<script setup>
defineProps({
  count: { type: Number, default: 5 },
  modelValue: { type: Number, default: 0 },
  labels: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="steps">
    <button
      v-for="i in count"
      :key="i"
      class="step"
      :class="{ active: i - 1 === modelValue }"
      :title="labels[i - 1] || `步骤 ${i}`"
      @click="emit('update:modelValue', i - 1)"
    />
  </div>
</template>

<style scoped>
.steps {
  display: flex;
  gap: 9px;
}
.step {
  width: 22px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--hud-dim);
  background: color-mix(in srgb, var(--hud-dim) 25%, transparent);
  cursor: pointer;
}
.step:hover {
  border-color: var(--hud-accent);
}
.step.active {
  border: 1.5px solid var(--hud-accent);
  background: none;
}
.step.active::after {
  content: '';
  display: block;
  width: 10px;
  height: 3px;
  margin: 18px auto 0;
  background: var(--hud-accent);
}
</style>
