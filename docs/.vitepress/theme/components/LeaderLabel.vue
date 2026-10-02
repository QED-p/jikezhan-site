<script setup>
defineProps({
  variant: { type: String, default: 'accent' },
  text: { type: String, default: '' }
})
</script>

<template>
  <span class="leader-label" :class="variant">
    <slot>{{ text }}</slot>
  </span>
</template>

<style scoped>
.leader-label {
  display: inline-block;
  padding: 3px 10px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.5;
}
.leader-label.accent {
  background: var(--hud-accent);
  color: var(--hud-bg);
}
.leader-label.warn {
  border: 1px solid var(--hud-warn);
  color: var(--hud-warn);
}
.leader-label.dim {
  border: 1px solid var(--hud-dim);
  color: var(--hud-dim);
}
</style>
