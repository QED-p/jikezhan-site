<script setup>
import { ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudButton from './HudButton.vue'

const QQ = '1124339004'
const copied = ref(false)
let timer = 0

async function copy() {
  try {
    await navigator.clipboard.writeText(QQ)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = QQ
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } catch {}
    document.body.removeChild(ta)
  }
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="jc-wrap" data-palette="violet">
    <HudFrame palette="violet" compact>
      <div class="jc-inner">
        <div class="jc-text">
          <h2>加入极客栈</h2>
          <p>社团交流 · 教程催更 · 实验反馈，都在这一个群里.</p>
        </div>
        <div class="jc-qq">
          <span class="jc-tag">QQ 群</span>
          <span class="jc-number">{{ QQ }}</span>
          <HudButton @click="copy">{{ copied ? '已复制 ✓' : '复制群号' }}</HudButton>
        </div>
      </div>
    </HudFrame>
  </div>
</template>

<style scoped>
.jc-wrap {
  max-width: 1152px;
  margin: 26px auto 44px;
  padding: 0 24px;
}
.jc-wrap :deep(.hf-vf) {
  display: none;
}
.jc-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px 40px;
  padding: 4px 14px 12px;
}
.jc-text h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
  border: none;
  padding: 0;
}
.jc-text p {
  margin: 0;
  font-size: 13.5px;
  color: var(--hud-dim);
}
.jc-qq {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.jc-tag {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.jc-number {
  font-family: ui-monospace, 'JetBrains Mono', 'Noto Sans Mono', monospace;
  flex-shrink: 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--hud-accent);
  font-variant-numeric: tabular-nums;
}
</style>
