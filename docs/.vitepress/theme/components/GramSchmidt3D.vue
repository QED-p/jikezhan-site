<script setup>
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'

const CANVAS_W = 720
const CANVAS_H = 540

const PRESETS = [
  { name: '教材例子', V: [[1, 1, 0], [1, 0, 1], [0, 1, 1]] },
  { name: '斜', V: [[2, 1, 0], [0, 2, 1], [1, 0, 2]] },
  { name: '共面', V: [[1, 0, 0], [0, 1, 0], [1, 1, 0]] },
  { name: '共线', V: [[1, 1, 0], [2, 2, 0], [0, 0, 1]] }
]

const V = reactive(PRESETS[0].V.map((v) => ({ x: v[0], y: v[1], z: v[2] })))
const step = ref(0)
const cam = reactive({ theta: -0.7, phi: 0.55 })
const canvasRef = ref(null)
const mounted = ref(false)
const drag = ref(null)
let lastPos = null
let ctx = null
let palette = null

const fmt = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2))
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const snap = (v) => Math.round(v * 10) / 10

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}
function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
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
function scale(a, t) {
  return { x: a.x * t, y: a.y * t, z: a.z * t }
}
const len = (a) => Math.hypot(a.x, a.y, a.z)

const maxStep = 4

function setPreset(p) {
  p.V.forEach((v, i) => {
    V[i].x = v[0]
    V[i].y = v[1]
    V[i].z = v[2]
  })
  step.value = 0
}
function resetView() {
  cam.theta = -0.7
  cam.phi = 0.55
}

const gs = computed(() => {
  const [a1, a2, a3] = V
  const n1 = len(a1)
  if (n1 < 1e-9) return { ok: false }
  const e1 = scale(a1, 1 / n1)
  const c2 = dot(a2, e1)
  const b2 = sub(a2, scale(e1, c2))
  const n2 = len(b2)
  const e2 = n2 > 1e-9 ? scale(b2, 1 / n2) : null
  const c31 = dot(a3, e1)
  const c32 = e2 ? dot(a3, e2) : 0
  const foot3 = e2 ? add(scale(e1, c31), scale(e2, c32)) : scale(e1, c31)
  const b3 = sub(a3, foot3)
  const n3 = len(b3)
  const e3 = n3 > 1e-9 ? scale(b3, 1 / n3) : null
  return { ok: true, e1, c2, b2, n2, e2, c31, c32, foot3, b3, n3, e3, r11: n1 }
})

const readouts = computed(() => {
  const g = gs.value
  const s = step.value
  const val = (v, gate) => (s >= gate && g.ok && isFinite(v) ? fmt(v) : '·')
  return [
    { label: 'r₁₁', value: val(g.r11, 1) },
    { label: 'r₂₂', value: g.ok && s >= 2 ? fmt(g.n2) : '·' },
    { label: 'r₃₃', value: g.ok && s >= 4 ? fmt(g.n3) : '·' },
    { label: '状态', value: !g.ok ? '失败' : s >= 4 ? (g.n3 < 1e-9 ? '共面' : '完成') : '进行中' }
  ]
})

const status = computed(() => {
  const g = gs.value
  const s = step.value
  if (!g.ok) return 'a₁ = 0：第一支向量是零向量，没法归一化——换一个输入.'
  if (s === 0) return '三支输入向量 a₁、a₂、a₃. 点「下一步」开始从左往右正交化.'
  if (s === 1) return `e₁ = a₁/|a₁|，长度 1（r₁₁ = |a₁| = ${fmt(g.r11)}）.`
  if (s === 2) {
    if (g.n2 < 1e-9) return 'b₂ = 0：a₂ 与 a₁ 共线，影子把 a₂ 整个减没了——第二支向量撑不出新方向.'
    return `a₂ 在 e₁ 上的投影系数 c = ${fmt(g.c2)}；减去影子得 b₂，|b₂| = ${fmt(g.n2)}（R 的 r₂₂）.`
  }
  if (s === 3) {
    if (g.n2 < 1e-9) return '没有 e₂，平面撑不起来——先换输入解决 a₂ 与 a₁ 共线的问题.'
    return `e₂ = b₂/|b₂|. 淡蓝平面是 e₁、e₂ 张成的平面；a₃ 要减掉它在这个平面上的全部影子（垂足 = ${fmt(g.c31)}·e₁ + ${fmt(g.c32)}·e₂）.`
  }
  if (g.n3 < 1e-9) return 'b₃ = 0：a₃ 落在 e₁、e₂ 的平面里——三支向量共面，撑不出三维.'
  return `e₃ = b₃/|b₃|（r₃₃ = ${fmt(g.n3)}），三支标准正交向量到手——任意维数都是这个循环.`
})

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

function line(p, q, color, width, dash) {
  if (!p || !q) return
  ctx.setLineDash(dash || [])
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(q.x, q.y)
  ctx.stroke()
  ctx.setLineDash([])
}
function label(p, text, color, dx = 8, dy = -8, size = 14) {
  if (!p) return
  ctx.fillStyle = color
  ctx.font = `600 ${size}px "Noto Sans SC", sans-serif`
  ctx.fillText(text, p.x + dx, p.y + dy)
}
function dotAt(p, r, color) {
  if (!p) return
  ctx.beginPath()
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.fillStyle = rgb(palette.bg)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6
  ctx.stroke()
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
      good: cssColor('--hud-good', { r: 95, g: 168, b: 90 }),
      hot: cssColor('--hud-hot', { r: 234, g: 246, b: 246 }),
      ink: cssColor('--hud-ink', { r: 194, g: 212, b: 214 }),
      dim: cssColor('--hud-dim', { r: 92, g: 114, b: 116 }),
      faint: cssColor('--hud-faint', { r: 32, g: 48, b: 47 })
    }
  }
  const P = palette
  const c = camera()
  const g = gs.value
  const s = step.value

  ctx.fillStyle = rgb(P.bg)
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  for (let k = -3; k <= 3; k++) {
    line(project({ x: k, y: -3, z: 0 }, c), project({ x: k, y: 3, z: 0 }, c), rgba(P.faint, 0.9), 1)
    line(project({ x: -3, y: k, z: 0 }, c), project({ x: 3, y: k, z: 0 }, c), rgba(P.faint, 0.9), 1)
  }
  const O = { x: 0, y: 0, z: 0 }
  line(project(O, c), project({ x: 3.4, y: 0, z: 0 }, c), rgba(P.dim, 0.7), 1)
  line(project(O, c), project({ x: 0, y: 3.4, z: 0 }, c), rgba(P.dim, 0.7), 1)
  line(project(O, c), project({ x: 0, y: 0, z: 3 }, c), rgba(P.dim, 0.7), 1)
  label(project({ x: 3.4, y: 0, z: 0 }, c), 'x', rgba(P.dim, 0.9), 6, 14, 13)
  label(project({ x: 0, y: 3.4, z: 0 }, c), 'y', rgba(P.dim, 0.9), 6, 14, 13)
  label(project({ x: 0, y: 0, z: 3 }, c), 'z', rgba(P.dim, 0.9), 8, 4, 13)

  if (g.ok && s >= 3 && g.e2) {
    const L = 2.2
    const corners = [
      add(scale(g.e1, L), scale(g.e2, L)),
      add(scale(g.e1, L), scale(g.e2, -L)),
      add(scale(g.e1, -L), scale(g.e2, -L)),
      add(scale(g.e1, -L), scale(g.e2, L))
    ].map((p) => project(p, c))
    if (corners.every(Boolean)) {
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y)
      ctx.closePath()
      ctx.fillStyle = rgba(P.accent, 0.07)
      ctx.fill()
      ctx.strokeStyle = rgba(P.accent, 0.3)
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  const O2 = project(O, c)
  V.forEach((v, i) => {
    const p = project(v, c)
    line(O2, p, rgba(P.ink, 0.55), 1.8)
    label(p, `a${'₁₂₃'[i]}`, rgba(P.ink, 0.8))
    dotAt(p, 7, rgba(P.ink, 0.9))
  })

  if (g.ok && s >= 1) {
    const p = project(g.e1, c)
    line(O2, p, rgba(P.accent, 1), 2.6)
    label(p, 'e₁', rgba(P.accent, 1))
    dotAt(p, 5, rgba(P.accent, 1))
  }

  if (g.ok && s >= 2 && g.n2 > 1e-9) {
    const foot = scale(g.e1, g.c2)
    const pf = project(foot, c)
    const pa = project(V[1], c)
    line(O2, pf, rgba(P.warn, 0.8), 1.5, [5, 4])
    line(pa, pf, rgba(P.warn, 0.55), 1, [3, 3])
    const pb = project(g.b2, c)
    line(O2, pb, rgba(P.warn, 0.95), 2.2)
    label(pb, 'b₂', rgba(P.warn, 1))
    dotAt(pf, 4, rgba(P.warn, 0.9))
  }

  if (g.ok && s >= 3 && g.e2) {
    const p = project(g.e2, c)
    line(O2, p, rgba(P.good, 1), 2.6)
    label(p, 'e₂', rgba(P.good, 1))
    dotAt(p, 5, rgba(P.good, 1))
  }

  if (g.ok && s >= 3 && g.e2) {
    const pf = project(g.foot3, c)
    const pa = project(V[2], c)
    line(O2, pf, rgba(P.warn, 0.7), 1.4, [5, 4])
    line(pa, pf, rgba(P.warn, 0.5), 1, [3, 3])
    dotAt(pf, 4, rgba(P.warn, 0.9))
    if (s === 3 && g.n3 > 1e-9) {
      const pb = project(g.b3, c)
      line(O2, pb, rgba(P.warn, 0.95), 2.2)
      label(pb, 'b₃', rgba(P.warn, 1))
    }
  }

  if (g.ok && s >= 4 && g.e3) {
    const p = project(g.e3, c)
    line(O2, p, rgba(P.hot, 1), 2.6)
    label(p, 'e₃', rgba(P.hot, 1))
    dotAt(p, 5, rgba(P.hot, 1))
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
  let hit = null
  V.forEach((v, i) => {
    const sp = project(v, c)
    if (sp && Math.hypot(sp.x - p.x, sp.y - p.y) < 16) hit = i
  })
  drag.value = hit !== null ? hit : 'orbit'
  lastPos = p
  evt.currentTarget.setPointerCapture?.(evt.pointerId)
}
function onMove(evt) {
  if (drag.value === null) return
  const p = pointerToCanvas(evt)
  if (drag.value === 'orbit') {
    cam.theta += (p.x - lastPos.x) * 0.008
    cam.phi = clamp(cam.phi - (p.y - lastPos.y) * 0.006, 0.12, 1.45)
  } else {
    const c = camera()
    const dir = norm({
      x: (c.right.x * (p.x - c.cx)) / c.f + (c.up.x * (c.cy - p.y)) / c.f + c.fwd.x,
      y: (c.right.y * (p.x - c.cx)) / c.f + (c.up.y * (c.cy - p.y)) / c.f + c.fwd.y,
      z: (c.right.z * (p.x - c.cx)) / c.f + (c.up.z * (c.cy - p.y)) / c.f + c.fwd.z
    })
    const denom = dot(dir, c.fwd)
    if (Math.abs(denom) > 1e-6) {
      const v0 = V[drag.value]
      const t = dot(sub(v0, c.eye), c.fwd) / denom
      if (t > 0) {
        let np = add(c.eye, scale(dir, t))
        np = { x: snap(clamp(np.x, -3.2, 3.2)), y: snap(clamp(np.y, -3.2, 3.2)), z: snap(clamp(np.z, -3.2, 3.2)) }
        const n = len(np)
        if (n > 3.2) np = scale(np, 3.2 / n)
        V[drag.value].x = np.x
        V[drag.value].y = np.y
        V[drag.value].z = np.z
      }
    }
  }
  lastPos = p
}
function onUp() {
  drag.value = null
  lastPos = null
}

onMounted(() => {
  mounted.value = true
})
watchEffect(() => {
  V.forEach((v) => {
    void v.x
    void v.y
    void v.z
  })
  void step.value
  void cam.theta
  void cam.phi
  if (mounted.value) draw()
})
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="gs-head">
      <div class="gs-title">
        <TitleTab text="实验 06b" />
        <h3>三维 Gram–Schmidt</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="gs-rule" :split="56" />

    <div class="gs-controls">
      <span class="gs-label">预设</span>
      <HudButton v-for="p in PRESETS" :key="p.name" @click="setPreset(p)">{{ p.name }}</HudButton>
      <span class="gs-spacer" />
      <span class="gs-step">步骤 {{ step }}/{{ maxStep }}</span>
      <HudButton @click="step = step >= maxStep ? 0 : step + 1">{{ step >= maxStep ? '重来' : '下一步' }}</HudButton>
    </div>

    <div class="gs-canvas">
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

    <p class="gs-status">{{ status }}</p>
    <p class="gs-note">
      拖空白处旋转视角（双击复位），拖三个向量的端点可以改输入. 黄色虚线是每一步减掉的影子，黄色实线是残差 b；
      淡蓝平面是 e₁、e₂ 张成的平面，a₃ 要减掉它在这个平面上的全部影子——剩下的 b₃ 与整个平面垂直，单位化就是 e₃.
      「共面」「共线」预设看退化：算法会在 b₂ 或 b₃ 变成零的地方当场报告线性相关.
    </p>
  </HudFrame>
</template>

<style scoped>
.gs-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.gs-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.gs-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.gs-rule {
  margin: 20px 0 22px;
}
.gs-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.gs-label {
  font-size: 12.5px;
  color: var(--hud-dim);
  margin-right: 4px;
}
.gs-spacer {
  flex: 1;
}
.gs-step {
  font-size: 13px;
  color: var(--hud-dim);
  font-variant-numeric: tabular-nums;
}
.gs-canvas canvas {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
  cursor: grab;
}
.gs-canvas canvas:active {
  cursor: grabbing;
}
.gs-status {
  margin: 18px 0 10px;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.gs-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
