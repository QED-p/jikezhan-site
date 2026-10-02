<script setup>
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'

const PRESETS = [
  { name: '正定（碗）', M: [[2, 1], [1, 2]] },
  { name: '不定（鞍）', M: [[0, 1], [1, 0]] },
  { name: '槽（半正定）', M: [[1, 1], [1, 1]] },
  { name: '负定', M: [[-1, 0], [0, -2]] },
  { name: '窄碗', M: [[3, 2], [2, 3]] }
]

const CANVAS_W = 720
const CANVAS_H = 540
const RANGE = 2.5
const N = 28
const seq = [0, 1, 2, 3, -1, -2]
const LIGHT = norm({ x: 0.45, y: -0.55, z: 0.7 })

const A = reactive(PRESETS[0].M.map((r) => r.slice()))
const probe = reactive({ x: 1.2, y: 0.8 })
const cam = reactive({ theta: -0.7, phi: 0.55 })
const canvasRef = ref(null)
const mounted = ref(false)
let ctx = null
let palette = null
let drag = null
let lastPos = null

function setPreset(p) {
  A.splice(0, A.length, ...p.M.map((r) => r.slice()))
  probe.x = 1.2
  probe.y = 0.8
}
function cycleCell(i, j) {
  const v = seq[(seq.indexOf(A[i][j]) + 1) % seq.length]
  if (i === j) {
    A[i][i] = v
  } else {
    A[0][1] = v
    A[1][0] = v
  }
}
function resetView() {
  cam.theta = -0.7
  cam.phi = 0.55
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const snap = (v) => Math.round(clamp(v, -RANGE, RANGE) * 10) / 10

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}
function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
}
function norm(a) {
  const n = Math.hypot(a.x, a.y, a.z) || 1
  return { x: a.x / n, y: a.y / n, z: a.z / n }
}

const eig = computed(() => {
  const a = A[0][0]
  const b = A[0][1]
  const c = A[1][1]
  const tr = a + c
  const dt = a * c - b * b
  const s = Math.sqrt(Math.max(0, tr * tr - 4 * dt))
  const l1 = (tr + s) / 2
  const l2 = (tr - s) / 2
  const unit = (x, y) => {
    const n = Math.hypot(x, y) || 1
    return { x: x / n, y: y / n }
  }
  const v1 = Math.hypot(b, l1 - a) > 1e-9 ? unit(b, l1 - a) : { x: 1, y: 0 }
  const v2 = Math.hypot(b, l2 - a) > 1e-9 ? unit(b, l2 - a) : { x: 1, y: 0 }
  const identity = Math.abs(b) < 1e-9 && Math.abs(a - c) < 1e-9
  return { l1, l2, v1, v2, identity }
})

const kind = computed(() => {
  const { l1, l2 } = eig.value
  const eps = 1e-9 * Math.max(1, Math.abs(l1), Math.abs(l2))
  if (Math.abs(l1) <= eps && Math.abs(l2) <= eps) return { key: 'zero', name: '零型' }
  if (l2 > eps) return { key: 'pd', name: '正定' }
  if (l1 < -eps) return { key: 'nd', name: '负定' }
  if (l2 < -eps) return { key: 'id', name: '不定' }
  if (Math.abs(l2) <= eps) return { key: 'psd', name: '半正定' }
  return { key: 'nsd', name: '半负定' }
})

const fmt = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2))

const readouts = computed(() => {
  const e = eig.value
  return [
    { label: 'λ₁', value: fmt(e.l1) },
    { label: 'λ₂', value: fmt(e.l2) },
    { label: 'det', value: fmt(e.l1 * e.l2) },
    { label: '类型', value: kind.value.name }
  ]
})

const formula = computed(() => {
  const e = eig.value
  const t2 = e.l2 < 0 ? `− ${Math.abs(e.l2).toFixed(2)}` : `+ ${e.l2.toFixed(2)}`
  return `q = ${e.l1.toFixed(2)}·y₁² ${t2}·y₂²`
})

const status = computed(() => {
  switch (kind.value.key) {
    case 'pd':
      return '正定：碗形曲面. 两个特征值都为正，从原点向任何方向都向上翘——最低点就在原点.'
    case 'nd':
      return '负定：倒扣的碗. 任何方向都向下弯——最高点在原点.'
    case 'id':
      return '不定：马鞍面. 沿一条主轴向上弯、沿另一条向下弯，原点既不是最高点也不是最低点——优化里最麻烦的形状.'
    case 'psd':
      return '半正定：槽形曲面. 沿 λ₂ = 0 的主轴方向是一道平直的谷底（q 恒为零），离开谷底才上升.'
    case 'nsd':
      return '半负定：倒过来的槽. 沿一条主轴方向 q 不变，其余方向全部下降.'
    default:
      return '零型：A = 0，曲面就是底面本身，q 恒等于 0.'
  }
})

const qval = (x, y) => A[0][0] * x * x + 2 * A[0][1] * x * y + A[1][1] * y * y
const qp = computed(() => qval(probe.x, probe.y))

function camera() {
  const d = 8.5
  const cp = Math.cos(cam.phi)
  const eye = {
    x: d * cp * Math.cos(cam.theta),
    y: d * cp * Math.sin(cam.theta),
    z: d * Math.sin(cam.phi)
  }
  const fwd = norm({ x: -eye.x, y: -eye.y, z: -eye.z })
  const right = norm(cross(fwd, { x: 0, y: 0, z: 1 }))
  const up = cross(right, fwd)
  return { eye, fwd, right, up, f: 600, cx: CANVAS_W / 2, cy: CANVAS_H / 2 }
}
function project(p, c) {
  const v = sub(p, c.eye)
  const zc = dot(v, c.fwd)
  if (zc < 0.2) return null
  return { x: c.cx + (c.f * dot(v, c.right)) / zc, y: c.cy - (c.f * dot(v, c.up)) / zc, z: zc }
}

function cssColor(name, fallback) {
  const v = getComputedStyle(canvasRef.value).getPropertyValue(name).trim()
  const m = /^#([0-9a-f]{6})$/i.exec(v)
  if (!m) return fallback
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
const rgb = (c) => `rgb(${c.r},${c.g},${c.b})`
const rgba = (c, a) => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`
const shadeColor = (c, s) => ({ r: c.r * s, g: c.g * s, b: c.b * s })

const xi = (i) => -RANGE + (i / N) * 2 * RANGE
const yj = (j) => -RANGE + (j / N) * 2 * RANGE

function line(p, q, c, width, dash) {
  if (!p || !q) return
  ctx.setLineDash(dash || [])
  ctx.strokeStyle = c
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(q.x, q.y)
  ctx.stroke()
  ctx.setLineDash([])
}

function draw() {
  const el = canvasRef.value
  if (!el) return
  if (!ctx) {
    ctx = el.getContext('2d')
    ctx.setTransform(2, 0, 0, 2, 0, 0)
    palette = {
      bg: cssColor('--hud-bg', { r: 10, g: 17, b: 20 }),
      accent: cssColor('--hud-accent', { r: 95, g: 211, b: 216 }),
      warn: cssColor('--hud-warn', { r: 217, g: 178, b: 60 }),
      hot: cssColor('--hud-hot', { r: 234, g: 246, b: 246 }),
      ink: cssColor('--hud-ink', { r: 194, g: 212, b: 214 }),
      faint: cssColor('--hud-faint', { r: 32, g: 48, b: 47 })
    }
  }
  const P = palette
  const c = camera()

  ctx.fillStyle = rgb(P.bg)
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  let zmax = 0
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const z = Math.abs(qval(xi(i), yj(j)))
      if (z > zmax) zmax = z
    }
  }
  const zs = zmax > 1e-6 ? 2.2 / zmax : 1
  const zAt = (x, y) => qval(x, y) * zs

  ctx.lineWidth = 1
  ctx.strokeStyle = rgba(P.faint, 0.9)
  for (let k = 0; k <= 10; k++) {
    const t = -RANGE + (k / 10) * 2 * RANGE
    line(project({ x: t, y: -RANGE, z: 0 }, c), project({ x: t, y: RANGE, z: 0 }, c), rgba(P.faint, 0.9), 1)
    line(project({ x: -RANGE, y: t, z: 0 }, c), project({ x: RANGE, y: t, z: 0 }, c), rgba(P.faint, 0.9), 1)
  }
  line(project({ x: 0, y: 0, z: 0 }, c), project({ x: RANGE + 0.4, y: 0, z: 0 }, c), rgba(P.ink, 0.4), 1)
  line(project({ x: 0, y: 0, z: 0 }, c), project({ x: 0, y: RANGE + 0.4, z: 0 }, c), rgba(P.ink, 0.4), 1)
  line(project({ x: 0, y: 0, z: 0 }, c), project({ x: 0, y: 0, z: 2.2 }, c), rgba(P.ink, 0.4), 1)

  const quads = []
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x0 = xi(i)
      const x1 = xi(i + 1)
      const y0 = yj(j)
      const y1 = yj(j + 1)
      const s00 = project({ x: x0, y: y0, z: zAt(x0, y0) }, c)
      const s10 = project({ x: x1, y: y0, z: zAt(x1, y0) }, c)
      const s11 = project({ x: x1, y: y1, z: zAt(x1, y1) }, c)
      const s01 = project({ x: x0, y: y1, z: zAt(x0, y1) }, c)
      if (!s00 || !s10 || !s11 || !s01) continue
      const xm = (x0 + x1) / 2
      const ym = (y0 + y1) / 2
      const zm = zAt(xm, ym)
      const nrm = norm({
        x: -(2 * A[0][0] * xm + 2 * A[0][1] * ym) * zs,
        y: -(2 * A[0][1] * xm + 2 * A[1][1] * ym) * zs,
        z: 1
      })
      const shade = 0.35 + 0.65 * Math.max(0, dot(nrm, LIGHT))
      quads.push({
        pts: [s00, s10, s11, s01],
        depth: (s00.z + s10.z + s11.z + s01.z) / 4,
        zm,
        shade
      })
    }
  }
  quads.sort((a, b) => b.depth - a.depth)

  for (const q of quads) {
    const t = zmax > 1e-6 ? Math.min(1, Math.abs(q.zm / zs) / zmax) : 0
    const base = q.zm >= 0 ? P.accent : P.warn
    ctx.beginPath()
    ctx.moveTo(q.pts[0].x, q.pts[0].y)
    ctx.lineTo(q.pts[1].x, q.pts[1].y)
    ctx.lineTo(q.pts[2].x, q.pts[2].y)
    ctx.lineTo(q.pts[3].x, q.pts[3].y)
    ctx.closePath()
    ctx.fillStyle = rgba(shadeColor(base, q.shade), 0.16 + 0.62 * t)
    ctx.fill()
    ctx.strokeStyle = rgba(P.bg, 0.3)
    ctx.lineWidth = 0.6
    ctx.stroke()
  }

  const e = eig.value
  const sections = e.identity
    ? [{ v: e.v1, label: 'λ₁' }]
    : [
        { v: e.v1, label: 'λ₁' },
        { v: e.v2, label: 'λ₂' }
      ]
  for (const s of sections) {
    ctx.beginPath()
    let started = false
    for (let k = 0; k <= 40; k++) {
      const t = -RANGE + (k / 40) * 2 * RANGE
      const p = project({ x: t * s.v.x, y: t * s.v.y, z: zAt(t * s.v.x, t * s.v.y) }, c)
      if (!p) continue
      if (!started) {
        ctx.moveTo(p.x, p.y)
        started = true
      } else {
        ctx.lineTo(p.x, p.y)
      }
    }
    ctx.strokeStyle = rgba(P.ink, 0.85)
    ctx.lineWidth = 1.4
    ctx.stroke()
    const lp = project({ x: RANGE * 0.92 * s.v.x, y: RANGE * 0.92 * s.v.y, z: zAt(RANGE * 0.92 * s.v.x, RANGE * 0.92 * s.v.y) }, c)
    if (lp) {
      ctx.fillStyle = rgba(P.ink, 0.9)
      ctx.font = '600 14px "Noto Sans SC", sans-serif'
      ctx.fillText(s.label, lp.x + 6, lp.y - 6)
    }
  }

  const pb = project({ x: probe.x, y: probe.y, z: 0 }, c)
  const pt = project({ x: probe.x, y: probe.y, z: zAt(probe.x, probe.y) }, c)
  if (pb && pt) {
    line(pb, pt, rgba(P.hot, 0.85), 1.6)
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = rgb(P.bg)
    ctx.fill()
    ctx.strokeStyle = rgba(P.hot, 1)
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(pb.x, pb.y, 3.5, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(P.hot, 0.6)
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.fillStyle = rgba(P.hot, 1)
    ctx.font = '600 14px "Noto Sans SC", sans-serif'
    ctx.fillText(`q = ${fmt(qval(probe.x, probe.y))}`, pt.x + 10, pt.y - 8)
  }
}

const pointerToCanvas = (evt) => {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: ((evt.clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((evt.clientY - rect.top) / rect.height) * CANVAS_H
  }
}

function onDown(evt) {
  const p = pointerToCanvas(evt)
  const c = camera()
  const sp = project({ x: probe.x, y: probe.y, z: 0 }, c)
  drag = sp && Math.hypot(sp.x - p.x, sp.y - p.y) < 14 ? 'probe' : 'orbit'
  lastPos = p
  evt.currentTarget.setPointerCapture?.(evt.pointerId)
}
function onMove(evt) {
  if (!drag) return
  const p = pointerToCanvas(evt)
  if (drag === 'orbit') {
    cam.theta += (p.x - lastPos.x) * 0.008
    cam.phi = clamp(cam.phi - (p.y - lastPos.y) * 0.006, 0.12, 1.45)
  } else {
    const c = camera()
    const dir = norm({
      x: (c.right.x * (p.x - c.cx)) / c.f + (c.up.x * (c.cy - p.y)) / c.f + c.fwd.x,
      y: (c.right.y * (p.x - c.cx)) / c.f + (c.up.y * (c.cy - p.y)) / c.f + c.fwd.y,
      z: (c.right.z * (p.x - c.cx)) / c.f + (c.up.z * (c.cy - p.y)) / c.f + c.fwd.z
    })
    if (Math.abs(dir.z) > 1e-6) {
      const t = -c.eye.z / dir.z
      if (t > 0) {
        probe.x = snap(c.eye.x + t * dir.x)
        probe.y = snap(c.eye.y + t * dir.y)
      }
    }
  }
  lastPos = p
}
function onUp() {
  drag = null
  lastPos = null
}

onMounted(() => {
  mounted.value = true
})
watchEffect(() => {
  void A[0][0]
  void A[0][1]
  void A[1][1]
  void probe.x
  void probe.y
  void cam.theta
  void cam.phi
  if (mounted.value) draw()
})
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="ql-head">
      <div class="ql-title">
        <TitleTab text="实验 10" />
        <h3>二次型曲面：碗、鞍与槽</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="ql-rule" :split="56" />

    <div class="ql-presets">
      <span class="ql-label">预设</span>
      <HudButton v-for="p in PRESETS" :key="p.name" @click="setPreset(p)">{{ p.name }}</HudButton>
    </div>

    <div class="ql-matrix-row">
      <div class="ql-mat-block">
        <span class="ql-label">对称矩阵 A（点格子改）</span>
        <div class="ql-grid">
          <button class="ql-cell edit" @click="cycleCell(0, 0)">{{ A[0][0] }}</button>
          <button class="ql-cell edit" @click="cycleCell(0, 1)">{{ A[0][1] }}</button>
          <button class="ql-cell edit" @click="cycleCell(1, 0)">{{ A[1][0] }}</button>
          <button class="ql-cell edit" @click="cycleCell(1, 1)">{{ A[1][1] }}</button>
        </div>
      </div>
      <div class="ql-formula">
        <div>{{ formula }}</div>
        <div class="ql-probe-line">点 ({{ probe.x.toFixed(1) }}, {{ probe.y.toFixed(1) }})：q = {{ fmt(qp) }}</div>
      </div>
    </div>

    <div class="ql-canvas">
      <canvas
        ref="canvasRef"
        :width="CANVAS_W * 2"
        :height="CANVAS_H * 2"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
        @dblclick="resetView"
      />
    </div>

    <p class="ql-status">{{ status }}</p>
    <p class="ql-note">
      拖空白处旋转视角（双击复位）；拖白色圆点沿底面移动，竖线伸到曲面上的高度就是 q 的值（高度做了归一化显示）.
      蓝色曲面是 q > 0 的部分、黄色是 q < 0 的部分；浅灰实线是两条主轴方向上的剖面——碗是向上的抛物线，鞍一上一下.
      点格子改矩阵，看 λ 的符号组合怎么决定碗、鞍还是槽.
    </p>
  </HudFrame>
</template>

<style scoped>
.ql-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.ql-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.ql-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.ql-rule {
  margin: 20px 0 22px;
}
.ql-presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.ql-label {
  font-size: 12.5px;
  color: var(--hud-dim);
  margin-right: 4px;
}
.ql-matrix-row {
  display: flex;
  align-items: center;
  gap: 30px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.ql-mat-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ql-grid {
  display: grid;
  grid-template-columns: repeat(2, 46px);
  gap: 4px;
}
.ql-cell {
  width: 46px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hud-faint);
  background: var(--hud-bg);
  color: var(--hud-ink);
  font-family: inherit;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.ql-cell.edit {
  cursor: pointer;
}
.ql-cell.edit:hover {
  border-color: var(--hud-accent);
}
.ql-formula {
  font-size: 15px;
  color: var(--hud-ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ql-probe-line {
  font-size: 13px;
  color: var(--hud-dim);
}
.ql-canvas canvas {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
  cursor: grab;
}
.ql-canvas canvas:active {
  cursor: grabbing;
}
.ql-status {
  margin: 18px 0 10px;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.ql-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
