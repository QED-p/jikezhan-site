---
title: RV32I 五级流水线
layout: page
---

<script setup>
import RvPipeline from '../.vitepress/theme/components/RvPipeline.vue'
import ForceLandscape from '../.vitepress/theme/components/ForceLandscape.vue'
</script>

<div class="lab-page">
  <ForceLandscape>
    <RvPipeline />
  </ForceLandscape>
  <p class="lab-caption">
    周期精确的五级流水线在浏览器内真实执行：控制信号、转发旁路、停顿与冲刷逐拍可见；点部件看内部实现.
  </p>
</div>

<style>
.lab-page {
  max-width: 1720px;
  margin: 0 auto;
  padding: 24px 40px 80px;
}
.lab-caption {
  margin-top: 14px;
  font-size: 13.5px;
  color: var(--vp-c-text-3);
}
@media (max-width: 720px) {
  .lab-page {
    padding: 12px 10px 60px;
  }
}
</style>
