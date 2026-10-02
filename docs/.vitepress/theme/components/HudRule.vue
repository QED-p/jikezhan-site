<script setup>
defineProps({
  split: { type: Number, default: 64 }
})
</script>

<template>
  <div class="hud-rule" aria-hidden="true">
    <span class="hr-a" :style="{ width: split + '%' }" />
    <span class="hr-step" />
    <span class="hr-b" />
  </div>
</template>

<style scoped>
.hud-rule {
  display: flex;
  align-items: flex-start;
  height: 14px;
}
.hr-a {
  border-top: 1px solid var(--hud-dim);
}
.hr-step {
  width: 12px;
  height: 13px;
  margin-top: -1px;
  border-right: 1px solid var(--hud-dim);
  border-bottom: 1px solid var(--hud-dim);
}
.hr-b {
  flex: 1;
  margin-top: 12px;
  border-top: 1px solid var(--hud-dim);
}
</style>
