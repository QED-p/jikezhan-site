<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'

const VW = 720
const VH = 540
const QXMIN = -4.6
const QXMAX = 4.6
const QYMIN = -3.45
const QYMAX = 3.45

const PRESETS = [
  { name: '对称正定', M: [[4, 2], [2, 3]] },
  { name: '一般', M: [[2, 1], [4, 3]] },
  { name: '剪切', M: [[1, 1], [0, 1]] },
  { name: '秩亏', M: [[1, 2], [2, 4]] },
  { name: '主元为零', M: [[0, 1], [1, 0]] }
]
const seq = [0, 1, 2, 3, -1]

const A = reactive(PRESETS[0].M.map((r) => r.slice()))
const mode = ref('lu')
const step = ref(0)

const maxStep = computed(() => (mode.value === 'lu' ? 2 : 3))

function setPreset(p) {
  A.splice(0, A.length, ...p.M.map((r) => r.slice()))
  step.value = 0
}
function cycleCell(i, j) {
  A[i][j] = seq[(seq.indexOf(A[i][j]) + 1) % seq.length]
  step.value = 0
}
function switchMode(m) {
  mode.value = m
  step.value = 0
}
function next() {
  step.value = step.value >= maxStep.value ? 0 : step.value + 1
}

const fmt = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2))

const lu = computed(() => {
  const a = A[0][0]
  const b = A[0][1]
  const c = A[1][0]
  const d = A[1][1]
  if (Math.abs(a) < 1e-9) return { ok: false }
  const m = c / a
  return {
    ok: true,
    m,
    L: [[1, 0], [m, 1]],
    U: [[a, b], [0, d - m * b]],
    det: a * (d - m * b)
  }
})

const qr = computed(() => {
  const a1 = { x: A[0][0], y: A[1][0] }
  const a2 = { x: A[0][1], y: A[1][1] }
  const n1 = Math.hypot(a1.x, a1.y)
  if (n1 < 1e-9) return { ok: false }
  const q1 = { x: a1.x / n1, y: a1.y / n1 }
  const c = a2.x * q1.x + a2.y * q1.y
  const u2 = { x: a2.x - c * q1.x, y: a2.y - c * q1.y }
  const n2 = Math.hypot(u2.x, u2.y)
  const deficient = n2 < 1e-9
  const q2 = deficient ? { x: 0, y: 0 } : { x: u2.x / n2, y: u2.y / n2 }
  return {
    ok: true,
    a1,
    a2,
    q1,
    c,
    u2,
    n2,
    deficient,
    q2,
    foot: { x: c * q1.x, y: c * q1.y },
    Q: [[q1.x, q2.x], [q1.y, q2.y]],
    R: [[n1, c], [0, n2]]
  }
})

const chol = computed(() => {
  const a = A[0][0]
  const b = A[0][1]
  const c = A[1][0]
  const d = A[1][1]
  if (Math.abs(b - c) > 1e-9) return { symmetric: false }
  const r11 = a > 0 ? Math.sqrt(a) : NaN
  const r12 = a > 0 ? b / r11 : NaN
  const t = a > 0 ? d - r12 * r12 : NaN
  const r22 = t > 0 ? Math.sqrt(t) : NaN
  return { symmetric: true, r11, r12, t, r22, ok: a > 0 && t > 0 }
})

const readouts = computed(() => {
  const s = step.value
  if (mode.value === 'lu') {
    const r = lu.value
    if (!r.ok) {
      return [
        { label: 'm', value: '—' },
        { label: 'u₁₁', value: '0' },
        { label: 'u₂₂', value: '—' },
        { label: 'det', value: '—' }
      ]
    }
    return [
      { label: 'm', value: s >= 1 ? fmt(r.m) : '·' },
      { label: 'u₁₁', value: fmt(A[0][0]) },
      { label: 'u₂₂', value: s >= 1 ? fmt(r.U[1][1]) : '·' },
      { label: 'det', value: s >= 2 ? fmt(r.det) : '·' }
    ]
  }
  if (mode.value === 'qr') {
    const r = qr.value
    if (!r.ok) {
      return [
        { label: 'r₁₁', value: '0' },
        { label: 'r₁₂', value: '—' },
        { label: 'r₂₂', value: '—' },
        { label: '状态', value: '失败' }
      ]
    }
    return [
      { label: 'r₁₁', value: fmt(Math.hypot(r.a1.x, r.a1.y)) },
      { label: 'r₁₂', value: s >= 2 ? fmt(r.c) : '·' },
      { label: 'r₂₂', value: s >= 3 ? fmt(r.n2) : '·' },
      { label: '状态', value: s >= 3 ? (r.deficient ? '秩亏' : '完成') : '进行中' }
    ]
  }
  const r = chol.value
  if (!r.symmetric) {
    return [
      { label: 'r₁₁', value: '—' },
      { label: 'r₁₂', value: '—' },
      { label: 'r₂₂', value: '—' },
      { label: '状态', value: '不对称' }
    ]
  }
  return [
    { label: 'r₁₁', value: s >= 1 && isFinite(r.r11) ? fmt(r.r11) : '·' },
    { label: 'r₁₂', value: s >= 2 && isFinite(r.r12) ? fmt(r.r12) : '·' },
    { label: 'r₂₂', value: s >= 3 && isFinite(r.r22) ? fmt(r.r22) : '·' },
    { label: '状态', value: s >= 3 ? (r.ok ? '完成' : '非正定') : '进行中' }
  ]
})

const status = computed(() => {
  const s = step.value
  if (mode.value === 'lu') {
    const r = lu.value
    if (!r.ok) {
      return 'a₁₁ = 0：不能直接消元——需要换行，改用 PA = LU. 点「主元为零」预设看这个情形.'
    }
    if (s === 0) {
      return 'A 的消元从左上角主元开始. 下一步：用乘数 m = a₂₁/a₁₁ 把第二行第一列消成 0.'
    }
    if (s === 1) {
      return `乘数 m = ${fmt(r.m)}，执行 R₂ ← R₂ − m·R₁；这个 m 被记进 L 的 (2,1) 位置，消元结果进 U.`
    }
    return `完成：A = LU，det A = u₁₁·u₂₂ = ${fmt(r.det)}——三角阵的行列式就是对角线的乘积.`
  }
  if (mode.value === 'qr') {
    const r = qr.value
    if (!r.ok) {
      return 'a₁ = 0：第一列是零向量，没法单位化——列不满秩，QR 直接失败.'
    }
    if (s === 0) {
      return '两条向量是 A 的两列 a₁、a₂. Gram–Schmidt 从左往右处理：先处理 a₁.'
    }
    if (s === 1) {
      return `q₁ = a₁/‖a₁‖：第一列单位化，方向不变（R 的对角元 r₁₁ = ‖a₁‖ = ${fmt(Math.hypot(r.a1.x, r.a1.y))}）.`
    }
    if (s === 2) {
      return `a₂ 减去它在 q₁ 上的投影：c = a₂·q₁ = ${fmt(r.c)}，残差 u₂ = a₂ − c·q₁ 与 q₁ 垂直.`
    }
    if (r.deficient) {
      return 'u₂ = 0：a₂ 与 a₁ 共线，列向量线性相关——QR 在这里失败（秩不足）.'
    }
    return `q₂ = u₂/‖u₂‖，r₂₂ = ‖u₂‖ = ${fmt(r.n2)}，得到 A = QR：Q 的列标准正交，R 上三角.`
  }
  const r = chol.value
  if (!r.symmetric) {
    return 'A 不对称——Cholesky 只给对称正定矩阵准备（第 8 章的谱定理与正定判据）.'
  }
  if (s === 0) {
    return 'Cholesky 从 r₁₁ 开始：正定矩阵的左上角必须为正，否则开根号就失败了.'
  }
  if (s === 1) {
    return `r₁₁ = √a₁₁ = ${fmt(r.r11)}；下一步 r₁₂ = a₁₂/r₁₁.`
  }
  if (s === 2) {
    return `r₁₂ = ${fmt(r.r12)}；关键一步：剩下的平方 a₂₂ − r₁₂² = ${fmt(r.t)} 必须非负.`
  }
  if (!r.ok) {
    return `a₂₂ − r₁₂² = ${fmt(r.t)} ≤ 0：开不出实数——A 不是正定. 这就是第 8 章判据的算法版.`
  }
  return `r₂₂ = √(a₂₂ − r₁₂²) = ${fmt(r.r22)}；A = RᵀR 完成. 计算全程不需要选主元.`
})

const sx = (x) => ((x - QXMIN) / (QXMAX - QXMIN)) * VW
const sy = (y) => VH - ((y - QYMIN) / (QYMAX - QYMIN)) * VH

const gridPath = computed(() => {
  const lines = []
  for (let k = -4; k <= 4; k++) {
    lines.push(`M${sx(k)} ${sy(QYMIN)} L${sx(k)} ${sy(QYMAX)}`)
    lines.push(`M${sx(QXMIN)} ${sy(k)} L${sx(QXMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

const luView = computed(() => {
  const r = lu.value
  if (!r.ok) return null
  if (step.value === 0) {
    return { L: [[1, 0], [0, 1]], U: [[A[0][0], A[0][1]], [A[1][0], A[1][1]]] }
  }
  return { L: r.L, U: r.U }
})

const cholCell = (i, j) => {
  const r = chol.value
  if (!r.symmetric) return '—'
  const s = step.value
  if (i === 1 && j === 0) return '0'
  if (i === 0 && j === 0) return s >= 1 && isFinite(r.r11) ? fmt(r.r11) : '·'
  if (i === 0 && j === 1) return s >= 2 && isFinite(r.r12) ? fmt(r.r12) : '·'
  return s >= 3 && isFinite(r.r22) ? fmt(r.r22) : '·'
}
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="dl-head">
      <div class="dl-title">
        <TitleTab text="实验 02" />
        <h3>三种分解的阶梯</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="dl-rule" :split="56" />

    <div class="dl-controls">
      <HudButton :class="{ 'dl-tab-active': mode === 'lu' }" @click="switchMode('lu')">LU</HudButton>
      <HudButton :class="{ 'dl-tab-active': mode === 'qr' }" @click="switchMode('qr')">QR</HudButton>
      <HudButton :class="{ 'dl-tab-active': mode === 'chol' }" @click="switchMode('chol')">Cholesky</HudButton>
      <span class="dl-spacer" />
      <span class="dl-step">步骤 {{ step }}/{{ maxStep }}</span>
      <HudButton @click="next">{{ step >= maxStep ? '重来' : '下一步' }}</HudButton>
    </div>

    <div class="dl-presets">
      <span class="dl-label">预设</span>
      <HudButton v-for="p in PRESETS" :key="p.name" @click="setPreset(p)">{{ p.name }}</HudButton>
    </div>

    <div class="dl-matrix-row">
      <span class="dl-label">A（点格子改）</span>
      <div class="dl-grid">
        <button class="dl-cell" @click="cycleCell(0, 0)">{{ A[0][0] }}</button>
        <button class="dl-cell" @click="cycleCell(0, 1)">{{ A[0][1] }}</button>
        <button class="dl-cell" @click="cycleCell(1, 0)">{{ A[1][0] }}</button>
        <button class="dl-cell" @click="cycleCell(1, 1)">{{ A[1][1] }}</button>
      </div>
    </div>

    <p class="dl-status">{{ status }}</p>

    <template v-if="mode === 'lu'">
      <div v-if="luView" class="dl-results">
        <div class="dl-mat">
          <span class="dl-mat-label">L（乘数住在这里）</span>
          <div class="dl-grid ro">
            <div v-for="(v, i) in luView.L.flat()" :key="'L' + i" class="dl-cell ro">{{ fmt(v) }}</div>
          </div>
        </div>
        <div class="dl-mat">
          <span class="dl-mat-label">U（消元结果）</span>
          <div class="dl-grid ro">
            <div v-for="(v, i) in luView.U.flat()" :key="'U' + i" class="dl-cell ro">{{ fmt(v) }}</div>
          </div>
        </div>
        <div v-if="step >= 2 && lu.ok" class="dl-det">det A = {{ fmt(lu.det) }}</div>
      </div>
    </template>

    <template v-if="mode === 'qr'">
      <div class="dl-canvas">
        <svg :viewBox="`0 0 ${VW} ${VH}`">
          <path :d="gridPath" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
          <line :x1="sx(QXMIN)" :y1="sy(0)" :x2="sx(QXMAX)" :y2="sy(0)" stroke="var(--hud-dim)" stroke-width="1" />
          <line :x1="sx(0)" :y1="sy(QYMIN)" :x2="sx(0)" :y2="sy(QYMAX)" stroke="var(--hud-dim)" stroke-width="1" />

          <template v-if="qr.ok">
            <line :x1="sx(0)" :y1="sy(0)" :x2="sx(qr.a1.x)" :y2="sy(qr.a1.y)" stroke="var(--hud-dim)" stroke-width="1.8" />
            <text :x="sx(qr.a1.x) + 8" :y="sy(qr.a1.y) + 16" fill="var(--hud-dim)" font-size="14">a₁</text>
            <line :x1="sx(0)" :y1="sy(0)" :x2="sx(qr.a2.x)" :y2="sy(qr.a2.y)" stroke="var(--hud-dim)" stroke-width="1.8" />
            <text :x="sx(qr.a2.x) + 8" :y="sy(qr.a2.y) - 8" fill="var(--hud-dim)" font-size="14">a₂</text>

            <template v-if="step >= 1">
              <line :x1="sx(0)" :y1="sy(0)" :x2="sx(qr.q1.x)" :y2="sy(qr.q1.y)" stroke="var(--hud-accent)" stroke-width="2.6" />
              <text :x="sx(qr.q1.x) + 8" :y="sy(qr.q1.y) + 18" fill="var(--hud-accent)" font-size="14" font-weight="700">q₁</text>
            </template>

            <template v-if="step >= 2">
              <line :x1="sx(0)" :y1="sy(0)" :x2="sx(qr.foot.x)" :y2="sy(qr.foot.y)" stroke="var(--hud-warn)" stroke-width="1.6" stroke-dasharray="5 4" opacity="0.8" />
              <line :x1="sx(qr.a2.x)" :y1="sy(qr.a2.y)" :x2="sx(qr.foot.x)" :y2="sy(qr.foot.y)" stroke="var(--hud-warn)" stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />
              <circle :cx="sx(qr.foot.x)" :cy="sy(qr.foot.y)" r="4" fill="var(--hud-bg)" stroke="var(--hud-warn)" stroke-width="1.6" />
              <template v-if="step === 2">
                <line :x1="sx(0)" :y1="sy(0)" :x2="sx(qr.u2.x)" :y2="sy(qr.u2.y)" stroke="var(--hud-warn)" stroke-width="2.2" />
                <text :x="sx(qr.u2.x) + 8" :y="sy(qr.u2.y) - 8" fill="var(--hud-warn)" font-size="14" font-weight="700">u₂</text>
              </template>
            </template>

            <template v-if="step >= 3 && !qr.deficient">
              <line :x1="sx(0)" :y1="sy(0)" :x2="sx(qr.q2.x)" :y2="sy(qr.q2.y)" stroke="var(--hud-warn)" stroke-width="2.6" />
              <text :x="sx(qr.q2.x) + 8" :y="sy(qr.q2.y) - 8" fill="var(--hud-warn)" font-size="14" font-weight="700">q₂</text>
            </template>
          </template>
        </svg>
      </div>

      <div v-if="qr.ok" class="dl-results">
        <div class="dl-mat">
          <span class="dl-mat-label">Q（列标准正交）</span>
          <div class="dl-grid ro">
            <div v-for="(v, i) in qr.Q.flat()" :key="'Q' + i" class="dl-cell ro">{{ fmt(v) }}</div>
          </div>
        </div>
        <div class="dl-mat">
          <span class="dl-mat-label">R（上三角）</span>
          <div class="dl-grid ro">
            <div v-for="(v, i) in qr.R.flat()" :key="'R' + i" class="dl-cell ro">{{ step >= 2 ? fmt(v) : '·' }}</div>
          </div>
        </div>
      </div>
    </template>

    <template v-if="mode === 'chol'">
      <div class="dl-results">
        <div class="dl-mat">
          <span class="dl-mat-label">R（上三角，对角为正）</span>
          <div class="dl-grid ro">
            <div v-for="(c, i) in [cholCell(0, 0), cholCell(0, 1), cholCell(1, 0), cholCell(1, 1)]" :key="'C' + i" class="dl-cell ro">{{ c }}</div>
          </div>
        </div>
        <div v-if="step >= 3" class="dl-det">
          {{ chol.ok ? 'A = RᵀR ✓' : '计算中断：不是正定' }}
        </div>
      </div>
    </template>

    <p class="dl-note">
      点「下一步」逐步走：LU 看乘数怎么进 L、消元结果怎么进 U；QR 看 a₁ 单位化、a₂ 减投影、残差再单位化；
      Cholesky 看 r₁₁、r₁₂、r₂₂ 依次算出——最后一步的开根号正是"正定"的关卡.
      「秩亏」预设让三种分解一起失败，「主元为零」让 LU 撞上换行问题.
    </p>
  </HudFrame>
</template>

<style scoped>
.dl-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.dl-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.dl-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.dl-rule {
  margin: 20px 0 22px;
}
.dl-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.dl-tab-active {
  border-color: var(--hud-accent) !important;
  color: var(--hud-accent) !important;
}
.dl-spacer {
  flex: 1;
}
.dl-step {
  font-size: 13px;
  color: var(--hud-dim);
  font-variant-numeric: tabular-nums;
}
.dl-presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.dl-label {
  font-size: 12.5px;
  color: var(--hud-dim);
  margin-right: 4px;
}
.dl-matrix-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.dl-grid {
  display: grid;
  grid-template-columns: repeat(2, 52px);
  gap: 4px;
}
.dl-cell {
  width: 52px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hud-faint);
  background: var(--hud-bg);
  color: var(--hud-ink);
  font-family: inherit;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}
.dl-cell.ro {
  cursor: default;
  color: var(--hud-body);
}
.dl-results {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 26px;
  margin: 14px 0 4px;
}
.dl-mat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dl-mat-label {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.dl-det {
  font-size: 14px;
  color: var(--hud-accent);
  padding-bottom: 8px;
}
.dl-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
}
.dl-status {
  margin: 4px 0 10px;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.dl-note {
  margin: 14px 0 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
