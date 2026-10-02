<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'

const VW = 720
const VH = 540
const XMIN = -4
const XMAX = 4
const YMIN = -3
const YMAX = 3

const svgEl = ref(null)
const c1 = reactive({ x: 1.5, y: 0.5 })
const c2 = reactive({ x: 0.5, y: 1.5 })
const lastOp = ref('')
let dragging = null

const sx = (x) => ((x - XMIN) / (XMAX - XMIN)) * VW
const sy = (y) => VH - ((y - YMIN) / (YMAX - YMIN)) * VH
const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val))
const snap = (val) => Math.round(clamp(val, -2.5, 2.5) * 10) / 10

const det = computed(() => c1.x * c2.y - c1.y * c2.x)
const singular = computed(() => Math.abs(det.value) < 0.02)
const orientation = computed(() =>
  singular.value ? '退化' : det.value > 0 ? '逆时针' : '顺时针'
)
const areaColor = computed(() =>
  singular.value ? 'var(--hud-dim)' : det.value > 0 ? 'var(--hud-good)' : 'var(--hud-crit)'
)

const readouts = computed(() => [
  { label: 'det', value: det.value.toFixed(2) },
  { label: '面积', value: Math.abs(det.value).toFixed(2) },
  { label: '定向', value: orientation.value },
  { label: '状态', value: singular.value ? '退化' : '可逆' }
])

const parallelogram = computed(() => {
  const p0 = { x: 0, y: 0 }
  const p1 = { x: c1.x, y: c1.y }
  const p2 = { x: c1.x + c2.x, y: c1.y + c2.y }
  const p3 = { x: c2.x, y: c2.y }
  return [p0, p1, p2, p3]
    .map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(' ')
})

const gridPath = computed(() => {
  const lines = []
  for (let k = -4; k <= 4; k++) {
    lines.push(`M${sx(k)} ${sy(YMIN)} L${sx(k)} ${sy(YMAX)}`)
    lines.push(`M${sx(XMIN)} ${sy(k)} L${sx(XMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

const arrowHead = (vx, vy) => {
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

const vectors = computed(() => [
  { id: 'c1', label: 'c₁', color: 'var(--hud-accent)', p: c1 },
  { id: 'c2', label: 'c₂', color: 'var(--hud-warn)', p: c2 }
])

const toMath = (evt) => {
  const rect = svgEl.value.getBoundingClientRect()
  return {
    x: XMIN + ((evt.clientX - rect.left) / rect.width) * (XMAX - XMIN),
    y: YMIN + ((rect.bottom - evt.clientY) / rect.height) * (YMAX - YMIN)
  }
}

const onMove = (evt) => {
  if (!dragging) return
  const { x, y } = toMath(evt)
  const target = dragging === 'c1' ? c1 : c2
  Object.assign(target, { x: snap(x), y: snap(y) })
  lastOp.value = ''
}
const onUp = () => {
  dragging = null
}

function reset() {
  Object.assign(c1, { x: 1, y: 0 })
  Object.assign(c2, { x: 0, y: 1 })
  lastOp.value = '单位矩阵：det = 1.'
}
function shear() {
  c1.x = Math.round((c1.x + c2.x) * 10) / 10
  c1.y = Math.round((c1.y + c2.y) * 10) / 10
  lastOp.value = `倍加列（c₁ ← c₁ + c₂）：面积不变，det 仍是 ${det.value.toFixed(2)}.`
}
function swap() {
  const { x, y } = c1
  Object.assign(c1, c2)
  Object.assign(c2, { x, y })
  lastOp.value = `交换两列：面积不变、定向翻转，det 变成 ${det.value.toFixed(2)}.`
}
function double() {
  c1.x = Math.round(c1.x * 2 * 10) / 10
  c1.y = Math.round(c1.y * 2 * 10) / 10
  lastOp.value = `第一列乘 2：面积也乘 2，det 变成 ${det.value.toFixed(2)}.`
}
function makeCollinear() {
  Object.assign(c1, { x: 1, y: 1 })
  Object.assign(c2, { x: 2, y: 2 })
  lastOp.value = '两列共线：面积塌成 0，det = 0，矩阵不可逆.'
}
function makeGeneral() {
  Object.assign(c1, { x: 1.5, y: 0.5 })
  Object.assign(c2, { x: 0.5, y: 1.5 })
  lastOp.value = ''
}
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="da-head">
      <div class="da-title">
        <TitleTab text="实验 07" />
        <h3>行列式的三条公理</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="da-rule" :split="56" />

    <div class="da-modes">
      <span class="da-label">操作</span>
      <HudButton @click="shear">c₁ ← c₁ + c₂</HudButton>
      <HudButton @click="swap">交换两列</HudButton>
      <HudButton @click="double">c₁ ← 2c₁</HudButton>
      <span class="da-gap" />
      <HudButton @click="makeGeneral">一般</HudButton>
      <HudButton @click="reset">单位</HudButton>
      <HudButton @click="makeCollinear">共线</HudButton>
    </div>

    <div class="da-canvas">
      <svg
        ref="svgEl"
        :viewBox="`0 0 ${VW} ${VH}`"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      >
        <path :d="gridPath" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
        <line :x1="sx(XMIN)" :y1="sy(0)" :x2="sx(XMAX)" :y2="sy(0)" stroke="var(--hud-dim)" stroke-width="1" />
        <line :x1="sx(0)" :y1="sy(YMIN)" :x2="sx(0)" :y2="sy(YMAX)" stroke="var(--hud-dim)" stroke-width="1" />

        <polygon
          points="0,0 0,0 0,0 0,0"
          fill="none"
        />
        <polygon
          :points="`${sx(0)},${sy(0)} ${sx(1)},${sy(0)} ${sx(1)},${sy(1)} ${sx(0)},${sy(1)}`"
          fill="none"
          stroke="var(--hud-faint)"
          stroke-width="1"
          stroke-dasharray="4 4"
        />
        <polygon
          :points="parallelogram"
          :fill="areaColor"
          fill-opacity="0.16"
          :stroke="areaColor"
          stroke-width="1.6"
        />
        <text
          :x="sx((c1.x + c2.x) / 2) + 12"
          :y="sy((c1.y + c2.y) / 2) + 22"
          :fill="areaColor"
          font-size="18"
          font-weight="700"
        >面积 = {{ Math.abs(det).toFixed(2) }}</text>

        <g v-for="vec in vectors" :key="vec.id">
          <line :x1="sx(0)" :y1="sy(0)" :x2="sx(vec.p.x)" :y2="sy(vec.p.y)" :stroke="vec.color" stroke-width="2.2" />
          <polygon :points="arrowHead(vec.p.x, vec.p.y)" :fill="vec.color" />
          <text :x="sx(vec.p.x) + 14" :y="sy(vec.p.y) - 12" :fill="vec.color" font-size="20" font-weight="700">{{ vec.label }}</text>
          <circle
            :cx="sx(vec.p.x)"
            :cy="sy(vec.p.y)"
            r="10"
            fill="var(--hud-bg)"
            :stroke="vec.color"
            stroke-width="2"
            class="da-handle"
            @pointerdown="dragging = vec.id"
          />
        </g>
      </svg>
    </div>

    <p class="da-status" :class="{ warn: singular }">
      <template v-if="singular">
        两列共线：平行四边形塌成一条线段，有向面积为零，矩阵不可逆.
      </template>
      <template v-else>
        {{ orientation === '逆时针' ? '绿色 = 逆时针（正定向）' : '红色 = 顺时针（负定向）' }}，
        det 的绝对值是面积，符号是定向. {{ lastOp }}
      </template>
    </p>
    <p class="da-note">
      三个操作对应三条公理：每一列伸缩会把 det 同倍伸缩（多重线性）；交换两列让 det 变号（交错性）；
      单位矩阵的 det 是 1（归一化）. 拖动 c₁、c₂ 可以任意改这两列.
    </p>
  </HudFrame>
</template>

<style scoped>
.da-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.da-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.da-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.da-rule {
  margin: 20px 0 22px;
}
.da-modes {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.da-label {
  font-size: 12.5px;
  color: var(--hud-dim);
  margin-right: 4px;
}
.da-gap {
  width: 14px;
}
.da-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
}
.da-handle {
  cursor: grab;
}
.da-handle:active {
  cursor: grabbing;
}
.da-status {
  margin: 18px 0 10px;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-good);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.da-status.warn {
  border-left-color: var(--hud-warn);
  color: var(--hud-warn);
}
.da-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
