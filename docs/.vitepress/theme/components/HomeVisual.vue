<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref(null)
const sceneIndex = ref(0)
const reduced = ref(false)

const SCENES = [
  { key: 'la', label: '线性代数 · 特征方向' },
  { key: 'va', label: '矢量分析 · 场与流线' },
  { key: 'arch', label: '体系结构 · 流水线与缓存' },
  { key: 'tf', label: 'Transformer · 注意力' },
  { key: 'mix', label: '概率 · 信息 · 离散' }
]
const DUR = [8, 8, 8, 8, 9]
const FADE = 0.7

let ctx = null
let raf = 0
let io = null
let ro = null
let W = 0
let H = 0
let elapsed = 0
let last = 0
let running = false
let palette = null
let current = -1
const state = {}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)
const font = (s) => `${s}px ui-monospace, "JetBrains Mono", "Noto Sans Mono", monospace`

function hex2rgb(hex, fb) {
  const m = /^#([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return fb
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`
const mix = (a, b, t) => ({
  r: Math.round(lerp(a.r, b.r, t)),
  g: Math.round(lerp(a.g, b.g, t)),
  b: Math.round(lerp(a.b, b.b, t))
})

function readPalette(el) {
  const cs = getComputedStyle(el)
  const get = (name, fb) => hex2rgb(cs.getPropertyValue(name), fb)
  palette = {
    bg: get('--hud-bg', { r: 11, g: 9, b: 22 }),
    accent: get('--hud-accent', { r: 138, g: 111, b: 232 }),
    hot: get('--hud-hot', { r: 233, g: 224, b: 255 }),
    warn: get('--hud-warn', { r: 217, g: 178, b: 60 }),
    good: get('--hud-good', { r: 120, g: 168, b: 112 }),
    crit: get('--hud-crit', { r: 224, g: 80, b: 96 }),
    ink: get('--hud-ink', { r: 214, g: 206, b: 238 }),
    dim: get('--hud-dim', { r: 111, g: 100, b: 148 }),
    faint: get('--hud-faint', { r: 42, g: 36, b: 68 })
  }
}

function line(x0, y0, x1, y1, color, width = 1, dash = null) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  if (dash) ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  if (dash) ctx.setLineDash([])
}

function arrow(x0, y0, x1, y1, color, width = 1.2, head = 5) {
  line(x0, y0, x1, y1, color, width)
  const a = Math.atan2(y1 - y0, x1 - x0)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45))
  ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45))
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function view(sMax, hMax) {
  const s = Math.min(W / sMax, H / hMax)
  const ox = W / 2
  const oy = H / 2
  return { s, X: (x) => ox + x * s, Y: (y) => oy - y * s }
}

/* ---------- 幕 1：线性代数 ---------- */
const LA_KF = [
  [1, 0, 0, 1],
  [Math.cos(0.62), -Math.sin(0.62), Math.sin(0.62), Math.cos(0.62)],
  [1.12, 0.85, 0.05, 0.6],
  [1.45, 0, 0, 0.72],
  [1, 0, 0, 1]
]
function laMatrix(t) {
  const n = LA_KF.length - 1
  const u = (t / DUR[0]) * n
  const i = Math.min(n - 1, Math.max(0, Math.floor(u)))
  const p = smooth(u - i)
  const A = LA_KF[i]
  const B = LA_KF[i + 1]
  return [lerp(A[0], B[0], p), lerp(A[1], B[1], p), lerp(A[2], B[2], p), lerp(A[3], B[3], p)]
}
function drawLA(t, P) {
  const v = view(5.6, 3.6)
  const X = v.X
  const Y = v.Y
  ctx.strokeStyle = rgba(P.faint, 0.5)
  ctx.lineWidth = 1
  for (let k = -2; k <= 2; k += 0.5) {
    ctx.beginPath(); ctx.moveTo(X(k), Y(-2)); ctx.lineTo(X(k), Y(2)); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(X(-2), Y(k)); ctx.lineTo(X(2), Y(k)); ctx.stroke()
  }
  const [a, b, c, d] = laMatrix(t)
  const map = (x, y) => [a * x + b * y, c * x + d * y]
  ctx.strokeStyle = rgba(P.accent, 0.5)
  for (let k = -2; k <= 2; k += 0.5) {
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const [mx, my] = map(k, u)
      u === -2 ? ctx.moveTo(X(mx), Y(my)) : ctx.lineTo(X(mx), Y(my))
    }
    ctx.stroke()
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const [mx, my] = map(u, k)
      u === -2 ? ctx.moveTo(X(mx), Y(my)) : ctx.lineTo(X(mx), Y(my))
    }
    ctx.stroke()
  }
  const tr = a + d
  const det = a * d - b * c
  const disc = tr * tr - 4 * det
  ctx.font = font(11)
  if (disc >= -1e-6) {
    const r = Math.sqrt(Math.max(0, disc))
    const l1 = (tr + r) / 2
    const l2 = (tr - r) / 2
    const ev = (l) => {
      let vx = b
      let vy = l - a
      if (Math.hypot(vx, vy) < 1e-6) { vx = 1; vy = 0 }
      const n = Math.hypot(vx, vy)
      return [vx / n, vy / n]
    }
    const [v1x, v1y] = ev(l1)
    line(X(-2.7 * v1x), Y(-2.7 * v1y), X(2.7 * v1x), Y(2.7 * v1y), rgba(P.accent, 0.8), 1.2, [6, 5])
    ctx.fillStyle = rgba(P.accent, 0.95)
    ctx.fillText(`λ₁ ${l1.toFixed(2)}`, X(2.7 * v1x) + 6, Y(2.7 * v1y) - 6)
    if (Math.abs(l1 - l2) > 1e-6) {
      const [v2x, v2y] = ev(l2)
      line(X(-2.7 * v2x), Y(-2.7 * v2y), X(2.7 * v2x), Y(2.7 * v2y), rgba(P.warn, 0.75), 1.2, [6, 5])
      ctx.fillStyle = rgba(P.warn, 0.9)
      ctx.fillText(`λ₂ ${l2.toFixed(2)}`, X(2.7 * v2x) + 6, Y(2.7 * v2y) + 14)
    }
  } else {
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = rgba(P.warn, 0.55)
    ctx.beginPath()
    ctx.arc(X(0), Y(0), 0.6 * v.s, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  const vx = 1
  const vy = 0.34
  arrow(X(0), Y(0), X(vx), Y(vy), rgba(P.hot, 0.95), 1.6, 6)
  const [mx, my] = map(vx, vy)
  ctx.setLineDash([5, 4])
  arrow(X(0), Y(0), X(mx), Y(my), rgba(P.hot, 0.5), 1.2, 5)
  ctx.setLineDash([])
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText(`det ${det.toFixed(2)}   tr ${tr.toFixed(2)}   A·v → Av`, W - 250, 22)
}

/* ---------- 幕 2：矢量分析 ---------- */
function drawVA(t, P) {
  const v = view(5.8, 3.4)
  const X = v.X
  const Y = v.Y
  const F = (x, y) => [Math.sin(1.2 * y) + 0.3 * x, Math.sin(1.2 * x) + 0.3 * y]
  for (let i = -2.4; i <= 2.41; i += 0.48) {
    for (let j = -1.44; j <= 1.45; j += 0.48) {
      const [fx, fy] = F(i, j)
      const m = Math.hypot(fx, fy) || 1
      const k = (Math.min(1.4, m) / m) * 0.21
      arrow(X(i), Y(j), X(i + fx * k), Y(j + fy * k), rgba(mix(P.accent, P.warn, Math.min(1, m / 1.6)), 0.68), 1, 3.8)
    }
  }
  if (!state.va) {
    const rnd = mulberry32(7)
    state.va = {
      ps: Array.from({ length: 46 }, () => {
        const x = rnd() * 4.6 - 2.3
        const y = rnd() * 2.6 - 1.3
        return { x, y, px: x, py: y, life: 1 + rnd() * 2 }
      })
    }
  }
  const dt = 1 / 60
  for (const p of state.va.ps) {
    const [fx, fy] = F(p.x, p.y)
    p.px = p.x
    p.py = p.y
    p.x += fx * dt * 1.1
    p.y += fy * dt * 1.1
    p.life -= dt
    if (p.life <= 0 || Math.abs(p.x) > 2.5 || Math.abs(p.y) > 1.5) {
      p.x = Math.random() * 4.6 - 2.3
      p.y = Math.random() * 2.6 - 1.3
      p.px = p.x
      p.py = p.y
      p.life = 1.5 + Math.random() * 2
    }
    ctx.strokeStyle = rgba(P.hot, 0.42 * Math.min(1, p.life))
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(X(p.px), Y(p.py))
    ctx.lineTo(X(p.x), Y(p.y))
    ctx.stroke()
  }
  const px = 1.35 * Math.cos(0.45 * t)
  const py = 0.85 * Math.sin(0.62 * t)
  const [fx, fy] = F(px, py)
  const curl = 1.2 * Math.cos(1.2 * px) - 1.2 * Math.cos(1.2 * py)
  arrow(X(px), Y(py), X(px + fx * 0.28), Y(py + fy * 0.28), rgba(P.hot, 0.85), 1.4, 5)
  ctx.beginPath()
  ctx.arc(X(px), Y(py), 4, 0, Math.PI * 2)
  ctx.fillStyle = rgba(P.hot, 1)
  ctx.fill()
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText(`div F = 0.60   curl F = ${curl.toFixed(2)}`, W - 250, 22)
}

/* ---------- 幕 3：体系结构 ---------- */
const ARCH_TAGS = ['add', 'ld', 'bne', 'mul', 'sub', 'jal', 'lw', 'xor']
function drawArch(t, P) {
  const stages = ['IF', 'ID', 'EX', 'MEM', 'WB']
  const bw = Math.min(92, (W - 120) / 6)
  const bh = 32
  const gap = 10
  const totalW = stages.length * bw + (stages.length - 1) * gap
  const x0 = (W - totalW) / 2
  const y0 = 34
  ctx.font = font(11)
  stages.forEach((s, i) => {
    const x = x0 + i * (bw + gap)
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.fillRect(x, y0, bw, bh)
    ctx.strokeStyle = rgba(P.faint, 1)
    ctx.strokeRect(x, y0, bw, bh)
    ctx.fillStyle = rgba(P.dim, 1)
    ctx.fillText(s, x + 8, y0 + bh / 2 + 4)
  })
  for (let k = 0; k < 5; k++) {
    const pos = (t * 0.55 + k * 1.3) % 6
    if (pos > 5.3) continue
    const stall = k === 2 && pos > 2.05 && pos < 2.75
    const stage = Math.min(4, Math.floor(pos))
    const frac = stall ? 0 : pos - Math.floor(pos)
    const x = x0 + stage * (bw + gap) + frac * bw
    const y = y0 + bh + 14
    const tag = ARCH_TAGS[(k + Math.floor(t / 6)) % ARCH_TAGS.length]
    ctx.fillStyle = rgba(stall ? P.warn : P.accent, 0.9)
    ctx.fillRect(x, y, 36, 18)
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.font = font(10)
    ctx.fillText(tag, x + 5, y + 13)
    if (stall) {
      ctx.fillStyle = rgba(P.warn, 0.9)
      ctx.font = font(10)
      ctx.fillText('stall', x + 42, y + 13)
    }
  }
  const cy = H - 66
  const names = ['CPU', 'L1', 'L2', 'DRAM']
  const centers = []
  const boxW = Math.min(110, (W - 160) / 5)
  names.forEach((nm, i) => {
    const x = (W - (names.length * boxW + (names.length - 1) * 26)) / 2 + i * (boxW + 26)
    centers.push(x + boxW / 2)
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.fillRect(x, cy, boxW, 30)
    ctx.strokeStyle = rgba(i === 0 ? P.dim : P.faint, 1)
    ctx.strokeRect(x, cy, boxW, 30)
    ctx.fillStyle = rgba(P.dim, 1)
    ctx.font = font(11)
    ctx.fillText(nm, x + 8, cy + 19)
    if (i > 0) {
      ctx.fillStyle = rgba(P.faint, 1)
      ctx.font = font(9)
      ctx.fillText(['hit 75%', 'hit 21%', 'miss 4%'][i - 1], x + boxW - 48, cy + 19)
    }
  })
  const dests = [1, 1, 1, 1, 1, 2, 2, 3]
  dests.forEach((dest, k) => {
    const legs = dest * 2
    const u = (t * 0.34 + k * 0.13) % 1
    const leg = Math.min(legs - 1, Math.floor(u * legs))
    const frac = u * legs - leg
    const from = leg < dest ? leg : legs - leg
    const to = leg < dest ? leg + 1 : legs - leg - 1
    const x = lerp(centers[from], centers[to], frac)
    const flash = leg === dest - 1 && frac > 0.65
    const col = dest === 1 ? P.good : dest === 2 ? P.accent : P.crit
    ctx.beginPath()
    ctx.arc(x, cy + 15, flash ? 5 : 3, 0, Math.PI * 2)
    ctx.fillStyle = rgba(col, flash ? 1 : 0.7)
    ctx.fill()
  })
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText('IPC 3.1   L1 75%  L2 21%  DRAM 4%', W - 320, 22)
}

/* ---------- 幕 4：Transformer ---------- */
const TOKENS = ['极', '客', '栈', '是', '社', '团']
function drawTF(t, P) {
  const n = 6
  const cell = Math.min(26, H / 15)
  const gw = cell * n
  const gx = W * 0.5 - gw / 2
  const gy = H * 0.34
  const qi = Math.floor(t / 1.6) % n
  const w = []
  for (let i = 0; i < n; i++) {
    w.push([])
    let sum = 0
    for (let j = 0; j < n; j++) {
      const s = 1.3 * Math.sin(1.1 * i + 0.9 * j + 0.5 * t) + (i === j ? 0.9 : 0)
      w[i].push(Math.exp(s))
      sum += w[i][j]
    }
    for (let j = 0; j < n; j++) w[i][j] /= sum
  }
  const ty = gy - cell * 2.1
  for (let j = 0; j < n; j++) {
    const x = gx + j * cell
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.fillRect(x, ty, cell * 0.86, cell * 0.86)
    ctx.strokeStyle = rgba(j === qi ? P.accent : P.faint, 1)
    ctx.strokeRect(x, ty, cell * 0.86, cell * 0.86)
    ctx.fillStyle = rgba(j === qi ? P.accent : P.ink, 1)
    ctx.font = font(12)
    ctx.fillText(TOKENS[j], x + cell * 0.28, ty + cell * 0.6)
  }
  const qx = gx + qi * cell + cell * 0.43
  for (let j = 0; j < n; j++) {
    const tx = gx + j * cell + cell * 0.43
    const lw = 0.6 + w[qi][j] * 5
    ctx.strokeStyle = rgba(P.hot, 0.12 + w[qi][j] * 0.65)
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(qx, ty)
    ctx.quadraticCurveTo((qx + tx) / 2, ty - cell * 1.6, tx, ty)
    ctx.stroke()
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = gx + j * cell
      const y = gy + i * cell
      ctx.fillStyle = rgba(P.accent, 0.06 + Math.pow(w[i][j], 1.3) * 0.85)
      ctx.fillRect(x, y, cell * 0.92, cell * 0.92)
      ctx.strokeStyle = rgba(i === qi ? P.accent : P.faint, i === qi ? 0.9 : 0.6)
      ctx.strokeRect(x, y, cell * 0.92, cell * 0.92)
    }
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText(`query = ${TOKENS[qi]}   softmax(QKᵀ/√d)`, W - 280, 22)
}

/* ---------- 幕 5：概率 · 信息 · 离散 ---------- */
function gauss(rnd) {
  const u = Math.max(1e-6, rnd())
  const v = rnd()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
function drawMix(t, P) {
  if (!state.mix) {
    const rnd = mulberry32(11)
    state.mix = { samples: Array.from({ length: 36 }, () => clamp(gauss(rnd), -2.8, 2.8)) }
  }
  const pw = W / 3
  const g = rgba(P.faint, 0.7)
  line(pw, 26, pw, H - 26, g, 1)
  line(pw * 2, 26, pw * 2, H - 26, g, 1)

  const X1 = (x) => pw * 0.5 + x * (pw * 0.24)
  const base = H - 52
  ctx.strokeStyle = rgba(P.accent, 0.9)
  ctx.lineWidth = 1.4
  ctx.beginPath()
  for (let x = -3; x <= 3.001; x += 0.1) {
    const y = base - Math.exp(-x * x / 2) * (H * 0.3)
    x === -3 ? ctx.moveTo(X1(x), y) : ctx.lineTo(X1(x), y)
  }
  ctx.stroke()
  const shown = Math.min(36, Math.floor(t * 5))
  const bins = new Array(14).fill(0)
  for (let k = 0; k < shown; k++) {
    const s = state.mix.samples[k]
    ctx.beginPath()
    ctx.arc(X1(s), base - 4 - (k % 3) * 5, 2, 0, Math.PI * 2)
    ctx.fillStyle = rgba(P.hot, 0.8)
    ctx.fill()
    bins[clamp(Math.floor(((s + 3) / 6) * 14), 0, 13)]++
  }
  bins.forEach((c, i) => {
    if (!c) return
    const bw = (pw * 0.48) / 14
    const x = pw * 0.26 + i * bw
    ctx.fillStyle = rgba(P.warn, 0.5)
    ctx.fillRect(x, base - c * 5, bw * 0.7, c * 5)
  })
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(10)
  ctx.fillText('正态采样', 12, 22)

  const colW = pw * 0.14
  for (let c = 0; c < 6; c++) {
    const x = pw + pw * 0.1 + c * colW
    for (let r = 0; r < 16; r++) {
      const seed = Math.floor(t * 2 + c * 3 + r)
      const h = (seed * 2654435761) % 97
      const bit = h % 2
      const hot = h % 23 === 0
      ctx.fillStyle = hot ? rgba(P.accent, 0.95) : rgba(P.dim, 0.45)
      ctx.font = font(10)
      ctx.fillText(String(bit), x, 40 + r * 17)
    }
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(10)
  ctx.fillText('比特流 · H(p)', pw + 12, 22)

  const gx = pw * 2 + pw / 2
  const gy = H / 2 + 8
  const R = Math.min(pw * 0.3, H * 0.28)
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2
    return { x: gx + R * Math.cos(a), y: gy + R * Math.sin(a) }
  })
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3]]
  const order = [0, 1, 5, 3, 2, 4]
  const step = Math.floor(t / 0.7) % (order.length + 1)
  const visited = new Set(order.slice(0, step))
  edges.forEach(([i, j]) => {
    const flash = step > 0 && (order[step - 1] === i || order[step - 1] === j)
    line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, rgba(flash ? P.accent : P.faint, flash ? 0.9 : 0.8), flash ? 1.4 : 1)
  })
  nodes.forEach((nd, i) => {
    const on = visited.has(i)
    ctx.beginPath()
    ctx.arc(nd.x, nd.y, on ? 6 : 4, 0, Math.PI * 2)
    ctx.fillStyle = rgba(on ? P.accent : P.dim, on ? 0.95 : 0.6)
    ctx.fill()
  })
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(10)
  ctx.fillText('图遍历', pw * 2 + 12, 22)
}

/* ---------- 装饰与总控 ---------- */
function drawChrome(P) {
  const L = 16
  ctx.strokeStyle = rgba(P.dim, 0.85)
  ctx.lineWidth = 1.5
  const corners = [
    [8, 8, 1, 1],
    [W - 8, 8, -1, 1],
    [8, H - 8, 1, -1],
    [W - 8, H - 8, -1, -1]
  ]
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath()
    ctx.moveTo(x, y + dy * L)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * L, y)
    ctx.stroke()
  }
  const sy = (elapsed * 0.11 % 1) * H
  const grd = ctx.createLinearGradient(0, sy - 26, 0, sy + 26)
  grd.addColorStop(0, rgba(P.accent, 0))
  grd.addColorStop(0.5, rgba(P.accent, 0.07))
  grd.addColorStop(1, rgba(P.accent, 0))
  ctx.fillStyle = grd
  ctx.fillRect(0, sy - 26, W, 52)
  ctx.fillStyle = rgba(P.dim, 0.7)
  ctx.font = font(10)
  ctx.fillText('JKZ·VIS // 05', W - 92, H - 14)
}

function drawScene(idx, t, alpha) {
  ctx.globalAlpha = alpha
  const P = palette
  const key = SCENES[idx].key
  if (key === 'la') drawLA(t, P)
  else if (key === 'va') drawVA(t, P)
  else if (key === 'arch') drawArch(t, P)
  else if (key === 'tf') drawTF(t, P)
  else drawMix(t, P)
  ctx.globalAlpha = 1
}

function frame(now) {
  if (!running) return
  const dt = clamp((now - last) / 1000, 0, 0.05)
  last = now
  elapsed += dt
  const total = DUR.reduce((a, b) => a + b, 0)
  const cyc = elapsed % total
  let acc = 0
  let idx = 0
  while (idx < DUR.length - 1 && cyc >= acc + DUR[idx]) {
    acc += DUR[idx]
    idx++
  }
  const t = cyc - acc
  if (idx !== current) {
    current = idx
    sceneIndex.value = idx
    if (SCENES[idx].key === 'va') state.va = null
    if (SCENES[idx].key === 'mix') state.mix = null
  }
  ctx.fillStyle = rgba(palette.bg, 1)
  ctx.fillRect(0, 0, W, H)
  const remain = DUR[idx] - t
  if (remain < FADE) {
    const p = 1 - remain / FADE
    drawScene(idx, t, 1 - p)
    drawScene((idx + 1) % SCENES.length, FADE - remain, p)
  } else {
    drawScene(idx, t, 1)
  }
  drawChrome(palette)
  raf = requestAnimationFrame(frame)
}

function resize() {
  const el = canvasRef.value
  if (!el || !ctx) return
  const wrap = el.parentElement
  const cssW = wrap.clientWidth
  const cssH = Math.round(clamp(cssW * 0.36, 250, 430))
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  W = cssW
  H = cssH
  el.width = Math.round(cssW * dpr)
  el.height = Math.round(cssH * dpr)
  el.style.height = cssH + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function start() {
  if (running) return
  running = true
  last = performance.now()
  raf = requestAnimationFrame(frame)
}
function stop() {
  running = false
  cancelAnimationFrame(raf)
}

onMounted(() => {
  const el = canvasRef.value
  if (!el) return
  const wrap = el.parentElement
  readPalette(wrap)
  ctx = el.getContext('2d')
  resize()
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced.value) {
    elapsed = 2.6
    current = 0
    ctx.fillStyle = rgba(palette.bg, 1)
    ctx.fillRect(0, 0, W, H)
    drawScene(0, elapsed, 1)
    drawChrome(palette)
    return
  }
  ro = new ResizeObserver(() => {
    resize()
  })
  ro.observe(wrap)
  io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) start()
      else stop()
    },
    { threshold: 0.05 }
  )
  io.observe(wrap)
  start()
})

onBeforeUnmount(() => {
  stop()
  io?.disconnect()
  ro?.disconnect()
})
</script>

<template>
  <div class="hv-wrap" data-palette="violet">
    <div class="hv-frame">
      <canvas ref="canvasRef" aria-label="概念动画：线性代数、矢量分析、体系结构、Transformer 与概率信息离散" />
      <div class="hv-hud">
        <span class="hv-label">{{ SCENES[sceneIndex].label }}</span>
        <span class="hv-ticks">
          <i v-for="(s, i) in SCENES" :key="s.key" :class="{ on: i === sceneIndex }" />
        </span>
      </div>
    </div>
    <p v-if="reduced" class="hv-note">已按系统设置（prefers-reduced-motion）暂停动画.</p>
  </div>
</template>

<style scoped>
.hv-wrap {
  max-width: 1152px;
  margin: 10px auto 34px;
  padding: 0 24px;
}
.hv-frame {
  position: relative;
  border: 1px solid var(--hud-faint, #2a2444);
  background: var(--hud-bg, #0b0916);
  overflow: hidden;
}
canvas {
  display: block;
  width: 100%;
}
.hv-hud {
  position: absolute;
  inset: auto 10px 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
  font-family: ui-monospace, 'JetBrains Mono', 'Noto Sans Mono', monospace;
}
.hv-label {
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: var(--hud-dim, #6f6494);
}
.hv-ticks {
  display: inline-flex;
  gap: 5px;
}
.hv-ticks i {
  width: 14px;
  height: 3px;
  background: var(--hud-faint, #2a2444);
  transition: background 0.3s;
}
.hv-ticks i.on {
  background: var(--hud-accent, #8a6fe8);
}
.hv-note {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--hud-dim, #6f6494);
}
</style>
