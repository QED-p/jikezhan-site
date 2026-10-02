<script setup>
import { computed } from 'vue'
import { parseSample } from '../labs/lm/sample-math.js'

const props = defineProps({
  text: { type: String, default: '' }
})

const parts = computed(() => parseSample(props.text))
</script>

<template>
  <span class="sample-text">
    <template v-for="(p, i) in parts" :key="i">
      <span v-if="!p.math" class="st-plain">{{ p.value }}</span>
      <span v-else class="st-math" :class="{ block: p.display }" v-html="p.html" />
    </template>
  </span>
</template>

<style scoped>
.sample-text {
  white-space: pre-wrap;
  word-break: break-all;
}
.st-plain {
  white-space: pre-wrap;
}
.st-math {
  white-space: normal;
}
.st-math.block {
  display: block;
  margin: 6px 0;
}
</style>
