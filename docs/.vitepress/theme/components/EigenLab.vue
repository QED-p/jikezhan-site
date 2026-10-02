<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'

const PRESETS = [
  { name: '对角 (2,1)', M: [[2, 0], [0, 1]] },
  { name: '对称', M: [[2, 1], [1, 2]] },
  { name: '剪切', M: [[1, 1], [0, 1]] },
  { name: '旋转 90°', M: [[0, -1], [1, 0]] },
  { name: '投影', M: [[1, 0], [0, 0]] },
  { name: '缩放+旋转', M: [[1.2, -0.5], [0.5, 1.2]] }
]

const VW = 720
const VH = 540
const XMIN = -4
const XMAX = 4
const YMIN = -3
const YMAX = 3

const M = reactive(PRESETS[1].M.map((r) => r.slice()))
const probe = reactive({ x: 1, y: 1 })
const basisU = reactive({ x: 1, y: 0 })
const basisW = reactive({ x: 0, y: 1 })
const trail = reactive([])
const showDeform = ref(true)
const dragging = ref(null)
const seq = [0, 1, 2, -1]

function setPreset(p) {
  M.splice(0, M.length, ...p.M.map((r) => r.slice()))
  resetProbe()
  basisU.x = 1
  basisU.y = 0
  basisW.x = 0
  basisW.y = 1
}
function cycleCell(i, j) {
  const v = M[i][j]
  M[i][j] = seq[(seq.indexOf(v) + 1) % seq.length]
  resetProbe()
}

const sx = (x) => ((x - XMIN) / (XMAX - XMIN)) * VW
const sy = (y) => VH - ((y - YMIN) / (YMAX - YMIN)) * VH
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const snapP = (v) => Math.round(clamp(v, -2.5, 2.5) * 10) / 10
const snapB = (v) => Math.round(clamp(v, -3, 3) * 10) / 10

const eigen = computed(() => {
  const [[a, b], [c, d]] = M
  const tr = a + d
  const dt = a * d - b * c
  const disc = tr * tr - 4 * dt
  if (disc < -1e-9) return { complex: true, tr, dt }
  const s = Math.sqrt(Math.max(0, disc))
  const l1 = (tr + s) / 2
  const l2 = (tr - s) / 2
  const eigvec = (l) => {
    let v = { x: -b, y: a - l }
    if (Math.hypot(v.x, v.y) > 1e-9) return v
    v = { x: -(d - l), y: c }
    if (Math.hypot(v.x, v.y) > 1e-9) return v
    return null
  }
  const raw1 = eigvec(l1)
  const raw2 = eigvec(l2)
  const unit = (v) => {
    const n = Math.hypot(v.x, v.y) || 1
    return { x: v.x / n, y: v.y / n }
  }
  const identity = !raw1 && !raw2
  const repeated = Math.abs(l1 - l2) < 1e-9
  return {
    complex: false,
    tr,
    dt,
    l1,
    l2,
    repeated,
    identity,
    diagonalizable: identity || !repeated,
    v1: raw1 ? unit(raw1) : null,
    v2: raw2 && !repeated ? unit(raw2) : null
  }
})

const fmt = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2))

const readouts = computed(() => {
  const e = eigen.value
  if (e.complex) {
    return [
      { label: '特征值', value: '复数对' },
      { label: 'trace', value: fmt(e.tr) },
      { label: 'det', value: fmt(e.dt) },
      { label: '实特征方向', value: '无' }
    ]
  }
  return [
    { label: 'λ₁', value: fmt(e.l1) },
    { label: 'λ₂', value: fmt(e.l2) },
    { label: 'trace', value: fmt(e.tr) },
    { label: 'det', value: fmt(e.dt) }
  ]
})

const status = computed(() => {
  const e = eigen.value
  if (e.complex) {
    return '特征方程没有实根：平面上没有"顺纹"方向，整体在旋转加缩放. u、w 无论怎么拖，右侧 P⁻¹AP 都消不掉副对角（实数域内拖不出对角阵）.'
  }
  if (e.identity) {
    return `A = ${fmt(e.l1)}·I：每个方向都是特征方向，伸缩率都是 ${fmt(e.l1)}；u、w 怎么拖，P⁻¹AP 都等于 ${fmt(e.l1)}·I.`
  }
  if (e.repeated) {
    return `特征值 ${fmt(e.l1)} 的代数重数是 2，但特征方向只有一条（几何重数 1）——不可对角化：u、w 无论怎么拖，P⁻¹AP 都只能是上三角.`
  }
  return `两条虚线是特征方向. 把绿色 u、红色 w 拖到虚线上，右侧 P⁻¹AP 会变成对角阵——这就是对角化.`
})

const gridPath = computed(() => {
  const lines = []
  for (let k = -4; k <= 4; k++) {
    lines.push(`M${sx(k)} ${sy(YMIN)} L${sx(k)} ${sy(YMAX)}`)
    lines.push(`M${sx(XMIN)} ${sy(k)} L${sx(XMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

const deformedPath = computed(() => {
  if (!showDeform.value) return ''
  const [[a, b], [c, d]] = M
  const a1 = { x: a, y: c }
  const a2 = { x: b, y: d }
  const T = 14
  const segs = []
  const add = (px, py, dx, dy) => {
    if (Math.hypot(dx, dy) < 1e-6) return
    segs.push(`M${sx(px - dx * T)} ${sy(py - dy * T)} L${sx(px + dx * T)} ${sy(py + dy * T)}`)
  }
  for (let k = -6; k <= 6; k++) {
    add(k * a1.x, k * a1.y, a2.x, a2.y)
    add(k * a2.x, k * a2.y, a1.x, a1.y)
  }
  return segs.join(' ')
})

const mat2mul = (X, Y) => [
  [X[0][0] * Y[0][0] + X[0][1] * Y[1][0], X[0][0] * Y[0][1] + X[0][1] * Y[1][1]],
  [X[1][0] * Y[0][0] + X[1][1] * Y[1][0], X[1][0] * Y[0][1] + X[1][1] * Y[1][1]]
]

const basisInfo = computed(() => {
  const ux = basisU.x
  const uy = basisU.y
  const wx = basisW.x
  const wy = basisW.y
  const detP = ux * wy - uy * wx
  if (Math.abs(detP) < 0.05) return { degenerate: true, detP }
  const Pinv = [
    [wy / detP, -wx / detP],
    [-uy / detP, ux / detP]
  ]
  const P = [
    [ux, wx],
    [uy, wy]
  ]
  const Mp = mat2mul(Pinv, mat2mul([[M[0][0], M[0][1]], [M[1][0], M[1][1]]], P))
  const diagonal = Math.abs(Mp[0][1]) < 0.06 && Math.abs(Mp[1][0]) < 0.06
  return { degenerate: false, detP, Mp, diagonal }
})

const mpCells = computed(() => {
  const b = basisInfo.value
  if (b.degenerate) return null
  return [b.Mp[0][0], b.Mp[0][1], b.Mp[1][0], b.Mp[1][1]]
})

const eigLines = computed(() => {
  const e = eigen.value
  if (e.complex || e.identity) return []
  const L = 9
  const lines = []
  if (e.v1) lines.push({ v: e.v1, color: 'var(--hud-accent)', label: 'λ₁' })
  if (e.v2) lines.push({ v: e.v2, color: 'var(--hud-warn)', label: 'λ₂' })
  return lines.map((l) => ({
    ...l,
    x1: sx(-l.v.x * L),
    y1: sy(-l.v.y * L),
    x2: sx(l.v.x * L),
    y2: sy(l.v.y * L),
    lx: sx(l.v.x * 2.2) + 10,
    ly: sy(l.v.y * 2.2) - 10
  }))
})

const applyA = (p) => {
  const [[a, b], [c, d]] = M
  return { x: a * p.x + b * p.y, y: c * p.x + d * p.y }
}

const image = computed(() => applyA(probe))

const trailPath = computed(() => {
  if (trail.length < 2) return ''
  return trail
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(' ')
})

function iterate(times = 1) {
  if (Math.hypot(probe.x, probe.y) > 9) return
  for (let i = 0; i < times; i++) {
    trail.push({ x: probe.x, y: probe.y })
    if (trail.length > 24) trail.shift()
    const next = applyA(probe)
    if (Math.hypot(next.x, next.y) > 9) {
      probe.x = next.x
      probe.y = next.y
      return
    }
    probe.x = Math.round(next.x * 1000) / 1000
    probe.y = Math.round(next.y * 1000) / 1000
  }
}

function resetProbe() {
  probe.x = 1
  probe.y = 1
  trail.length = 0
}

const toMath = (evt) => {
  const rect = evt.currentTarget.getBoundingClientRect()
  return {
    x: XMIN + ((evt.clientX - rect.left) / rect.width) * (XMAX - XMIN),
    y: YMIN + ((rect.bottom - evt.clientY) / rect.height) * (YMAX - YMIN)
  }
}
const onMove = (evt) => {
  const d = dragging.value
  if (!d) return
  const { x, y } = toMath(evt)
  if (d === 'v') {
    probe.x = snapP(x)
    probe.y = snapP(y)
    trail.length = 0
  } else if (d === 'u') {
    basisU.x = snapB(x)
    basisU.y = snapB(y)
  } else if (d === 'w') {
    basisW.x = snapB(x)
    basisW.y = snapB(y)
  }
}
const onUp = () => {
  dragging.value = null
}
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="eg-head">
      <div class="eg-title">
        <TitleTab text="实验 09" />
        <h3>特征方向、新基与变形网格</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="eg-rule" :split="56" />

    <div class="eg-presets">
      <span class="eg-label">预设</span>
      <HudButton v-for="p in PRESETS" :key="p.name" @click="setPreset(p)">{{ p.name }}</HudButton>
    </div>

    <div class="eg-matrices">
      <div class="eg-mat-block">
        <span class="eg-label">A（点格子改）</span>
        <div class="eg-grid">
          <template v-for="(row, i) in M" :key="'r' + i">
            <button
              v-for="(v, j) in row"
              :key="'c' + i + '-' + j"
              class="eg-cell edit"
              @click="cycleCell(i, j)"
            >{{ v }}</button>
          </template>
        </div>
      </div>

      <div class="eg-mat-block">
        <span class="eg-label">P⁻¹AP（拖 u、w 改）</span>
        <div class="eg-grid">
          <template v-if="mpCells">
            <div
              v-for="(v, i) in mpCells"
              :key="'mp' + i"
              class="eg-cell ro"
              :class="{ lit: basisInfo.diagonal }"
            >{{ fmt(v) }}</div>
          </template>
          <template v-else>
            <div v-for="i in 4" :key="'mpd' + i" class="eg-cell ro dim">—</div>
          </template>
        </div>
        <span v-if="mpCells && basisInfo.diagonal" class="eg-tag">对角! 这组基就是特征方向</span>
        <span v-else-if="!mpCells" class="eg-tag deg">基退化（u、w 共线）</span>
      </div>

      <div class="eg-controls">
        <HudButton @click="iterate(1)">迭代 A</HudButton>
        <HudButton @click="iterate(5)">迭代 5 次</HudButton>
        <HudButton @click="resetProbe">重置 v</HudButton>
        <HudButton @click="showDeform = !showDeform">变形网格: {{ showDeform ? '开' : '关' }}</HudButton>
      </div>
    </div>

    <div class="eg-canvas">
      <svg :viewBox="`0 0 ${VW} ${VH}`" @pointermove="onMove" @pointerup="onUp" @pointerleave="onUp">
        <path :d="gridPath" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
        <path
          v-if="deformedPath"
          :d="deformedPath"
          fill="none"
          stroke="var(--hud-dim)"
          stroke-width="1"
          opacity="0.55"
        />
        <line :x1="sx(XMIN)" :y1="sy(0)" :x2="sx(XMAX)" :y2="sy(0)" stroke="var(--hud-dim)" stroke-width="1" />
        <line :x1="sx(0)" :y1="sy(YMIN)" :x2="sx(0)" :y2="sy(YMAX)" stroke="var(--hud-dim)" stroke-width="1" />

        <g v-for="(l, i) in eigLines" :key="'el' + i">
          <line :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" :stroke="l.color" stroke-width="1.2" stroke-dasharray="7 5" opacity="0.75" />
          <text :x="l.lx" :y="l.ly" :fill="l.color" font-size="15" font-weight="700">{{ l.label }}</text>
        </g>

        <path v-if="trailPath" :d="trailPath" fill="none" stroke="var(--hud-dim)" stroke-width="1" stroke-dasharray="3 4" />
        <rect
          v-for="(p, i) in trail"
          :key="'t' + i"
          :x="sx(p.x) - 2"
          :y="sy(p.y) - 2"
          width="4"
          height="4"
          fill="var(--hud-dim)"
        />

        <line
          :x1="sx(0)" :y1="sy(0)" :x2="sx(basisU.x)" :y2="sy(basisU.y)"
          stroke="var(--hud-good)" stroke-width="2.4"
        />
        <circle
          :cx="sx(basisU.x)" :cy="sy(basisU.y)" r="9"
          fill="var(--hud-bg)" stroke="var(--hud-good)" stroke-width="2"
          class="eg-handle h-u" @pointerdown="dragging = 'u'"
        />
        <text :x="sx(basisU.x) + 8" :y="sy(basisU.y) + 22" fill="var(--hud-good)" font-size="17" font-weight="700">u</text>

        <line
          :x1="sx(0)" :y1="sy(0)" :x2="sx(basisW.x)" :y2="sy(basisW.y)"
          stroke="var(--hud-crit)" stroke-width="2.4"
        />
        <circle
          :cx="sx(basisW.x)" :cy="sy(basisW.y)" r="9"
          fill="var(--hud-bg)" stroke="var(--hud-crit)" stroke-width="2"
          class="eg-handle h-w" @pointerdown="dragging = 'w'"
        />
        <text :x="sx(basisW.x) + 8" :y="sy(basisW.y) + 22" fill="var(--hud-crit)" font-size="17" font-weight="700">w</text>

        <line
          :x1="sx(0)" :y1="sy(0)" :x2="sx(image.x)" :y2="sy(image.y)"
          stroke="var(--hud-hot)" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.7"
        />
        <line
          :x1="sx(0)" :y1="sy(0)" :x2="sx(probe.x)" :y2="sy(probe.y)"
          stroke="var(--hud-hot)" stroke-width="2.2"
        />
        <text :x="sx(image.x) + 10" :y="sy(image.y) - 10" fill="var(--hud-hot)" font-size="15" opacity="0.8">Av</text>
        <text :x="sx(probe.x) + 10" :y="sy(probe.y) + 20" fill="var(--hud-hot)" font-size="18" font-weight="700">v</text>
        <circle
          :cx="sx(probe.x)" :cy="sy(probe.y)" r="10"
          fill="var(--hud-bg)" stroke="var(--hud-hot)" stroke-width="2"
          class="eg-handle h-v" @pointerdown="dragging = 'v'"
        />
      </svg>
    </div>

    <p class="eg-status">{{ status }}</p>
    <p class="eg-note">
      浅色是标准网格，斜向的亮网格是 A 作用后的"变形网格"（行列式就是它的面积缩放率）. 拖绿色 u、红色 w
      组成新基，右侧实时显示 A 在新基下的矩阵 P⁻¹AP. 拖 v 看 Av，点「迭代 A」留下轨迹看方向往哪跑.
      旋转 90° 时变形网格和标准网格重合——方格转 90° 还是方格.
    </p>
  </HudFrame>
</template>

<style scoped>
.eg-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.eg-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.eg-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.eg-rule {
  margin: 20px 0 22px;
}
.eg-presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.eg-label {
  font-size: 12.5px;
  color: var(--hud-dim);
  margin-right: 4px;
}
.eg-matrices {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 22px 34px;
  margin-bottom: 20px;
}
.eg-mat-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.eg-grid {
  display: grid;
  grid-template-columns: repeat(2, 46px);
  gap: 4px;
}
.eg-cell {
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
.eg-cell.edit {
  cursor: pointer;
}
.eg-cell.edit:hover {
  border-color: var(--hud-accent);
}
.eg-cell.ro {
  cursor: default;
}
.eg-cell.dim {
  color: var(--hud-dim);
}
.eg-cell.lit {
  border-color: var(--hud-accent);
  color: var(--hud-accent);
}
.eg-tag {
  font-size: 12.5px;
  color: var(--hud-accent);
}
.eg-tag.deg {
  color: var(--hud-warn);
}
.eg-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
  padding-bottom: 2px;
}
.eg-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
}
.eg-handle {
  cursor: grab;
}
.eg-handle:active {
  cursor: grabbing;
}
.eg-status {
  margin: 18px 0 10px;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.eg-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
