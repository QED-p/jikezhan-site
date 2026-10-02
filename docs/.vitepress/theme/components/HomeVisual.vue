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
const DUR = [5, 5, 5, 5, 5.5]
const FADE = 0.45
const FLASH = 0.35

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
let flashT = 0
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
const rgba = (c, a) => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`
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

function poly(pts, fill, edge, width = 1) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (edge) {
    ctx.strokeStyle = edge
    ctx.lineWidth = width
    ctx.stroke()
  }
}

/* 等距立方块：正面 + 顶面 + 侧面 */
function box3(x, y, w, h, d, edge, top = 0.22) {
  const P = palette
  ctx.fillStyle = rgba(P.bg, 1)
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = edge
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, w, h)
  poly([[x, y], [x + d, y - d], [x + w + d, y - d], [x + w, y]], rgba(mix(P.bg, edge, top + 0.1), 1), edge, 1)
  poly([[x + w, y], [x + w + d, y - d], [x + w + d, y + h - d], [x + w, y + h]], rgba(mix(P.bg, edge, top * 0.6), 1), edge, 1)
}

function glowDot(x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
  g.addColorStop(0, rgba(col, 0.5))
  g.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r * 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = rgba(col, 1)
  ctx.fill()
}

function view(sMax, hMax) {
  const s = Math.min(W / sMax, H / hMax)
  const ox = W / 2
  const oy = H / 2
  return { s, X: (x) => ox + x * s, Y: (y) => oy - y * s }
}

/* ---------- 幕 1：线性代数（倾斜平面） ---------- */
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
const tilt = (x, y) => [x - 0.38 * y, 0.26 * x + 0.74 * y]
function drawLA(t, P) {
  const v = view(5.8, 4.3)
  const X = v.X
  const Y = v.Y
  ctx.strokeStyle = rgba(P.faint, 0.55)
  ctx.lineWidth = 1
  for (let k = -2; k <= 2; k += 0.5) {
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const [tx, ty] = tilt(k, u)
      u === -2 ? ctx.moveTo(X(tx), Y(ty)) : ctx.lineTo(X(tx), Y(ty))
    }
    ctx.stroke()
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const [tx, ty] = tilt(u, k)
      u === -2 ? ctx.moveTo(X(tx), Y(ty)) : ctx.lineTo(X(tx), Y(ty))
    }
    ctx.stroke()
  }
  const [a, b, c, d] = laMatrix(t)
  const map = (x, y) => {
    const mx = a * x + b * y
    const my = c * x + d * y
    return tilt(mx, my)
  }
  ctx.strokeStyle = rgba(P.accent, 0.62)
  ctx.lineWidth = 1.1
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
  const pulse = 9 + 3.5 * Math.sin(t * 6.5)
  glowDot(X(0), Y(0), 2.6, P.accent)
  const rg = ctx.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), pulse * 2.4)
  rg.addColorStop(0, rgba(P.accent, 0.28))
  rg.addColorStop(1, rgba(P.accent, 0))
  ctx.fillStyle = rg
  ctx.beginPath()
  ctx.arc(X(0), Y(0), pulse * 2.4, 0, Math.PI * 2)
  ctx.fill()
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
    const dir = (vx, vy) => {
      const [tx, ty] = tilt(vx, vy)
      const n = Math.hypot(tx, ty) || 1
      return [tx / n, ty / n]
    }
    const [e1x, e1y] = dir(...ev(l1))
    line(X(-2.7 * e1x), Y(-2.7 * e1y), X(2.7 * e1x), Y(2.7 * e1y), rgba(P.accent, 0.85), 1.4, [6, 5])
    ctx.fillStyle = rgba(P.accent, 0.95)
    ctx.fillText(`λ₁ ${l1.toFixed(2)}`, X(2.7 * e1x) + 6, Y(2.7 * e1y) - 6)
    if (Math.abs(l1 - l2) > 1e-6) {
      const [e2x, e2y] = dir(...ev(l2))
      line(X(-2.7 * e2x), Y(-2.7 * e2y), X(2.7 * e2x), Y(2.7 * e2y), rgba(P.warn, 0.8), 1.4, [6, 5])
      ctx.fillStyle = rgba(P.warn, 0.92)
      ctx.fillText(`λ₂ ${l2.toFixed(2)}`, X(2.7 * e2x) + 6, Y(2.7 * e2y) + 14)
    }
  } else {
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = rgba(P.warn, 0.6)
    ctx.beginPath()
    ctx.arc(X(0), Y(0), 0.6 * v.s, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  const vx = 1
  const vy = 0.34
  const [pvx, pvy] = tilt(vx, vy)
  arrow(X(0), Y(0), X(pvx), Y(pvy), rgba(P.hot, 0.95), 1.8, 6)
  const [mx, my] = map(vx, vy)
  ctx.setLineDash([5, 4])
  arrow(X(0), Y(0), X(mx), Y(my), rgba(P.hot, 0.55), 1.3, 5)
  ctx.setLineDash([])
  glowDot(X(mx), Y(my), 2.4, P.hot)
  ctx.strokeStyle = rgba(P.faint, 1)
  ctx.strokeRect(30, 16, 118, 44)
  ctx.font = font(11)
  const mvals = [[a, b], [c, d]]
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = rgba(i === 0 && j === 0 ? P.hot : P.ink, 0.92)
      ctx.fillText(mvals[i][j].toFixed(2), 42 + j * 56, 32 + i * 18)
    }
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText(`det ${det.toFixed(2)}   tr ${tr.toFixed(2)}   A·v → Av`, W - 250, 22)
}

/* ---------- 幕 2：矢量分析（深度雾） ---------- */
function drawVA(t, P) {
  const v = view(5.8, 3.4)
  const X = v.X
  const Y = v.Y
  const F = (x, y) => [Math.sin(1.2 * y) + 0.3 * x, Math.sin(1.2 * x) + 0.3 * y]
  const fog = (py) => 0.3 + 0.7 * (py / H)
  if (!state.va) {
    const rnd = mulberry32(7)
    const ps = Array.from({ length: 80 }, () => {
      const x = rnd() * 4.6 - 2.3
      const y = rnd() * 2.6 - 1.3
      return { x, y, px: x, py: y, life: 1 + rnd() * 2 }
    })
    const seeds = [[-2.2, -1.2], [-1.2, 1.2], [0, 0], [1.4, -0.9], [2.1, 0.8], [-0.6, -1.4], [0.6, 1.3]]
    const lines = []
    for (const [sx0, sy0] of seeds) {
      let x = sx0
      let y = sy0
      const pts = [[x, y]]
      for (let k = 0; k < 90; k++) {
        const [fx, fy] = F(x, y)
        const n = Math.hypot(fx, fy) || 1
        x += (fx / n) * 0.06
        y += (fy / n) * 0.06
        pts.push([x, y])
      }
      lines.push(pts)
    }
    state.va = { ps, lines }
  }
  for (const pts of state.va.lines) {
    ctx.beginPath()
    pts.forEach(([x, y], i) => {
      const px = X(x)
      const py = Y(y)
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    })
    ctx.strokeStyle = rgba(P.accent, 0.26)
    ctx.lineWidth = 1
    ctx.stroke()
  }
  for (let i = -2.4; i <= 2.41; i += 0.48) {
    for (let j = -1.44; j <= 1.45; j += 0.48) {
      const [fx, fy] = F(i, j)
      const m = Math.hypot(fx, fy) || 1
      const k = (Math.min(1.4, m) / m) * 0.21
      const col = mix(P.accent, P.warn, Math.min(1, m / 1.6))
      arrow(X(i), Y(j), X(i + fx * k), Y(j + fy * k), rgba(col, 0.62 * fog(Y(j))), 1, 3.8)
    }
  }
  const dt = 1 / 60
  for (const p of state.va.ps) {
    const [fx, fy] = F(p.x, p.y)
    p.px = p.x
    p.py = p.y
    p.x += fx * dt * 1.7
    p.y += fy * dt * 1.7
    p.life -= dt
    if (p.life <= 0 || Math.abs(p.x) > 2.5 || Math.abs(p.y) > 1.5) {
      p.x = Math.random() * 4.6 - 2.3
      p.y = Math.random() * 2.6 - 1.3
      p.px = p.x
      p.py = p.y
      p.life = 1.2 + Math.random() * 1.6
    }
    ctx.strokeStyle = rgba(P.hot, 0.5 * Math.min(1, p.life) * fog(Y(p.y)))
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(X(p.px), Y(p.py))
    ctx.lineTo(X(p.x), Y(p.y))
    ctx.stroke()
  }
  const px = 1.35 * Math.cos(0.55 * t)
  const py = 0.85 * Math.sin(0.75 * t)
  const [fx, fy] = F(px, py)
  const curl = 1.2 * Math.cos(1.2 * px) - 1.2 * Math.cos(1.2 * py)
  const ring = 7 + ((t * 46) % 30)
  ctx.beginPath()
  ctx.arc(X(px), Y(py), ring, 0, Math.PI * 2)
  ctx.strokeStyle = rgba(P.hot, Math.max(0, 0.5 - ring / 64))
  ctx.lineWidth = 1.2
  ctx.stroke()
  arrow(X(px), Y(py), X(px + fx * 0.28), Y(py + fy * 0.28), rgba(P.hot, 0.9), 1.5, 5)
  glowDot(X(px), Y(py), 3.2, P.hot)
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText(`div F = 0.60   curl F = ${curl.toFixed(2)}`, W - 250, 22)
}

/* ---------- 幕 3：体系结构（立体块） ---------- */
const ARCH_TAGS = ['add', 'ld', 'bne', 'mul', 'sub', 'jal', 'lw', 'xor']
function drawArch(t, P) {
  const stages = ['IF', 'ID', 'EX', 'MEM', 'WB']
  const bw = Math.min(92, (W - 120) / 6)
  const bh = 32
  const gap = 10
  const totalW = stages.length * bw + (stages.length - 1) * gap
  const x0 = (W - totalW) / 2
  const y0 = 46
  ctx.font = font(11)
  stages.forEach((s, i) => {
    const x = x0 + i * (bw + gap)
    box3(x, y0, bw, bh, 7, rgba(P.faint, 1))
    ctx.fillStyle = rgba(P.dim, 1)
    ctx.fillText(s, x + 8, y0 + bh / 2 + 4)
  })
  for (let k = 0; k < 5; k++) {
    const pos = (t * 0.85 + k * 1.3) % 6
    if (pos > 5.3) continue
    const stall = k === 2 && pos > 2.05 && pos < 2.5
    const stage = Math.min(4, Math.floor(pos))
    const frac = stall ? 0 : pos - Math.floor(pos)
    const x = x0 + stage * (bw + gap) + frac * bw
    const y = y0 + bh + 18
    const tag = ARCH_TAGS[(k + Math.floor(t / 5)) % ARCH_TAGS.length]
    if (!stall) {
      ctx.strokeStyle = rgba(P.accent, 0.85)
      ctx.lineWidth = 1.4
      ctx.strokeRect(x0 + stage * (bw + gap), y0, bw, bh)
    }
    box3(x, y, 36, 18, 4, rgba(stall ? P.warn : P.accent, 0.95), 0.3)
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.font = font(10)
    ctx.fillText(tag, x + 5, y + 13)
    if (stall) {
      ctx.fillStyle = rgba(P.warn, 0.95)
      ctx.font = font(10)
      ctx.fillText('stall', x + 46, y + 13)
    }
  }
  const cy = H - 70
  const names = ['CPU', 'L1', 'L2', 'DRAM']
  const centers = []
  const boxW = Math.min(110, (W - 160) / 5)
  names.forEach((nm, i) => {
    const x = (W - (names.length * boxW + (names.length - 1) * 26)) / 2 + i * (boxW + 26)
    centers.push(x + boxW / 2)
    box3(x, cy, boxW, 30, 6, rgba(i === 0 ? P.dim : P.faint, 1))
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
    const u = (t * 0.5 + k * 0.13) % 1
    const leg = Math.min(legs - 1, Math.floor(u * legs))
    const frac = u * legs - leg
    const from = leg < dest ? leg : legs - leg
    const to = leg < dest ? leg + 1 : legs - leg - 1
    const x = lerp(centers[from], centers[to], frac)
    const flash = leg === dest - 1 && frac > 0.65
    const col = dest === 1 ? P.good : dest === 2 ? P.accent : P.crit
    if (flash) {
      ctx.beginPath()
      ctx.arc(x, cy + 15, 10, 0, Math.PI * 2)
      ctx.strokeStyle = rgba(col, 0.75)
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(x, cy + 15, flash ? 5 : 3, 0, Math.PI * 2)
    ctx.fillStyle = rgba(col, flash ? 1 : 0.75)
    ctx.fill()
  })
  const ipc = (3.0 + 0.25 * Math.sin(t * 4.2)).toFixed(2)
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText(`IPC ${ipc}   L1 75%  L2 21%  DRAM 4%`, W - 330, 22)
}

/* ---------- 幕 4：Transformer（3D 注意力柱） ---------- */
const TOKENS = ['极', '客', '栈', '是', '社', '团']
function drawTF(t, P) {
  const n = 6
  const cell = Math.min(30, H / 13)
  const gw = cell * n
  const gx = (W - (gw + 34 + cell * 2.8)) / 2
  const gy = H * 0.44
  const qi = Math.floor(t / 1.05) % n
  const w = []
  for (let i = 0; i < n; i++) {
    w.push([])
    let sum = 0
    for (let j = 0; j < n; j++) {
      const s = 1.3 * Math.sin(1.1 * i + 0.9 * j + 0.9 * t) + (i === j ? 0.9 : 0)
      w[i].push(Math.exp(s))
      sum += w[i][j]
    }
    for (let j = 0; j < n; j++) w[i][j] /= sum
  }
  const ty = gy - cell * 2.3
  for (let j = 0; j < n; j++) {
    const x = gx + j * cell
    box3(x, ty, cell * 0.86, cell * 0.86, 5, rgba(j === qi ? P.accent : P.faint, 1), j === qi ? 0.35 : 0.18)
    ctx.fillStyle = rgba(j === qi ? P.accent : P.ink, 1)
    ctx.font = font(12)
    ctx.fillText(TOKENS[j], x + cell * 0.28, ty + cell * 0.62)
  }
  const qx = gx + qi * cell + cell * 0.43
  for (let j = 0; j < n; j++) {
    const tx = gx + j * cell + cell * 0.43
    const lw = 0.6 + w[qi][j] * 5.5
    ctx.strokeStyle = rgba(P.hot, 0.14 + w[qi][j] * 0.72)
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(qx, ty)
    ctx.quadraticCurveTo((qx + tx) / 2, ty - cell * 1.7, tx, ty)
    ctx.stroke()
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = gx + j * cell
      const y = gy + i * cell
      const hgt = Math.pow(w[i][j], 1.15) * cell * 3.1
      const d = cell * 0.34
      const col = i === qi ? P.accent : P.dim
      poly([[x, y], [x + d, y - d], [x + cell * 0.8 + d, y - d], [x + cell * 0.8, y]], rgba(mix(P.bg, col, 0.35), 1), rgba(col, 0.5), 1)
      if (hgt > 1.5) {
        poly(
          [[x, y - hgt], [x + d, y - hgt - d], [x + cell * 0.8 + d, y - hgt - d], [x + cell * 0.8, y - hgt]],
          rgba(mix(P.bg, col, 0.55), 1),
          rgba(col, 0.7),
          1
        )
        ctx.fillStyle = rgba(mix(P.bg, col, 0.3), 1)
        ctx.fillRect(x, y - hgt, cell * 0.8, hgt)
        ctx.strokeStyle = rgba(col, 0.55)
        ctx.strokeRect(x, y - hgt, cell * 0.8, hgt)
        poly(
          [[x + cell * 0.8, y - hgt], [x + cell * 0.8 + d, y - hgt - d], [x + cell * 0.8 + d, y - d], [x + cell * 0.8, y]],
          rgba(mix(P.bg, col, 0.2), 1),
          rgba(col, 0.45),
          1
        )
      } else {
        ctx.fillStyle = rgba(col, 0.2)
        ctx.fillRect(x, y, cell * 0.8, 1)
      }
    }
  }
  const barX = gx + gw + 34
  for (let j = 0; j < n; j++) {
    const y = gy + j * cell
    const bw2 = w[qi][j] * cell * 2.8
    ctx.fillStyle = rgba(P.accent, 0.7)
    ctx.fillRect(barX, y + cell * 0.18, bw2, cell * 0.55)
    ctx.strokeStyle = rgba(P.faint, 1)
    ctx.strokeRect(barX, y + cell * 0.18, cell * 2.8, cell * 0.55)
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
  const grd = ctx.createLinearGradient(0, base - H * 0.3, 0, base)
  grd.addColorStop(0, rgba(P.accent, 0.12))
  grd.addColorStop(1, rgba(P.accent, 0))
  ctx.beginPath()
  ctx.moveTo(X1(-3), base)
  for (let x = -3; x <= 3.001; x += 0.1) ctx.lineTo(X1(x), base - Math.exp(-x * x / 2) * (H * 0.3))
  ctx.lineTo(X1(3), base)
  ctx.closePath()
  ctx.fillStyle = grd
  ctx.fill()
  ctx.strokeStyle = rgba(P.accent, 0.95)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let x = -3; x <= 3.001; x += 0.1) {
    const y = base - Math.exp(-x * x / 2) * (H * 0.3)
    x === -3 ? ctx.moveTo(X1(x), y) : ctx.lineTo(X1(x), y)
  }
  ctx.stroke()
  const shown = Math.min(36, Math.floor(t * 7))
  const bins = new Array(14).fill(0)
  for (let k = 0; k < shown; k++) {
    const s = state.mix.samples[k]
    ctx.beginPath()
    ctx.arc(X1(s), base - 4 - (k % 3) * 5, 2.2, 0, Math.PI * 2)
    ctx.fillStyle = rgba(P.hot, 0.85)
    ctx.fill()
    bins[clamp(Math.floor(((s + 3) / 6) * 14), 0, 13)]++
  }
  bins.forEach((c, i) => {
    if (!c) return
    const bw = (pw * 0.48) / 14
    const x = pw * 0.26 + i * bw
    box3(x, base - c * 5, bw * 0.7, c * 5, 3, rgba(P.warn, 0.7), 0.25)
  })
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(10)
  ctx.fillText('正态采样', 12, 22)

  const colW = pw * 0.14
  for (let c = 0; c < 6; c++) {
    const x = pw + pw * 0.1 + c * colW
    for (let r = 0; r < 16; r++) {
      const seed = Math.floor(t * 3 + c * 3 + r)
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
  const step = Math.floor(t / 0.55) % (order.length + 1)
  const visited = new Set(order.slice(0, step))
  edges.forEach(([i, j]) => {
    const flash = step > 0 && (order[step - 1] === i || order[step - 1] === j)
    line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, rgba(flash ? P.accent : P.faint, flash ? 0.95 : 0.8), flash ? 1.6 : 1)
  })
  nodes.forEach((nd, i) => {
    const on = visited.has(i)
    if (on) glowDot(nd.x, nd.y, 4.5, P.accent)
    else {
      ctx.beginPath()
      ctx.arc(nd.x, nd.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = rgba(P.dim, 0.6)
      ctx.fill()
    }
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
  const sy = ((elapsed * 0.16) % 1) * H
  const grd = ctx.createLinearGradient(0, sy - 26, 0, sy + 26)
  grd.addColorStop(0, rgba(P.accent, 0))
  grd.addColorStop(0.5, rgba(P.accent, 0.09))
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
    flashT = FLASH
    if (SCENES[idx].key === 'va') state.va = null
    if (SCENES[idx].key === 'mix') state.mix = null
  }
  const P = palette
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, rgba(mix(P.bg, P.accent, 0.07), 1))
  bgGrad.addColorStop(1, rgba(P.bg, 1))
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  const punch = flashT > 0 ? 1 + 0.045 * (flashT / FLASH) : 1
  ctx.save()
  if (punch !== 1) {
    ctx.translate(W / 2, H / 2)
    ctx.scale(punch, punch)
    ctx.translate(-W / 2, -H / 2)
  }
  const remain = DUR[idx] - t
  if (remain < FADE) {
    const p = 1 - remain / FADE
    drawScene(idx, t, 1 - p)
    drawScene((idx + 1) % SCENES.length, FADE - remain, p)
  } else {
    drawScene(idx, t, 1)
  }
  ctx.restore()

  const vg = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.25, W / 2, H * 0.5, Math.max(W, H) * 0.72)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, rgba(P.bg, 0.82))
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  if (flashT > 0) {
    const p = 1 - flashT / FLASH
    const x = p * W
    const sweep = ctx.createLinearGradient(x - 110, 0, x + 110, 0)
    sweep.addColorStop(0, rgba(P.accent, 0))
    sweep.addColorStop(0.5, rgba(P.hot, 0.25))
    sweep.addColorStop(1, rgba(P.accent, 0))
    ctx.fillStyle = sweep
    ctx.fillRect(x - 110, 0, 220, H)
    ctx.fillStyle = rgba(P.accent, 0.1 * (1 - p))
    ctx.fillRect(0, 0, W, H)
    flashT = Math.max(0, flashT - dt)
  }
  drawChrome(P)
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
    elapsed = 2.2
    current = 0
    const P = palette
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.fillRect(0, 0, W, H)
    drawScene(0, elapsed, 1)
    drawChrome(P)
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
