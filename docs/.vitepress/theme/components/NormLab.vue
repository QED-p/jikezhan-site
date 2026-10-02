<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'

const VW = 720
const VH = 540
const XMIN = -2.4
const XMAX = 2.4
const YMIN = -1.8
const YMAX = 1.8
const X2MIN = -3.5
const X2MAX = 3.5
const Y2MIN = -2.625
const Y2MAX = 2.625

const seq = [0, 1, 2, 3, -1, -2]
const p = ref(2)
const probe = reactive({ x: 1.4, y: 1.0 })
const dragging = ref(false)

const MAT_PRESETS = [
  { name: '对称', M: [[2, 1], [1, 2]] },
  { name: '对角', M: [[3, 0], [0, 1]] },
  { name: '剪切', M: [[1, 1], [0, 1]] },
  { name: '旋转+缩放', M: [[1, -1], [1, 1]] },
  { name: '投影', M: [[1, 0], [0, 0]] }
]
const M = reactive(MAT_PRESETS[0].M.map((r) => r.slice()))
const unitAngle = ref(0.9)
const dragUnit = ref(false)

function setMatPreset(preset) {
  M.splice(0, M.length, ...preset.M.map((r) => r.slice()))
}
function cycleM(i, j) {
  M[i][j] = seq[(seq.indexOf(M[i][j]) + 1) % seq.length]
}

const sx = (x) => ((x - XMIN) / (XMAX - XMIN)) * VW
const sy = (y) => VH - ((y - YMIN) / (YMAX - YMIN)) * VH
const sx2 = (x) => ((x - X2MIN) / (X2MAX - X2MIN)) * VW
const sy2 = (y) => VH - ((y - Y2MIN) / (Y2MAX - Y2MIN)) * VH
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const snap = (v, lo, hi) => Math.round(clamp(v, lo, hi) * 10) / 10
const fmt = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2))

const ballPath = (pp) => {
  const K = 160
  const pts = []
  for (let i = 0; i <= K; i++) {
    const t = (i / K) * Math.PI * 2
    const ct = Math.cos(t)
    const st = Math.sin(t)
    const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / pp)
    const y = Math.sign(st) * Math.pow(Math.abs(st), 2 / pp)
    pts.push(`${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
}

const pBall = computed(() => ballPath(p.value))

const refBalls = computed(() => [
  { d: ballPath(1), color: 'var(--hud-warn)', label: '‖·‖₁', lx: sx(0.58), ly: sy(0.5) },
  { d: ballPath(2), color: 'var(--hud-good)', label: '‖·‖₂', lx: sx(0.82), ly: sy(0.74) },
  {
    d: `M${sx(1)} ${sy(1)} L${sx(-1)} ${sy(1)} L${sx(-1)} ${sy(-1)} L${sx(1)} ${sy(-1)} Z`,
    color: 'var(--hud-ink)',
    label: '‖·‖∞',
    lx: sx(0.3),
    ly: sy(1.12)
  }
])

const n1 = computed(() => Math.abs(probe.x) + Math.abs(probe.y))
const n2 = computed(() => Math.hypot(probe.x, probe.y))
const ninf = computed(() => Math.max(Math.abs(probe.x), Math.abs(probe.y)))
const np = computed(() =>
  Math.pow(Math.pow(Math.abs(probe.x), p.value) + Math.pow(Math.abs(probe.y), p.value), 1 / p.value)
)

const readouts = computed(() => [
  { label: '‖x‖₁', value: fmt(n1.value) },
  { label: '‖x‖₂', value: fmt(n2.value) },
  { label: '‖x‖∞', value: fmt(ninf.value) },
  { label: '‖x‖ₚ', value: fmt(np.value) }
])

const status = computed(() => {
  const bound = Math.SQRT2 * n2.value
  return `任何向量都满足 ‖x‖∞ ≤ ‖x‖₂ ≤ ‖x‖₁：${fmt(ninf.value)} ≤ ${fmt(n2.value)} ≤ ${fmt(n1.value)}；而且 ‖x‖₁ ≤ √2·‖x‖₂ = ${fmt(bound)} ✓. 拖动滑块看单位球从菱形（p = 1）经圆（p = 2）变向正方形（p → ∞）.`
})

const gridPath = computed(() => {
  const lines = []
  for (let k = -2; k <= 2; k++) {
    lines.push(`M${sx(k)} ${sy(YMIN)} L${sx(k)} ${sy(YMAX)}`)
    lines.push(`M${sx(XMIN)} ${sy(k)} L${sx(XMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

const gridPath2 = computed(() => {
  const lines = []
  for (let k = -3; k <= 3; k++) {
    lines.push(`M${sx2(k)} ${sy2(Y2MIN)} L${sx2(k)} ${sy2(Y2MAX)}`)
    lines.push(`M${sx2(X2MIN)} ${sy2(k)} L${sx2(X2MAX)} ${sy2(k)}`)
  }
  return lines.join(' ')
})

const matNorm = computed(() => {
  const a = M[0][0]
  const b = M[0][1]
  const c = M[1][0]
  const d = M[1][1]
  const tr = a * a + b * b + c * c + d * d
  const det = (a * d - b * c) * (a * d - b * c)
  const disc = Math.max(0, tr * tr - 4 * det)
  const l1 = (tr + Math.sqrt(disc)) / 2
  const l2 = (tr - Math.sqrt(disc)) / 2
  const smax = Math.sqrt(Math.max(0, l1))
  const smin = Math.sqrt(Math.max(0, l2))
  const m11 = a * a + c * c
  const m22 = b * b + d * d
  const m12 = a * b + c * d
  const vec = (lam) => {
    let v = { x: m12, y: lam - m11 }
    if (Math.hypot(v.x, v.y) < 1e-9) v = { x: 1, y: 0 }
    const n = Math.hypot(v.x, v.y)
    return { x: v.x / n, y: v.y / n }
  }
  let v1
  let v2
  if (Math.abs(m12) < 1e-9 && Math.abs(m11 - m22) < 1e-9) {
    v1 = { x: 1, y: 0 }
    v2 = { x: 0, y: 1 }
  } else {
    v1 = vec(l1)
    v2 = vec(l2)
  }
  const u1 = { x: a * v1.x + b * v1.y, y: c * v1.x + d * v1.y }
  const u2 = { x: a * v2.x + b * v2.y, y: c * v2.x + d * v2.y }
  return {
    smax,
    smin,
    u1,
    u2,
    frob: Math.sqrt(tr),
    n1: Math.max(Math.abs(a) + Math.abs(c), Math.abs(b) + Math.abs(d))
  }
})

const ellipsePath = computed(() => {
  const a = M[0][0]
  const b = M[0][1]
  const c = M[1][0]
  const d = M[1][1]
  const K = 180
  const pts = []
  for (let i = 0; i <= K; i++) {
    const t = (i / K) * Math.PI * 2
    const x = Math.cos(t)
    const y = Math.sin(t)
    pts.push(`${sx2(a * x + b * y).toFixed(1)} ${sy2(c * x + d * y).toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
})

const rectPath = computed(() => {
  const u1 = matNorm.value.u1
  const u2 = matNorm.value.u2
  const c = (x, y) => `${sx2(x).toFixed(1)} ${sy2(y).toFixed(1)}`
  return `M${c(0, 0)} L${c(u1.x, u1.y)} L${c(u1.x + u2.x, u1.y + u2.y)} L${c(u2.x, u2.y)} Z`
})

const unitVec = computed(() => ({ x: Math.cos(unitAngle.value), y: Math.sin(unitAngle.value) }))
const Ax = computed(() => {
  const a = M[0][0]
  const b = M[0][1]
  const c = M[1][0]
  const d = M[1][1]
  const u = unitVec.value
  return { x: a * u.x + b * u.y, y: c * u.x + d * u.y }
})
const axNorm = computed(() => Math.hypot(Ax.value.x, Ax.value.y))

const matReadouts = computed(() => {
  const mn = matNorm.value
  return [
    { label: '‖A‖₂', value: fmt(mn.smax) },
    { label: 'σmin', value: fmt(mn.smin) },
    { label: '‖A‖_F', value: fmt(mn.frob) },
    { label: '‖A‖₁', value: fmt(mn.n1) }
  ]
})

const matStatus = computed(() => {
  const mn = matNorm.value
  if (mn.smin < 1e-6) {
    return `投影型：单位圆被压成一条线段，最短半轴为 0；最长半轴仍是谱范数 ‖A‖₂ = ${fmt(mn.smax)}. 当前 ‖Ax‖ = ${fmt(axNorm.value)}.`
  }
  return `单位圆被 A 映成椭圆，最长半轴就是谱范数 ‖A‖₂ = ${fmt(mn.smax)}（第 3 章会看到它就是最大奇异值 σmax）. ‖A‖_F = √(σ₁² + σ₂²) = ${fmt(mn.frob)}，正是两半轴的勾股对角线. 拖圆上的白点：当前 ‖Ax‖ = ${fmt(axNorm.value)} ≤ ${fmt(mn.smax)}，沿最长轴方向取到等号.`
})

const toMath = (evt) => {
  const rect = evt.currentTarget.getBoundingClientRect()
  return {
    x: XMIN + ((evt.clientX - rect.left) / rect.width) * (XMAX - XMIN),
    y: YMIN + ((rect.bottom - evt.clientY) / rect.height) * (YMAX - YMIN)
  }
}
const toMath2 = (evt) => {
  const rect = evt.currentTarget.getBoundingClientRect()
  return {
    x: X2MIN + ((evt.clientX - rect.left) / rect.width) * (X2MAX - X2MIN),
    y: Y2MIN + ((rect.bottom - evt.clientY) / rect.height) * (Y2MAX - Y2MIN)
  }
}
const onMove = (evt) => {
  if (!dragging.value) return
  const { x, y } = toMath(evt)
  probe.x = snap(x, XMIN, XMAX)
  probe.y = snap(y, YMIN, YMAX)
}
const onUp = () => {
  dragging.value = false
}
const onDown2 = (evt) => {
  const pt = toMath2(evt)
  const u = unitVec.value
  if (Math.hypot(pt.x - u.x, pt.y - u.y) < 0.22) {
    dragUnit.value = true
    evt.currentTarget.setPointerCapture?.(evt.pointerId)
  }
}
const onMove2 = (evt) => {
  if (!dragUnit.value) return
  const pt = toMath2(evt)
  unitAngle.value = Math.atan2(pt.y, pt.x)
}
const onUp2 = () => {
  dragUnit.value = false
}
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="nl-head">
      <div class="nl-title">
        <TitleTab text="实验 01" />
        <h3>单位球与单位圆的像</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="nl-rule" :split="56" />

    <div class="nl-controls">
      <span class="nl-label">p = {{ p.toFixed(1) }}</span>
      <input v-model.number="p" class="nl-slider" type="range" min="1" max="8" step="0.1" />
      <HudButton @click="p = 1">p = 1</HudButton>
      <HudButton @click="p = 2">p = 2</HudButton>
      <HudButton @click="p = 4">p = 4</HudButton>
      <HudButton @click="p = 8">p = 8</HudButton>
    </div>

    <div class="nl-canvas">
      <svg class="nl-svg1" :viewBox="`0 0 ${VW} ${VH}`" @pointermove="onMove" @pointerup="onUp" @pointerleave="onUp">
        <path :d="gridPath" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
        <line :x1="sx(XMIN)" :y1="sy(0)" :x2="sx(XMAX)" :y2="sy(0)" stroke="var(--hud-dim)" stroke-width="1" />
        <line :x1="sx(0)" :y1="sy(YMIN)" :x2="sx(0)" :y2="sy(YMAX)" stroke="var(--hud-dim)" stroke-width="1" />

        <g v-for="(b, i) in refBalls" :key="'rb' + i">
          <path :d="b.d" fill="none" :stroke="b.color" stroke-width="1.3" stroke-dasharray="6 5" opacity="0.7" />
          <text :x="b.lx" :y="b.ly" :fill="b.color" font-size="14" font-weight="700" opacity="0.9">{{ b.label }}</text>
        </g>

        <path :d="pBall" fill="none" stroke="var(--hud-accent)" stroke-width="2.2" />

        <line
          :x1="sx(0)" :y1="sy(0)" :x2="sx(probe.x)" :y2="sy(probe.y)"
          stroke="var(--hud-hot)" stroke-width="2"
        />
        <circle
          :cx="sx(probe.x)" :cy="sy(probe.y)" r="9"
          fill="var(--hud-bg)" stroke="var(--hud-hot)" stroke-width="2"
          class="nl-handle" @pointerdown="dragging = true"
        />
        <text
          :x="sx(probe.x) + 12" :y="sy(probe.y) - 12"
          fill="var(--hud-hot)" font-size="14" font-weight="700"
        >({{ probe.x.toFixed(1) }}, {{ probe.y.toFixed(1) }})</text>
      </svg>
    </div>

    <p class="nl-status">{{ status }}</p>
    <p class="nl-note">
      三张虚线球是 1、2、∞ 范数的单位球：菱形、圆、正方形，都在 (1,0)、(0,1) 这些轴上点重合——轴上向量三种范数一样大.
      实线是当前 p 的单位球；拖动圆点，右上角实时给出它的四种范数.
      把点拖到对角线上，1-范数与 2-范数的差距最大（√2 倍）——这就是稀疏优化偏爱 1-范数的几何来源.
    </p>

    <HudRule class="nl-rule" :split="56" />

    <div class="nl-subhead">
      <h4>矩阵范数：单位圆被映成椭圆</h4>
      <ReadoutCells :items="matReadouts" />
    </div>

    <div class="nl-controls">
      <span class="nl-label">预设</span>
      <HudButton v-for="mp in MAT_PRESETS" :key="mp.name" @click="setMatPreset(mp)">{{ mp.name }}</HudButton>
    </div>

    <div class="nl-matrix-row">
      <span class="nl-label">A（点格子改）</span>
      <div class="nl-grid">
        <button class="nl-cell" @click="cycleM(0, 0)">{{ M[0][0] }}</button>
        <button class="nl-cell" @click="cycleM(0, 1)">{{ M[0][1] }}</button>
        <button class="nl-cell" @click="cycleM(1, 0)">{{ M[1][0] }}</button>
        <button class="nl-cell" @click="cycleM(1, 1)">{{ M[1][1] }}</button>
      </div>
    </div>

    <div class="nl-canvas">
      <svg class="nl-svg2" :viewBox="`0 0 ${VW} ${VH}`" @pointerdown="onDown2" @pointermove="onMove2" @pointerup="onUp2" @pointerleave="onUp2">
        <path :d="gridPath2" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
        <line :x1="sx2(X2MIN)" :y1="sy2(0)" :x2="sx2(X2MAX)" :y2="sy2(0)" stroke="var(--hud-dim)" stroke-width="1" />
        <line :x1="sx2(0)" :y1="sy2(Y2MIN)" :x2="sx2(0)" :y2="sy2(Y2MAX)" stroke="var(--hud-dim)" stroke-width="1" />

        <circle
          :cx="sx2(0)" :cy="sy2(0)" :r="(720 / (X2MAX - X2MIN))"
          fill="none" stroke="var(--hud-ink)" stroke-width="1.3" stroke-dasharray="6 5" opacity="0.6"
        />
        <text :x="sx2(-1.45)" :y="sy2(1.18)" fill="var(--hud-ink)" font-size="14" opacity="0.75">‖x‖ = 1</text>

        <path :d="ellipsePath" fill="none" stroke="var(--hud-accent)" stroke-width="2.2" />

        <path
          :d="rectPath"
          fill="none" stroke="var(--hud-dim)" stroke-width="1" stroke-dasharray="4 4" opacity="0.65"
        />

        <template v-if="matNorm.smin > 1e-6 && Math.abs(matNorm.smax - matNorm.smin) > 1e-6">
          <line
            :x1="sx2(-matNorm.u2.x)" :y1="sy2(-matNorm.u2.y)" :x2="sx2(matNorm.u2.x)" :y2="sy2(matNorm.u2.y)"
            stroke="var(--hud-dim)" stroke-width="1.2" stroke-dasharray="5 4"
          />
          <text
            :x="sx2(matNorm.u2.x) + 8" :y="sy2(matNorm.u2.y) + 16"
            fill="var(--hud-dim)" font-size="13"
          >σmin = {{ fmt(matNorm.smin) }}</text>
        </template>

        <line
          :x1="sx2(-matNorm.u1.x)" :y1="sy2(-matNorm.u1.y)" :x2="sx2(matNorm.u1.x)" :y2="sy2(matNorm.u1.y)"
          stroke="var(--hud-hot)" stroke-width="1.6" opacity="0.85"
        />
        <text
          :x="sx2(-matNorm.u1.x) + 10" :y="sy2(-matNorm.u1.y) + 18"
          fill="var(--hud-hot)" font-size="14" font-weight="700"
        >‖A‖₂ = {{ fmt(matNorm.smax) }}</text>

        <line
          :x1="sx2(0)" :y1="sy2(0)"
          :x2="sx2(matNorm.u1.x + matNorm.u2.x)" :y2="sy2(matNorm.u1.y + matNorm.u2.y)"
          stroke="var(--hud-warn)" stroke-width="1.8"
        />
        <text
          :x="sx2(matNorm.u1.x + matNorm.u2.x) + ((matNorm.u1.x + matNorm.u2.x) >= 0 ? -10 : 10)"
          :y="sy2(matNorm.u1.y + matNorm.u2.y) - 8"
          :text-anchor="(matNorm.u1.x + matNorm.u2.x) >= 0 ? 'end' : 'start'"
          fill="var(--hud-warn)" font-size="14" font-weight="700"
        >‖A‖_F = {{ fmt(matNorm.frob) }}</text>

        <line
          :x1="sx2(unitVec.x)" :y1="sy2(unitVec.y)" :x2="sx2(Ax.x)" :y2="sy2(Ax.y)"
          stroke="var(--hud-hot)" stroke-width="1" stroke-dasharray="3 3" opacity="0.45"
        />
        <line
          :x1="sx2(0)" :y1="sy2(0)" :x2="sx2(Ax.x)" :y2="sy2(Ax.y)"
          stroke="var(--hud-hot)" stroke-width="2"
        />
        <circle
          :cx="sx2(unitVec.x)" :cy="sy2(unitVec.y)" r="9"
          fill="var(--hud-bg)" stroke="var(--hud-hot)" stroke-width="2"
          class="nl-handle"
        />
        <circle :cx="sx2(Ax.x)" :cy="sy2(Ax.y)" r="5" fill="var(--hud-bg)" stroke="var(--hud-hot)" stroke-width="2" />
        <text
          :x="sx2(Ax.x) + 10" :y="sy2(Ax.y) - 10"
          fill="var(--hud-hot)" font-size="14" font-weight="700"
        >‖Ax‖ = {{ fmt(axNorm) }}</text>
      </svg>
    </div>

    <p class="nl-status">{{ matStatus }}</p>
    <p class="nl-note">
      点格子改 A（循环 0 → 1 → 2 → 3 → −1 → −2），或换预设. 虚线圆是 ‖x‖ = 1，实线是它的像 {Ax}；
      灰虚线是最短半轴 σmin，亮线（最长半轴）的长度就是谱范数；黄色线是两半轴张成的矩形对角线——
      两条半轴互相垂直，所以它的长是 √(σ₁² + σ₂²)，正好是 Frobenius 范数.
      拖圆上的白点绕一圈，看 ‖Ax‖ 如何随方向变化——沿最长轴方向取到最大值，这就是"算子范数 = 单位球上最大拉伸倍数".
      剪切预设的最大拉伸是黄金比 1.62.
    </p>
  </HudFrame>
</template>

<style scoped>
.nl-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.nl-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.nl-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.nl-subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px 40px;
  margin-bottom: 16px;
}
.nl-subhead h4 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--hud-ink);
}
.nl-rule {
  margin: 22px 0;
}
.nl-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-bottom: 18px;
}
.nl-label {
  font-size: 14px;
  color: var(--hud-ink);
  font-variant-numeric: tabular-nums;
  min-width: 72px;
}
.nl-slider {
  width: 240px;
  accent-color: var(--hud-accent);
  cursor: pointer;
}
.nl-matrix-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.nl-grid {
  display: grid;
  grid-template-columns: repeat(2, 46px);
  gap: 4px;
}
.nl-cell {
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
  cursor: pointer;
}
.nl-cell:hover {
  border-color: var(--hud-accent);
}
.nl-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
}
.nl-svg2 {
  cursor: crosshair;
}
.nl-handle {
  cursor: grab;
}
.nl-handle:active {
  cursor: grabbing;
}
.nl-status {
  margin: 18px 0 10px;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.nl-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
