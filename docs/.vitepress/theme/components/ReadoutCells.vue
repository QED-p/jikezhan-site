<script setup>
defineProps({
  items: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="readouts">
    <div v-for="(it, i) in items" :key="i" class="ro">
      <span class="ro-label">{{ it.label }}</span>
      <span class="ro-value hud-num">{{ it.value }}</span>
    </div>
  </div>
</template>

<style scoped>
.readouts {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 30px;
}
@media (max-width: 640px) {
  .readouts {
    gap: 8px 16px;
  }
}
.ro {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ro-label {
  font-size: 13px;
  color: var(--hud-dim);
}
.ro-value {
  padding: 3px 9px;
  background: var(--hud-accent);
  color: var(--hud-bg);
  font-size: 14px;
}
</style>
