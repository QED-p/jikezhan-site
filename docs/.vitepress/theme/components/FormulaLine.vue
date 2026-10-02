<script setup>
import { computed } from 'vue'
import katex from 'katex'

const props = defineProps({
  tex: { type: String, required: true },
  display: { type: Boolean, default: false },
  size: { type: String, default: '' }
})

const html = computed(() =>
  katex.renderToString(props.tex, {
    throwOnError: false,
    displayMode: props.display
  })
)
</script>

<template>
  <span
    class="formula"
    :style="size ? { fontSize: size } : null"
    v-html="html"
  />
</template>

<style scoped>
.formula {
  color: var(--hud-ink);
}
</style>
