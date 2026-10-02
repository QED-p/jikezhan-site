export const TOKENS = [
  '核心', '思想', '是', '让', '序列', '中',
  '每个', '位置', '直接', '看见', '全部', '上下文'
]

export const SEL = { r: 7, c: 4 }

export const Q = ['0.42', '-0.18', '0.07', '0.55', '-0.31', '0.12', '0.64', '-0.05']
export const K = ['0.21', '0.33', '-0.27', '0.58', '0.16', '-0.09', '0.47', '0.02']
export const V = ['-0.35', '0.28', '0.61', '0.14', '-0.52', '0.09', '0.37', '0.22']

export const READOUTS = [
  { label: '序列', value: '012' },
  { label: '维度', value: '064' },
  { label: '注意力头', value: '04/08' },
  { label: '层', value: '06' }
]

export const EXTRA = [
  [9, 11, 1.15],
  [3, 4, 0.75],
  [5, 4, 0.55],
  [10, 11, 0.65],
  [6, 7, 0.5]
]

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildWeights() {
  const n = TOKENS.length
  const rng = mulberry32(7)
  const raw = []
  for (let i = 0; i < n; i++) {
    const row = []
    for (let j = 0; j < n; j++) {
      let s = i === j ? 1.25 : 0
      s += j === 0 ? 0.85 : 0
      s += 0.7 * Math.exp(-((i - j) ** 2) / 10)
      s += rng() * 0.16
      row.push(s)
    }
    raw.push(row)
  }
  for (const [i, j, b] of EXTRA) raw[i][j] += b

  let bump = 0.9
  for (;;) {
    const w = raw.map((r) => r.slice())
    for (let j = 0; j < n; j++) w[SEL.r][j] += bump * Math.exp(-((j - SEL.c) ** 2) / 1.5)
    const weights = w.map((row) => {
      const mx = Math.max(...row)
      const ex = row.map((v) => Math.exp(v - mx))
      const z = ex.reduce((a, b) => a + b, 0)
      return ex.map((v) => v / z)
    })
    const rw = weights[SEL.r]
    if (rw[SEL.c] === Math.max(...rw) && rw[SEL.c] >= 0.5) return weights
    bump += 0.3
  }
}
