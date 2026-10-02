<script setup>
defineProps({
  text: { type: String, required: true }
})
</script>

<template>
  <span class="title-tab">{{ text }}</span>
</template>

<style scoped>
.title-tab {
  display: inline-block;
  padding: 4px 11px;
  background: var(--hud-accent);
  color: var(--hud-bg);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}
</style>
