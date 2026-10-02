<script setup>
defineProps({
  title: { type: String, default: '权重 图例' },
  stops: { type: Array, default: () => [0.1, 0.25, 0.4, 0.55, 0.72, 0.92] },
  low: { type: String, default: '低' },
  high: { type: String, default: '高' },
  caption: { type: String, default: '' }
})
</script>

<template>
  <div class="legend">
    <div class="lg-title">{{ title }}</div>
    <div class="lg-row">
      <span class="lg-end">{{ low }}</span>
      <span
        v-for="(o, i) in stops"
        :key="i"
        class="lg-chip"
        :style="{ opacity: o }"
      />
      <span class="lg-end">{{ high }}</span>
    </div>
    <div v-if="caption" class="lg-caption">{{ caption }}</div>
  </div>
</template>

<style scoped>
.legend {
  display: inline-flex;
  flex-direction: column;
  gap: 10px;
}
.lg-title {
  font-size: 13px;
  color: var(--hud-dim);
}
.lg-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lg-chip {
  width: 24px;
  height: 17px;
  background: var(--hud-accent);
}
.lg-end {
  font-size: 12px;
  color: var(--hud-dim);
  margin: 0 6px;
}
.lg-caption {
  font-size: 13px;
  color: var(--hud-dim);
}
</style>
