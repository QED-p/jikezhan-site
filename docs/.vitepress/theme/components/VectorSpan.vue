<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'
import ValueChips from './ValueChips.vue'

const VW = 720
const VH = 540
const XMIN = -4
const XMAX = 4
const YMIN = -3
const YMAX = 3
const EPS = 1e-9

const svgEl = ref(null)
const v1 = reactive({ x: 1, y: 0 })
const v2 = reactive({ x: 0, y: 1 })
const v3 = reactive({ x: 1, y: 1 })
const showV3 = ref(false)
const target = reactive({ x: 1.5, y: 0.8 })
let dragging = null

const sx = (x) => ((x - XMIN) / (XMAX - XMIN)) * VW
const sy = (y) => VH - ((y - YMIN) / (YMAX - YMIN)) * VH

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const snap = (v) => Math.round(clamp(v, -2.5, 2.5) * 10) / 10

const det = computed(() => v1.x * v2.y - v1.y * v2.x)
const independent = computed(() => Math.abs(det.value) > 1e-6 * 1)
const zeroSpan = computed(
  () => Math.hypot(v1.x, v1.y) < 0.05 && Math.hypot(v2.x, v2.y) < 0.05
)

const spanKind = computed(() => {
  if (zeroSpan.value) return '点'
  return independent.value ? '平面' : '直线'
})

const isBasis = computed(() => independent.value && !showV3.value)

const coords = computed(() => {
  if (!independent.value) return null
  const a = v1.x
  const b = v2.x
  const c = v1.y
  const d = v2.y
  const w = target
  const c1 = (d * w.x - b * w.y) / det.value
  const c2 = (-c * w.x + a * w.y) / det.value
  return { c1, c2 }
})

const targetOnLine = computed(() => {
  if (independent.value) return true
  if (zeroSpan.value) return Math.hypot(target.x, target.y) < 0.05
  const dir = Math.hypot(v1.x, v1.y) > 0.05 ? v1 : v2
  const cross = dir.x * target.y - dir.y * target.x
  return Math.abs(cross) / Math.hypot(dir.x, dir.y) < 0.08
})

const lattice = computed(() => {
  if (!independent.value) return ''
  const lines = []
  const mv = (x, y) => [v1.x * x + v2.x * y, v1.y * x + v2.y * y]
  for (let k = -8; k <= 8; k++) {
    const p1 = mv(k, -8)
    const p2 = mv(k, 8)
    lines.push(`M${sx(p1[0]).toFixed(1)} ${sy(p1[1]).toFixed(1)} L${sx(p2[0]).toFixed(1)} ${sy(p2[1]).toFixed(1)}`)
    const q1 = mv(-8, k)
    const q2 = mv(8, k)
    lines.push(`M${sx(q1[0]).toFixed(1)} ${sy(q1[1]).toFixed(1)} L${sx(q2[0]).toFixed(1)} ${sy(q2[1]).toFixed(1)}`)
  }
  return lines.join(' ')
})

const spanLine = computed(() => {
  if (independent.value || zeroSpan.value) return null
  const dir = Math.hypot(v1.x, v1.y) > 0.05 ? v1 : v2
  const L = 8
  const p1 = { x: -dir.x * L, y: -dir.y * L }
  const p2 = { x: dir.x * L, y: dir.y * L }
  return { x1: sx(p1.x), y1: sy(p1.y), x2: sx(p2.x), y2: sy(p2.y) }
})

const gridPath = computed(() => {
  const lines = []
  for (let k = -4; k <= 4; k++) {
    lines.push(`M${sx(k)} ${sy(YMIN)} L${sx(k)} ${sy(YMAX)}`)
    lines.push(`M${sx(XMIN)} ${sy(k)} L${sx(XMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

const arrows = computed(() => {
  const list = [
    { id: 'v1', label: 'v₁', color: 'var(--hud-accent)', x: v1.x, y: v1.y },
    { id: 'v2', label: 'v₂', color: 'var(--hud-warn)', x: v2.x, y: v2.y }
  ]
  if (showV3.value) {
    list.push({ id: 'v3', label: 'v₃', color: 'var(--hud-good)', x: v3.x, y: v3.y })
  }
  return list
})

function arrowHead(vx, vy) {
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
  if (dragging === 'v1') Object.assign(v1, { x: cx, y: cy })
  else if (dragging === 'v2') Object.assign(v2, { x: cx, y: cy })
  else if (dragging === 'v3') Object.assign(v3, { x: cx, y: cy })
  else if (dragging === 'w') Object.assign(target, { x: cx, y: cy })
}

function onUp() {
  dragging = null
}

const PRESETS = [
  { name: '标准基', v: { v1: { x: 1, y: 0 }, v2: { x: 0, y: 1 }, v3: null } },
  { name: '斜基', v: { v1: { x: 1, y: 0 }, v2: { x: 0.6, y: 1 }, v3: null } },
  { name: '共线', v: { v1: { x: 1, y: 0.5 }, v2: { x: 2, y: 1 }, v3: null } },
  { name: '冗余', v: { v1: { x: 1, y: 0 }, v2: { x: 0, y: 1 }, v3: { x: 1, y: 1 } } }
]

function apply(p) {
  Object.assign(v1, p.v.v1)
  Object.assign(v2, p.v.v2)
  if (p.v.v3) {
    Object.assign(v3, p.v.v3)
    showV3.value = true
  } else {
    showV3.value = false
  }
}

const readouts = computed(() => [
  { label: '张成', value: spanKind.value },
  { label: '无关', value: showV3.value ? '否' : independent.value ? '是' : '否' },
  { label: '基', value: isBasis.value ? '是' : '否' },
  { label: '维数', value: spanKind.value === '平面' ? '2' : spanKind.value === '直线' ? '1' : '0' }
])

const statusText = computed(() => {
  if (showV3.value) {
    return '平面上的第三个向量必然多余：它总能被 v₁、v₂ 拼出来，所以整组线性相关，不再是基.'
  }
  if (spanKind.value === '平面') {
    return '这是一组基：平面上每个向量都能被唯一地写成 c₁v₁ + c₂v₂.拖动目标 w，看它的坐标怎么跟着变.'
  }
  if (spanKind.value === '直线') {
    return targetOnLine.value
      ? '两向量共线，张成退化成直线.目标恰好在线上：配方有无穷多组.'
      : '两向量共线，张成退化成直线.目标离开了这条线，怎么拼都够不到.'
  }
  return '两个向量都退化了，张成只剩原点.'
})

const coordValues = computed(() => {
  if (!coords.value) return null
  return [coords.value.c1.toFixed(2), coords.value.c2.toFixed(2)]
})
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="vs-head">
      <div class="vs-title">
        <TitleTab text="实验 02" />
        <h3>张成、无关与基</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="vs-rule" :split="56" />

    <div class="vs-body">
      <div class="vs-canvas">
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

          <path v-if="lattice" :d="lattice" fill="none" stroke="var(--hud-accent)" stroke-width="1" opacity="0.22" />
          <line
            v-if="spanLine"
            :x1="spanLine.x1"
            :y1="spanLine.y1"
            :x2="spanLine.x2"
            :y2="spanLine.y2"
            stroke="var(--hud-accent)"
            stroke-width="5"
            opacity="0.28"
          />

          <g v-if="coords">
            <line
              :x1="sx(0)"
              :y1="sy(0)"
              :x2="sx(v1.x * coords.c1)"
              :y2="sy(v1.y * coords.c1)"
              stroke="var(--hud-warn)"
              stroke-width="1.4"
              stroke-dasharray="5 4"
            />
            <line
              :x1="sx(v1.x * coords.c1)"
              :y1="sy(v1.y * coords.c1)"
              :x2="sx(target.x)"
              :y2="sy(target.y)"
              stroke="var(--hud-warn)"
              stroke-width="1.4"
              stroke-dasharray="5 4"
            />
          </g>

          <g v-for="a in arrows" :key="a.id">
            <line :x1="sx(0)" :y1="sy(0)" :x2="sx(a.x)" :y2="sy(a.y)" :stroke="a.color" stroke-width="2.2" />
            <polygon :points="arrowHead(a.x, a.y)" :fill="a.color" />
            <text :x="sx(a.x) + 16" :y="sy(a.y) - 12" :fill="a.color" font-size="20" font-weight="700">{{ a.label }}</text>
            <circle
              :cx="sx(a.x)"
              :cy="sy(a.y)"
              r="10"
              fill="var(--hud-bg)"
              :stroke="a.color"
              stroke-width="2"
              class="vs-handle"
              @pointerdown="onDown(a.id)"
            />
          </g>

          <g>
            <line :x1="sx(0)" :y1="sy(0)" :x2="sx(target.x)" :y2="sy(target.y)" stroke="var(--hud-hot)" stroke-width="2" />
            <polygon :points="arrowHead(target.x, target.y)" fill="var(--hud-hot)" />
            <text :x="sx(target.x) + 16" :y="sy(target.y) + 22" fill="var(--hud-hot)" font-size="20" font-weight="700">w</text>
            <circle
              :cx="sx(target.x)"
              :cy="sy(target.y)"
              r="10"
              fill="var(--hud-bg)"
              stroke="var(--hud-hot)"
              stroke-width="2"
              class="vs-handle"
              @pointerdown="onDown('w')"
            />
          </g>
        </svg>
      </div>

      <div class="vs-panel">
        <div class="vs-coords">
          <span class="vs-label">目标 w 在这组向量下的坐标</span>
          <ValueChips v-if="coordValues" :values="coordValues" label="坐标" />
          <span v-else class="vs-note-inline">
            {{ targetOnLine ? '共线：坐标有无穷多组' : '共线：目标不在张成里，没有坐标' }}
          </span>
        </div>
        <div class="vs-presets">
          <HudButton v-for="p in PRESETS" :key="p.name" @click="apply(p)">{{ p.name }}</HudButton>
        </div>
        <p class="vs-status">{{ statusText }}</p>
        <p class="vs-note">
          拖动 v₁、v₂、w 的端点.虚线网格是 v₁ 与 v₂ 张成的格点，虚线折线是 w 的配方：先走 c₁ 步 v₁，再走 c₂ 步 v₂.
        </p>
      </div>
    </div>
  </HudFrame>
</template>

<style scoped>
.vs-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.vs-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.vs-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.vs-rule {
  margin: 20px 0 24px;
}
.vs-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
}
.vs-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
}
.vs-handle {
  cursor: grab;
}
.vs-handle:active {
  cursor: grabbing;
}
.vs-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.vs-coords {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.vs-label {
  font-size: 13px;
  color: var(--hud-dim);
}
.vs-note-inline {
  font-size: 13.5px;
  color: var(--hud-warn);
}
.vs-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.vs-status {
  margin: 0;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.vs-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
