<script setup>
defineProps({
  label: { type: String, default: '' },
  values: { type: Array, default: () => [] },
  highlight: { type: Number, default: -1 },
  format: { type: Function, default: null }
})
</script>

<template>
  <div class="value-chips">
    <span v-if="label" class="vc-label">{{ label }}</span>
    <span
      v-for="(v, i) in values"
      :key="i"
      class="vc-chip hud-num"
      :class="{ hot: i === highlight }"
    >{{ format ? format(v) : v }}</span>
  </div>
</template>

<style scoped>
.value-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.vc-label {
  width: 64px;
  padding: 3px 9px;
  margin-right: 12px;
  border: 1px solid var(--hud-dim);
  color: var(--hud-ink);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}
.vc-chip {
  min-width: 42px;
  padding: 3px 6px;
  border: 1px solid var(--hud-dim);
  color: var(--hud-ink);
  font-size: 12.5px;
  text-align: center;
}
.vc-chip.hot {
  border-color: var(--hud-accent);
  background: var(--hud-accent);
  color: var(--hud-bg);
}
</style>
