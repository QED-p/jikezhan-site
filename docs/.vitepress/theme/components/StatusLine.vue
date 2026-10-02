<script setup>
defineProps({
  status: { type: String, default: '就绪' },
  note: { type: String, default: '' },
  right: { type: String, default: '' },
  blink: { type: Boolean, default: true }
})
</script>

<template>
  <div class="status-line">
    <span class="sl-box">{{ status }}</span>
    <span v-if="blink" class="sl-blink hud-blink" />
    <span v-if="note" class="sl-note">{{ note }}</span>
    <span v-if="right" class="sl-right hud-num">{{ right }}</span>
  </div>
</template>

<style scoped>
.status-line {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sl-box {
  padding: 4px 10px;
  background: var(--hud-accent);
  color: var(--hud-bg);
  font-size: 13px;
  font-weight: 700;
}
.sl-blink {
  width: 8px;
  height: 8px;
  background: var(--hud-accent);
}
.sl-note {
  font-size: 13px;
  color: var(--hud-dim);
}
.sl-right {
  margin-left: auto;
  font-size: 13px;
  color: var(--hud-dim);
}
</style>
