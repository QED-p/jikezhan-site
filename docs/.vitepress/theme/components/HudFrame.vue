<script setup>
defineProps({
  palette: { type: String, default: 'violet' },
  scanlines: { type: Boolean, default: true },
  rounded: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }
})
</script>

<template>
  <div class="hud-frame" :class="{ compact }" :data-palette="palette">
    <div class="hf-chrome" aria-hidden="true">
      <span class="hf-bracket tl" />
      <span class="hf-bracket tr" />
      <span class="hf-bracket bl" />
      <span class="hf-bracket br" />

      <div class="hf-rail t" />
      <div class="hf-rail b" />
      <div class="hf-rail l" />
      <div class="hf-rail r" />

      <svg v-for="p in ['tl', 'tr', 'bl', 'br']" :key="p" class="hf-vf" :class="p" viewBox="0 0 26 26">
        <rect x="0.5" y="0.5" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1" />
        <path d="M9 1v24M17 1v24M1 9h24M1 17h24" stroke="currentColor" stroke-width="0.6" opacity="0.5" />
        <path d="M13 11v4M11 13h4" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </div>

    <div v-if="scanlines" class="hf-scanlines" aria-hidden="true" />
    <div class="hf-inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.hud-frame {
  position: relative;
  background: var(--hud-bg);
  border: 1px solid var(--hud-dim);
  padding: 56px 32px 48px;
}
.hud-frame.compact {
  padding: 40px 24px 34px;
}
.hf-chrome {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hf-bracket {
  position: absolute;
  width: 22px;
  height: 22px;
}
.hf-bracket.tl { top: -1px; left: -1px; border-top: 2px solid var(--hud-dim); border-left: 2px solid var(--hud-dim); }
.hf-bracket.tr { top: -1px; right: -1px; border-top: 2px solid var(--hud-dim); border-right: 2px solid var(--hud-dim); }
.hf-bracket.bl { bottom: -1px; left: -1px; border-bottom: 2px solid var(--hud-dim); border-left: 2px solid var(--hud-dim); }
.hf-bracket.br { bottom: -1px; right: -1px; border-bottom: 2px solid var(--hud-dim); border-right: 2px solid var(--hud-dim); }

.hf-rail {
  position: absolute;
  opacity: 0.9;
}
.hf-rail.t {
  top: 26px; left: 26px; right: 26px; height: 5px;
  border-top: 1px solid var(--hud-faint);
  background: repeating-linear-gradient(90deg, var(--hud-faint) 0 1px, transparent 1px 16px);
}
.hf-rail.b {
  bottom: 26px; left: 26px; right: 26px; height: 5px;
  border-bottom: 1px solid var(--hud-faint);
  background: repeating-linear-gradient(90deg, var(--hud-faint) 0 1px, transparent 1px 16px);
}
.hf-rail.l {
  left: 26px; top: 26px; bottom: 26px; width: 5px;
  border-left: 1px solid var(--hud-faint);
  background: repeating-linear-gradient(180deg, var(--hud-faint) 0 1px, transparent 1px 16px);
}
.hf-rail.r {
  right: 26px; top: 26px; bottom: 26px; width: 5px;
  border-right: 1px solid var(--hud-faint);
  background: repeating-linear-gradient(180deg, var(--hud-faint) 0 1px, transparent 1px 16px);
}

.hf-vf {
  position: absolute;
  width: 26px;
  height: 26px;
  color: var(--hud-dim);
  opacity: 0.65;
}
.hf-vf.tl { top: 40px; left: 40px; }
.hf-vf.tr { top: 40px; right: 40px; }
.hf-vf.bl { bottom: 40px; left: 40px; }
.hf-vf.br { bottom: 40px; right: 40px; }

.hf-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background: repeating-linear-gradient(
    0deg,
    color-mix(in srgb, var(--hud-ink) 5%, transparent) 0 1px,
    transparent 1px 3px
  );
}
.hf-inner {
  position: relative;
  z-index: 1;
}
</style>
