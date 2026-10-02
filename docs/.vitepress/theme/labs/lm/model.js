// Char-level decoder-only Transformer, hand-written forward/backward/Adam.
// No dependencies. Runs in Node (tests) and in a Web Worker (browser).

export const DEFAULT_CFG = {
  ctx: 16,
  d: 32,
  heads: 4,
  hidden: 64,
  layers: 1,
  batch: 8,
  lr: 0.003,
  clip: 1.0,
  eps: 1e-5
}

// ---------- RNG ----------

export function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- small matrix helpers (nested arrays) ----------

export const zeros = (n, m) => Array.from({ length: n }, () => new Array(m).fill(0))
export const clone = (A) => A.map((r) => r.slice())
export const colSum = (A) => {
  const m = A[0].length
  const out = new Array(m).fill(0)
  for (const row of A) for (let j = 0; j < m; j++) out[j] += row[j]
  return out
}

export function randn(n, m, rng, scale = 0.08) {
  const A = zeros(n, m)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let u = 0
      let v = 0
      while (u === 0) u = rng()
      while (v === 0) v = rng()
      A[i][j] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * scale
    }
  }
  return A
}

export function matmul(A, B) {
  const n = A.length
  const m = B[0].length
  const k = B.length
  const C = zeros(n, m)
  for (let i = 0; i < n; i++) {
    const Ai = A[i]
    const Ci = C[i]
    for (let p = 0; p < k; p++) {
      const a = Ai[p]
      if (a === 0) continue
      const Bp = B[p]
      for (let j = 0; j < m; j++) Ci[j] += a * Bp[j]
    }
  }
  return C
}

export function matmulTN(A, B) {
  // A^T @ B, A: [n,k], B: [n,m] -> [k,m]
  const k = A[0].length
  const m = B[0].length
  const n = A.length
  const C = zeros(k, m)
  for (let i = 0; i < n; i++) {
    const Ai = A[i]
    const Bi = B[i]
    for (let p = 0; p < k; p++) {
      const a = Ai[p]
      if (a === 0) continue
      const Cp = C[p]
      for (let j = 0; j < m; j++) Cp[j] += a * Bi[j]
    }
  }
  return C
}

export function matmulNT(A, B) {
  // A @ B^T, A: [n,m], B: [k,m] -> [n,k]
  const n = A.length
  const m = A[0].length
  const k = B.length
  const C = zeros(n, k)
  for (let i = 0; i < n; i++) {
    const Ai = A[i]
    const Ci = C[i]
    for (let j = 0; j < k; j++) {
      const Bj = B[j]
      let s = 0
      for (let p = 0; p < m; p++) s += Ai[p] * Bj[p]
      Ci[j] = s
    }
  }
  return C
}

export function addInto(A, B) {
  for (let i = 0; i < A.length; i++) {
    const Ai = A[i]
    const Bi = B[i]
    for (let j = 0; j < Ai.length; j++) Ai[j] += Bi[j]
  }
  return A
}

export function scaleInto(A, s) {
  for (const row of A) for (let j = 0; j < row.length; j++) row[j] *= s
  return A
}

export function softmaxRow(x) {
  let mx = -Infinity
  for (const v of x) if (v > mx) mx = v
  const out = new Array(x.length)
  let s = 0
  for (let i = 0; i < x.length; i++) {
    const e = Math.exp(x[i] - mx)
    out[i] = e
    s += e
  }
  for (let i = 0; i < x.length; i++) out[i] /= s
  return out
}

// LayerNorm forward for one row; returns {y, xh, mu, sig}
export function layernormRow(x, g, b, eps) {
  const n = x.length
  let mu = 0
  for (const v of x) mu += v
  mu /= n
  let va = 0
  for (const v of x) va += (v - mu) * (v - mu)
  va /= n
  const sig = Math.sqrt(va + eps)
  const xh = new Array(n)
  const y = new Array(n)
  for (let i = 0; i < n; i++) {
    xh[i] = (x[i] - mu) / sig
    y[i] = xh[i] * g[i] + b[i]
  }
  return { y, xh, sig }
}

// backward for one row: returns {dx, dg, db}
export function layernormRowBack(dy, xh, sig, g) {
  const n = dy.length
  const dx = new Array(n)
  const dg = new Array(n)
  const db = new Array(n)
  let m1 = 0
  for (let i = 0; i < n; i++) m1 += dy[i] * g[i] * xh[i]
  m1 /= n
  let m2 = 0
  for (let i = 0; i < n; i++) m2 += dy[i] * g[i]
  m2 /= n
  for (let i = 0; i < n; i++) {
    dx[i] = (dy[i] * g[i] - m2 - xh[i] * m1) / sig
    dg[i] = dy[i] * xh[i]
    db[i] = dy[i]
  }
  return { dx, dg, db }
}

// ---------- model ----------

export function createModel(vocabSize, cfg = DEFAULT_CFG, seed = 1) {
  const rng = mulberry32(seed)
  const { d, heads, hidden, ctx, layers } = cfg
  const dh = d / heads
  const params = {
    tokEmb: randn(vocabSize, d, rng),
    posEmb: randn(ctx, d, rng),
    blocks: [],
    gf: new Array(d).fill(1),
    bf: new Array(d).fill(0),
    Wout: randn(d, vocabSize, rng, 0.08)
  }
  for (let l = 0; l < layers; l++) {
    params.blocks.push({
      g1: new Array(d).fill(1),
      b1: new Array(d).fill(0),
      Wq: randn(d, d, rng, 0.08 / Math.sqrt(2)),
      Wk: randn(d, d, rng, 0.08 / Math.sqrt(2)),
      Wv: randn(d, d, rng, 0.08 / Math.sqrt(2)),
      Wo: randn(d, d, rng, 0.08),
      g2: new Array(d).fill(1),
      b2: new Array(d).fill(0),
      W1: randn(d, hidden, rng),
      b1f: new Array(hidden).fill(0),
      W2: randn(hidden, d, rng),
      b2f: new Array(d).fill(0)
    })
  }
  params.meta = { vocabSize, cfg, dh }
  return params
}

export function countParams(params) {
  let n = 0
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (Array.isArray(v[0])) v.forEach(walk)
      else n += v.length
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(walk)
    }
  }
  walk(params.tokEmb)
  walk(params.posEmb)
  walk(params.Wout)
  walk(params.gf)
  walk(params.bf)
  for (const b of params.blocks) walk(b)
  return n
}

// forward for one sequence, returns {loss, logits, probs, cache}
export function forwardSeq(params, tokens, targets, cfg) {
  const { d, heads, hidden, eps } = cfg
  const { dh } = params.meta
  const T = tokens.length
  const V = params.meta.vocabSize
  const B = params.blocks[0]

  const e = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const te = params.tokEmb[tokens[i]]
    const pe = params.posEmb[i]
    const ei = e[i]
    for (let j = 0; j < d; j++) ei[j] = te[j] + pe[j]
  }

  const ln1 = []
  const h = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const r = layernormRow(e[i], B.g1, B.b1, eps)
    ln1.push(r)
    h[i] = r.y
  }

  const q = matmul(h, B.Wq)
  const k = matmul(h, B.Wk)
  const v = matmul(h, B.Wv)

  const attn = zeros(T, d)
  const headsCache = []
  const attnScale = 1 / Math.sqrt(dh)
  for (let hI = 0; hI < heads; hI++) {
    const off = hI * dh
    const scores = zeros(T, T)
    for (let i = 0; i < T; i++) {
      for (let j = 0; j <= i; j++) {
        let s = 0
        for (let c = 0; c < dh; c++) s += q[i][off + c] * k[j][off + c]
        scores[i][j] = s * attnScale
      }
    }
    const P = zeros(T, T)
    for (let i = 0; i < T; i++) {
      P[i] = softmaxRow(scores[i].slice(0, i + 1).concat(new Array(T - i - 1).fill(-Infinity)))
    }
    for (let i = 0; i < T; i++) {
      for (let c = 0; c < dh; c++) {
        let s = 0
        for (let j = 0; j <= i; j++) s += P[i][j] * v[j][off + c]
        attn[i][off + c] = s
      }
    }
    headsCache.push({ off, P })
  }

  const o = matmul(attn, B.Wo)
  const x2 = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const ei = e[i]
    const oi = o[i]
    const x2i = x2[i]
    for (let j = 0; j < d; j++) x2i[j] = ei[j] + oi[j]
  }

  const ln2 = []
  const h2 = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const r = layernormRow(x2[i], B.g2, B.b2, eps)
    ln2.push(r)
    h2[i] = r.y
  }

  const z1 = matmul(h2, B.W1)
  const a1 = zeros(T, hidden)
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < hidden; j++) {
      const z = z1[i][j] + B.b1f[j]
      z1[i][j] = z
      a1[i][j] = z > 0 ? z : 0
    }
  }
  const z2 = matmul(a1, B.W2)
  const x3 = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const a = x2[i]
    const b = z2[i]
    const r = x3[i]
    for (let j = 0; j < d; j++) r[j] = a[j] + b[j] + B.b2f[j]
  }

  const lnF = []
  const xn = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const r = layernormRow(x3[i], params.gf, params.bf, eps)
    lnF.push(r)
    xn[i] = r.y
  }

  const logits = matmul(xn, params.Wout)
  const probs = zeros(T, V)
  let loss = 0
  for (let i = 0; i < T; i++) {
    probs[i] = softmaxRow(logits[i])
    loss += -Math.log(Math.max(probs[i][targets[i]], 1e-12))
  }
  loss /= T

  return {
    loss,
    logits,
    probs,
    cache: {
      tokens, targets, e, ln1, h, q, k, v, headsCache, attn, o, x2,
      ln2, h2, z1, a1, z2, x3, lnF, xn, logits, probs
    }
  }
}

// backward for one sequence, accumulates into grads
export function backwardSeq(params, cache, grads, cfg) {
  const { d, heads, hidden, eps } = cfg
  const { dh } = params.meta
  const T = cache.tokens.length
  const B = params.blocks[0]
  const GB = grads.blocks[0]

  // dlogits: (probs - onehot)/T
  const V = params.meta.vocabSize
  const dlogits = zeros(T, V)
  for (let i = 0; i < T; i++) {
    const p = cache.probs[i]
    const row = dlogits[i]
    for (let j = 0; j < V; j++) row[j] = p[j] / T
    row[cache.targets[i]] -= 1 / T
  }

  addInto(grads.Wout, matmulTN(cache.xn, dlogits))
  const dxn = matmulNT(dlogits, params.Wout)

  const dx3 = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const r = layernormRowBack(dxn[i], cache.lnF[i].xh, cache.lnF[i].sig, params.gf)
    dx3[i] = r.dx
    for (let j = 0; j < d; j++) {
      grads.gf[j] += r.dg[j]
      grads.bf[j] += r.db[j]
    }
  }

  // x3 = x2 + z2 + b2f  => dx2 = dx3, dz2 = dx3, db2f = colsum
  const dz2 = dx3
  addInto(GB.dW2, matmulTN(cache.a1, dz2))
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < d; j++) GB.db2f[j] += dz2[i][j]
  }
  const da1 = matmul(dz2, transpose(B.W2))
  const dz1 = zeros(T, hidden)
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < hidden; j++) {
      dz1[i][j] = cache.z1[i][j] > 0 ? da1[i][j] : 0
    }
  }
  addInto(GB.dW1, matmulTN(cache.h2, dz1))
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < hidden; j++) GB.db1f[j] += dz1[i][j]
  }
  const dh2 = matmul(dz1, transpose(B.W1))

  const dx2 = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const r = layernormRowBack(dh2[i], cache.ln2[i].xh, cache.ln2[i].sig, B.g2)
    for (let j = 0; j < d; j++) {
      dx2[i][j] = dx3[i][j] + r.dx[j]
      GB.dg2[j] += r.dg[j]
      GB.db2[j] += r.db[j]
    }
  }

  addInto(GB.dWo, matmulTN(cache.attn, dx2))
  const dAttn = matmul(dx2, transpose(B.Wo))

  const dq = zeros(T, d)
  const dk = zeros(T, d)
  const dv = zeros(T, d)
  const attnScale = 1 / Math.sqrt(dh)
  for (let hI = 0; hI < heads; hI++) {
    const off = hI * dh
    const { P } = cache.headsCache[hI]
    const dP = zeros(T, T)
    const dVh = zeros(T, dh)
    for (let i = 0; i < T; i++) {
      for (let j = 0; j <= i; j++) {
        let s = 0
        for (let c = 0; c < dh; c++) s += dAttn[i][off + c] * cache.v[j][off + c]
        dP[i][j] = s
      }
    }
    for (let j = 0; j < T; j++) {
      for (let c = 0; c < dh; c++) {
        let s = 0
        for (let i = j; i < T; i++) s += P[i][j] * dAttn[i][off + c]
        dVh[j][c] = s
      }
    }
    // softmax backward per row
    for (let i = 0; i < T; i++) {
      let dot = 0
      for (let j = 0; j <= i; j++) dot += dP[i][j] * P[i][j]
      for (let j = 0; j <= i; j++) {
        const ds = P[i][j] * (dP[i][j] - dot)
        const sc = ds * attnScale
        for (let c = 0; c < dh; c++) {
          dq[i][off + c] += sc * cache.k[j][off + c]
          dk[j][off + c] += sc * cache.q[i][off + c]
        }
      }
    }
    for (let j = 0; j < T; j++) {
      for (let c = 0; c < dh; c++) dv[j][off + c] = dVh[j][c]
    }
  }

  addInto(GB.dWq, matmulTN(cache.h, dq))
  addInto(GB.dWk, matmulTN(cache.h, dk))
  addInto(GB.dWv, matmulTN(cache.h, dv))
  const dH = zeros(T, d)
  addInto(dH, matmul(dq, transpose(B.Wq)))
  addInto(dH, matmul(dk, transpose(B.Wk)))
  addInto(dH, matmul(dv, transpose(B.Wv)))

  const de = zeros(T, d)
  for (let i = 0; i < T; i++) {
    const r = layernormRowBack(dH[i], cache.ln1[i].xh, cache.ln1[i].sig, B.g1)
    for (let j = 0; j < d; j++) {
      de[i][j] = r.dx[j]
      GB.dg1[j] += r.dg[j]
      GB.db1[j] += r.db[j]
    }
  }
  for (let i = 0; i < T; i++) {
    const ti = cache.tokens[i]
    for (let j = 0; j < d; j++) {
      grads.tokEmb[ti][j] += de[i][j]
      grads.posEmb[i][j] += de[i][j]
    }
  }
}

export function transpose(A) {
  const n = A.length
  const m = A[0].length
  const B = zeros(m, n)
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) B[j][i] = A[i][j]
  return B
}

export function zeroGrads(params) {
  const g = {
    tokEmb: zeros(params.tokEmb.length, params.tokEmb[0].length),
    posEmb: zeros(params.posEmb.length, params.posEmb[0].length),
    blocks: [],
    gf: new Array(params.gf.length).fill(0),
    bf: new Array(params.bf.length).fill(0),
    Wout: zeros(params.Wout.length, params.Wout[0].length)
  }
  for (const b of params.blocks) {
    const d = params.meta.cfg.d
    const hidden = params.meta.cfg.hidden
    g.blocks.push({
      dg1: new Array(d).fill(0),
      db1: new Array(d).fill(0),
      dWq: zeros(d, d),
      dWk: zeros(d, d),
      dWv: zeros(d, d),
      dWo: zeros(d, d),
      dg2: new Array(d).fill(0),
      db2: new Array(d).fill(0),
      dW1: zeros(d, hidden),
      db1f: new Array(hidden).fill(0),
      dW2: zeros(hidden, d),
      db2f: new Array(d).fill(0)
    })
    break // single layer
  }
  return g
}

export function gradNorm(grads) {
  let s = 0
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object') v.forEach(walk)
      else for (const x of v) s += x * x
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(grads)
  return Math.sqrt(s)
}

export function clipGrads(grads, maxNorm) {
  const n = gradNorm(grads)
  if (n <= maxNorm || n === 0) return n
  const s = maxNorm / n
  const walk = (v) => {
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object') v.forEach(walk)
      else for (let i = 0; i < v.length; i++) v[i] *= s
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(grads)
  return n
}

// ---------- Adam ----------

export function createAdam(params) {
  const zero = (o) => {
    if (Array.isArray(o)) return o.map(zero)
    if (o && typeof o === 'object') {
      const out = {}
      for (const k of Object.keys(o)) out[k] = k === 'meta' ? o[k] : zero(o[k])
      return out
    }
    return 0
  }
  return { m: zero(params), v: zero(params), t: 0, b1: 0.9, b2: 0.999, eps: 1e-8 }
}

export function adamUpdate(params, grads, state, lr) {
  state.t += 1
  let sq = 0
  const b1 = state.b1
  const b2 = state.b2
  const c1 = 1 - Math.pow(b1, state.t)
  const c2 = 1 - Math.pow(b2, state.t)
  const walk = (p, g, m, v) => {
    if (Array.isArray(p)) {
      if (Array.isArray(p[0])) {
        for (let i = 0; i < p.length; i++) walk(p[i], g[i], m[i], v[i])
      } else {
        for (let i = 0; i < p.length; i++) {
          const gi = g[i]
          m[i] = b1 * m[i] + (1 - b1) * gi
          v[i] = b2 * v[i] + (1 - b2) * gi * gi
          const delta = (lr * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + state.eps)
          p[i] -= delta
          sq += delta * delta
        }
      }
    } else if (p && typeof p === 'object') {
      for (const k of Object.keys(p)) {
        if (k === 'meta') continue
        walk(p[k], g[k], m[k], v[k])
      }
    }
  }
  walk(params.tokEmb, grads.tokEmb, state.m.tokEmb, state.v.tokEmb)
  walk(params.posEmb, grads.posEmb, state.m.posEmb, state.v.posEmb)
  walk(params.gf, grads.gf, state.m.gf, state.v.gf)
  walk(params.bf, grads.bf, state.m.bf, state.v.bf)
  walk(params.Wout, grads.Wout, state.m.Wout, state.v.Wout)

  const PAIRS = [
    ['g1', 'dg1'],
    ['b1', 'db1'],
    ['Wq', 'dWq'],
    ['Wk', 'dWk'],
    ['Wv', 'dWv'],
    ['Wo', 'dWo'],
    ['g2', 'dg2'],
    ['b2', 'db2'],
    ['W1', 'dW1'],
    ['b1f', 'db1f'],
    ['W2', 'dW2'],
    ['b2f', 'db2f']
  ]
  for (let i = 0; i < params.blocks.length; i++) {
    const pb = params.blocks[i]
    const gb = grads.blocks[i]
    const mb = state.m.blocks[i]
    const vb = state.v.blocks[i]
    for (const [pk, gk] of PAIRS) walk(pb[pk], gb[gk], mb[pk], vb[pk])
  }
  return Math.sqrt(sq)
}
