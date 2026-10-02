<script setup>
import { computed, ref } from 'vue'
import HudFrame from '../components/HudFrame.vue'
import HudRule from '../components/HudRule.vue'
import TitleTab from '../components/TitleTab.vue'
import ReadoutCells from '../components/ReadoutCells.vue'
import PanelGroup from '../components/PanelGroup.vue'
import StatusLine from '../components/StatusLine.vue'
import Legend from '../components/Legend.vue'
import StepDots from '../components/StepDots.vue'
import HudSlider from '../components/HudSlider.vue'
import ValueChips from '../components/ValueChips.vue'
import WaveTrace from '../components/WaveTrace.vue'
import DistributionBars from '../components/DistributionBars.vue'
import FormulaLine from '../components/FormulaLine.vue'
import MatrixHeat from '../components/MatrixHeat.vue'
import {
  TOKENS,
  SEL,
  Q,
  K,
  V,
  READOUTS,
  buildWeights
} from './attention-data.js'

defineProps({
  palette: { type: String, default: 'violet' }
})

const matrix = buildWeights()
const row = computed(() => matrix[SEL.r])
const selWeight = computed(() => row.value[SEL.c].toFixed(2))
const head = ref(4)
const step = ref(2)
</script>

<template>
  <HudFrame :palette="palette">
    <header class="lab-head">
      <div>
        <div class="lh-title">
          <TitleTab text="实验 04" />
          <h2>注意力权重矩阵</h2>
        </div>
        <p class="lh-kicker">TRANSFORMER 解析 · 多层自注意力</p>
      </div>
      <ReadoutCells :items="READOUTS" />
    </header>

    <HudRule class="lab-rule" :split="62" />

    <div class="lab-body">
      <div class="lab-left">
        <div class="ll-note">行 = 查询 · 列 = 键</div>
        <div class="ll-matrix">
          <MatrixHeat
            :matrix="matrix"
            :row-labels="TOKENS"
            :col-labels="TOKENS"
            :selected="SEL"
            :callout="`权重 ${selWeight}`"
            :cell-w="54"
            :cell-h="42"
            :label-w="136"
          />
          <div class="ll-bars">
            <DistributionBars
              :values="row"
              :highlight="SEL.c"
              caption="注意力分布 · 查询「位置」"
            />
          </div>
        </div>
        <div class="ll-bottom">
          <Legend caption="颜色越亮，这一行从该列读取的信息越多" />
          <HudSlider
            v-model="head"
            :min="1"
            :max="8"
            :step="1"
            :label="`注意力头 ${String(head).padStart(2, '0')} / 08`"
          />
        </div>
      </div>

      <aside class="lab-right">
        <PanelGroup>
          <section class="lr-sec">
            <div class="lr-title">查询 / 键 / 值</div>
            <div class="lr-rows">
              <ValueChips label="查询" :values="Q" :highlight="3" />
              <ValueChips label="键" :values="K" :highlight="3" />
              <ValueChips label="值" :values="V" :highlight="3" />
            </div>
          </section>

          <section class="lr-sec">
            <div class="lr-title">缩放点积</div>
            <div class="lr-formula">
              <FormulaLine
                tex="\operatorname{softmax}\!\left(\dfrac{QK^{\top}}{\sqrt{d_k}}\right)V"
                size="20px"
              />
              <span class="lr-weight">权重</span>
            </div>
            <div class="lr-foot">softmax 归一化</div>
          </section>

          <section class="lr-sec">
            <div class="lr-title">值向量</div>
            <div class="lr-wave">
              <WaveTrace :seed="7" :n="56" :width="300" :height="48" />
              <span class="lr-sum">加权求和</span>
            </div>
          </section>

          <section class="lr-sec">
            <div class="lr-title">实验步骤</div>
            <StepDots v-model="step" :count="5" />
            <div class="lr-foot">步骤 {{ String(step + 1).padStart(2, '0') }} / 05 · 前进 →</div>
          </section>

          <section class="lr-sec lr-status">
            <StatusLine note="视觉稿 · 交互逻辑后续接入" right="缩放 1.00" />
          </section>
        </PanelGroup>
      </aside>
    </div>
  </HudFrame>
</template>

<style scoped>
.lab-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px 40px;
}
.lh-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.lh-title h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  color: var(--hud-ink);
}
.lh-kicker {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--hud-dim);
}
.lab-rule {
  margin: 22px 0 30px;
}
.lab-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 520px;
  gap: 28px;
}
@media (max-width: 1640px) {
  .lab-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .lab-right {
    max-width: 640px;
  }
}
.ll-note {
  font-size: 13px;
  color: var(--hud-dim);
  margin-bottom: 14px;
}
.ll-matrix {
  width: fit-content;
  max-width: 100%;
}
.ll-bars {
  margin-top: 26px;
  padding-left: 170px;
}
.ll-bottom {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: 28px;
  max-width: 360px;
}
.lr-sec {
  padding: 18px 0;
  border-top: 1px solid var(--hud-hair);
}
.lr-sec:first-child {
  padding-top: 0;
  border-top: none;
}
.lr-title {
  font-size: 13px;
  color: var(--hud-dim);
  margin-bottom: 14px;
}
.lr-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lr-formula {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.lr-weight {
  padding: 5px 16px;
  background: var(--hud-accent);
  color: var(--hud-bg);
  font-size: 15px;
  font-weight: 700;
}
.lr-foot {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--hud-dim);
}
.lr-wave {
  display: flex;
  align-items: center;
  gap: 22px;
}
.lr-wave :deep(.wave) {
  flex: 1;
}
.lr-sum {
  padding: 4px 12px;
  border: 1px solid var(--hud-warn);
  color: var(--hud-warn);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.lr-status {
  padding-bottom: 0;
}
</style>
