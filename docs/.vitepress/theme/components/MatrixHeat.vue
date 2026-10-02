<script setup>
import { computed } from 'vue'
import LeaderLabel from './LeaderLabel.vue'

const props = defineProps({
  matrix: { type: Array, required: true },
  rowLabels: { type: Array, default: () => [] },
  colLabels: { type: Array, default: () => [] },
  selected: { type: Object, default: null },
  cellW: { type: Number, default: 58 },
  cellH: { type: Number, default: 44 },
  gap: { type: Number, default: 2 },
  labelW: { type: Number, default: 150 },
  hot: { type: Number, default: 0.8 },
  gamma: { type: Number, default: 0.7 },
  base: { type: Number, default: 0.1 },
  showIndex: { type: Boolean, default: true },
  showHeaders: { type: Boolean, default: true },
  scan: { type: Boolean, default: true },
  scanDuration: { type: Number, default: 9 },
  callout: { type: String, default: '' },
  calloutWidth: { type: Number, default: 190 }
})
const emit = defineEmits(['cell-enter', 'cell-leave', 'cell-click'])

const n = computed(() => props.matrix.length)
const m = computed(() => props.matrix[0]?.length ?? 0)
const amax = computed(() => Math.max(...props.matrix.flat(), 1e-9))
const gap = computed(() => props.gap)

const gridStyle = computed(() => ({
  gridTemplateColumns: `${props.showIndex ? 30 : 0}px ${props.labelW}px repeat(${m.value}, ${props.cellW}px)`,
  gridTemplateRows: `${props.showIndex ? 18 : 0}px ${props.showHeaders ? 34 : 0}px repeat(${n.value}, ${props.cellH}px)`,
  gap: gap.value + 'px'
}))

const cellsX = computed(() => (props.showIndex ? 30 + gap.value : 0) + props.labelW + gap.value)
const cellsY = computed(
  () => (props.showIndex ? 18 + gap.value : 0) + (props.showHeaders ? 34 + gap.value : 0)
)
const totalW = computed(() => cellsX.value + m.value * props.cellW + (m.value - 1) * gap.value)
const totalH = computed(() => cellsY.value + n.value * props.cellH + (n.value - 1) * gap.value)

const fillOf = (v) => {
  const r = v / amax.value
  return {
    background: r > props.hot ? 'var(--hud-hot)' : 'var(--hud-accent)',
    opacity: (props.base + (1 - props.base) * Math.pow(r, props.gamma)).toFixed(3)
  }
}

const sel = computed(() => props.selected)
const selGeom = computed(() => {
  if (!sel.value) return null
  const left = cellsX.value + sel.value.c * (props.cellW + gap.value)
  const top = cellsY.value + sel.value.r * (props.cellH + gap.value)
  const cy = top + props.cellH / 2
  const flip = left + props.cellW + props.calloutWidth + 40 > totalW.value
  const anchorX = flip ? left - 14 : left + props.cellW + 14
  return { left, top, right: left + props.cellW, cy, flip, anchorX }
})

const scanKeyframes = computed(
  () => `@keyframes mh-scan-${props.scanDuration} { 0% { transform: translateY(0); }
    92%, 100% { transform: translateY(${(n.value - 1) * (props.cellH + gap.value)}px); } }`
)
const scanStyle = computed(() => ({
  gridColumn: `3 / -1`,
  gridRow: 3,
  height: props.cellH + 'px',
  animation: `mh-scan-${props.scanDuration} ${props.scanDuration}s linear infinite`
}))
</script>

<template>
  <div class="matrix-heat" :style="{ width: totalW + 'px' }">
    <component :is="'style'">{{ scanKeyframes }}</component>
    <div class="mh-grid" :style="gridStyle">
      <template v-if="showIndex">
        <span
          v-for="(l, j) in colLabels"
          :key="'ci' + j"
          class="mh-cidx hud-num"
          :style="{ gridColumn: j + 3, gridRow: 1 }"
        >{{ String(j).padStart(2, '0') }}</span>
        <span
          v-for="(l, i) in rowLabels"
          :key="'ri' + i"
          class="mh-ridx hud-num"
          :style="{ gridColumn: 1, gridRow: i + 3 }"
        >{{ String(i).padStart(2, '0') }}</span>
      </template>

      <template v-if="showHeaders" v-for="(l, j) in colLabels" :key="'ch' + j">
        <span
          class="mh-chead"
          :class="{ sel: sel && sel.c === j }"
          :style="{ gridColumn: j + 3, gridRow: 2 }"
        >{{ l }}</span>
      </template>
      <template v-for="(l, i) in rowLabels" :key="'rl' + i">
        <span
          class="mh-rlabel"
          :class="{ sel: sel && sel.r === i }"
          :style="{ gridColumn: 2, gridRow: i + 3 }"
        >{{ l }}</span>
      </template>

      <template v-for="(row, i) in matrix" :key="'r' + i">
        <div
          v-for="(v, j) in row"
          :key="'c' + i + '-' + j"
          class="mh-cell"
          :style="[fillOf(v), { gridColumn: j + 3, gridRow: i + 3 }]"
          @mouseenter="emit('cell-enter', { r: i, c: j, v })"
          @mouseleave="emit('cell-leave', { r: i, c: j, v })"
          @click="emit('cell-click', { r: i, c: j, v })"
        />
      </template>

      <div v-if="scan && n > 1" class="mh-scan" :style="scanStyle" />

      <div
        v-if="sel"
        class="mh-sel"
        :style="{ gridColumn: sel.c + 3, gridRow: sel.r + 3 }"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M0 15V0h15 M85 0h15v15 M100 85v15h-15 M15 100H0V85"
            fill="none"
            stroke="var(--hud-hot)"
            stroke-width="1.6"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>

    <svg
      v-if="sel && callout"
      class="mh-leader"
      :width="totalW"
      :height="totalH"
      aria-hidden="true"
    >
      <line
        :x1="selGeom.flip ? selGeom.left - 1 : selGeom.right + 1"
        :y1="selGeom.cy"
        :x2="selGeom.anchorX"
        :y2="selGeom.cy"
        stroke="var(--hud-hot)"
        stroke-width="1"
        opacity="0.75"
      />
      <rect
        :x="(selGeom.flip ? selGeom.left - 3 : selGeom.right - 1)"
        :y="selGeom.cy - 2"
        width="4"
        height="4"
        fill="var(--hud-hot)"
      />
    </svg>
    <div
      v-if="sel && callout"
      class="mh-callout"
      :style="{
        left: (selGeom.flip ? selGeom.anchorX - calloutWidth : selGeom.anchorX) + 'px',
        top: selGeom.cy + 'px',
        width: calloutWidth + 'px',
        textAlign: selGeom.flip ? 'right' : 'left'
      }"
    >
      <LeaderLabel variant="accent">{{ callout }}</LeaderLabel>
    </div>
  </div>
</template>

<style scoped>
.matrix-heat {
  position: relative;
}
.mh-grid {
  display: grid;
}
.mh-cell {
  cursor: pointer;
}
.mh-cell:hover {
  filter: brightness(1.35);
}
.mh-cidx,
.mh-ridx {
  font-size: 12px;
  color: var(--hud-dim);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mh-chead {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hud-dim);
  color: var(--hud-ink);
  font-size: 13.5px;
  overflow: hidden;
}
.mh-chead.sel {
  background: var(--hud-accent);
  border-color: var(--hud-accent);
  color: var(--hud-bg);
  font-weight: 600;
}
.mh-rlabel {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  border: 1px solid var(--hud-dim);
  color: var(--hud-ink);
  font-size: 13.5px;
}
.mh-rlabel.sel {
  background: var(--hud-accent);
  border-color: var(--hud-accent);
  color: var(--hud-bg);
  font-weight: 600;
}
.mh-scan {
  z-index: 2;
  pointer-events: none;
  position: relative;
  background: color-mix(in srgb, var(--hud-accent) 13%, transparent);
  border-top: 1px solid var(--hud-accent);
}
.mh-scan::after {
  content: '';
  position: absolute;
  right: -3px;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-top: -3px;
  background: var(--hud-accent);
}
.mh-sel {
  z-index: 3;
  pointer-events: none;
  margin: -3px;
}
.mh-sel svg {
  width: 100%;
  height: 100%;
  display: block;
}
.mh-leader {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 4;
}
.mh-callout {
  position: absolute;
  transform: translateY(-50%);
  z-index: 5;
  pointer-events: none;
}
</style>
