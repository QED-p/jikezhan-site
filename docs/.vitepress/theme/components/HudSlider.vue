<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 1 },
  step: { type: Number, default: 0.01 },
  label: { type: String, default: '' },
  ticks: { type: Number, default: 6 }
})
const emit = defineEmits(['update:modelValue'])

const pct = computed(() => {
  const t = (props.modelValue - props.min) / (props.max - props.min || 1)
  return Math.round(Math.min(1, Math.max(0, t)) * 1000) / 10
})
</script>

<template>
  <div class="hud-slider">
    <input
      class="hs-input"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :style="{ '--pct': pct + '%' }"
      @input="emit('update:modelValue', Number($event.target.value))"
    />
    <div class="hs-ticks">
      <span v-for="i in ticks" :key="i" class="hs-tick" />
    </div>
    <div v-if="label" class="hs-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.hud-slider {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.hs-input {
  appearance: none;
  width: 100%;
  height: 10px;
  margin: 0;
  background: linear-gradient(
    90deg,
    var(--hud-accent) var(--pct),
    var(--hud-faint) var(--pct)
  );
  background-size: 100% 1px;
  background-position: 0 50%;
  background-repeat: no-repeat;
  cursor: pointer;
}
.hs-input::-webkit-slider-thumb {
  appearance: none;
  width: 5px;
  height: 12px;
  background: var(--hud-accent);
  border: none;
  border-radius: 0;
}
.hs-input::-moz-range-thumb {
  width: 5px;
  height: 12px;
  background: var(--hud-accent);
  border: none;
  border-radius: 0;
}
.hs-input::-moz-range-track {
  background: none;
}
.hs-ticks {
  display: flex;
  justify-content: space-between;
}
.hs-tick {
  width: 1px;
  height: 5px;
  background: var(--hud-dim);
  opacity: 0.8;
}
.hs-label {
  font-size: 13px;
  color: var(--hud-dim);
}
</style>
