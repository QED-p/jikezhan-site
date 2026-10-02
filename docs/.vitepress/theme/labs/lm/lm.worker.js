// Training worker: owns the model, runs forward/backward in a loop,
// posts compact snapshots for the mind-map UI.
import {
  DEFAULT_CFG,
  createModel,
  countParams,
  zeroGrads,
  forwardSeq,
  backwardSeq,
  gradNorm,
  clipGrads,
  createAdam,
  adamUpdate,
  mulberry32
} from './model.js'

const rnd = (A, digits = 4) =>
  A.map((row) => row.map((v) => Number(v.toFixed(digits))))

let CFG = { ...DEFAULT_CFG }
let model = null
let adam = null
let data = null
let rng = null

let windowOffset = 0

const state = {
  running: false,
  step: 0,
  lossEMA: null,
  lossRaw: null,
  val: null,
  gradNorm: 0,
  updateNorm: 0,
  history: [],
  valHistory: [],
  gradGroups: null,
  sample: '',
  samplePrompt: '',
  sampleLength: 48,
  temperature: 1,
  topK: 0,
  lastReport: 0,
  nextVal: 25,
  nextSample: 150
}

function buildData(text) {
  const chars = Array.from(new Set(Array.from(text)))
  const stoi = new Map(chars.map((c, i) => [c, i]))
  const ids = Array.from(text).map((c) => stoi.get(c))
  const n = ids.length
  const minCtx = CFG.ctx + 2
  if (n < minCtx * 4) {
    const cut = Math.max(Math.min(minCtx, n), Math.floor(n * 0.85))
    return { chars, ids, train: ids.slice(0, cut), val: ids.slice(cut) }
  }
  // 验证集：从语料里均匀抽若干连续片段（而不是末尾截断），保证与训练集同分布
  const chunkCount = 16
  const chunkLen = Math.max(minCtx, Math.floor((n * 0.15) / chunkCount))
  const stride = Math.max(chunkLen + minCtx, Math.floor(n / chunkCount))
  const valRanges = []
  for (let i = 0; i < chunkCount; i++) {
    const start = Math.min(n - chunkLen, Math.floor(stride * (i + 0.5)))
    valRanges.push([start, start + chunkLen])
  }
  const train = []
  const val = []
  let cur = 0
  for (const [s, e] of valRanges) {
    if (s > cur) train.push(...ids.slice(cur, s))
    val.push(...ids.slice(s, e))
    cur = e
  }
  if (cur < n) train.push(...ids.slice(cur))
  return { chars, ids, train, val }
}

function init(corpus, lr) {
  CFG = { ...DEFAULT_CFG, lr: lr ?? DEFAULT_CFG.lr }
  const clean = corpus.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (clean.length < 8) {
    model = null
    post({ type: 'error', message: '语料太短：至少需要 8 个字符（现在 ' + clean.length + ' 个）' })
    return false
  }
  data = buildData(clean)
  rng = mulberry32(1234)
  model = createModel(data.chars.length, CFG, 42)
  adam = createAdam(model)
  windowOffset = 0
  state.step = 0
  state.lossEMA = null
  state.lossRaw = null
  state.val = null
  state.history = []
  state.valHistory = []
  state.sample = ''
  state.nextVal = 25
  state.nextSample = 150
  post({ type: 'snapshot', data: snapshot(true) })
  return true
}

// effective context: never longer than the corpus allows
function effCtx() {
  return Math.max(1, Math.min(CFG.ctx, data.ids.length - 2))
}

function sampleBatch(src, batch) {
  const T = Math.max(1, Math.min(effCtx(), src.length - 2))
  const xs = []
  const ys = []
  for (let b = 0; b < batch; b++) {
    const span = Math.max(1, src.length - T - 1)
    const i = Math.floor(rng() * span)
    xs.push(src.slice(i, i + T))
    ys.push(src.slice(i + 1, i + T + 1))
  }
  return { xs, ys }
}

function trainStep() {
  const { xs, ys } = sampleBatch(data.train, CFG.batch)
  const grads = zeroGrads(model)
  let loss = 0
  for (let b = 0; b < xs.length; b++) {
    const out = forwardSeq(model, xs[b], ys[b], CFG)
    loss += out.loss
    backwardSeq(model, out.cache, grads, CFG)
  }
  loss /= xs.length
  const inv = 1 / xs.length
  scaleObj(grads, inv)
  state.gradNorm = gradNorm(grads)
  state.gradGroups = groupNorms(grads)
  clipGrads(grads, CFG.clip)
  state.updateNorm = adamUpdate(model, grads, adam, CFG.lr)
  state.step += 1
  state.lossRaw = loss
  state.lossEMA = state.lossEMA === null ? loss : state.lossEMA * 0.95 + loss * 0.05

  const keep = state.step <= 300 || state.step % 3 === 0
  if (keep) {
    state.history.push({ s: state.step, l: Number(state.lossEMA.toFixed(4)) })
    if (state.history.length > 420) {
      state.history = state.history.filter((_, i) => i % 2 === 0)
    }
  }
}

function scaleObj(g, s) {
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object') v.forEach(walk)
      else for (let i = 0; i < v.length; i++) v[i] *= s
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(g)
}

function evalVal() {
  if (!data.val || data.val.length < 4) return null
  const T = Math.max(1, Math.min(effCtx(), data.val.length - 2))
  const vr = mulberry32(99)
  let loss = 0
  let count = 0
  for (let b = 0; b < 4; b++) {
    for (let s = 0; s < 4; s++) {
      const span = Math.max(1, data.val.length - T - 1)
      const i = Math.floor(vr() * span)
      const xs = data.val.slice(i, i + T)
      const ys = data.val.slice(i + 1, i + T + 1)
      loss += forwardSeq(model, xs, ys, CFG).loss
      count++
    }
  }
  return loss / count
}

function generate(prompt, n) {
  const ids = Array.from(prompt).map((c) => data.chars.indexOf(c))
  const ctx = ids.length ? ids : [0]
  let out = ''
  const temp = Math.max(0.05, Math.min(2, state.temperature || 1))
  const topK = Math.max(0, Math.min(50, Math.round(state.topK || 0)))
  for (let i = 0; i < n; i++) {
    const x = ctx.slice(-Math.max(1, effCtx()))
    const res = forwardSeq(model, x, x, CFG)
    const p = Array.from(res.probs[res.probs.length - 1])
    if (temp !== 1) {
      let s = 0
      for (let j = 0; j < p.length; j++) {
        p[j] = Math.pow(p[j], 1 / temp)
        s += p[j]
      }
      if (s > 0) for (let j = 0; j < p.length; j++) p[j] /= s
    }
    if (topK > 0 && topK < p.length) {
      const order = p.map((v, j) => [v, j]).sort((a, b) => b[0] - a[0]).slice(0, topK)
      const keep = new Set(order.map(([, j]) => j))
      let s = 0
      for (let j = 0; j < p.length; j++) {
        if (!keep.has(j)) p[j] = 0
        else s += p[j]
      }
      if (s > 0) for (let j = 0; j < p.length; j++) p[j] /= s
    }
    let r = Math.random()
    let pick = 0
    for (let j = 0; j < p.length; j++) {
      r -= p[j]
      if (r <= 0) {
        pick = j
        break
      }
    }
    out += data.chars[pick]
    ctx.push(pick)
  }
  return out
}

function clampSampleLength(v) {
  return Math.max(4, Math.min(200, Math.round(Number(v) || 48)))
}

// 提示词里不在词表中的字符会被忽略；全部被忽略时退回语料开头两个字
function resolvePrompt() {
  const raw = String(state.samplePrompt || '')
  const filtered = Array.from(raw).filter((ch) => data.chars.includes(ch)).join('')
  return filtered || data.chars.slice(0, 2).join('')
}

function applySampleSettings(msg) {
  if (typeof msg.prompt === 'string') state.samplePrompt = msg.prompt
  if (msg.length !== undefined) state.sampleLength = clampSampleLength(msg.length)
  if (msg.temperature !== undefined) {
    state.temperature = Math.max(0.05, Math.min(2, Number(msg.temperature) || 1))
  }
  if (msg.topK !== undefined) {
    state.topK = Math.max(0, Math.min(50, Math.round(Number(msg.topK) || 0)))
  }
}

function doSample() {
  const prompt = resolvePrompt()
  state.sample = prompt + generate(prompt, state.sampleLength)
}

function groupNorms(g) {
  const n1 = gradNorm({ tokEmb: g.tokEmb })
  const n2 = gradNorm({ posEmb: g.posEmb })
  const B = g.blocks[0]
  const nAttn = gradNorm({ Wq: B.dWq, Wk: B.dWk, Wv: B.dWv, Wo: B.dWo })
  const nFfn = gradNorm({ W1: B.dW1, W2: B.dW2 })
  const nLn = gradNorm({ g1: B.dg1, b1: B.db1, g2: B.dg2, b2: B.db2 })
  const nOut = gradNorm({ Wout: g.Wout })
  const r = (x) => Number(x.toFixed(3))
  return [
    { label: '词元嵌入', value: r(n1) },
    { label: '位置编码', value: r(n2) },
    { label: '注意力', value: r(nAttn) },
    { label: '前馈', value: r(nFfn) },
    { label: '归一化', value: r(nLn) },
    { label: '输出层', value: r(nOut) }
  ]
}

function maxOffset() {
  return Math.max(0, data.ids.length - effCtx() - 1)
}

function probeSnapshot() {
  if (!model || !data) return null
  const T = effCtx()
  const off = Math.max(0, Math.min(windowOffset, maxOffset()))
  const x = data.ids.slice(off, off + T)
  const y = data.ids.slice(off + 1, off + T + 1)
  const out = forwardSeq(model, x, y, CFG)
  const dh = CFG.d / CFG.heads
  const attn = out.cache.headsCache.map((h) => rnd(h.P))
  const scores = out.cache.headsCache.map((h) => {
    const off = h.off
    const S = Array.from({ length: T }, () => new Array(T).fill(0))
    for (let i = 0; i < T; i++) {
      for (let j = 0; j <= i; j++) {
        let dot = 0
        for (let c = 0; c < dh; c++) dot += out.cache.q[i][off + c] * out.cache.k[j][off + c]
        S[i][j] = Number(dot.toFixed(4))
      }
    }
    return S
  })
  const attnMax = out.cache.headsCache.map((h) => {
    let best = { r: 0, c: 0, v: 0 }
    for (let i = 0; i < T; i++) {
      for (let j = 0; j <= i; j++) {
        if (h.P[i][j] > best.v) best = { r: i, c: j, v: h.P[i][j] }
      }
    }
    return best
  })
  const last = out.probs[T - 1]
  const top = Array.from(last)
    .map((p, i) => ({ ch: data.chars[i], p }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 8)
    .map((t) => ({ ch: t.ch, p: Number(t.p.toFixed(4)) }))
  return {
    tokens: x.map((i) => data.chars[i]),
    e: rnd(out.cache.e),
    posEmb: rnd(model.posEmb.slice(0, T)),
    hidden: rnd(out.cache.a1),
    attn,
    attnMax,
    scores,
    dh,
    heads: attn.length,
    window: { start: off, end: off + T - 1, total: data.ids.length },
    top
  }
}

function snapshot(force) {
  const probe = probeSnapshot()
  return {
    step: state.step,
    loss: state.lossEMA,
    lossRaw: state.lossRaw,
    val: state.val,
    gradNorm: state.gradNorm,
    gradGroups: state.gradGroups,
    updateNorm: state.updateNorm,
    params: countParams(model),
    history: state.history.slice(-420),
    valHistory: state.valHistory.slice(-120),
    sample: state.sample,
    sampleSettings: {
      prompt: state.samplePrompt,
      length: state.sampleLength,
      temperature: state.temperature,
      topK: state.topK
    },
    chars: data.chars,
    stats: {
      corpus: data.ids.length,
      vocab: data.chars.length,
      train: data.train.length,
      val: data.val.length
    },
    probe
  }
}

function post(msg) {
  self.postMessage(msg)
}

function run() {
  if (!state.running || !model) return
  try {
    trainChunk()
  } catch (err) {
    state.running = false
    post({ type: 'error', message: '训练中断：' + (err && err.message ? err.message : err) })
    return
  }
  setTimeout(run, 0)
}

function trainChunk() {
  const t0 = performance.now()
  while (performance.now() - t0 < 40) {
    trainStep()
    if (state.step >= state.nextVal) {
      state.val = evalVal()
      state.nextVal += 25
      if (state.val !== null) {
        state.valHistory.push({ s: state.step, l: Number(state.val.toFixed(4)) })
      }
    }
    if (state.step >= state.nextSample) {
      doSample()
      state.nextSample += 150
    }
  }
  const now = performance.now()
  if (now - state.lastReport > 140) {
    state.lastReport = now
    post({ type: 'snapshot', data: snapshot() })
  }
}

self.onmessage = (e) => {
  const { type } = e.data
  try {
    if (type === 'init') {
      state.running = false
      if (init(e.data.corpus, e.data.lr)) {
        state.running = true
        run()
      }
    } else if (type === 'start') {
      if (!state.running) {
        state.running = true
        run()
      }
    } else if (type === 'pause') {
      state.running = false
    } else if (type === 'lr') {
      CFG.lr = e.data.value
      post({ type: 'snapshot', data: snapshot() })
    } else if (type === 'reset') {
      state.running = false
      if (init(e.data.corpus, e.data.lr)) {
        state.running = true
        run()
      }
    } else if (type === 'setWindow') {
      if (typeof e.data.offset === 'number') windowOffset = e.data.offset
      if (typeof e.data.delta === 'number') windowOffset += e.data.delta
      windowOffset = Math.max(0, Math.min(windowOffset, maxOffset()))
      post({ type: 'snapshot', data: snapshot() })
    } else if (type === 'sampleNow') {
      applySampleSettings(e.data)
      doSample()
      state.nextSample = state.step + 150
      post({ type: 'snapshot', data: snapshot() })
    } else if (type === 'sampleSettings') {
      applySampleSettings(e.data)
    }
  } catch (err) {
    post({ type: 'error', message: String(err && err.message ? err.message : err) })
  }
}
