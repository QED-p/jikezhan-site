<script setup>
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: [Number, String], default: undefined },
  suffix: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

function onInput(evt) {
  const raw = evt.target.value
  emit('update:modelValue', props.type === 'number' ? Number(raw) : raw)
}
</script>

<template>
  <label class="hud-input">
    <span v-if="label" class="hi-label">{{ label }}</span>
    <span class="hi-box">
      <input
        class="hi-field"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        :step="step"
        spellcheck="false"
        @input="onInput"
      />
      <span v-if="suffix" class="hi-suffix">{{ suffix }}</span>
    </span>
  </label>
</template>

<style scoped>
.hud-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.hi-label {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.hi-box {
  display: flex;
  align-items: center;
  border: 1px solid var(--hud-dim);
  background: var(--hud-bg);
}
.hi-box:focus-within {
  border-color: var(--hud-accent);
}
.hi-field {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  background: none;
  border: none;
  outline: none;
  color: var(--hud-ink);
  font-family: inherit;
  font-size: 13.5px;
}
.hi-field::placeholder {
  color: var(--hud-dim);
  opacity: 0.8;
}
.hi-suffix {
  padding: 0 10px;
  font-size: 12.5px;
  color: var(--hud-dim);
  white-space: nowrap;
}
</style>
