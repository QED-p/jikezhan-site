<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: { type: Array, default: () => [] },
  highlight: { type: Number, default: -1 },
  height: { type: Number, default: 72 },
  minHeight: { type: Number, default: 8 },
  showValue: { type: Boolean, default: true },
  caption: { type: String, default: '' },
  labels: { type: Array, default: null }
})
const maxV = computed(() => Math.max(...props.values, 1e-9))
const hOf = (v) =>
  props.minHeight + (props.height - props.minHeight) * Math.sqrt(v / maxV.value)
const fmt = (v) => Number(v).toFixed(2)
</script>

<template>
  <div class="db">
    <div v-if="caption" class="db-caption">{{ caption }}</div>
    <div class="db-row" :style="{ minHeight: height + 22 + 'px' }">
      <div v-for="(v, i) in values" :key="i" class="db-slot">
        <span v-if="showValue && i === highlight" class="db-value hud-num">{{ fmt(v) }}</span>
        <div
          class="db-bar"
          :class="{ hot: i === highlight }"
          :style="{ height: hOf(v) + 'px', opacity: i === highlight ? 1 : 0.3 + 0.3 * (v / maxV) }"
        />
      </div>
    </div>
    <div class="db-base">
      <span v-for="(v, i) in values" :key="i" class="db-tick" />
    </div>
    <div v-if="labels" class="db-labels">
      <span v-for="(l, i) in labels" :key="i" class="db-label">{{ l }}</span>
    </div>
  </div>
</template>

<style scoped>
.db {
  display: flex;
  flex-direction: column;
}
.db-caption {
  font-size: 13px;
  color: var(--hud-dim);
  margin-bottom: 10px;
}
.db-row {
  display: flex;
  align-items: flex-end;
  gap: 3px;
}
.db-slot {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}
.db-value {
  font-size: 12px;
  color: var(--hud-hot);
  margin-bottom: 6px;
}
.db-bar {
  width: 26px;
  max-width: 90%;
  background: var(--hud-accent);
}
.db-bar.hot {
  box-shadow: inset 0 0 0 1px var(--hud-hot);
}
.db-base {
  display: flex;
  gap: 3px;
  border-top: 1px solid var(--hud-dim);
  padding-top: 3px;
}
.db-tick {
  flex: 1;
  height: 5px;
  border-left: 1px solid var(--hud-faint);
}
.db-labels {
  display: flex;
  gap: 3px;
  margin-top: 4px;
}
.db-label {
  flex: 1;
  font-size: 11px;
  color: var(--hud-dim);
  text-align: center;
}
</style>
