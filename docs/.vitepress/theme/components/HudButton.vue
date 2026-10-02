<script setup>
defineProps({
  variant: { type: String, default: 'ghost' },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['click'])
</script>

<template>
  <button
    class="hud-btn"
    :class="variant"
    :disabled="disabled"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.hud-btn {
  padding: 5px 16px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.6;
  cursor: pointer;
  background: none;
  border: 1px solid var(--hud-dim);
  color: var(--hud-ink);
}
.hud-btn:hover:not(:disabled) {
  border-color: var(--hud-accent);
  color: var(--hud-accent);
}
.hud-btn.primary {
  background: var(--hud-accent);
  border-color: var(--hud-accent);
  color: var(--hud-bg);
}
.hud-btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
  color: var(--hud-bg);
}
.hud-btn.danger {
  border-color: var(--hud-crit);
  color: var(--hud-crit);
}
.hud-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
