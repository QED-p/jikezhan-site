<script setup>
import { computed, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudSlider from './HudSlider.vue'
import FormulaLine from './FormulaLine.vue'

const NS = [2, 3, 4, 10, 50, 512]
const n = ref(3)

function logGamma(z) {
  const g = 7
  const C = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = C[0]
  for (let i = 1; i < g + 2; i++) x += C[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

const logRatio = (nn) => (nn / 2) * Math.log(Math.PI) - nn * Math.log(2) - logGamma(nn / 2 + 1)
const log10Ratio = (nn) => logRatio(nn) / Math.LN10

// 直接从对数格式化，避免极小数下溢成 0
function fmtLog10(v) {
  if (v >= -2) return (Math.pow(10, v) * 100).toFixed(1) + '%'
  const e = Math.floor(v)
  const m = Math.pow(10, v - e)
  return m.toFixed(1) + 'e' + e
}

const dMax = computed(() => -log10Ratio(512))

const bars = computed(() =>
  NS.map((nn) => {
    const d = -log10Ratio(nn)
    const h = Math.log10(1 + d) / Math.log10(1 + dMax.value)
    return { n: nn, ratio: fmtLog10(log10Ratio(nn)), h: Math.round(h * 100) }
  })
)

const nearest = computed(() => {
  let best = NS[0]
  for (const nn of NS) {
    if (Math.abs(Math.log(nn) - Math.log(n.value)) < Math.abs(Math.log(best) - Math.log(n.value))) best = nn
  }
  return best
})

const readouts = computed(() => [
  { label: '维数', value: String(n.value) },
  { label: '体对角线', value: Math.sqrt(n.value).toFixed(2) },
  { label: '内接球占比', value: fmtLog10(log10Ratio(n.value)) }
])
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="hd-head">
      <div class="hd-title">
        <TitleTab text="实验 03" />
        <h3>高维里剩下什么</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="hd-rule" :split="56" />

    <div class="hd-slider">
      <HudSlider
        v-model="n"
        :min="1"
        :max="512"
        :step="1"
        :label="`维数 n = ${n}`"
      />
    </div>

    <div class="hd-bars">
      <div v-for="b in bars" :key="b.n" class="hd-bar-col">
        <span class="hd-value hud-num">{{ b.ratio }}</span>
        <div class="hd-bar-track">
          <div class="hd-bar" :class="{ on: b.n === nearest }" :style="{ height: b.h + '%' }" />
        </div>
        <span class="hd-n hud-num">n={{ b.n }}</span>
      </div>
    </div>

    <p class="hd-note">
      单位立方体 [0,1]^n 的体积恒为 1，内接球半径固定 1/2，占比
      <FormulaLine :tex="'\\dfrac{\\pi^{n/2}}{2^n\\,\\Gamma(n/2+1)}'" size="17px" />
      随维度指数衰减.柱子越高表示占比越小（纵轴做过对数压缩，否则 n≥10 的柱子会彻底看不见）.
    </p>
    <p class="hd-note">
      体对角线长度是 √n：n=512 时约 22.6，而每条棱仍然只是 1.高维立方体"很空旷"与"体积几乎全贴在边界"，是同一个计算的两面.
    </p>
  </HudFrame>
</template>

<style scoped>
.hd-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.hd-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.hd-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.hd-rule {
  margin: 20px 0 24px;
}
.hd-slider {
  max-width: 420px;
}
.hd-bars {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  height: 220px;
  margin: 30px 0 18px;
  padding-left: 8px;
}
.hd-bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 8px;
}
.hd-value {
  font-size: 12.5px;
  color: var(--hud-dim);
  white-space: nowrap;
}
.hd-bar-track {
  display: flex;
  align-items: flex-end;
  width: 46px;
  height: 150px;
  border-bottom: 1px solid var(--hud-dim);
}
.hd-bar {
  width: 100%;
  background: var(--hud-accent);
  opacity: 0.45;
}
.hd-bar.on {
  opacity: 1;
  box-shadow: inset 0 0 0 1px var(--hud-hot);
}
.hd-n {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.hd-note {
  margin: 0 0 10px;
  font-size: 13.5px;
  line-height: 1.95;
  color: var(--hud-dim);
}
</style>
