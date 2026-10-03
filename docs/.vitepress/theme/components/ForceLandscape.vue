<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const active = ref(false)
const dismissed = ref(false)

function canRotate() {
  const portrait = window.matchMedia('(orientation: portrait)').matches
  const touch =
    window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches)
  const narrow = window.innerWidth <= 1180
  return portrait && touch && narrow
}

function update() {
  if (!canRotate()) dismissed.value = false
  const on = canRotate() && !dismissed.value
  active.value = on
  document.documentElement.classList.toggle('fl-lock', on)
}

function dismiss() {
  dismissed.value = true
  update()
}

onMounted(() => {
  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', update)
  window.removeEventListener('orientationchange', update)
  document.documentElement.classList.remove('fl-lock')
})
</script>

<template>
  <div class="fl-wrap" :class="{ 'fl-on': active }">
    <div class="fl-stage">
      <slot />
    </div>
  </div>
  <div v-if="active" class="fl-hint">
    <span>已强制横屏 · 请将手机旋转 90° 查看</span>
    <button type="button" @click="dismiss">竖屏浏览</button>
  </div>
</template>

<style>
html.fl-lock,
html.fl-lock body {
  overflow: hidden !important;
}
</style>

<style scoped>
.fl-wrap {
  display: block;
}
.fl-stage {
  container-type: inline-size;
}
.fl-wrap.fl-on {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--vp-c-bg);
  z-index: 100;
}
.fl-wrap.fl-on .fl-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vh;
  height: 100vw;
  padding: 10px 12px 48px;
  transform: rotate(90deg) translateY(-100%);
  transform-origin: top left;
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  background: var(--vp-c-bg);
  will-change: transform;
}
@supports (height: 100dvw) {
  .fl-wrap.fl-on .fl-stage {
    width: 100dvh;
    height: 100dvw;
  }
}
.fl-hint {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 101;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12.5px;
  white-space: nowrap;
}
.fl-hint button {
  border: none;
  background: none;
  padding: 0;
  color: var(--vp-c-brand-1);
  font-size: 12.5px;
  text-decoration: underline;
  cursor: pointer;
}
</style>
