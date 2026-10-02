<script setup>
import { computed, reactive, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import HudButton from './HudButton.vue'

const VW = 720
const VH = 540
const XMIN = -4
const XMAX = 4
const YMIN = -3
const YMAX = 3

const svgEl = ref(null)
const mode = ref('proj')
const u = reactive({ x: 2, y: 0 })
const v = reactive({ x: 0.5, y: 2 })
const a = reactive({ x: 1.5, y: 0.5 })
const b = reactive({ x: 0.5, y: 2 })
let dragging = null

const sx = (x) => ((x - XMIN) / (XMAX - XMIN)) * VW
const sy = (y) => VH - ((y - YMIN) / (YMAX - YMIN)) * VH
const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val))
const snap = (val) => Math.round(clamp(val, -2.5, 2.5) * 10) / 10

const dot = (p, q) => p.x * q.x + p.y * q.y
const norm = (p) => Math.sqrt(dot(p, p))
const unit = (p) => {
  const n = norm(p)
  return n > 1e-9 ? { x: p.x / n, y: p.y / n } : null
}

// ---- 投影模式 ----
const uv = computed(() => dot(u, v))
const uu = computed(() => dot(u, u))
const tCoef = computed(() => (uu.value > 1e-9 ? uv.value / uu.value : null))
const proj = computed(() =>
  tCoef.value === null ? null : { x: tCoef.value * u.x, y: tCoef.value * u.y }
)
const residual = computed(() =>
  proj.value ? { x: v.x - proj.value.x, y: v.y - proj.value.y } : null
)
const cosTheta = computed(() => {
  const n = norm(u) * norm(v)
  return n > 1e-9 ? uv.value / n : null
})

// ---- 正交化模式 ----
const aa = computed(() => dot(a, a))
const ab = computed(() => dot(a, b))
const projB = computed(() =>
  aa.value > 1e-9 ? { x: (ab.value / aa.value) * a.x, y: (ab.value / aa.value) * a.y } : null
)
const perp = computed(() =>
  projB.value ? { x: b.x - projB.value.x, y: b.y - projB.value.y } : null
)
const perpNorm = computed(() => (perp.value ? norm(perp.value) : null))

const fmt = (x) => (x === null || x === undefined ? '—' : x.toFixed(2))

const readouts = computed(() =>
  mode.value === 'proj'
    ? [
        { label: '⟨u, v⟩', value: fmt(uv.value) },
        { label: '|u|', value: fmt(norm(u)) },
        { label: '系数 t', value: fmt(tCoef.value) },
        { label: '|残差|', value: residual.value ? fmt(norm(residual.value)) : '—' }
      ]
    : [
        { label: '|a|', value: fmt(norm(a)) },
        { label: '⟨a, b⟩', value: fmt(ab.value) },
        { label: '|b⊥|', value: fmt(perpNorm.value) },
        { label: 'e₂', value: perp.value && norm(perp.value) > 1e-9 ? '存在' : '退化' }
      ]
)

const status = computed(() => {
  if (mode.value === 'proj') {
    if (tCoef.value === null) return 'u 是零向量，无法确定投影方向.'
    const parts = []
    parts.push(
      `v = 投影 + 残差：投影落在 u 的直线上，残差与 u 正交（夹角 ${cosTheta.value === null ? '—' : Math.acos(Math.min(1, Math.max(-1, cosTheta.value))) * 180 / Math.PI}°）`
    )
    if (uv.value < 0) parts.push('这次投影落在 u 的反方向（内积为负）.')
    return parts.join('；') + '.'
  }
  if (aa.value < 1e-9) return 'a 是零向量，无法做正交化.'
  if (perpNorm.value !== null && perpNorm.value < 0.05) {
    return 'b 与 a 共线：b⊥ = 0，这一组向量张不成两个正交方向.'
  }
  return 'e₁ 与 e₂ 是一组标准正交基：长度都是 1，且 e₁ ⊥ e₂. 这正是 Gram–Schmidt 的目标.'
})

const gridPath = computed(() => {
  const lines = []
  for (let k = -4; k <= 4; k++) {
    lines.push(`M${sx(k)} ${sy(YMIN)} L${sx(k)} ${sy(YMAX)}`)
    lines.push(`M${sx(XMIN)} ${sy(k)} L${sx(XMAX)} ${sy(k)}`)
  }
  return lines.join(' ')
})

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

// 直角标记：以 p 为角点，沿 d1、d2 两个单位方向画小方框
const rightAngle = (p, d1, d2, s = 0.22) => {
  if (!d1 || !d2) return ''
  const p1 = { x: p.x + d1.x * s, y: p.y + d1.y * s }
  const p2 = { x: p1.x + d2.x * s, y: p1.y + d2.y * s }
  const p3 = { x: p.x + d2.x * s, y: p.y + d2.y * s }
  return `M${sx(p1.x).toFixed(1)} ${sy(p1.y).toFixed(1)} L${sx(p2.x).toFixed(1)} ${sy(p2.y).toFixed(1)} L${sx(p3.x).toFixed(1)} ${sy(p3.y).toFixed(1)}`
}

const projRightAngle = computed(() => {
  if (!proj.value || !residual.value) return ''
  return rightAngle(proj.value, unit(u), unit(residual.value))
})

const gsRightAngle = computed(() => {
  if (!projB.value || !perp.value) return ''
  return rightAngle(projB.value, unit(a), unit(perp.value))
})

const toMath = (evt) => {
  const rect = svgEl.value.getBoundingClientRect()
  return {
    x: XMIN + ((evt.clientX - rect.left) / rect.width) * (XMAX - XMIN),
    y: YMIN + ((rect.bottom - evt.clientY) / rect.height) * (YMAX - YMIN)
  }
}

const onMove = (evt) => {
  if (!dragging) return
  const { x, y } = toMath(evt)
  const cx = snap(x)
  const cy = snap(y)
  const target =
    dragging === 'u' ? u : dragging === 'v' ? v : dragging === 'a' ? a : dragging === 'b' ? b : null
  if (target) Object.assign(target, { x: cx, y: cy })
}
const onUp = () => {
  dragging = null
}

const PRESETS = {
  proj: [
    { name: '水平', u: { x: 2, y: 0 }, v: { x: 0.5, y: 2 } },
    { name: '斜', u: { x: 1.5, y: 1 }, v: { x: 0.5, y: 2 } },
    { name: '反向', u: { x: -1.5, y: 0.5 }, v: { x: 1.5, y: 1.5 } }
  ],
  gs: [
    { name: '交叉', a: { x: 1.5, y: 0.5 }, b: { x: 0.5, y: 2 } },
    { name: '斜', a: { x: 1, y: 1 }, b: { x: 2, y: 0 } },
    { name: '共线', a: { x: 1, y: 1 }, b: { x: 2, y: 2 } }
  ]
}

function applyPreset(p) {
  if (mode.value === 'proj') {
    Object.assign(u, p.u)
    Object.assign(v, p.v)
  } else {
    Object.assign(a, p.a)
    Object.assign(b, p.b)
  }
}
</script>

<template>
  <HudFrame palette="cyan" compact>
    <header class="op-head">
      <div class="op-title">
        <TitleTab text="实验 06" />
        <h3>投影与正交化</h3>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="op-rule" :split="56" />

    <div class="op-modes">
      <HudButton :variant="mode === 'proj' ? 'primary' : 'ghost'" @click="mode = 'proj'">
        投影
      </HudButton>
      <HudButton :variant="mode === 'gs' ? 'primary' : 'ghost'" @click="mode = 'gs'">
        正交化（Gram–Schmidt）
      </HudButton>
      <span class="op-gap" />
      <HudButton v-for="p in PRESETS[mode]" :key="p.name" @click="applyPreset(p)">
        {{ p.name }}
      </HudButton>
    </div>

    <div class="op-canvas">
      <svg
        ref="svgEl"
        :viewBox="`0 0 ${VW} ${VH}`"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      >
        <path :d="gridPath" fill="none" stroke="var(--hud-faint)" stroke-width="1" />
        <line :x1="sx(XMIN)" :y1="sy(0)" :x2="sx(XMAX)" :y2="sy(0)" stroke="var(--hud-dim)" stroke-width="1" />
        <line :x1="sx(0)" :y1="sy(YMIN)" :x2="sx(0)" :y2="sy(YMAX)" stroke="var(--hud-dim)" stroke-width="1" />

        <!-- 投影模式 -->
        <template v-if="mode === 'proj'">
          <line
            v-if="proj"
            :x1="sx(0)" :y1="sy(0)" :x2="sx(proj.x)" :y2="sy(proj.y)"
            stroke="var(--hud-good)" stroke-width="4" opacity="0.8"
          />
          <path :d="projRightAngle" fill="none" stroke="var(--hud-good)" stroke-width="1" opacity="0.9" />
          <line
            v-if="residual"
            :x1="sx(proj.x)" :y1="sy(proj.y)" :x2="sx(v.x)" :y2="sy(v.y)"
            stroke="var(--hud-hot)" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.6"
          />
          <text
            v-if="proj" :x="sx(proj.x) + 10" :y="sy(proj.y) + 18"
            fill="var(--hud-good)" font-size="15" font-weight="700"
          >投影</text>
          <text
            v-if="residual" :x="sx((proj.x + v.x) / 2) + 10" :y="sy((proj.y + v.y) / 2) - 8"
            fill="var(--hud-hot)" font-size="14" opacity="0.75"
          >残差</text>
        </template>

        <!-- 正交化模式 -->
        <template v-else>
          <line
            v-if="perp"
            :x1="sx(projB.x)" :y1="sy(projB.y)" :x2="sx(b.x)" :y2="sy(b.y)"
            stroke="var(--hud-warn)" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.55"
          />
          <line
            v-if="perp"
            :x1="sx(0)" :y1="sy(0)" :x2="sx(perp.x)" :y2="sy(perp.y)"
            stroke="var(--hud-good)" stroke-width="2.6" opacity="0.9"
          />
          <path :d="gsRightAngle" fill="none" stroke="var(--hud-good)" stroke-width="1" opacity="0.9" />
          <text
            v-if="perp" :x="sx(perp.x) + 12" :y="sy(perp.y) + 20"
            fill="var(--hud-good)" font-size="15" font-weight="700"
          >b⊥</text>
        </template>

        <!-- 可拖向量 -->
        <template v-if="mode === 'proj'">
          <g>
            <line :x1="sx(0)" :y1="sy(0)" :x2="sx(u.x)" :y2="sy(u.y)" stroke="var(--hud-accent)" stroke-width="2.2" />
            <polygon :points="arrowHead(u.x, u.y)" fill="var(--hud-accent)" />
            <text :x="sx(u.x) + 14" :y="sy(u.y) - 12" fill="var(--hud-accent)" font-size="20" font-weight="700">u</text>
            <circle :cx="sx(u.x)" :cy="sy(u.y)" r="10" fill="var(--hud-bg)" stroke="var(--hud-accent)" stroke-width="2" class="op-handle" @pointerdown="dragging = 'u'" />
          </g>
          <g>
            <line :x1="sx(0)" :y1="sy(0)" :x2="sx(v.x)" :y2="sy(v.y)" stroke="var(--hud-hot)" stroke-width="2.2" />
            <polygon :points="arrowHead(v.x, v.y)" fill="var(--hud-hot)" />
            <text :x="sx(v.x) + 14" :y="sy(v.y) - 12" fill="var(--hud-hot)" font-size="20" font-weight="700">v</text>
            <circle :cx="sx(v.x)" :cy="sy(v.y)" r="10" fill="var(--hud-bg)" stroke="var(--hud-hot)" stroke-width="2" class="op-handle" @pointerdown="dragging = 'v'" />
          </g>
        </template>

        <template v-else>
          <g>
            <line :x1="sx(0)" :y1="sy(0)" :x2="sx(a.x)" :y2="sy(a.y)" stroke="var(--hud-accent)" stroke-width="2.2" />
            <polygon :points="arrowHead(a.x, a.y)" fill="var(--hud-accent)" />
            <text :x="sx(a.x) + 14" :y="sy(a.y) - 12" fill="var(--hud-accent)" font-size="20" font-weight="700">a</text>
            <circle :cx="sx(a.x)" :cy="sy(a.y)" r="10" fill="var(--hud-bg)" stroke="var(--hud-accent)" stroke-width="2" class="op-handle" @pointerdown="dragging = 'a'" />
          </g>
          <g>
            <line :x1="sx(0)" :y1="sy(0)" :x2="sx(b.x)" :y2="sy(b.y)" stroke="var(--hud-warn)" stroke-width="2.2" />
            <polygon :points="arrowHead(b.x, b.y)" fill="var(--hud-warn)" />
            <text :x="sx(b.x) + 14" :y="sy(b.y) - 12" fill="var(--hud-warn)" font-size="20" font-weight="700">b</text>
            <circle :cx="sx(b.x)" :cy="sy(b.y)" r="10" fill="var(--hud-bg)" stroke="var(--hud-warn)" stroke-width="2" class="op-handle" @pointerdown="dragging = 'b'" />
          </g>
          <line
            v-if="unit(a)"
            :x1="sx(0)" :y1="sy(0)" :x2="sx(unit(a).x)" :y2="sy(unit(a).y)"
            stroke="var(--hud-accent)" stroke-width="1.2" opacity="0.7"
          />
          <line
            v-if="perp && unit(perp)"
            :x1="sx(0)" :y1="sy(0)" :x2="sx(unit(perp).x)" :y2="sy(unit(perp).y)"
            stroke="var(--hud-good)" stroke-width="1.2" opacity="0.7"
          />
          <text :x="sx(unit(a) ? unit(a).x : 0) + 10" :y="sy(unit(a) ? unit(a).y : 0) + 20" fill="var(--hud-accent)" font-size="13" opacity="0.85">e₁</text>
          <text
            v-if="perp && unit(perp)"
            :x="sx(unit(perp).x) + 10" :y="sy(unit(perp).y) + 20"
            fill="var(--hud-good)" font-size="13" opacity="0.85"
          >e₂</text>
        </template>
      </svg>
    </div>

    <p class="op-status">{{ status }}</p>
    <p class="op-note">
      <template v-if="mode === 'proj'">
        绿色粗线是 v 在 u 上的投影，白色虚线是残差 v − 投影；直角标记表示两者垂直. 拖动 u、v 的端点看投影怎么变.
      </template>
      <template v-else>
        先把 a 归一化得到 e₁，再把 b 减去它在 a 上的投影得到 b⊥，最后把 b⊥ 归一化得到 e₂. 拖动 a、b 观察 b⊥ 何时退化成零.
      </template>
    </p>
  </HudFrame>
</template>

<style scoped>
.op-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 40px;
}
.op-title {
  display: flex;
  align-items: center;
  gap: 18px;
}
.op-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.op-rule {
  margin: 20px 0 22px;
}
.op-modes {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.op-gap {
  width: 14px;
}
.op-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
  touch-action: none;
}
.op-handle {
  cursor: grab;
}
.op-handle:active {
  cursor: grabbing;
}
.op-status {
  margin: 18px 0 10px;
  padding: 10px 12px;
  border-left: 2px solid var(--hud-accent);
  background: var(--hud-tint);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hud-ink);
}
.op-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--hud-dim);
}
</style>
