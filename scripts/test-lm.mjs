// Node self-test: gradient check + convergence on a tiny corpus.
import {
  DEFAULT_CFG,
  createModel,
  zeroGrads,
  forwardSeq,
  backwardSeq,
  gradNorm,
  clipGrads,
  createAdam,
  adamUpdate,
  mulberry32
} from '../docs/.vitepress/theme/labs/lm/model.js'

const CORPUS = (
  '极客栈是一个研究体系结构与机器学习的社团.' +
  '我们写教程，做实验，把机器拆开看它是怎么跑的.' +
  '语言模型从一堆字符里学会预测下一个字符.' +
  '前向传播算出预测，反向传播算出梯度.' +
  '梯度告诉参数应该往哪里走，走多快由学习率决定.' +
  '训练是把这件事重复很多很多遍.'
).repeat(12)

function buildData(text) {
  const chars = Array.from(new Set(Array.from(text)))
  const stoi = new Map(chars.map((c, i) => [c, i]))
  const data = Array.from(text).map((c) => stoi.get(c))
  const n = Math.floor(data.length * 0.9)
  return { chars, stoi, train: data.slice(0, n), val: data.slice(n) }
}

function sampleBatch(data, ctx, batch, rng) {
  const xs = []
  const ys = []
  for (let b = 0; b < batch; b++) {
    const i = Math.floor(rng() * (data.length - ctx - 1))
    xs.push(data.slice(i, i + ctx))
    ys.push(data.slice(i + 1, i + ctx + 1))
  }
  return { xs, ys }
}

function evalLoss(model, data, ctx, batches, rng) {
  let loss = 0
  for (let i = 0; i < batches; i++) {
    const { xs, ys } = sampleBatch(data, ctx, 4, rng)
    for (let b = 0; b < xs.length; b++) {
      loss += forwardSeq(model, xs[b], ys[b], CFG).loss
    }
  }
  return loss / (batches * 4)
}

const CFG = { ...DEFAULT_CFG, ctx: 16, d: 32, heads: 4, hidden: 64, batch: 8, lr: 0.005 }

// ---------- gradient check ----------
{
  const text = 'abcdeabcdeabcdeabcdeabcdeabcdeabcde'
  const { chars, stoi, train } = buildData(text)
  const model = createModel(chars.length, CFG, 3)
  const xs = train.slice(0, 16)
  const ys = train.slice(1, 17)

  const out = forwardSeq(model, xs, ys, CFG)
  const grads = zeroGrads(model)
  backwardSeq(model, out.cache, grads, CFG)

  const idx = [2, 3]
  const eps = 1e-4
  const orig = model.Wout[idx[0]][idx[1]]
  model.Wout[idx[0]][idx[1]] = orig + eps
  const lp = forwardSeq(model, xs, ys, CFG).loss
  model.Wout[idx[0]][idx[1]] = orig - eps
  const lm = forwardSeq(model, xs, ys, CFG).loss
  model.Wout[idx[0]][idx[1]] = orig
  const num = (lp - lm) / (2 * eps)
  const ana = grads.Wout[idx[0]][idx[1]]
  const rel = Math.abs(num - ana) / Math.max(1e-8, Math.abs(num) + Math.abs(ana))
  console.log(`grad check Wout[${idx}]: numeric=${num.toFixed(6)} analytic=${ana.toFixed(6)} rel=${rel.toExponential(2)}`)
  if (rel > 1e-3) {
    console.error('GRAD CHECK FAILED')
    process.exit(1)
  }
}

// ---------- convergence ----------
{
  const { chars, train, val } = buildData(CORPUS)
  const model = createModel(chars.length, CFG, 42)
  const adam = createAdam(model)
  const rng = mulberry32(7)
  const steps = 600
  let firstLoss = null
  let lastLoss = null
  const t0 = Date.now()

  for (let s = 0; s < steps; s++) {
    const { xs, ys } = sampleBatch(train, CFG.ctx, CFG.batch, rng)
    const grads = zeroGrads(model)
    let loss = 0
    for (let b = 0; b < xs.length; b++) {
      const out = forwardSeq(model, xs[b], ys[b], CFG)
      loss += out.loss
      backwardSeq(model, out.cache, grads, CFG)
    }
    loss /= xs.length
    scaleGrads(grads, 1 / xs.length)
    clipGrads(grads, CFG.clip)
    adamUpdate(model, grads, adam, CFG.lr)
    if (s === 0) firstLoss = loss
    lastLoss = loss
    if ((s + 1) % 100 === 0) {
      const vl = evalLoss(model, val, CFG.ctx, 4, rng)
      console.log(`step ${String(s + 1).padStart(4)}  train ${loss.toFixed(3)}  val ${vl.toFixed(3)}  grad ${gradNorm(grads).toFixed(2)}`)
    }
  }

  const ms = Date.now() - t0
  console.log(`\nvocab=${chars.length}  params=${countParams(model)}  ${steps} steps in ${ms}ms (${((ms / steps)).toFixed(1)} ms/step)`)
  console.log(`loss ${firstLoss.toFixed(3)} -> ${lastLoss.toFixed(3)}`)
  if (!(lastLoss < firstLoss * 0.5)) {
    console.error('CONVERGENCE FAILED: loss did not halve')
    process.exit(1)
  }
  console.log('CONVERGENCE OK')

  // sample
  console.log('sample:', generate(model, chars, '语言', 40))
}

function scaleGrads(g, s) {
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object') v.forEach(walk)
      else for (let i = 0; i < v.length; i++) v[i] *= s
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(g)
}

function countParams(params) {
  let n = 0
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (Array.isArray(v[0])) v.forEach(walk)
      else n += v.length
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  ;[params.tokEmb, params.posEmb, params.Wout, params.gf, params.bf].forEach(walk)
  params.blocks.forEach(walk)
  return n
}

function generate(model, chars, prompt, n) {
  const { forwardSeq } = mod
  let ctx = Array.from(prompt).map((c) => chars.indexOf(c))
  let out = prompt
  for (let i = 0; i < n; i++) {
    const x = ctx.slice(-CFG.ctx)
    while (x.length < CFG.ctx) x.unshift(0)
    const res = forwardSeq(model, x, x, CFG)
    const p = res.probs[res.probs.length - 1]
    let r = Math.random()
    let pick = 0
    for (let j = 0; j < p.length; j++) {
      r -= p[j]
      if (r <= 0) {
        pick = j
        break
      }
    }
    out += chars[pick]
    ctx.push(pick)
  }
  return out
}

import * as mod from '../docs/.vitepress/theme/labs/lm/model.js'
