<script setup>
import { computed } from 'vue'

const props = defineProps({
  seed: { type: Number, default: 7 },
  n: { type: Number, default: 56 },
  width: { type: Number, default: 300 },
  height: { type: Number, default: 48 },
  points: { type: Array, default: null }
})

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const d = computed(() => {
  const h = props.height
  const w = props.width
  let pts = props.points
  if (!pts) {
    const rng = mulberry32(props.seed)
    pts = []
    let v = 0
    for (let i = 0; i < props.n; i++) {
      v = v * 0.72 + (rng() * 2 - 1) * 0.55
      v = Math.max(-1, Math.min(1, v))
      pts.push({ x: (w * i) / (props.n - 1), y: h / 2 + v * h * 0.4 })
    }
  }
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
})
</script>

<template>
  <svg
    class="wave"
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="none"
    role="img"
  >
    <path :d="d" fill="none" stroke="var(--hud-dim)" stroke-width="1" vector-effect="non-scaling-stroke" />
    <line
      :x1="0"
      :y1="height / 2"
      :x2="width"
      :y2="height / 2"
      stroke="var(--hud-faint)"
      stroke-width="1"
      stroke-dasharray="3 6"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<style scoped>
.wave {
  display: block;
  width: 100%;
  height: auto;
}
</style>
