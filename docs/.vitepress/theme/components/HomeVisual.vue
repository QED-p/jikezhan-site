<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref(null)
const sceneIndex = ref(0)
const reduced = ref(false)

const SCENES = [
  { key: 'la', label: '线性代数 · 特征方向（三维）' },
  { key: 'gs', label: '矩阵分析 · 正交化（三维）' },
  { key: 'va', label: '矢量分析 · 梯度、散度与旋度' },
  { key: 'gd', label: '梯度下降 · 三维损失曲面' },
  { key: 'cnn', label: 'CNN · 卷积核' },
  { key: 'tf', label: 'Transformer · 全链路' },
  { key: 'arch', label: '体系结构 · 哈佛架构与存储层次' },
  { key: 'mix', label: '概率 · 信息 · 离散' }
]
const DUR = [4.6, 4.2, 4.6, 4.2, 4.4, 4.2, 5.2, 4.2]
const FADE = 0.4
const FLASH = 0.32

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

function glowDot(x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
  g.addColorStop(0, rgba(col, 0.45))
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

/* ---------- 3D 工具（幕 1） ---------- */
function sub3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z } }
function dot3(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z }
function cross3(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x } }
function norm3(a) {
  const n = Math.hypot(a.x, a.y, a.z) || 1
  return { x: a.x / n, y: a.y / n, z: a.z / n }
}
function camera3(theta, phi, d = 8.4, f = 560) {
  const cp = Math.cos(phi)
  const eye = { x: d * cp * Math.cos(theta), y: d * cp * Math.sin(theta), z: d * Math.sin(phi) }
  const fwd = norm3({ x: -eye.x, y: -eye.y, z: -eye.z })
  const right = norm3(cross3(fwd, { x: 0, y: 0, z: 1 }))
  const up = cross3(right, fwd)
  return { eye, fwd, right, up, f, cx: W / 2, cy: H / 2 + 8 }
}
function project3(p, c) {
  const v = sub3(p, c.eye)
  const zc = dot3(v, c.fwd)
  if (zc < 0.2) return null
  return { x: c.cx + (c.f * dot3(v, c.right)) / zc, y: c.cy - (c.f * dot3(v, c.up)) / zc, z: zc }
}

/* ---------- 幕 1：线性代数（真三维平面） ---------- */
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
  const c = camera3(-0.7 + 0.5 * Math.sin(t * 0.55), 0.56 + 0.07 * Math.sin(t * 0.4))
  const proj = (x, y, z = 0) => project3({ x, y, z }, c)
  ctx.lineWidth = 1
  ctx.strokeStyle = rgba(P.faint, 0.6)
  for (let k = -2; k <= 2; k += 0.5) {
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const p = proj(k, u)
      if (!p) continue
      u === -2 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const p = proj(u, k)
      if (!p) continue
      u === -2 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  const [a, b, cc, d] = laMatrix(t)
  const map = (x, y) => [a * x + b * y, cc * x + d * y]
  ctx.strokeStyle = rgba(P.accent, 0.62)
  ctx.lineWidth = 1.1
  for (let k = -2; k <= 2; k += 0.5) {
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const [mx, my] = map(k, u)
      const p = proj(mx, my)
      if (!p) continue
      u === -2 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const [mx, my] = map(u, k)
      const p = proj(mx, my)
      if (!p) continue
      u === -2 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  const o = proj(0, 0)
  if (o) {
    const pulse = 8 + 3 * Math.sin(t * 6.5)
    const rg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, pulse * 2.4)
    rg.addColorStop(0, rgba(P.accent, 0.3))
    rg.addColorStop(1, rgba(P.accent, 0))
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.arc(o.x, o.y, pulse * 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  const tr = a + d
  const det = a * d - b * cc
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
    const e1a = proj(-2.7 * v1x, -2.7 * v1y)
    const e1b = proj(2.7 * v1x, 2.7 * v1y)
    if (e1a && e1b) {
      line(e1a.x, e1a.y, e1b.x, e1b.y, rgba(P.accent, 0.85), 1.4, [6, 5])
      ctx.fillStyle = rgba(P.accent, 0.95)
      ctx.fillText(`λ₁ ${l1.toFixed(2)}`, e1b.x + 6, e1b.y - 6)
    }
    if (Math.abs(l1 - l2) > 1e-6) {
      const [v2x, v2y] = ev(l2)
      const e2a = proj(-2.7 * v2x, -2.7 * v2y)
      const e2b = proj(2.7 * v2x, 2.7 * v2y)
      if (e2a && e2b) {
        line(e2a.x, e2a.y, e2b.x, e2b.y, rgba(P.warn, 0.8), 1.4, [6, 5])
        ctx.fillStyle = rgba(P.warn, 0.92)
        ctx.fillText(`λ₂ ${l2.toFixed(2)}`, e2b.x + 6, e2b.y + 14)
      }
    }
  }
  const vx = 1
  const vy = 0.34
  const pv = proj(vx, vy)
  if (o && pv) arrow(o.x, o.y, pv.x, pv.y, rgba(P.hot, 0.95), 1.8, 6)
  const [mx, my] = map(vx, vy)
  const pm = proj(mx, my)
  if (o && pm) {
    ctx.setLineDash([5, 4])
    arrow(o.x, o.y, pm.x, pm.y, rgba(P.hot, 0.55), 1.3, 5)
    ctx.setLineDash([])
    glowDot(pm.x, pm.y, 2.4, P.hot)
  }
  ctx.strokeStyle = rgba(P.faint, 1)
  ctx.strokeRect(30, 16, 118, 44)
  const mvals = [[a, b], [cc, d]]
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = rgba(i === 0 && j === 0 ? P.hot : P.ink, 0.92)
      ctx.fillText(mvals[i][j].toFixed(2), 42 + j * 56, 32 + i * 18)
    }
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.fillText(`det ${det.toFixed(2)}   tr ${tr.toFixed(2)}   A·v → Av`, W - 250, 22)
}

/* ---------- 幕 2：矩阵分析（正交化，真三维） ---------- */
function drawGS(t, P) {
  const cam = camera3(-0.55 + 0.4 * Math.sin(t * 0.5), 0.62 + 0.06 * Math.sin(t * 0.4), 6.1, 560)
  const pr = (p) => project3({ x: p[0], y: p[1], z: p[2] }, cam)
  const seg = (p, q, color, width = 1.4, dash = null) => {
    const a = pr(p)
    const b = pr(q)
    if (!a || !b) return
    line(a.x, a.y, b.x, b.y, color, width, dash)
  }
  const arr = (p, q, color, width = 1.6, head = 6) => {
    const a = pr(p)
    const b = pr(q)
    if (!a || !b) return
    arrow(a.x, a.y, b.x, b.y, color, width, head)
  }
  const lab = (p, text, color, dx = 6, dy = -6) => {
    const a = pr(p)
    if (!a) return
    ctx.fillStyle = color
    ctx.font = font(11)
    ctx.fillText(text, a.x + dx, a.y + dy)
  }
  ctx.lineWidth = 1
  ctx.strokeStyle = rgba(P.faint, 0.55)
  for (let k = -2; k <= 2; k += 0.5) {
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const p = pr([k, u, 0])
      if (!p) continue
      u === -2 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    ctx.beginPath()
    for (let u = -2; u <= 2.001; u += 0.25) {
      const p = pr([u, k, 0])
      if (!p) continue
      u === -2 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  const O = [0, 0, 0]
  const dt3 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
  const n3 = (v) => Math.hypot(v[0], v[1], v[2])
  const a1 = [1.6, 0.28, 0.62]
  const a2 = [0.42, 1.45, -0.28]
  const n1 = n3(a1)
  const e1 = a1.map((x) => x / n1)
  const c2 = dt3(a2, e1)
  const b2 = a2.map((x, i) => x - c2 * e1[i])
  const n2 = n3(b2)
  const e2 = b2.map((x) => x / n2)
  const ph = t / DUR[1]
  const p1 = smooth(clamp((ph - 0.06) / 0.22, 0, 1))
  const p2 = smooth(clamp((ph - 0.3) / 0.3, 0, 1))
  const p3 = smooth(clamp((ph - 0.62) / 0.24, 0, 1))
  const o = pr(O)
  if (o) {
    const pulse = 7 + 2.5 * Math.sin(t * 6)
    const rg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, pulse * 2.4)
    rg.addColorStop(0, rgba(P.accent, 0.25))
    rg.addColorStop(1, rgba(P.accent, 0))
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.arc(o.x, o.y, pulse * 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  const mid = (v, k) => v.map((x) => x * k)
  arr(O, a1, rgba(P.ink, 0.65), 1.7, 5)
  lab(mid(a1, 0.6), 'a₁', rgba(P.ink, 0.85), -26, 4)
  arr(O, a2, rgba(P.ink, 0.65), 1.7, 5)
  lab(a2, 'a₂', rgba(P.ink, 0.85), 12, -8)
  if (p1 > 0.01) {
    ctx.globalAlpha = p1
    arr(O, e1, rgba(P.accent, 0.95), 2, 6)
    const g1 = pr(e1)
    if (g1) glowDot(g1.x, g1.y, 2.2, P.accent)
    lab(e1, 'e₁', rgba(P.accent, 1), 9, 18)
    ctx.globalAlpha = 1
  }
  if (p2 > 0.01) {
    ctx.globalAlpha = p2
    const foot = e1.map((x) => x * c2)
    seg(O, foot, rgba(P.warn, 0.7), 1.4, [5, 4])
    seg(a2, foot, rgba(P.warn, 0.5), 1, [3, 3])
    arr(O, b2, rgba(P.warn, 0.9), 1.8, 5)
    lab(mid(b2, 0.55), 'b₂ = a₂ − 投影', rgba(P.warn, 0.95), 14, 20)
    const fp = pr(foot)
    if (fp) {
      ctx.beginPath()
      ctx.arc(fp.x, fp.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = rgba(P.warn, 0.8)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  if (p3 > 0.01) {
    ctx.globalAlpha = p3
    arr(O, e2, rgba(P.good, 0.95), 2, 6)
    const g2 = pr(e2)
    if (g2) glowDot(g2.x, g2.y, 2.2, P.good)
    lab(e2, 'e₂', rgba(P.good, 1), 8, -8)
    const r = 0.24
    const r1 = e1.map((x) => x * r)
    const r2 = e1.map((x, i) => (x + e2[i]) * r)
    const r3 = e2.map((x) => x * r)
    seg(r1, r2, rgba(P.hot, 0.8), 1.2)
    seg(r3, r2, rgba(P.hot, 0.8), 1.2)
    ctx.globalAlpha = 1
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText(`r₁₁ ${n1.toFixed(2)}   r₂₂ ${n2.toFixed(2)}   A = QR`, W - 260, 22)
}

/* ---------- 幕 3：矢量分析（场 + 梯度 inset） ---------- */
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
  glowDot(X(px), Y(py), 3, P.hot)
  const ix = 26
  const iy = 30
  const iw = 152
  const ih = 110
  ctx.strokeStyle = rgba(P.faint, 1)
  ctx.strokeRect(ix, iy, iw, ih)
  const cx0 = ix + iw / 2
  const cy0 = iy + ih / 2 + 6
  for (let r = 1; r <= 3; r++) {
    ctx.beginPath()
    ctx.ellipse(cx0, cy0, r * 18, r * 12, 0, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(P.dim, 0.35)
    ctx.lineWidth = 1
    ctx.stroke()
  }
  const gx0 = 20 * Math.cos(0.9 * t)
  const gy0 = 11 * Math.sin(1.2 * t)
  arrow(cx0 + gx0, cy0 + gy0, cx0 + gx0 * 1.55, cy0 + gy0 * 1.55, rgba(P.hot, 0.9), 1.4, 5)
  glowDot(cx0 + gx0, cy0 + gy0, 2, P.hot)
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(10)
  ctx.fillText('梯度 ∇f', ix + 8, iy + 16)
  ctx.fillText(`div F = 0.60   curl F = ${curl.toFixed(2)}`, W - 250, 22)
}

/* ---------- 幕 4：梯度下降（三维损失曲面） ---------- */
function buildManifold() {
  const f = (x, y) => 0.35 * (x * x + y * y) + 0.55 * Math.sin(1.8 * x + 0.4) * Math.cos(1.6 * y - 0.3)
  const grad = (x, y) => [
    0.7 * x + 0.99 * Math.cos(1.8 * x + 0.4) * Math.cos(1.6 * y - 0.3),
    0.7 * y - 0.88 * Math.sin(1.8 * x + 0.4) * Math.sin(1.6 * y - 0.3)
  ]
  const path = [[1.75, 1.55]]
  let px = 1.75
  let py = 1.55
  for (let k = 0; k < 46; k++) {
    const [gx, gy] = grad(px, py)
    px = clamp(px - 0.1 * gx, -2.15, 2.15)
    py = clamp(py - 0.1 * gy, -1.5, 1.5)
    path.push([px, py])
  }
  return { f, grad, path }
}
function drawGD(t, P) {
  if (!state.gd) state.gd = buildManifold()
  const mf = state.gd
  const c = camera3(-0.6 + 0.35 * Math.sin(t * 0.5), 0.66 + 0.06 * Math.sin(t * 0.4))
  const R = 2.2
  const N = 24
  let zmax = 0.1
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const z = mf.f(-R + (i / N) * 2 * R, -R + (j / N) * 2 * R)
      if (z > zmax) zmax = z
    }
  }
  const zs = 1.9 / zmax
  const zAt = (x, y) => mf.f(x, y) * zs
  const proj = (x, y, z) => project3({ x, y, z }, c)
  const quads = []
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const xa = -R + (i / N) * 2 * R
      const xb = -R + ((i + 1) / N) * 2 * R
      const ya = -R + (j / N) * 2 * R
      const yb = -R + ((j + 1) / N) * 2 * R
      const p1 = proj(xa, ya, zAt(xa, ya))
      const p2 = proj(xb, ya, zAt(xb, ya))
      const p3 = proj(xb, yb, zAt(xb, yb))
      const p4 = proj(xa, yb, zAt(xa, yb))
      if (!p1 || !p2 || !p3 || !p4) continue
      const zm = zAt((xa + xb) / 2, (ya + yb) / 2)
      quads.push({ pts: [p1, p2, p3, p4], depth: (p1.z + p2.z + p3.z + p4.z) / 4, zm })
    }
  }
  quads.sort((a, b) => b.depth - a.depth)
  for (const q of quads) {
    const ht = clamp(q.zm / 1.9, 0, 1)
    ctx.beginPath()
    ctx.moveTo(q.pts[0].x, q.pts[0].y)
    for (let k = 1; k < 4; k++) ctx.lineTo(q.pts[k].x, q.pts[k].y)
    ctx.closePath()
    ctx.fillStyle = rgba(mix(P.accent, P.warn, ht), 0.1 + ht * 0.3)
    ctx.fill()
    ctx.strokeStyle = rgba(P.bg, 0.5)
    ctx.lineWidth = 0.7
    ctx.stroke()
  }
  const stepT = 0.09
  const shown = Math.min(mf.path.length - 1, Math.floor(t / stepT))
  const frac = clamp(t / stepT - shown, 0, 1)
  const upto = mf.path.slice(0, shown + 1)
  ctx.beginPath()
  upto.forEach(([x, y], i) => {
    const p = proj(x, y, zAt(x, y) + 0.03)
    if (!p) return
    i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)
  })
  ctx.strokeStyle = rgba(P.hot, 0.95)
  ctx.lineWidth = 1.8
  ctx.stroke()
  for (const [x, y] of upto) {
    const p = proj(x, y, zAt(x, y) + 0.03)
    if (!p) continue
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = rgba(P.hot, 0.55)
    ctx.fill()
  }
  const cur =
    shown < mf.path.length - 1
      ? [lerp(mf.path[shown][0], mf.path[shown + 1][0], frac), lerp(mf.path[shown][1], mf.path[shown + 1][1], frac)]
      : mf.path[mf.path.length - 1]
  const [gx, gy] = mf.grad(cur[0], cur[1])
  const gn = Math.hypot(gx, gy) || 1
  const k = 0.6
  const dx = -((gx / gn) * k)
  const dy = -((gy / gn) * k)
  const pC = proj(cur[0], cur[1], zAt(cur[0], cur[1]) + 0.04)
  const pD = proj(cur[0] + dx, cur[1] + dy, zAt(cur[0] + dx, cur[1] + dy) + 0.04)
  if (pC && pD) {
    arrow(pC.x, pC.y, pD.x, pD.y, rgba(P.good, 0.95), 1.7, 6)
    ctx.fillStyle = rgba(P.good, 0.95)
    ctx.font = font(10)
    ctx.fillText('−∇f', pD.x + 6, pD.y - 6)
  }
  if (pC) glowDot(pC.x, pC.y, 3.6, P.hot)
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText(
    `lr 0.10   step ${shown}/46   f = ${mf.f(cur[0], cur[1]).toFixed(2)}   |∇f| = ${gn.toFixed(2)}`,
    W - 430,
    22
  )
}
/* ---------- 幕 5：CNN（扁平 HUD） ---------- */
function drawCNN(t, P) {
  const n = 7
  const cell = Math.min(20, H / 17)
  const val = (j) => (j === 3 ? 1 : j === 2 || j === 4 ? 0.5 : 0.15)
  const ix = W * 0.1
  const iy = (H - n * cell) / 2 + 8
  ctx.font = font(10)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = ix + j * cell
      const y = iy + i * cell
      ctx.fillStyle = rgba(P.accent, 0.08 + val(j) * 0.6)
      ctx.fillRect(x, y, cell - 1, cell - 1)
      ctx.strokeStyle = rgba(P.faint, 1)
      ctx.strokeRect(x, y, cell - 1, cell - 1)
    }
  }
  const s = Math.floor(t / 0.32) % 25
  const kr = Math.floor(s / 5)
  const kc = s % 5
  ctx.strokeStyle = rgba(P.hot, 0.95)
  ctx.lineWidth = 1.6
  ctx.strokeRect(ix + kc * cell - 1, iy + kr * cell - 1, cell * 3 + 1, cell * 3 + 1)
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.fillText('输入 7×7', ix, iy - 10)
  const kx = ix + n * cell + 34
  ctx.fillText('卷积核 3×3', kx, iy - 10)
  const kk = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = kx + j * cell * 1.2
      const y = iy + i * cell * 1.2
      const wv = kk[i][j]
      ctx.fillStyle = wv > 0 ? rgba(P.good, 0.5) : wv < 0 ? rgba(P.crit, 0.5) : rgba(P.faint, 1)
      ctx.fillRect(x, y, cell, cell)
      ctx.strokeStyle = rgba(P.faint, 1)
      ctx.strokeRect(x, y, cell, cell)
      ctx.fillStyle = rgba(P.ink, 0.9)
      ctx.fillText(String(wv), x + cell * 0.32, y + cell * 0.68)
    }
  }
  const fx = kx + 3 * cell * 1.2 + 40
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.fillText('特征图 5×5', fx, iy - 10)
  const resp = (r, c) => {
    let sum = 0
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) sum += kk[i][j] * val(c + j)
    }
    return sum / 2.55
  }
  const built = s
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const x = fx + c * cell
      const y = iy + r * cell
      const idx = r * 5 + c
      const done = idx <= built
      const rv = resp(r, c)
      const col = rv > 0 ? P.accent : P.warn
      ctx.fillStyle = rgba(col, done ? 0.1 + Math.abs(rv) * 0.75 : 0.05)
      ctx.fillRect(x, y, cell - 1, cell - 1)
      ctx.strokeStyle = idx === s ? rgba(P.hot, 0.95) : rgba(P.faint, 1)
      ctx.lineWidth = idx === s ? 1.5 : 1
      ctx.strokeRect(x, y, cell - 1, cell - 1)
    }
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.fillText('conv 3×3 · stride 1 · ReLU', W - 250, 22)
}

/* ---------- 幕 6：Transformer（全链路 + 参数方框，扁平 HUD） ---------- */
function drawTF(t, P) {
  const stageNames = ['Token', 'Embedding', 'Q / K / V', 'Attention', 'FFN', 'Output']
  const nStage = stageNames.length
  const bw = Math.min(168, (W - 80) / nStage - 18)
  const gap = (W - 80 - nStage * bw) / (nStage - 1)
  const x0 = 40
  const midY = H * 0.47
  const bh = 132
  const cycle = t / 0.62
  const stageW = Math.floor(cycle) % nStage
  const inStage = cycle - Math.floor(cycle)
  ctx.font = font(10)
  const hash2 = (i, j) => {
    const h = Math.sin(i * 127.1 + j * 311.7 + Math.floor(t * 3) * 74.7) * 43758.5453
    return h - Math.floor(h)
  }
  const paramGrid = (x, y, cols, rows, cw) => {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        ctx.fillStyle = rgba(P.accent, 0.18 + hash2(i + x, j + y) * 0.55)
        ctx.fillRect(x + j * (cw + 1), y + i * (cw + 1), cw, cw)
        ctx.strokeStyle = rgba(P.faint, 0.9)
        ctx.lineWidth = 1
        ctx.strokeRect(x + j * (cw + 1), y + i * (cw + 1), cw, cw)
      }
    }
  }
  const bars = [0.55, 0.24, 0.13, 0.08]
  const outNames = ['客', '栈', '是', '的']
  for (let sIdx = 0; sIdx < nStage; sIdx++) {
    const x = x0 + sIdx * (bw + gap)
    const active = sIdx === stageW
    ctx.strokeStyle = rgba(active ? P.accent : P.faint, active ? 1 : 0.9)
    ctx.lineWidth = active ? 1.6 : 1
    ctx.strokeRect(x, midY - bh / 2, bw, bh)
    ctx.fillStyle = rgba(active ? P.accent : P.dim, 0.95)
    ctx.fillText(stageNames[sIdx], x + 8, midY - bh / 2 - 8)
    if (sIdx === 0) {
      const toks = ['极', '客', '栈', '是']
      toks.forEach((tk, i) => {
        const cx = x + 18 + (i % 2) * 64
        const cy = midY - 52 + Math.floor(i / 2) * 44
        ctx.strokeStyle = rgba(P.ink, 0.8)
        ctx.strokeRect(cx, cy, 50, 30)
        ctx.fillStyle = rgba(P.ink, 0.95)
        ctx.font = font(13)
        ctx.fillText(tk, cx + 18, cy + 20)
        ctx.font = font(10)
      })
    } else if (sIdx === 1) {
      paramGrid(x + 18, midY - 40, 8, 6, 7)
      const row = stageW === sIdx ? Math.floor(inStage * 6) % 6 : 0
      ctx.fillStyle = rgba(P.hot, 0.95)
      ctx.fillRect(x + 18 + row * 8, midY - 40 + row * 8, 7, 7)
    } else if (sIdx === 2) {
      ;[['Wq', 0], ['Wk', 1], ['Wv', 2]].forEach((pair) => {
        const lb = pair[0]
        const i = pair[1]
        paramGrid(x + 14 + i * 52, midY - 32, 5, 5, 6)
        ctx.fillStyle = rgba(P.ink, 0.9)
        ctx.fillText(lb, x + 14 + i * 52, midY + 18)
      })
    } else if (sIdx === 3) {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const a = 0.08 + Math.max(0, Math.sin(i * 1.2 + j * 0.9 + t * 2)) * 0.5
          ctx.fillStyle = rgba(P.accent, a)
          ctx.fillRect(x + 18 + j * 13, midY - 40 + i * 13, 12, 12)
        }
      }
      ctx.fillStyle = rgba(P.dim, 0.95)
      ctx.fillText('softmax(QKᵀ/√d)', x + 18, midY + 46)
    } else if (sIdx === 4) {
      paramGrid(x + 16, midY - 42, 5, 4, 7)
      paramGrid(x + 82, midY - 42, 4, 5, 7)
      ctx.fillStyle = rgba(P.ink, 0.9)
      ctx.fillText('W₁', x + 16, midY + 34)
      ctx.fillText('W₂', x + 82, midY + 34)
      ctx.fillStyle = rgba(P.dim, 0.95)
      ctx.fillText('ReLU', x + 52, midY - 50)
    } else {
      outNames.forEach((nm, i) => {
        const bwid = bars[i] * (bw - 64)
        ctx.fillStyle = rgba(i === 0 ? P.accent : P.dim, i === 0 ? 0.85 : 0.5)
        ctx.fillRect(x + 16, midY - 44 + i * 24, bwid, 16)
        ctx.fillStyle = rgba(P.ink, 0.9)
        ctx.fillText(nm, x + 16 + bwid + 6, midY - 32 + i * 24)
      })
    }
  }
  for (let sIdx = 0; sIdx < nStage - 1; sIdx++) {
    const xa = x0 + sIdx * (bw + gap) + bw
    const xb = x0 + (sIdx + 1) * (bw + gap)
    const active = sIdx === stageW
    arrow(xa, midY, xb - 2, midY, rgba(active ? P.accent : P.faint, active ? 0.95 : 0.75), active ? 1.6 : 1, 6)
  }
  if (stageW < nStage - 1) {
    const chipA = x0 + stageW * (bw + gap) + bw
    const chipB = chipA + gap
    glowDot(lerp(chipA, chipB, smooth(clamp(inStage / 0.7, 0, 1))), midY, 4, P.hot)
  } else {
    glowDot(x0 + (nStage - 1) * (bw + gap) + bw * 0.5, midY - bh / 2 - 30, 4, P.hot)
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.font = font(11)
  ctx.fillText('前向：token → xW + b → softmax → 下一个 token', W - 430, 22)
}
/* ---------- 幕 7：体系结构（哈佛架构图 + 存储层次，扁平 HUD） ---------- */
function buildCacheSim() {
  const seq = [3, 7, 3, 12, 7, 20, 3, 12, 7, 5, 20, 3, 9, 7, 12, 3, 28, 5, 9, 20, 44, 7, 28, 9, 52, 3, 7, 44]
  const L1 = new Array(8).fill(-1)
  const L2 = new Array(16).fill(-1)
  let p1 = 0
  let p2 = 0
  let hits = 0
  let misses = 0
  const steps = []
  for (const blk of seq) {
    const hit1 = L1.indexOf(blk) >= 0
    let hit2 = false
    if (hit1) {
      hits++
    } else {
      misses++
      hit2 = L2.indexOf(blk) >= 0
      let slot = L1.indexOf(-1)
      if (slot < 0) {
        slot = p1
        p1 = (p1 + 1) % L1.length
      }
      L1[slot] = blk
      if (!hit2) {
        let s2 = L2.indexOf(-1)
        if (s2 < 0) {
          s2 = p2
          p2 = (p2 + 1) % L2.length
        }
        L2[s2] = blk
      }
    }
    steps.push({ blk, hit1, hit2, l1: [...L1], l2: [...L2], hits, misses })
  }
  return { steps }
}

function drawArch(t, P) {
  const midY = H * 0.44
  const imem = { x: 56, y: midY - 62, w: 150, h: 124 }
  const dmem = { x: W - 206, y: midY - 62, w: 150, h: 124 }
  const cpu = { x: W / 2 - 150, y: midY - 86, w: 300, h: 172 }
  ctx.lineWidth = 1.2
  ctx.strokeStyle = rgba(P.faint, 1)
  ctx.fillStyle = rgba(P.bg, 1)
  ctx.fillRect(imem.x, imem.y, imem.w, imem.h)
  ctx.strokeRect(imem.x, imem.y, imem.w, imem.h)
  ctx.fillRect(dmem.x, dmem.y, dmem.w, dmem.h)
  ctx.strokeRect(dmem.x, dmem.y, dmem.w, dmem.h)
  ctx.strokeRect(cpu.x, cpu.y, cpu.w, cpu.h)
  ctx.font = font(11)
  ctx.fillStyle = rgba(P.dim, 1)
  ctx.fillText('指令存储器', imem.x + 10, imem.y + 20)
  ctx.fillText('IMEM', imem.x + 10, imem.y + 36)
  ctx.fillText('数据存储器', dmem.x + 10, dmem.y + 20)
  ctx.fillText('DMEM', dmem.x + 10, dmem.y + 36)
  ctx.fillStyle = rgba(P.ink, 0.9)
  ctx.fillText('CPU', cpu.x + 10, cpu.y + 20)
  const cu = { x: cpu.x + 95, y: cpu.y + 30, w: 110, h: 38 }
  const rf = { x: cpu.x + 20, y: cpu.y + 92, w: 110, h: 46 }
  const alu = { x: cpu.x + 170, y: cpu.y + 92, w: 110, h: 46 }
  for (const [bx, label] of [[cu, '控制单元'], [rf, '寄存器堆'], [alu, 'ALU']]) {
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.fillRect(bx.x, bx.y, bx.w, bx.h)
    ctx.strokeStyle = rgba(P.dim, 0.85)
    ctx.strokeRect(bx.x, bx.y, bx.w, bx.h)
    ctx.fillStyle = rgba(P.ink, 0.9)
    ctx.font = font(11)
    ctx.fillText(label, bx.x + 10, bx.y + bx.h / 2 + 4)
  }
  const busY1 = midY - 18
  const busY2 = midY - 24
  const busY3 = midY + 30
  const cpuR = cpu.x + cpu.w
  line(imem.x + imem.w, busY1, cu.x, busY1, rgba(P.accent, 0.85), 1.6)
  arrow(imem.x + imem.w, busY1, cu.x - 2, busY1, rgba(P.accent, 0.85), 1.6, 6)
  ctx.fillStyle = rgba(P.accent, 0.9)
  ctx.fillText('指令总线', (imem.x + imem.w + cu.x) / 2 - 26, busY1 - 8)
  line(cpuR, busY2, dmem.x, busY2, rgba(P.good, 0.85), 1.6)
  arrow(cpuR, busY2, dmem.x - 2, busY2, rgba(P.good, 0.85), 1.6, 6)
  ctx.fillStyle = rgba(P.good, 0.9)
  ctx.fillText('数据总线（写）', (cpuR + dmem.x) / 2 - 34, busY2 - 8)
  line(dmem.x, busY3, cpuR, busY3, rgba(P.warn, 0.85), 1.6)
  arrow(dmem.x, busY3, cpuR + 2, busY3, rgba(P.warn, 0.85), 1.6, 6)
  ctx.fillStyle = rgba(P.warn, 0.9)
  ctx.fillText('数据总线（读）', (cpuR + dmem.x) / 2 - 34, busY3 + 16)
  const tags = ['add', 'ld', 'bne', 'mul', 'jal', 'lw']
  const ipos = (t * 0.85) % 1
  const ix = lerp(imem.x + imem.w, cu.x, ipos)
  ctx.fillStyle = rgba(P.accent, 0.95)
  ctx.fillRect(ix - 14, busY1 - 9, 28, 18)
  ctx.fillStyle = rgba(P.bg, 1)
  ctx.font = font(9)
  ctx.fillText(tags[Math.floor(t / 0.7) % tags.length], ix - 10, busY1 + 4)
  for (let k = 0; k < 3; k++) {
    const u = (t * 0.5 + k * 0.37) % 1
    const wx = lerp(cpuR, dmem.x, u)
    ctx.fillStyle = rgba(P.good, 0.9)
    ctx.fillRect(wx - 12, busY2 - 8, 24, 16)
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.font = font(9)
    ctx.fillText(['42', '0x3F', '7'][k], wx - 8, busY2 + 4)
    const v = (t * 0.42 + k * 0.53) % 1
    const rx = lerp(dmem.x, cpuR, v)
    ctx.fillStyle = rgba(P.warn, 0.9)
    ctx.fillRect(rx - 12, busY3 - 8, 24, 16)
    ctx.fillStyle = rgba(P.bg, 1)
    ctx.fillText(['13', 'FF', '8'][k], rx - 7, busY3 + 4)
  }
  if (!state.arch) state.arch = buildCacheSim()
  const sim = state.arch
  const stepDur = 0.18
  const totalSteps = sim.steps.length
  const si = Math.min(totalSteps - 1, Math.floor(t / stepDur))
  const cur = sim.steps[si]
  const frac = clamp(t / stepDur - si, 0, 1)
  const cellS = clamp(Math.round(H * 0.033), 8, 13)
  const memCell = clamp(Math.round(H * 0.023), 6, 9)
  const l1Cols = 4
  const l2Cols = 8
  const l1w = l1Cols * (cellS + 2) - 2
  const l1h = 2 * (cellS + 2) - 2
  const l2w = l2Cols * (cellS + 2) - 2
  const l2h = l1h
  const memCols = 16
  const memRows = 4
  const memW = memCols * (memCell + 1.5) - 1.5
  const memH = memRows * (memCell + 1.5) - 1.5
  const stripBase = H - 34
  const l1x = 60
  const l1y = stripBase - l1h
  const l2x = l1x + l1w + 46
  const l2y = l1y
  const memx = l2x + l2w + 52
  const memy = stripBase - memH
  const flashL1 = cur.l1.indexOf(cur.blk)
  const flashL2 = cur.l2.indexOf(cur.blk)
  const flashCol = cur.hit1 ? P.good : P.crit
  ctx.font = font(10)
  const drawSlots = (gx, gy, cols, rows, cell, arr, base, flashIdx) => {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const idx = i * cols + j
        const x = gx + j * (cell + 2)
        const y = gy + i * (cell + 2)
        const occupied = arr[idx] >= 0
        let fill
        let edge
        if (idx === flashIdx && frac < 0.6) {
          fill = rgba(flashCol, 0.95)
          edge = rgba(flashCol, 1)
        } else if (occupied) {
          fill = rgba(base, 0.5)
          edge = rgba(base, 0.85)
        } else {
          fill = rgba(P.bg, 1)
          edge = rgba(P.faint, 0.9)
        }
        ctx.fillStyle = fill
        ctx.fillRect(x, y, cell, cell)
        ctx.strokeStyle = edge
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, cell, cell)
      }
    }
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.fillText(`L1 · ${8} 行`, l1x, l1y - 8)
  ctx.fillText(`L2 · ${16} 行`, l2x, l2y - 8)
  ctx.fillText('主存 · 64 块', memx, memy - 8)
  drawSlots(l1x, l1y, l1Cols, 2, cellS, cur.l1, P.accent, flashL1)
  drawSlots(l2x, l2y, l2Cols, 2, cellS, cur.l2, P.accent, cur.hit2 || !cur.hit1 ? flashL2 : -1)
  for (let i = 0; i < memRows; i++) {
    for (let j = 0; j < memCols; j++) {
      const idx = i * memCols + j
      const x = memx + j * (memCell + 1.5)
      const y = memy + i * (memCell + 1.5)
      const isCur = idx === cur.blk
      ctx.fillStyle = isCur && frac < 0.6 ? rgba(P.crit, 0.95) : rgba(P.dim, 0.28)
      ctx.fillRect(x, y, memCell, memCell)
      ctx.strokeStyle = isCur ? rgba(P.crit, 1) : rgba(P.faint, 0.8)
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, memCell, memCell)
    }
  }
  line(l1x + l1w + 6, l1y + l1h / 2, l2x - 8, l2y + l2h / 2, rgba(P.faint, 0.9), 1)
  line(l2x + l2w + 6, l2y + l2h / 2, memx - 8, memy + memH / 2, rgba(P.faint, 0.9), 1)
  const p1c = { x: l1x + l1w / 2, y: l1y + l1h / 2 }
  const p2c = { x: l2x + l2w / 2, y: l2y + l2h / 2 }
  const pmc = { x: memx + memW / 2, y: memy + memH / 2 }
  let dot = p1c
  let dotCol = P.good
  if (!cur.hit1) {
    dotCol = P.crit
    if (cur.hit2) {
      const u = Math.min(1, frac * 2)
      dot = { x: lerp(p1c.x, p2c.x, u), y: lerp(p1c.y, p2c.y, u) }
    } else {
      dot =
        frac < 0.5
          ? { x: lerp(p1c.x, p2c.x, frac * 2), y: lerp(p1c.y, p2c.y, frac * 2) }
          : { x: lerp(p2c.x, pmc.x, (frac - 0.5) * 2), y: lerp(p2c.y, pmc.y, (frac - 0.5) * 2) }
    }
  }
  glowDot(dot.x, dot.y, 3, dotCol)
  if (!cur.hit1) {
    ctx.fillStyle = rgba(P.crit, 0.95)
    ctx.fillText('MISS', l1x + l1w + 12, l1y + 6)
  } else {
    ctx.fillStyle = rgba(P.good, 0.95)
    ctx.fillText('HIT', l1x + l1w + 12, l1y + 6)
  }
  if (!cur.hit1 && !cur.hit2) {
    ctx.fillStyle = rgba(P.crit, 0.95)
    ctx.fillText('MISS → 访存', l2x + l2w + 10, l2y + 6)
  }
  const rx = memx + memW + 40
  ctx.font = font(11)
  ctx.fillStyle = rgba(P.ink, 0.92)
  ctx.fillText(`访问 块 ${String(cur.blk).padStart(2, '0')}`, rx, l1y + 6)
  const msg = cur.hit1 ? 'L1 命中' : cur.hit2 ? 'L1 MISS → L2 命中' : 'L1 MISS → L2 MISS → 访存'
  ctx.fillStyle = cur.hit1 ? rgba(P.good, 1) : rgba(P.crit, 1)
  ctx.fillText(msg, rx, l1y + 26)
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.fillText(
    `L1 命中率 ${Math.round((cur.hits / (cur.hits + cur.misses)) * 100)}%  (${cur.hits}/${cur.hits + cur.misses})`,
    rx,
    l1y + 46
  )
  ctx.font = font(11)
  ctx.fillStyle = rgba(P.dim, 0.95)
  ctx.fillText('Harvard · 指令与数据总线分离', W - 330, 22)
}

/* ---------- 幕 8：概率 · 信息 · 离散（扁平 HUD） ---------- */
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
  line(pw, 26, pw, H - 26, rgba(P.faint, 0.7), 1)
  line(pw * 2, 26, pw * 2, H - 26, rgba(P.faint, 0.7), 1)
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
    ctx.fillStyle = rgba(P.warn, 0.55)
    ctx.fillRect(x, base - c * 5, bw * 0.7, c * 5)
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
      const hot = h % 23 === 0
      ctx.fillStyle = hot ? rgba(P.accent, 0.95) : rgba(P.dim, 0.45)
      ctx.fillText(String(h % 2), x, 40 + r * 17)
    }
  }
  ctx.fillStyle = rgba(P.dim, 0.95)
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
    ctx.beginPath()
    ctx.arc(nd.x, nd.y, on ? 5 : 3.6, 0, Math.PI * 2)
    ctx.fillStyle = rgba(on ? P.accent : P.dim, on ? 0.95 : 0.6)
    ctx.fill()
  })
  ctx.fillStyle = rgba(P.dim, 0.95)
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
  ctx.fillText('JKZ·VIS // 08', W - 92, H - 14)
}

function drawScene(idx, t, alpha) {
  ctx.globalAlpha = alpha
  const P = palette
  const key = SCENES[idx].key
  if (key === 'la') drawLA(t, P)
  else if (key === 'gs') drawGS(t, P)
  else if (key === 'va') drawVA(t, P)
  else if (key === 'gd') drawGD(t, P)
  else if (key === 'cnn') drawCNN(t, P)
  else if (key === 'tf') drawTF(t, P)
  else if (key === 'arch') drawArch(t, P)
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
      <canvas ref="canvasRef" aria-label="概念动画：线性代数、矩阵分析、矢量分析、梯度下降二维流形、CNN、Transformer 全链路、哈佛架构与存储层次、概率信息离散" />
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
  width: 12px;
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
