<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'
import FormulaLine from './FormulaLine.vue'

const VW = 720
const VH = 540
const XMIN = -4
const XMAX = 4
const YMIN = -3
const YMAX = 3

const svgEl = ref(null)
const A = reactive({ a: 1.5, b: 0, c: 0, d: 0.5 })
const B = reactive({ a: 1, b: 1, c: 0, d: 1 })
const probe = reactive({ x: 1.5, y: 1 })
const mode = ref('AB')
const view = ref('entry')
const showCols = ref(true)
const gridMode = ref('first')
const sel = ref(null)
let dragging = null

const sx = (x) => ((x - XMIN) / (XMAX - XMIN)) * VW
const sy = (y) => VH - ((y - YMIN) / (YMAX - YMIN)) * VH
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const snap = (v) => Math.round(clamp(v, -2.5, 2.5) * 10) / 10

const mm = (X, Y) => ({
  a: X.a * Y.a + X.b * Y.c,
  b: X.a * Y.b + X.b * Y.d,
  c: X.c * Y.a + X.d * Y.c,
  d: X.c * Y.b + X.d * Y.d
})
const apply = (X, p) => ({ x: X.a * p.x + X.b * p.y, y: X.c * p.x + X.d * p.y })

const AB = computed(() => mm(A, B))
const BA = computed(() => mm(B, A))
const same = computed(
  () =>
    Math.abs(AB.value.a - BA.value.a) < 1e-6 &&
    Math.abs(AB.value.b - BA.value.b) < 1e-6 &&
    Math.abs(AB.value.c - BA.value.c) < 1e-6 &&
    Math.abs(AB.value.d - BA.value.d) < 1e-6
)

const first = computed(() => (mode.value === 'AB' ? apply(B, probe) : apply(A, probe)))
const final = computed(() => (mode.value === 'AB' ? apply(AB.value, probe) : apply(BA.value, probe)))
const firstLabel = computed(() => (mode.value === 'AB' ? 'Bv' : 'Av'))
const finalLabel = computed(() => (mode.value === 'AB' ? 'ABv' : 'BAv'))

const gridPath = computed(() => {
  const lines = []
  for (let k = -4; k <= 4; k++) {
    lines.push(`M${sx(k)} ${sy(YMIN)} L${sx(k)} ${sy(YMAX)}`)
    lines.push(`M${sx(XMIN)} ${sy(k)} L${sx(XMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

// 把标准网格用矩阵 X 变形后的网格
const gridOf = (X) => {
  const lines = []
  const mv = (x, y) => [X.a * x + X.b * y, X.c * x + X.d * y]
  for (let k = -8; k <= 8; k++) {
    const p1 = mv(k, -8)
    const p2 = mv(k, 8)
    lines.push(`M${sx(p1[0]).toFixed(1)} ${sy(p1[1]).toFixed(1)} L${sx(p2[0]).toFixed(1)} ${sy(p2[1]).toFixed(1)}`)
    const q1 = mv(-8, k)
    const q2 = mv(8, k)
    lines.push(`M${sx(q1[0]).toFixed(1)} ${sy(q1[1]).toFixed(1)} L${sx(q2[0]).toFixed(1)} ${sy(q2[1]).toFixed(1)}`)
  }
  return lines.join(' ')
}

const firstGrid = computed(() => gridOf(mode.value === 'AB' ? B : A))
const finalGrid = computed(() => gridOf(mode.value === 'AB' ? AB.value : BA.value))

const arrowHead = (vx, vy) => {
  const px = sx(vx)
  const py = sy(vy)
  const cx = sx(0)
  const cy = sy(0)
  const dx = px - cx
  const dy = py - cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const ax = px - ux * 10
  const ay = py - uy * 10
  return `${px},${py} ${ax + uy * 4.5},${ay - ux * 4.5} ${ax - uy * 4.5},${ay + ux * 4.5}`
}

// 标签靠右时翻到点的左侧，避免被画布边缘裁掉
const labelPos = (x, y, dy = -10) => {
  const px = sx(x)
  const py = sy(y)
  const flip = px > VW - 110
  return { x: flip ? px - 14 : px + 14, y: py + dy, anchor: flip ? 'end' : 'start' }
}

const toMath = (evt) => {
  const rect = svgEl.value.getBoundingClientRect()
  return {
    x: XMIN + ((evt.clientX - rect.left) / rect.width) * (XMAX - XMIN),
    y: YMIN + ((rect.bottom - evt.clientY) / rect.height) * (YMAX - YMIN)
  }
}

const onMove = (evt) => {
  if (dragging !== 'v') return
  const { x, y } = toMath(evt)
  Object.assign(probe, { x: snap(x), y: snap(y) })
}
const onUp = () => {
  dragging = null
}

const MAPS = [
  { name: '旋转 90°', m: { a: 0, b: -1, c: 1, d: 0 } },
  { name: '剪切', m: { a: 1, b: 1, c: 0, d: 1 } },
  { name: '缩放', m: { a: 1.5, b: 0, c: 0, d: 0.5 } },
  { name: '投影', m: { a: 1, b: 1, c: 1, d: 1 } }
]

const rowOf = (X, r) => (r === 0 ? [X.a, X.b] : [X.c, X.d])
const colOf = (X, c) => (c === 0 ? [X.a, X.c] : [X.b, X.d])

const cells = computed(() => {
  const flat = (X) => [
    { i: 0, v: X.a }, { i: 1, v: X.b }, { i: 2, v: X.c }, { i: 3, v: X.d }
  ]
  return { AB: flat(AB.value), BA: flat(BA.value) }
})

function pick(order, i) {
  mode.value = order
  sel.value = { order, r: Math.floor(i / 2), c: i % 2 }
}

const isSel = (order, i) => {
  if (!sel.value || sel.value.order !== order) return false
  if (view.value === 'column') return i % 2 === sel.value.c
  return sel.value.r * 2 + sel.value.c === i
}

// 列视角：右矩阵的列向量，及其在左矩阵作用下的像（= 乘积矩阵的列）
const columnPairs = computed(() => {
  const right = mode.value === 'AB' ? B : A
  const left = mode.value === 'AB' ? A : B
  const names =
    mode.value === 'AB'
      ? ['b₁', 'b₂', 'Ab₁', 'Ab₂']
      : ['a₁', 'a₂', 'Ba₁', 'Ba₂']
  const c1 = apply(right, { x: 1, y: 0 })
  const c2 = apply(right, { x: 0, y: 1 })
  return [
    { from: c1, to: apply(left, c1), l1: names[0], l2: names[2] },
    { from: c2, to: apply(left, c2), l1: names[1], l2: names[3] }
  ]
})

const expandColumn = computed(() => {
  if (!sel.value) return null
  const { order, c } = sel.value
  const left = order === 'AB' ? A : B
  const right = order === 'AB' ? B : A
  const lname = order === 'AB' ? 'A' : 'B'
  const rname = order === 'AB' ? 'B' : 'A'
  const col = colOf(right, c)
  const res = [
    left.a * col[0] + left.b * col[1],
    left.c * col[0] + left.d * col[1]
  ]
  const leftCols = [colOf(left, 0), colOf(left, 1)]
  return { order, c, lname, rname, col, res, leftCols }
})

const expand = computed(() => {
  if (!sel.value) return null
  const { order, r, c } = sel.value
  const left = order === 'AB' ? A : B
  const right = order === 'AB' ? B : A
  const lname = order === 'AB' ? 'A' : 'B'
  const rname = order === 'AB' ? 'B' : 'A'
  const row = rowOf(left, r)
  const col = colOf(right, c)
  const term1 = row[0] * col[0]
  const term2 = row[1] * col[1]
  return { order, r, c, lname, rname, row, col, term1, term2, result: term1 + term2 }
})

const fmt = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2))
const texMat = (X) =>
  `\\begin{bmatrix} ${fmt(X.a)} & ${fmt(X.b)} \\\\ ${fmt(X.c)} & ${fmt(X.d)} \\end{bmatrix}`

const readouts = computed(() => [
  { label: 'v', value: `(${fmt(probe.x)}, ${fmt(probe.y)})` },
  { label: firstLabel.value, value: `(${fmt(first.value.x)}, ${fmt(first.value.y)})` },
  { label: finalLabel.value, value: `(${fmt(final.value.x)}, ${fmt(final.value.y)})` }
])
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="mc-head">
      <div class="mc-title">
        <TitleTab text="实验 04" />
        <h3>复合：两种顺序，两个矩阵</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="mc-rule" :split="56" />

    <div class="mc-mode">
      <HudButton :variant="mode === 'AB' ? 'primary' : 'ghost'" @click="mode = 'AB'">
        先 B 后 A（AB）
      </HudButton>
      <HudButton :variant="mode === 'BA' ? 'primary' : 'ghost'" @click="mode = 'BA'">
        先 A 后 B（BA）
      </HudButton>
      <HudButton @click="showCols = !showCols">
        {{ showCols ? '隐藏列向量' : '显示列向量' }}
      </HudButton>
      <span class="mc-hint">拖动探针 v，看两跳怎么走</span>
    </div>

    <div class="mc-viewrow">
      <span class="mc-label">变形网格</span>
      <HudButton :variant="gridMode === 'first' ? 'primary' : 'ghost'" @click="gridMode = 'first'">
        第一跳
      </HudButton>
      <HudButton :variant="gridMode === 'final' ? 'primary' : 'ghost'" @click="gridMode = 'final'">
        第二跳
      </HudButton>
    </div>

    <div class="mc-viewrow">
      <span class="mc-label">算式视角</span>
      <HudButton :variant="view === 'entry' ? 'primary' : 'ghost'" @click="view = 'entry'">
        行 · 列（点积）
      </HudButton>
      <HudButton :variant="view === 'column' ? 'primary' : 'ghost'" @click="view = 'column'">
        列（左矩阵作用在右列上）
      </HudButton>
    </div>

    <div class="mc-canvas">
      <svg
        ref="svgEl"
        :viewBox="`0 0 ${VW} ${VH}`"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      >
        <path :d="gridPath" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
        <g v-if="showCols">
          <template v-for="(p, i) in columnPairs" :key="'cols' + i">
            <line
              :x1="sx(0)" :y1="sy(0)" :x2="sx(p.from.x)" :y2="sy(p.from.y)"
              stroke="var(--hud-good)" stroke-width="1" stroke-dasharray="3 4" opacity="0.55"
            />
            <line
              :x1="sx(0)" :y1="sy(0)" :x2="sx(p.to.x)" :y2="sy(p.to.y)"
              stroke="var(--hud-good)" stroke-width="1.6" opacity="0.9"
            />
            <circle :cx="sx(p.from.x)" :cy="sy(p.from.y)" r="3.5" fill="none" stroke="var(--hud-good)" stroke-width="1.2" />
            <circle :cx="sx(p.to.x)" :cy="sy(p.to.y)" r="4" fill="var(--hud-good)" />
            <text :x="sx(p.from.x) + 10" :y="sy(p.from.y) + 16" fill="var(--hud-good)" font-size="12.5" opacity="0.8">{{ p.l1 }}</text>
            <text :x="sx(p.to.x) + 10" :y="sy(p.to.y) - 10" fill="var(--hud-good)" font-size="13" font-weight="700">{{ p.l2 }}</text>
          </template>
        </g>
        <path
          v-if="gridMode === 'first'"
          :d="firstGrid"
          fill="none"
          stroke="var(--hud-accent)"
          stroke-width="1"
          opacity="0.34"
        />
        <path
          v-else
          :d="finalGrid"
          fill="none"
          stroke="var(--hud-warn)"
          stroke-width="1"
          opacity="0.4"
        />
        <line :x1="sx(XMIN)" :y1="sy(0)" :x2="sx(XMAX)" :y2="sy(0)" stroke="var(--hud-dim)" stroke-width="1" />
        <line :x1="sx(0)" :y1="sy(YMIN)" :x2="sx(0)" :y2="sy(YMAX)" stroke="var(--hud-dim)" stroke-width="1" />

        <line
          :x1="sx(0)" :y1="sy(0)" :x2="sx(first.x)" :y2="sy(first.y)"
          stroke="var(--hud-accent)" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.8"
        />
        <text :x="labelPos(first.x, first.y).x" :y="labelPos(first.x, first.y).y" :text-anchor="labelPos(first.x, first.y).anchor" fill="var(--hud-accent)" font-size="17" font-weight="700" opacity="0.85">{{ firstLabel }}</text>

        <line
          :x1="sx(0)" :y1="sy(0)" :x2="sx(final.x)" :y2="sy(final.y)"
          stroke="var(--hud-warn)" stroke-width="2.4"
        />
        <polygon :points="arrowHead(final.x, final.y)" fill="var(--hud-warn)" />
        <text :x="labelPos(final.x, final.y, 22).x" :y="labelPos(final.x, final.y, 22).y" :text-anchor="labelPos(final.x, final.y, 22).anchor" fill="var(--hud-warn)" font-size="20" font-weight="700">{{ finalLabel }}</text>

        <line :x1="sx(0)" :y1="sy(0)" :x2="sx(probe.x)" :y2="sy(probe.y)" stroke="var(--hud-hot)" stroke-width="2.2" />
        <polygon :points="arrowHead(probe.x, probe.y)" fill="var(--hud-hot)" />
        <text :x="labelPos(probe.x, probe.y, -12).x" :y="labelPos(probe.x, probe.y, -12).y" :text-anchor="labelPos(probe.x, probe.y, -12).anchor" fill="var(--hud-hot)" font-size="20" font-weight="700">v</text>
        <circle
          :cx="sx(probe.x)" :cy="sy(probe.y)" r="10"
          fill="var(--hud-bg)" stroke="var(--hud-hot)" stroke-width="2"
          class="mc-handle" @pointerdown="dragging = 'v'"
        />
      </svg>
    </div>

    <div class="mc-panel">
      <div class="mc-mats">
        <div class="mc-mat">
          <span class="mc-label">A（之后做）</span>
          <FormulaLine :tex="`A = ${texMat(A)}`" size="16px" />
        </div>
        <div class="mc-mat">
          <span class="mc-label">B（先做）</span>
          <FormulaLine :tex="`B = ${texMat(B)}`" size="16px" />
        </div>
        <div class="mc-mat" :class="{ on: mode === 'AB' }">
          <span class="mc-label">AB（先 B 后 A）· 点格子看算式</span>
          <div class="mc-grid">
            <button
              v-for="cell in cells.AB"
              :key="'ab' + cell.i"
              class="mc-cell"
              :class="{ sel: isSel('AB', cell.i) }"
              @click="pick('AB', cell.i)"
            >{{ fmt(cell.v) }}</button>
          </div>
        </div>
        <div class="mc-mat" :class="{ on: mode === 'BA' }">
          <span class="mc-label">BA（先 A 后 B）· 点格子看算式</span>
          <div class="mc-grid">
            <button
              v-for="cell in cells.BA"
              :key="'ba' + cell.i"
              class="mc-cell"
              :class="{ sel: isSel('BA', cell.i) }"
              @click="pick('BA', cell.i)"
            >{{ fmt(cell.v) }}</button>
          </div>
        </div>
      </div>

      <div v-if="expand && view === 'entry'" class="mc-expand">
        <div class="mc-line">
          <span class="mc-tag">{{ expand.order }} 的第 {{ expand.r + 1 }} 行第 {{ expand.c + 1 }} 列</span>
          = {{ expand.lname }} 的第 {{ expand.r + 1 }} 行 · {{ expand.rname }} 的第 {{ expand.c + 1 }} 列
        </div>
        <div class="mc-line mc-vectors">
          <span class="mc-chips row"><b v-for="(v, i) in expand.row" :key="'r' + i">{{ fmt(v) }}</b></span>
          <span class="mc-dot">·</span>
          <span class="mc-chips col"><b v-for="(v, i) in expand.col" :key="'c' + i">{{ fmt(v) }}</b></span>
        </div>
        <div class="mc-line">
          = {{ fmt(expand.row[0]) }} × {{ fmt(expand.col[0]) }} + {{ fmt(expand.row[1]) }} × {{ fmt(expand.col[1]) }}
          = <b class="mc-result">{{ fmt(expand.result) }}</b>
        </div>
      </div>

      <div v-if="expandColumn && view === 'column'" class="mc-expand">
        <div class="mc-line">
          <span class="mc-tag">{{ expandColumn.order }} 的第 {{ expandColumn.c + 1 }} 列</span>
          = {{ expandColumn.lname }} · （{{ expandColumn.rname }} 的第 {{ expandColumn.c + 1 }} 列）
        </div>
        <div class="mc-line mc-vectors">
          <span class="mc-chips col"><b v-for="(v, i) in expandColumn.col" :key="'cc' + i">{{ fmt(v) }}</b></span>
        </div>
        <div class="mc-line mc-vectors">
          = <b class="mc-coef">{{ fmt(expandColumn.col[0]) }}</b> ×
          <span class="mc-chips row"><b v-for="(v, i) in expandColumn.leftCols[0]" :key="'l0' + i">{{ fmt(v) }}</b></span>
          + <b class="mc-coef">{{ fmt(expandColumn.col[1]) }}</b> ×
          <span class="mc-chips row"><b v-for="(v, i) in expandColumn.leftCols[1]" :key="'l1' + i">{{ fmt(v) }}</b></span>
          = <b class="mc-result">({{ fmt(expandColumn.res[0]) }}, {{ fmt(expandColumn.res[1]) }})</b>
        </div>
        <div class="mc-line mc-sub">
          左矩阵 {{ expandColumn.lname }} 的两列（青色）按右列的系数线性组合，得到乘积矩阵的这一列.
        </div>
      </div>

      <div class="mc-buttons">
        <span class="mc-label">映射 A</span>
        <HudButton v-for="m in MAPS" :key="'a' + m.name" @click="Object.assign(A, m.m)">{{ m.name }}</HudButton>
      </div>
      <div class="mc-buttons">
        <span class="mc-label">映射 B</span>
        <HudButton v-for="m in MAPS" :key="'b' + m.name" @click="Object.assign(B, m.m)">{{ m.name }}</HudButton>
      </div>

      <p class="mc-status">
        <template v-if="same">
          这次的 A 与 B 恰好可交换：AB = BA.
        </template>
        <template v-else>
          两种顺序给出不同的矩阵：右乘的 B 先动手，所以"先 B 后 A"写成 AB——矩阵乘法的次序与操作次序相反.
        </template>
      </p>
      <p class="mc-note">
        灰色是原网格，变形网格一次只显示一层（按钮切换）：青色是第一跳之后的形状（{{ firstLabel }} 那一跳），
        黄色是两跳之后的形状（{{ finalLabel }}）. 虚线箭头是第一跳，实线箭头是终点；
        矩阵卡片里的数是这几次拉扯在坐标里的记账.
      </p>
    </div>
  </HudFrame>
</template>

<style scoped>
.mc-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.mc-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.mc-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.mc-rule {
  margin: 20px 0 22px;
}
.mc-mode {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.mc-hint {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.mc-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
}
.mc-handle {
  cursor: grab;
}
.mc-handle:active {
  cursor: grabbing;
}
.mc-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 22px;
}
.mc-mats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}
.mc-mat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--hud-faint);
  background: var(--hud-tint);
}
.mc-mat.on {
  border-color: var(--hud-accent);
}
.mc-label {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.mc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.mc-cell {
  padding: 7px 0;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  color: var(--hud-ink);
  font-family: inherit;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.mc-cell:hover {
  border-color: var(--hud-accent);
}
.mc-cell.sel {
  border-color: var(--hud-accent);
  background: var(--hud-tint);
  color: var(--hud-hot);
}
.mc-expand {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--hud-faint);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--hud-ink);
}
.mc-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.mc-tag {
  padding: 2px 8px;
  background: var(--hud-accent);
  color: var(--hud-bg);
  font-weight: 700;
  font-size: 12.5px;
}
.mc-vectors {
  gap: 14px;
}
.mc-chips {
  display: inline-flex;
  gap: 6px;
}
.mc-chips b {
  min-width: 52px;
  padding: 3px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.mc-chips.row b {
  border: 1px solid var(--hud-accent);
  color: var(--hud-accent);
}
.mc-chips.col b {
  border: 1px solid var(--hud-warn);
  color: var(--hud-warn);
}
.mc-dot {
  color: var(--hud-dim);
}
.mc-coef {
  color: var(--hud-ink);
  font-variant-numeric: tabular-nums;
}
.mc-result {
  color: var(--hud-hot);
}
.mc-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.mc-buttons .mc-label {
  margin-right: 6px;
  min-width: 52px;
}
.mc-viewrow {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.mc-sub {
  color: var(--hud-dim);
  font-size: 12.5px;
}
.mc-status {
  margin: 0;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.mc-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
