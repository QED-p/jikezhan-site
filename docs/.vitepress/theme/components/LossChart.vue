<script setup>
import { computed } from 'vue'

const props = defineProps({
  train: { type: Array, default: () => [] },
  val: { type: Array, default: () => [] },
  width: { type: Number, default: 560 },
  height: { type: Number, default: 200 },
  log: { type: Boolean, default: true }
})

const PAD = { l: 40, r: 12, t: 10, b: 22 }

const clampL = (l) => Math.max(l, 1e-3)

const scale = computed(() => {
  const all = [...props.train.map((d) => d.l), ...props.val.map((d) => d.l)]
  const maxS = Math.max(
    1,
    props.train.length ? props.train[props.train.length - 1].s : 1,
    props.val.length ? props.val[props.val.length - 1].s : 1
  )
  const maxL = Math.max(0.1, ...all)
  if (props.log) {
    const logs = all.map((l) => Math.log(clampL(l)))
    const lo = Math.min(...logs)
    const hi = Math.max(...logs)
    const pad = (hi - lo) * 0.08 + 0.02
    return { maxS, mode: 'log', lo: lo - pad, hi: hi + pad, maxL }
  }
  return { maxS, mode: 'linear', maxL: maxL * 1.08 }
})

const xOf = (s) =>
  PAD.l + ((props.width - PAD.l - PAD.r) * s) / scale.value.maxS
const yOf = (l) => {
  const inner = props.height - PAD.t - PAD.b
  if (scale.value.mode === 'log') {
    const t = (Math.log(clampL(l)) - scale.value.lo) / (scale.value.hi - scale.value.lo)
    return props.height - PAD.b - inner * Math.min(1, Math.max(0, t))
  }
  return props.height - PAD.b - (inner * l) / scale.value.maxL
}

const path = (arr) =>
  arr.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(d.s).toFixed(1)} ${yOf(d.l).toFixed(1)}`).join(' ')

const trainPath = computed(() => path(props.train))
const valPath = computed(() => path(props.val))

const NICE = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]

const gridLines = computed(() => {
  if (scale.value.mode === 'log') {
    return NICE.filter((v) => {
      const t = (Math.log(v) - scale.value.lo) / (scale.value.hi - scale.value.lo)
      return t >= -0.02 && t <= 1.02
    }).map((v) => ({ y: yOf(v), label: v < 1 ? String(v) : String(v) }))
  }
  const ys = []
  for (let i = 0; i <= 4; i++) {
    const l = (scale.value.maxL * i) / 4
    ys.push({ y: yOf(l), label: l.toFixed(2) })
  }
  return ys
})

const empty = computed(() => props.train.length === 0 && props.val.length === 0)
</script>

<template>
  <div class="loss-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none">
      <line
        v-for="g in gridLines"
        :key="g.label"
        :x1="PAD.l"
        :y1="g.y"
        :x2="width - PAD.r"
        :y2="g.y"
        stroke="var(--hud-faint)"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <text
        v-for="g in gridLines"
        :key="'t' + g.label"
        :x="PAD.l - 6"
        :y="g.y + 4"
        fill="var(--hud-dim)"
        font-size="10"
        text-anchor="end"
      >{{ g.label }}</text>

      <line
        :x1="PAD.l"
        :y1="height - PAD.b"
        :x2="width - PAD.r"
        :y2="height - PAD.b"
        stroke="var(--hud-dim)"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <text
        :x="PAD.l"
        :y="height - 6"
        fill="var(--hud-dim)"
        font-size="10"
      >步数</text>
      <text
        :x="width - PAD.r"
        :y="height - 6"
        fill="var(--hud-dim)"
        font-size="10"
        text-anchor="end"
      >{{ scale.maxS }}</text>

      <path
        v-if="trainPath"
        :d="trainPath"
        fill="none"
        stroke="var(--hud-accent)"
        stroke-width="1.6"
        vector-effect="non-scaling-stroke"
      />
      <path
        v-if="valPath"
        :d="valPath"
        fill="none"
        stroke="var(--hud-warn)"
        stroke-width="1.4"
        stroke-dasharray="4 3"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <div v-if="empty" class="lc-empty">等待训练数据…</div>
    <div class="lc-legend">
      <span class="lc-item"><i class="dot train" />训练 loss</span>
      <span class="lc-item"><i class="dot val" />验证 loss</span>
    </div>
  </div>
</template>

<style scoped>
.loss-chart {
  position: relative;
}
.loss-chart svg {
  display: block;
  width: 100%;
  height: auto;
}
.lc-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--hud-dim);
  font-size: 13px;
}
.lc-legend {
  display: flex;
  gap: 18px;
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--hud-dim);
}
.lc-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 14px;
  height: 2px;
}
.dot.train {
  background: var(--hud-accent);
}
.dot.val {
  background: var(--hud-warn);
}
</style>
