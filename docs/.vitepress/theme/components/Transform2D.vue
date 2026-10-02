<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudSlider from './HudSlider.vue'
import HudButton from './HudButton.vue'
import FormulaLine from './FormulaLine.vue'

const VW = 720
const VH = 540
const XMIN = -4
const XMAX = 4
const YMIN = -3
const YMAX = 3

const svgEl = ref(null)
const m = reactive({ a: 1, b: 0, c: 0, d: 1 })
let dragging = null

const sx = (x) => ((x - XMIN) / (XMAX - XMIN)) * VW
const sy = (y) => VH - ((y - YMIN) / (YMAX - YMIN)) * VH

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const snap = (v) => Math.round(clamp(v, -2, 2) * 10) / 10
const T = (x, y) => [m.a * x + m.b * y, m.c * x + m.d * y]

const det = computed(() => m.a * m.d - m.b * m.c)
const singular = computed(() => Math.abs(det.value) < 0.05)

const imgGrid = computed(() => {
  const lines = []
  for (let k = -8; k <= 8; k++) {
    const p1 = T(k, -8)
    const p2 = T(k, 8)
    lines.push(`M${sx(p1[0]).toFixed(1)} ${sy(p1[1]).toFixed(1)} L${sx(p2[0]).toFixed(1)} ${sy(p2[1]).toFixed(1)}`)
    const q1 = T(-8, k)
    const q2 = T(8, k)
    lines.push(`M${sx(q1[0]).toFixed(1)} ${sy(q1[1]).toFixed(1)} L${sx(q2[0]).toFixed(1)} ${sy(q2[1]).toFixed(1)}`)
  }
  return lines.join(' ')
})

const origGrid = computed(() => {
  const lines = []
  for (let k = -4; k <= 4; k++) {
    lines.push(`M${sx(k)} ${sy(YMIN)} L${sx(k)} ${sy(YMAX)}`)
    lines.push(`M${sx(XMIN)} ${sy(k)} L${sx(XMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

const square = computed(() => {
  const pts = [T(0, 0), T(1, 0), T(1, 1), T(0, 1)]
    .map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
    .join(' ')
  return pts
})

const origSquare = computed(() =>
  [[0, 0], [1, 0], [1, 1], [0, 1]]
    .map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
    .join(' ')
)

const vectors = computed(() => [
  { id: 'i', label: 'î', color: 'var(--hud-accent)', x: m.a, y: m.c },
  { id: 'j', label: 'ĵ', color: 'var(--hud-warn)', x: m.b, y: m.d }
])

function arrowHead(vx, vy, color) {
  const px = sx(vx)
  const py = sy(vy)
  const cx = sx(0)
  const cy = sy(0)
  const dx = px - cx
  const dy = py - cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const ax = px - ux * 10
  const ay = py - uy * 10
  return `${px},${py} ${ax + uy * 4.5},${ay - ux * 4.5} ${ax - uy * 4.5},${ay + ux * 4.5}`
}

function toMath(evt) {
  const rect = svgEl.value.getBoundingClientRect()
  const x = XMIN + ((evt.clientX - rect.left) / rect.width) * (XMAX - XMIN)
  const y = YMIN + ((rect.bottom - evt.clientY) / rect.height) * (YMAX - YMIN)
  return { x, y }
}

function onDown(id) {
  dragging = id
}

function onMove(evt) {
  if (!dragging) return
  const { x, y } = toMath(evt)
  const cx = snap(x)
  const cy = snap(y)
  if (dragging === 'i') {
    m.a = cx
    m.c = cy
  } else {
    m.b = cx
    m.d = cy
  }
}

function onUp() {
  dragging = null
}

const sliders = computed(() => [
  { key: 'a', label: `a₁₁ = ${m.a.toFixed(1)}`, hint: 'î 的 x 分量' },
  { key: 'b', label: `a₁₂ = ${m.b.toFixed(1)}`, hint: 'ĵ 的 x 分量' },
  { key: 'c', label: `a₂₁ = ${m.c.toFixed(1)}`, hint: 'î 的 y 分量' },
  { key: 'd', label: `a₂₂ = ${m.d.toFixed(1)}`, hint: 'ĵ 的 y 分量' }
])

function set(key, v) {
  m[key] = Math.round(v * 10) / 10
}

const PRESETS = [
  { name: '单位', v: { a: 1, b: 0, c: 0, d: 1 } },
  { name: '旋转 45°', v: { a: 0.7, b: -0.7, c: 0.7, d: 0.7 } },
  { name: '剪切', v: { a: 1, b: 1, c: 0, d: 1 } },
  { name: '投影', v: { a: 1, b: 1, c: 1, d: 1 } },
  { name: '镜像', v: { a: -1, b: 0, c: 0, d: 1 } },
  { name: '缩放', v: { a: 1.5, b: 0, c: 0, d: 0.5 } }
]

function apply(p) {
  Object.assign(m, p.v)
}

const tex = computed(
  () =>
    `A=\\begin{bmatrix} ${m.a.toFixed(1)} & ${m.b.toFixed(1)} \\\\ ${m.c.toFixed(1)} & ${m.d.toFixed(1)} \\end{bmatrix}`
)

const readouts = computed(() => [
  { label: 'det', value: det.value.toFixed(2) },
  { label: '面积 ×', value: Math.abs(det.value).toFixed(2) },
  { label: '状态', value: singular.value ? '奇异' : '可逆' }
])
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="t2-head">
      <div class="t2-title">
        <TitleTab text="实验 01" />
        <h3>二维线性变换</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="t2-rule" :split="56" />

    <div class="t2-body">
      <div class="t2-canvas">
        <svg
          ref="svgEl"
          :viewBox="`0 0 ${VW} ${VH}`"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointerleave="onUp"
        >
          <path :d="origGrid" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
          <path :d="imgGrid" fill="none" stroke="var(--hud-accent)" stroke-width="1" opacity="0.38" />
          <line :x1="sx(XMIN)" :y1="sy(0)" :x2="sx(XMAX)" :y2="sy(0)" stroke="var(--hud-dim)" stroke-width="1" />
          <line :x1="sx(0)" :y1="sy(YMIN)" :x2="sx(0)" :y2="sy(YMAX)" stroke="var(--hud-dim)" stroke-width="1" />

          <polygon
            :points="origSquare"
            fill="none"
            stroke="var(--hud-dim)"
            stroke-width="1"
            stroke-dasharray="4 4"
          />
          <polygon :points="square" fill="var(--hud-accent)" fill-opacity="0.16" stroke="var(--hud-accent)" stroke-width="1.2" />

          <g v-for="v in vectors" :key="v.id">
            <line
              :x1="sx(0)"
              :y1="sy(0)"
              :x2="sx(v.x)"
              :y2="sy(v.y)"
              :stroke="v.color"
              stroke-width="2"
            />
            <polygon :points="arrowHead(v.x, v.y, v.color)" :fill="v.color" />
            <circle
              :cx="sx(v.x)"
              :cy="sy(v.y)"
              r="11"
              fill="var(--hud-bg)"
              :stroke="v.color"
              stroke-width="2"
              class="t2-handle"
              @pointerdown="onDown(v.id)"
            />
            <text
              :x="sx(v.x) + 18"
              :y="sy(v.y) - 14"
              :fill="v.color"
              font-size="22"
              font-weight="700"
            >{{ v.label }}</text>
          </g>

          <text
            :x="sx(T(0.5, 0.5)[0]) + 12"
            :y="sy(T(0.5, 0.5)[1]) - 10"
            fill="var(--hud-ink)"
            font-size="20"
            font-weight="700"
          >det = {{ det.toFixed(2) }}</text>
        </svg>
      </div>

      <aside class="t2-panel">
        <div class="t2-matrix">
          <FormulaLine :tex="tex" size="19px" />
        </div>

        <div class="t2-sliders">
          <div v-for="s in sliders" :key="s.key" class="t2-slider">
            <HudSlider
              :model-value="m[s.key]"
              :min="-2"
              :max="2"
              :step="0.1"
              :label="s.label"
              @update:model-value="(v) => set(s.key, v)"
            />
            <span class="t2-hint">{{ s.hint }}</span>
          </div>
        </div>

        <div class="t2-presets">
          <HudButton v-for="p in PRESETS" :key="p.name" @click="apply(p)">
            {{ p.name }}
          </HudButton>
        </div>

        <p class="t2-status" :class="{ warn: singular }">
          <template v-if="singular">
            奇异：两列共线，平面被压成一条线.落在线上的目标有无穷多解，线外无解.
          </template>
          <template v-else>
            可逆：平面被均匀拉扯，面积缩放 {{ Math.abs(det).toFixed(2) }} 倍，任何目标向量都有唯一来源.
          </template>
        </p>
        <p class="t2-note">
          拖动 î、ĵ 的端点，或者用左侧滑块改矩阵.虚线的单位正方形被映成实线平行四边形，它的有向面积就是 det.
        </p>
      </aside>
    </div>
  </HudFrame>
</template>

<style scoped>
.t2-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.t2-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.t2-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.t2-rule {
  margin: 20px 0 24px;
}
.t2-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}
.t2-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
}
.t2-handle {
  cursor: grab;
}
.t2-handle:active {
  cursor: grabbing;
}
.t2-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px 24px;
  align-items: start;
}
.t2-panel > * {
  min-width: 0;
}
.t2-matrix,
.t2-sliders,
.t2-presets,
.t2-status,
.t2-note {
  grid-column: 1 / -1;
}
.t2-matrix {
  padding: 14px;
  border: 1px solid var(--hud-faint);
  background: var(--hud-tint);
}
.t2-sliders {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 18px;
}
.t2-slider {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.t2-hint {
  font-size: 11.5px;
  color: var(--hud-dim);
}
.t2-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.t2-status {
  margin: 0;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.t2-status.warn {
  border-left-color: var(--hud-warn);
  color: var(--hud-warn);
}
.t2-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
