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
const M = reactive({ a: 0, b: -1, c: 1, d: 0 })
const u1 = reactive({ x: 1, y: 0 })
const u2 = reactive({ x: 0, y: 1 })
const probe = reactive({ x: 1.5, y: 1 })
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

const detM = computed(() => M.a * M.d - M.b * M.c)
const detP = computed(() => u1.x * u2.y - u1.y * u2.x)
const basisOk = computed(() => Math.abs(detP.value) > 1e-6)

const P = computed(() => ({ a: u1.x, b: u2.x, c: u1.y, d: u2.y }))

const Mprime = computed(() => {
  if (!basisOk.value) return null
  const p = P.value
  const det = detP.value
  const Pinv = { a: p.d / det, b: -p.b / det, c: -p.c / det, d: p.a / det }
  return mm(Pinv, mm(M, p))
})

const gridPath = computed(() => {
  const lines = []
  for (let k = -4; k <= 4; k++) {
    lines.push(`M${sx(k)} ${sy(YMIN)} L${sx(k)} ${sy(YMAX)}`)
    lines.push(`M${sx(XMIN)} ${sy(k)} L${sx(XMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

// 新基生成的网格（P 的像），随拖动实时变化
const lattice = computed(() => {
  const p = P.value
  const mv = (x, y) => [p.a * x + p.b * y, p.c * x + p.d * y]
  const lines = []
  for (let k = -8; k <= 8; k++) {
    const p1 = mv(k, -8)
    const p2 = mv(k, 8)
    lines.push(`M${sx(p1[0]).toFixed(1)} ${sy(p1[1]).toFixed(1)} L${sx(p2[0]).toFixed(1)} ${sy(p2[1]).toFixed(1)}`)
    const q1 = mv(-8, k)
    const q2 = mv(8, k)
    lines.push(`M${sx(q1[0]).toFixed(1)} ${sy(q1[1]).toFixed(1)} L${sx(q2[0]).toFixed(1)} ${sy(q2[1]).toFixed(1)}`)
  }
  return lines.join(' ')
})

const arrows = computed(() => [
  { id: 'u1', label: 'u₁', color: 'var(--hud-accent)', p: u1 },
  { id: 'u2', label: 'u₂', color: 'var(--hud-warn)', p: u2 }
])

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

const toMath = (evt) => {
  const rect = svgEl.value.getBoundingClientRect()
  return {
    x: XMIN + ((evt.clientX - rect.left) / rect.width) * (XMAX - XMIN),
    y: YMIN + ((rect.bottom - evt.clientY) / rect.height) * (YMAX - YMIN)
  }
}

const onDown = (id) => {
  dragging = id
}

const onMove = (evt) => {
  if (!dragging) return
  const { x, y } = toMath(evt)
  const cx = snap(x)
  const cy = snap(y)
  if (dragging === 'u1') Object.assign(u1, { x: cx, y: cy })
  else if (dragging === 'u2') Object.assign(u2, { x: cx, y: cy })
  else if (dragging === 'v') Object.assign(probe, { x: cx, y: cy })
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

const BASES = [
  { name: '标准基', u: [{ x: 1, y: 0 }, { x: 0, y: 1 }] },
  { name: '斜基', u: [{ x: 1, y: 1 }, { x: 1, y: -1 }] },
  { name: '旋转 45°', u: [{ x: 0.7, y: 0.7 }, { x: -0.7, y: 0.7 }] },
  { name: '共线', u: [{ x: 1, y: 0.5 }, { x: 2, y: 1 }] }
]

function applyMap(m) {
  Object.assign(M, m)
}

function applyBasis(b) {
  Object.assign(u1, b.u[0])
  Object.assign(u2, b.u[1])
}

const fmt = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2))
const texMat = (X) =>
  `\\begin{bmatrix} ${fmt(X.a)} & ${fmt(X.b)} \\\\ ${fmt(X.c)} & ${fmt(X.d)} \\end{bmatrix}`

const texM = computed(() => texMat(M))
const texP = computed(() => texMat(P.value))
const texMp = computed(() => (Mprime.value ? texMat(Mprime.value) : '\\text{—}'))

const readouts = computed(() => [
  { label: 'det M', value: detM.value.toFixed(2) },
  { label: 'det P', value: detP.value.toFixed(2) },
  { label: '基', value: basisOk.value ? '有效' : '退化' }
])
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="cb-head">
      <div class="cb-title">
        <TitleTab text="实验 05" />
        <h3>同一个变换，不同的矩阵</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="cb-rule" :split="56" />

    <div class="cb-canvas">
      <svg
        ref="svgEl"
        :viewBox="`0 0 ${VW} ${VH}`"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      >
        <path :d="gridPath" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
        <path :d="lattice" fill="none" stroke="var(--hud-accent)" stroke-width="1" opacity="0.24" />
        <line :x1="sx(XMIN)" :y1="sy(0)" :x2="sx(XMAX)" :y2="sy(0)" stroke="var(--hud-dim)" stroke-width="1" />
        <line :x1="sx(0)" :y1="sy(YMIN)" :x2="sx(0)" :y2="sy(YMAX)" stroke="var(--hud-dim)" stroke-width="1" />

        <g v-for="a in arrows" :key="a.id + '-img'">
          <line
            :x1="sx(0)"
            :y1="sy(0)"
            :x2="sx(apply(M, a.p).x)"
            :y2="sy(apply(M, a.p).y)"
            :stroke="a.color"
            stroke-width="1.6"
            stroke-dasharray="6 4"
            opacity="0.75"
          />
        </g>
        <g>
          <line
            :x1="sx(0)"
            :y1="sy(0)"
            :x2="sx(apply(M, probe).x)"
            :y2="sy(apply(M, probe).y)"
            stroke="var(--hud-hot)"
            stroke-width="1.6"
            stroke-dasharray="6 4"
            opacity="0.75"
          />
          <text :x="sx(apply(M, probe).x) + 14" :y="sy(apply(M, probe).y) + 20" fill="var(--hud-hot)" font-size="17" font-weight="700" opacity="0.8">Mv</text>
        </g>

        <g v-for="a in arrows" :key="a.id">
          <line :x1="sx(0)" :y1="sy(0)" :x2="sx(a.p.x)" :y2="sy(a.p.y)" :stroke="a.color" stroke-width="2.2" />
          <polygon :points="arrowHead(a.p.x, a.p.y)" :fill="a.color" />
          <text :x="sx(a.p.x) + 16" :y="sy(a.p.y) - 12" :fill="a.color" font-size="20" font-weight="700">{{ a.label }}</text>
          <circle
            :cx="sx(a.p.x)"
            :cy="sy(a.p.y)"
            r="10"
            fill="var(--hud-bg)"
            :stroke="a.color"
            stroke-width="2"
            class="cb-handle"
            @pointerdown="onDown(a.id)"
          />
        </g>

        <g>
          <line :x1="sx(0)" :y1="sy(0)" :x2="sx(probe.x)" :y2="sy(probe.y)" stroke="var(--hud-hot)" stroke-width="2.2" />
          <polygon :points="arrowHead(probe.x, probe.y)" fill="var(--hud-hot)" />
          <text :x="sx(probe.x) + 16" :y="sy(probe.y) + 22" fill="var(--hud-hot)" font-size="20" font-weight="700">v</text>
          <circle
            :cx="sx(probe.x)"
            :cy="sy(probe.y)"
            r="10"
            fill="var(--hud-bg)"
            stroke="var(--hud-hot)"
            stroke-width="2"
            class="cb-handle"
            @pointerdown="onDown('v')"
          />
        </g>
      </svg>
    </div>

    <div class="cb-panel">
      <div class="cb-mats">
        <div class="cb-mat">
          <span class="cb-label">映射 M（标准基）</span>
          <FormulaLine :tex="`M = ${texM}`" size="17px" />
        </div>
        <div class="cb-mat">
          <span class="cb-label">过渡矩阵 P（新基按列）</span>
          <FormulaLine :tex="`P = ${texP}`" size="17px" />
        </div>
        <div class="cb-mat">
          <span class="cb-label">同一映射在新基下的矩阵</span>
          <FormulaLine :tex="`M' = P^{-1}MP = ${texMp}`" size="17px" />
        </div>
      </div>

      <div class="cb-buttons">
        <span class="cb-label">映射</span>
        <HudButton v-for="m in MAPS" :key="m.name" @click="applyMap(m.m)">{{ m.name }}</HudButton>
      </div>
      <div class="cb-buttons">
        <span class="cb-label">基</span>
        <HudButton v-for="b in BASES" :key="b.name" @click="applyBasis(b)">{{ b.name }}</HudButton>
      </div>

      <p class="cb-status" :class="{ warn: !basisOk }">
        <template v-if="!basisOk">
          u₁ 与 u₂ 共线，P 不可逆：这一组向量不是基，换坐标的公式失效.
        </template>
        <template v-else>
          箭头 v 和 Mv 是几何事实，不会因为换基改变；换基只改变"记账"用的矩阵.
          拖动 u₁、u₂ 看 M′ 怎么变.</template>
      </p>
      <p class="cb-note">
        青色网格随 u₁、u₂ 一起变形，它就是 P 的图像：拖动基向量，网格被拉斜、旋转、压扁；
        基退化时网格塌成一条线，P 也就不可逆了.虚线是基向量的像，这两个像在新基下的坐标就是 M′ 的两列.
      </p>
    </div>
  </HudFrame>
</template>

<style scoped>
.cb-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.cb-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.cb-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.cb-rule {
  margin: 20px 0 24px;
}
.cb-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
}
.cb-handle {
  cursor: grab;
}
.cb-handle:active {
  cursor: grabbing;
}
.cb-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 22px;
}
.cb-mats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}
.cb-mat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--hud-faint);
  background: var(--hud-tint);
}
.cb-label {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.cb-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.cb-buttons .cb-label {
  margin-right: 6px;
}
.cb-status {
  margin: 0;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.cb-status.warn {
  border-left-color: var(--hud-warn);
  color: var(--hud-warn);
}
.cb-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
