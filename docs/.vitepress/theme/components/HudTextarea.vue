<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  rows: { type: Number, default: 5 },
  maxlength: { type: Number, default: 4000 }
})
const emit = defineEmits(['update:modelValue'])
const count = computed(() => props.modelValue.length)
</script>

<template>
  <div class="hud-textarea">
    <div v-if="label" class="ht-head">
      <span class="ht-label">{{ label }}</span>
      <span class="ht-count hud-num">{{ count }} / {{ maxlength }}</span>
    </div>
    <textarea
      class="ht-input"
      :rows="rows"
      :maxlength="maxlength"
      :value="modelValue"
      spellcheck="false"
      @input="emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<style scoped>
.hud-textarea {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ht-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.ht-label {
  font-size: 13px;
  color: var(--hud-dim);
}
.ht-count {
  font-size: 12px;
  color: var(--hud-dim);
}
.ht-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--hud-bg);
  border: 1px solid var(--hud-dim);
  color: var(--hud-ink);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  resize: vertical;
  outline: none;
}
.ht-input:focus {
  border-color: var(--hud-accent);
}
</style>
