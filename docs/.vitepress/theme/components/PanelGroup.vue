<script setup>
defineProps({
  title: { type: String, default: '' },
  flush: { type: Boolean, default: false }
})
</script>

<template>
  <section class="panel-group" :class="{ flush }">
    <header v-if="title" class="pg-head">
      <span class="pg-title">{{ title }}</span>
      <span class="pg-line" />
    </header>
    <slot />
  </section>
</template>

<style scoped>
.panel-group {
  background: var(--hud-tint);
  padding: 22px 20px;
}
.panel-group.flush {
  background: none;
  padding: 0;
}
.pg-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.pg-title {
  font-size: 13px;
  color: var(--hud-dim);
  white-space: nowrap;
}
.pg-line {
  flex: 1;
  border-top: 1px solid var(--hud-faint);
}
</style>
