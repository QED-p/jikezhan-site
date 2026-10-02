<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'

const PRESETS = [
  { name: '秩 2', M: [[1, 2, 3], [2, 4, 6], [1, 1, 1]] },
  { name: '满秩', M: [[1, 2, 3], [0, 1, 4], [5, 6, 0]] },
  { name: '秩 1', M: [[1, 2, 3], [2, 4, 6], [3, 6, 9]] },
  { name: '零矩阵', M: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
  { name: '宽矩阵 2×3', M: [[1, 2, 3], [0, 1, 1]] },
  { name: '高矩阵 3×2', M: [[1, 2], [2, 4], [3, 6]] }
]

const M = reactive(PRESETS[0].M.map((r) => r.slice()))
const seq = [0, 1, 2, -1]

function setPreset(p) {
  M.splice(0, M.length, ...p.M.map((r) => r.slice()))
}
function cycleCell(i, j) {
  const v = M[i][j]
  M[i][j] = seq[(seq.indexOf(v) + 1) % seq.length]
}

const m = computed(() => M.length)
const n = computed(() => M[0].length)

function rref(src) {
  const A = src.map((r) => r.map(Number))
  const rows = A.length
  const cols = A[0].length
  const pivots = []
  let r = 0
  for (let lead = 0; lead < cols && r < rows; lead++) {
    let i = r
    while (i < rows && Math.abs(A[i][lead]) < 1e-9) i++
    if (i === rows) continue
    ;[A[r], A[i]] = [A[i], A[r]]
    const p = A[r][lead]
    for (let j = 0; j < cols; j++) A[r][j] /= p
    for (let k = 0; k < rows; k++) {
      if (k !== r && Math.abs(A[k][lead]) > 1e-12) {
        const f = A[k][lead]
        for (let j = 0; j < cols; j++) A[k][j] -= f * A[r][j]
      }
    }
    pivots.push(lead)
    r++
  }
  return { R: A, pivots }
}

const reduced = computed(() => rref(M))
const rank = computed(() => reduced.value.pivots.length)
const nullity = computed(() => n.value - rank.value)
const leftNullity = computed(() => m.value - rank.value)
const isPivotCol = (j) => reduced.value.pivots.includes(j)
const zeroRows = computed(() =>
  reduced.value.R.map((row) => row.every((v) => Math.abs(v) < 1e-9))
)

const fmt = (v) => {
  if (Math.abs(v) < 1e-9) return '0'
  const r = Math.round(v)
  if (Math.abs(v - r) < 1e-9) return String(r)
  for (let d = 2; d <= 12; d++) {
    const num = v * d
    if (Math.abs(num - Math.round(num)) < 1e-9) return `${Math.round(num)}/${d}`
  }
  return v.toFixed(2)
}

// 零空间的一组基：每个自由变量取 1，其余自由变量取 0
const nullBasis = computed(() => {
  const { R, pivots } = reduced.value
  const free = []
  for (let j = 0; j < n.value; j++) if (!pivots.includes(j)) free.push(j)
  return free.map((f) => {
    const x = new Array(n.value).fill(0)
    x[f] = 1
    pivots.forEach((pc, row) => {
      x[pc] = -R[row][f]
    })
    return x
  })
})

const readouts = computed(() => [
  { label: '秩', value: String(rank.value) },
  { label: '零空间', value: String(nullity.value) },
  { label: '左零空间', value: String(leftNullity.value) },
  { label: '矩阵', value: `${m.value}×${n.value}` }
])

const barRN = computed(() => {
  const total = Math.max(1, n.value)
  return [
    { name: '行空间', w: (rank.value / total) * 100, cls: 'accent' },
    { name: '零空间', w: (nullity.value / total) * 100, cls: 'warn' }
  ]
})
const barRM = computed(() => {
  const total = Math.max(1, m.value)
  return [
    { name: '列空间', w: (rank.value / total) * 100, cls: 'good' },
    { name: '左零空间', w: (leftNullity.value / total) * 100, cls: 'crit' }
  ]
})
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="fs-head">
      <div class="fs-title">
        <TitleTab text="实验 08" />
        <h3>四个基本子空间</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="fs-rule" :split="56" />

    <div class="fs-presets">
      <span class="fs-label">预设</span>
      <HudButton v-for="p in PRESETS" :key="p.name" @click="setPreset(p)">{{ p.name }}</HudButton>
      <span class="fs-hint">点矩阵格子改数值（循环 0 → 1 → 2 → −1）</span>
    </div>

    <div class="fs-matrices">
      <div class="fs-block">
        <div class="fs-cap">A（高亮列 = 主元列）</div>
        <div class="fs-grid" :style="{ gridTemplateColumns: `repeat(${n}, 46px)` }">
          <template v-for="(row, i) in M" :key="'row' + i">
            <button
              v-for="(v, j) in row"
              :key="'c' + i + '-' + j"
              class="fs-cell edit"
              :class="{ pivot: isPivotCol(j) }"
              @click="cycleCell(i, j)"
            >{{ fmt(v) }}</button>
          </template>
        </div>
      </div>

      <div class="fs-block">
        <div class="fs-cap">简化行阶梯形 R（框 = 主元）</div>
        <div class="fs-grid" :style="{ gridTemplateColumns: `repeat(${n}, 46px)` }">
          <template v-for="(row, i) in reduced.R" :key="'r' + i">
            <span
              v-for="(v, j) in row"
              :key="'rc' + i + '-' + j"
              class="fs-cell"
              :class="{ pivot: row[j] === 1 && reduced.pivots.includes(j) && !row.slice(0, j).some((x) => Math.abs(x) > 1e-9), zero: zeroRows[i] }"
            >{{ fmt(v) }}</span>
          </template>
        </div>
      </div>
    </div>

    <div class="fs-bars">
      <div class="fs-side">
        <div class="fs-cap">输入空间 R<sup>{{ n }}</sup>（n = {{ n }}）</div>
        <div class="fs-bar">
          <span
            v-for="seg in barRN"
            :key="seg.name"
            class="fs-seg"
            :class="seg.cls"
            :style="{ width: seg.w + '%' }"
          >{{ seg.name }} {{ seg.name === '行空间' ? rank : nullity }}</span>
        </div>
      </div>
      <div class="fs-side">
        <div class="fs-cap">输出空间 R<sup>{{ m }}</sup>（m = {{ m }}）</div>
        <div class="fs-bar">
          <span
            v-for="seg in barRM"
            :key="seg.name"
            class="fs-seg"
            :class="seg.cls"
            :style="{ width: seg.w + '%' }"
          >{{ seg.name }} {{ seg.name === '列空间' ? rank : leftNullity }}</span>
        </div>
      </div>
    </div>

    <div class="fs-null">
      <span class="fs-label">零空间的一组基</span>
      <template v-if="nullBasis.length">
        <span v-for="(vec, i) in nullBasis" :key="'nb' + i" class="fs-vec">
          ({{ vec.map(fmt).join(', ') }})
        </span>
      </template>
      <span v-else class="fs-hint">零空间只有零向量（秩 = 列数）</span>
    </div>

    <p class="fs-status">
      秩 = 主元个数 = {{ rank }}：列空间与行空间的维数都是 {{ rank }}，零空间维数是 n − 秩 = {{ nullity }}，
      左零空间维数是 m − 秩 = {{ leftNullity }}. 左右两侧的维数各自配平：{{ rank }} + {{ nullity }} = {{ n }}，
      {{ rank }} + {{ leftNullity }} = {{ m }}.
    </p>
    <p class="fs-note">
      图的读法：橙色列是主元列，它们构成列空间的基；简化阶梯形的非零行构成行空间的基；
      零空间是 Ax = 0 的全部解；左零空间是满足 yᵀA = 0 的 y. 行空间与零空间在 Rⁿ 里互相正交，
      列空间与左零空间在 R^m 里互相正交（性由内积验证）.
    </p>
  </HudFrame>
</template>

<style scoped>
.fs-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.fs-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.fs-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.fs-rule {
  margin: 20px 0 22px;
}
.fs-presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}
.fs-label {
  font-size: 12.5px;
  color: var(--hud-dim);
  margin-right: 4px;
}
.fs-hint {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.fs-matrices {
  display: flex;
  flex-wrap: wrap;
  gap: 36px;
  margin-bottom: 24px;
}
.fs-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fs-cap {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.fs-grid {
  display: grid;
  gap: 4px;
}
.fs-cell {
  width: 46px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hud-faint);
  background: var(--hud-bg);
  color: var(--hud-ink);
  font-family: inherit;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.fs-cell.edit {
  cursor: pointer;
}
.fs-cell.edit:hover {
  border-color: var(--hud-accent);
}
.fs-cell.pivot {
  border-color: var(--hud-warn);
  background: color-mix(in srgb, var(--hud-warn) 12%, var(--hud-bg));
}
.fs-cell.pivot:not(.edit) {
  outline: 1.5px solid var(--hud-warn);
}
.fs-cell.zero {
  opacity: 0.45;
}
.fs-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 22px;
}
.fs-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fs-bar {
  display: flex;
  height: 30px;
  border: 1px solid var(--hud-faint);
}
.fs-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--hud-bg);
  white-space: nowrap;
  overflow: hidden;
}
.fs-seg.accent {
  background: var(--hud-accent);
}
.fs-seg.warn {
  background: var(--hud-warn);
}
.fs-seg.good {
  background: var(--hud-good);
}
.fs-seg.crit {
  background: var(--hud-crit);
}
.fs-null {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.fs-vec {
  padding: 4px 10px;
  border: 1px solid var(--hud-accent);
  color: var(--hud-accent);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.fs-status {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.fs-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
