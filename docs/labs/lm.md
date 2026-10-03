---
title: 语言模型全链路
layout: page
---

<script setup>
import LMLab from '../.vitepress/theme/labs/LMLab.vue'
import ForceLandscape from '../.vitepress/theme/components/ForceLandscape.vue'
</script>

<div class="lab-page">
  <ForceLandscape>
    <LMLab />
  </ForceLandscape>
  <p class="lab-caption">
    字符级 Transformer 在浏览器内真实训练：前向传播、反向传播、Adam 更新全部本地执行.
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
