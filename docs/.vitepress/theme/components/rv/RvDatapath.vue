<script setup>
import { computed, ref } from 'vue'
import { decodeWord } from '../../labs/rv/isa.js'

const props = defineProps({
  frame: { type: Object, default: null },
  listing: { type: Object, default: null },
  selected: { type: String, default: null }
})
const emit = defineEmits(['select'])

const panRef = ref(null)
let drag = null
let moved = false
let captured = false

function onDown(e) {
  if (e.button !== 0) return
  drag = { x: e.clientX, y: e.clientY, sl: panRef.value.scrollLeft, st: panRef.value.scrollTop }
  moved = false
  captured = false
}
function onMove(e) {
  if (!drag) return
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y
  if (!moved && Math.abs(dx) + Math.abs(dy) > 6) {
    moved = true
    captured = true
    panRef.value.setPointerCapture(e.pointerId)
  }
  if (!moved) return
  panRef.value.scrollLeft = drag.sl - dx
  panRef.value.scrollTop = drag.st - dy
}
function onUp(e) {
  if (captured && e && e.pointerId !== undefined) {
    try {
      panRef.value.releasePointerCapture(e.pointerId)
    } catch {}
  }
  captured = false
  drag = null
  setTimeout(() => (moved = false), 0)
}
function selectPart(k) {
  if (moved) return
  emit('select', k)
}

const f = computed(() => props.frame)
const text = (pc) => {
  if (props.listing && props.listing.get(pc) !== undefined) return props.listing.get(pc)
  return ''
}
const hex = (v, w = 8) => '0x' + ((v >>> 0) & (w === 8 ? 0xffffffff : (1 << (w * 4)) - 1)).toString(16).padStart(w, '0')
const dec = (v) => (v | 0).toString()

const stageActive = (key) => {
  const fr = f.value
  if (!fr) return false
  if (key === 'if') return !!fr.if
  if (key === 'id') return !!fr.id
  if (key === 'ex') return !!fr.ex
  if (key === 'mem') return !!fr.mem
  if (key === 'wb') return !!fr.wb
  return false
}

const lamState = (name) => {
  const fr = f.value
  if (!fr || !fr.id || !fr.id.ctrl) return 0
  return fr.id.ctrl[name] ? 1 : 0
}
const wbSel = computed(() => (f.value && f.value.id && f.value.id.ctrl ? f.value.id.ctrl.wbSel : 'ALU'))

const LAMPS = [
  { label: 'RegWrite', key: 'regWrite' },
  { label: 'MemRead', key: 'memRead' },
  { label: 'MemWrite', key: 'memWrite' },
  { label: 'ALUSrc', key: 'aluSrc' },
  { label: 'Branch', key: 'branch' },
  { label: 'Jump', key: 'jump' }
]

const barState = (which) => {
  const fr = f.value
  if (!fr) return { cls: 'idle', label: '' }
  const l = fr.latches[which]
  if (!l || !l.valid) return { cls: 'bub', label: '气泡' }
  const nm = l.name || (l.instr !== undefined ? decodeWord(l.instr).name : null) || '?'
  return { cls: which === 'ifid' && fr.signals.flush ? 'flush' : 'ok', label: nm }
}

const ex = computed(() => (f.value ? f.value.ex : null))
const mem = computed(() => (f.value ? f.value.mem : null))
const wb = computed(() => (f.value ? f.value.wb : null))
const sig = computed(() =>
  f.value
    ? f.value.signals
    : { stall: false, flush: false, fwdA: 0, fwdB: 0, redirect: null, pcWrite: true, ifidWrite: true }
)

const fwdLabel = (n) => ({ 0: '00', 1: '10', 2: '01' }[n] || '00')
const hazardText = computed(() => {
  const fr = f.value
  if (!fr) return null
  const idex = fr.latches.idex
  const id = fr.id
  const loadUse = idex && idex.valid && idex.ctrl && idex.ctrl.memRead
  const match = id && loadUse && idex.rd !== 0 && (idex.rd === id.rs1 || idex.rd === id.rs2)
  return {
    loadUse,
    match,
    stall: fr.signals.stall,
    flush: fr.signals.flush,
    rd: idex ? idex.rd : 0,
    rs1: id ? id.rs1 : 0,
    rs2: id ? id.rs2 : 0
  }
})
</script>

<template>
  <div class="rvdp" data-palette="violet">
    <div
      class="dp-pan"
      ref="panRef"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointerleave="onUp"
    >
    <svg viewBox="0 0 1500 760" class="dp-svg">
      <defs>
        <linearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(138,111,232,0.10)" />
          <stop offset="1" stop-color="rgba(138,111,232,0.02)" />
        </linearGradient>
        <linearGradient id="stageGradOn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(138,111,232,0.22)" />
          <stop offset="1" stop-color="rgba(138,111,232,0.05)" />
        </linearGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- 舞台背景 -->
      <g v-for="st in [
        { k: 'if', x: 20, w: 230, name: 'IF 取指' },
        { k: 'id', x: 274, w: 276, name: 'ID 译码' },
        { k: 'ex', x: 574, w: 282, name: 'EX 执行' },
        { k: 'mem', x: 880, w: 246, name: 'MEM 访存' },
        { k: 'wb', x: 1150, w: 320, name: 'WB 写回' }
      ]" :key="st.k">
        <rect
          :x="st.x" y="110" :width="st.w" height="470" rx="10"
          :fill="stageActive(st.k) ? 'url(#stageGradOn)' : 'url(#stageGrad)'"
          :stroke="stageActive(st.k) ? 'var(--hud-accent)' : 'var(--hud-faint)'"
          :stroke-width="stageActive(st.k) ? 1.4 : 1"
        />
        <text :x="st.x + 14" y="136" class="stage-name" :class="{ on: stageActive(st.k) }">{{ st.name }}</text>
      </g>

      <!-- 流水线寄存器条 -->
      <g v-for="b in [
        { k: 'ifid', x: 255, top: 'IF/ID' },
        { k: 'idex', x: 555, top: 'ID/EX' },
        { k: 'exmem', x: 862, top: 'EX/MEM' },
        { k: 'memwb', x: 1132, top: 'MEM/WB' }
      ]" :key="b.k">
        <rect
          :x="b.x" y="150" width="15" height="390" rx="3"
          :class="['pipe-bar', barState(b.k).cls]"
        />
        <text :x="b.x + 7.5" y="146" class="bar-label" text-anchor="middle">{{ b.top }}</text>
        <text :x="b.x + 7.5" y="560" class="bar-sub" text-anchor="middle">{{ barState(b.k).label }}</text>
      </g>

      <!-- 底层走线：转发旁路与写回反馈（画在部件之下，只从间隙露出） -->
      <path
        d="M 862 240 C 790 250 740 228 652 220"
        class="bypass" :class="{ on: ex && ex.fwdA === 2 || ex && ex.fwdB === 2 }"
      />
      <path
        d="M 1132 250 C 1000 300 760 350 652 312"
        class="bypass" :class="{ on: ex && ex.fwdA === 1 || ex && ex.fwdB === 1 }"
      />
      <path d="M 1358 336 L 1358 736 L 545 736 L 545 446" class="wbpath" :class="{ on: !!wb }" />

      <!-- ============ IF ============ -->
      <g class="clickable" data-part="pc" @click="selectPart('pc')">
        <rect x="40" y="170" width="92" height="76" rx="6" class="box" :class="{ on: stageActive('if'), sel: selected === 'pc' }" />
        <text x="86" y="194" class="bt" text-anchor="middle">PC 单元</text>
        <text x="86" y="218" class="bv" text-anchor="middle">{{ f ? hex(f.pc) : '——' }}</text>
        <text x="86" y="236" class="bs" text-anchor="middle">{{ sig.pcWrite ? '写使能' : '保持（停顿）' }}</text>
      </g>
      <g class="clickable" data-part="ifid-next" @click="selectPart('ifid-next')">
        <rect x="150" y="163" width="84" height="90" rx="6" class="box" :class="{ on: stageActive('if') }" />
        <text x="192" y="184" class="bs" text-anchor="middle">下一拍 PC</text>
        <text x="192" y="204" class="bv2" text-anchor="middle">+4 → {{ f && f.if ? hex(f.if.pc + 4, 4) : '····' }}</text>
        <text x="192" y="222" class="bv2" text-anchor="middle" :class="{ warn: sig.redirect !== null }">目标 → {{ sig.redirect !== null ? hex(sig.redirect, 4) : '····' }}</text>
        <text x="192" y="242" class="bs" text-anchor="middle" :class="{ crit: sig.flush }">{{ sig.flush ? '重定向' : sig.stall ? '停顿' : '顺序' }}</text>
      </g>
      <line x1="86" y1="246" x2="86" y2="330" class="wire" :class="{ on: stageActive('if') }" />
      <g class="clickable" data-part="imem" @click="selectPart('imem')">
        <rect x="40" y="330" width="194" height="120" rx="6" class="box" :class="{ on: stageActive('if'), sel: selected === 'imem' }" />
        <text x="52" y="354" class="bt">指令内存</text>
        <template v-if="f && f.if">
          <text x="52" y="380" class="bv">{{ hex(f.if.instr) }}</text>
          <text x="52" y="402" class="bs">{{ text(f.if.pc) }}</text>
          <text x="52" y="426" class="bs" :class="{ acc: f.if.predicted }">{{ f.if.predicted ? '预测 taken，从目标继续取' : '' }}</text>
        </template>
        <text v-else x="52" y="388" class="bs">（本拍未取指）</text>
      </g>
      <line x1="234" y1="390" x2="255" y2="390" class="wire" :class="{ on: stageActive('if') }" />

      <!-- ============ ID ============ -->
      <g class="clickable" data-part="cu" @click="selectPart('cu')">
        <rect x="294" y="152" width="152" height="96" rx="6" class="box" :class="{ on: stageActive('id'), sel: selected === 'cu' }" />
        <text x="306" y="174" class="bt">控制单元</text>
        <text x="306" y="194" class="bs">{{ f && f.id ? f.id.name : '——' }}</text>
        <text x="306" y="214" class="bv2">WB ← {{ wbSel }}</text>
        <text x="306" y="232" class="bs">{{ f && f.id && f.id.ctrl && f.id.ctrl.isHalt ? '停机指令' : '组合逻辑' }}</text>
      </g>
      <g>
        <g v-for="(L, i) in LAMPS" :key="L.key">
          <circle
            :cx="302 + (i % 3) * 60" :cy="272 + Math.floor(i / 3) * 24" r="5"
            class="lamp" :class="{ on: lamState(L.key) }"
            @click="selectPart('cu')"
          />
          <text :x="312 + (i % 3) * 60" :y="276 + Math.floor(i / 3) * 24" class="lamp-label">{{ L.label }}</text>
        </g>
      </g>
      <g class="clickable" data-part="rf" @click="selectPart('rf')">
        <rect x="294" y="318" width="236" height="130" rx="6" class="box" :class="{ on: stageActive('id'), sel: selected === 'rf' }" />
        <text x="306" y="340" class="bt">寄存器堆</text>
        <template v-if="f && f.id">
          <text x="306" y="362" class="bv2">rs1 = x{{ f.id.rs1 }} → {{ dec(f.id.rs1v) }}</text>
          <text x="306" y="382" class="bv2">rs2 = x{{ f.id.rs2 }} → {{ dec(f.id.rs2v) }}</text>
        </template>
        <text v-else x="306" y="372" class="bs">（本拍无译码）</text>
        <text v-if="wb" x="306" y="428" class="bv2 write" :key="'w' + f.cycle">写口 x{{ wb.rd }} ← {{ dec(wb.value) }}</text>
        <text v-else x="306" y="428" class="bs">写口空闲</text>
      </g>
      <g class="clickable" data-part="imm" @click="selectPart('imm')">
        <rect x="294" y="464" width="236" height="52" rx="6" class="box" :class="{ on: stageActive('id'), sel: selected === 'imm' }" />
        <text x="306" y="484" class="bt">立即数生成器</text>
        <text x="306" y="504" class="bv2">{{ f && f.id ? dec(f.id.imm) + '  (0x' + (f.id.imm >>> 0).toString(16) + ')' : '——' }}</text>
      </g>

      <!-- ============ EX ============ -->
      <g class="clickable" data-part="muxa" @click="selectPart('muxa')">
        <rect x="592" y="196" width="58" height="46" rx="5" class="box mux" :class="{ on: stageActive('ex'), sel: selected === 'muxa' }" />
        <text x="621" y="214" class="bs" text-anchor="middle">MUX A</text>
        <text x="621" y="233" class="bv2" text-anchor="middle" :class="{ acc: ex && ex.fwdA > 0 }">sel={{ ex ? fwdLabel(ex.fwdA) : '00' }}</text>
      </g>
      <g class="clickable" data-part="muxb" @click="selectPart('muxb')">
        <rect x="592" y="286" width="58" height="46" rx="5" class="box mux" :class="{ on: stageActive('ex'), sel: selected === 'muxb' }" />
        <text x="621" y="304" class="bs" text-anchor="middle">MUX B</text>
        <text x="621" y="323" class="bv2" text-anchor="middle" :class="{ acc: ex && ex.fwdB > 0 }">sel={{ ex ? fwdLabel(ex.fwdB) : '00' }}</text>
      </g>
      <line x1="650" y1="219" x2="700" y2="219" class="wire" :class="{ on: stageActive('ex') }" />
      <line x1="650" y1="309" x2="700" y2="309" class="wire" :class="{ on: stageActive('ex') }" />
      <g class="clickable" data-part="alu" @click="selectPart('alu')">
        <rect x="700" y="186" width="130" height="132" rx="6" class="box" :class="{ on: stageActive('ex'), sel: selected === 'alu' }" />
        <text x="765" y="210" class="bt" text-anchor="middle">ALU</text>
        <text x="765" y="234" class="bv" text-anchor="middle">{{ ex ? ex.name : '——' }}</text>
        <text x="712" y="258" class="bv2">A = {{ ex ? dec(ex.aVal) : '·' }}</text>
        <text x="712" y="278" class="bv2">B = {{ ex ? dec(ex.operB) : '·' }}</text>
        <text x="712" y="304" class="bv2 acc">→ {{ ex ? dec(ex.aluOut) : '·' }}</text>
      </g>
      <g class="clickable" data-part="branch" @click="selectPart('branch')">
        <rect x="700" y="336" width="130" height="88" rx="6" class="box" :class="{ on: ex && ex.taken, sel: selected === 'branch' }" />
        <text x="765" y="358" class="bt" text-anchor="middle">分支 / 跳转</text>
        <text x="765" y="380" class="bv2" text-anchor="middle">{{ ex && (ex.name === 'jal' || ex.name === 'jalr' || ['beq','bne','blt','bge'].includes(ex.name)) ? (ex.taken ? '跳转成立' : '不跳转') : '空闲' }}</text>
        <text x="765" y="402" class="bv2" text-anchor="middle">目标 {{ ex && ex.taken ? hex(ex.target, 4) : '····' }}</text>
        <text x="765" y="418" class="bs" text-anchor="middle">{{ sig.flush ? '预测错误 → 冲刷 2 拍' : '' }}</text>
      </g>
      <g class="clickable" data-part="fwd" @click="selectPart('fwd')">
        <rect x="592" y="446" width="252" height="96" rx="6" class="box" :class="{ on: ex && (ex.fwdA > 0 || ex.fwdB > 0), sel: selected === 'fwd' }" />
        <text x="604" y="468" class="bt">转发单元</text>
        <text x="604" y="490" class="bv2" :class="{ acc: ex && ex.fwdA === 2 }">EX/MEM → A {{ ex && ex.fwdA === 2 ? '●' : '○' }}</text>
        <text x="604" y="510" class="bv2" :class="{ acc: ex && ex.fwdB === 2 }">EX/MEM → B {{ ex && ex.fwdB === 2 ? '●' : '○' }}</text>
        <text x="728" y="490" class="bv2" :class="{ acc: ex && ex.fwdA === 1 }">MEM/WB → A {{ ex && ex.fwdA === 1 ? '●' : '○' }}</text>
        <text x="728" y="510" class="bv2" :class="{ acc: ex && ex.fwdB === 1 }">MEM/WB → B {{ ex && ex.fwdB === 1 ? '●' : '○' }}</text>
      </g>
      <!-- ============ MEM ============ -->
      <line x1="850" y1="255" x2="898" y2="255" class="wire" :class="{ on: stageActive('mem') }" />
      <g class="clickable" data-part="dmem" @click="selectPart('dmem')">
        <rect x="898" y="196" width="212" height="180" rx="6" class="box" :class="{ on: stageActive('mem'), sel: selected === 'dmem' }" />
        <text x="910" y="220" class="bt">数据内存</text>
        <template v-if="mem">
          <text x="910" y="246" class="bv2">地址 {{ hex(mem.addr, 4) }}</text>
          <text v-if="mem.type === 'store'" x="910" y="270" class="bv2 warn">写入 ← {{ dec(mem.value) }}</text>
          <text v-else x="910" y="270" class="bs">无写</text>
          <text v-if="mem.type === 'load'" x="910" y="294" class="bv2 acc">读出 → {{ dec(mem.value) }}</text>
          <text v-else x="910" y="294" class="bs">无读</text>
        </template>
        <text v-else x="910" y="262" class="bs">（本拍无访存）</text>
        <text x="910" y="340" class="bs">64 字 · 基址 0x100</text>
      </g>
      <line x1="1006" y1="376" x2="1006" y2="392" class="wire" />
      <line x1="1110" y1="290" x2="1132" y2="290" class="wire" :class="{ on: stageActive('mem') }" />

      <!-- ============ WB ============ -->
      <g class="clickable" data-part="wbmux" @click="selectPart('wbmux')">
        <rect x="1170" y="256" width="66" height="76" rx="6" class="box mux" :class="{ on: stageActive('wb'), sel: selected === 'wbmux' }" />
        <text x="1203" y="278" class="bs" text-anchor="middle">写回</text>
        <text x="1203" y="298" class="bv2" text-anchor="middle">MUX</text>
        <text x="1203" y="318" class="bv2" text-anchor="middle" :class="{ acc: !!wb }">{{ wbSel }}</text>
      </g>
      <line x1="1236" y1="294" x2="1266" y2="294" class="wire" :class="{ on: !!wb }" />
      <g class="clickable" data-part="wbval" @click="selectPart('wbval')">
        <rect x="1266" y="252" width="184" height="84" rx="6" class="box" :class="{ on: !!wb, sel: selected === 'wbval' }" />
        <text x="1278" y="276" class="bt">写回值</text>
        <template v-if="wb">
          <text x="1278" y="300" class="bv" :key="'wb' + f.cycle">x{{ wb.rd }} ← {{ dec(wb.value) }}</text>
          <text x="1278" y="320" class="bs">（写回寄存器堆）</text>
        </template>
        <text v-else x="1278" y="302" class="bs">本拍无写回</text>
      </g>
      <!-- ============ 冒险单元 ============ -->
      <g class="clickable" data-part="hazard" @click="selectPart('hazard')">
        <rect x="560" y="606" width="320" height="104" rx="8" class="box hazard" :class="{ on: sig.stall || sig.flush, sel: selected === 'hazard' }" />
        <text x="574" y="630" class="bt">冒险检测单元</text>
        <text x="574" y="652" class="bv2" :class="{ crit: hazardText && hazardText.loadUse }">load-use：ID/EX.MemRead = {{ hazardText && hazardText.loadUse ? 1 : 0 }}</text>
        <text x="574" y="672" class="bv2">ID/EX.rd = x{{ hazardText ? hazardText.rd : '·' }}   ID.rs1 = x{{ hazardText ? hazardText.rs1 : '·' }} / rs2 = x{{ hazardText ? hazardText.rs2 : '·' }}</text>
        <text x="574" y="694" class="bv2"><tspan :class="{ warn: sig.stall }">→ 停顿 {{ sig.stall ? 1 : 0 }}（PC/IF-ID 保持 · 插气泡）</tspan> · <tspan :class="{ crit: sig.flush }">→ 冲刷 {{ sig.flush ? 1 : 0 }}</tspan></text>
      </g>
      <path d="M 560 646 L 262 646 L 262 545" class="ctrl-line" :class="{ on: sig.stall }" />
      <path d="M 580 606 L 580 545" class="ctrl-line crit" :class="{ on: sig.flush }" />

      <!-- 底部图例 -->
      <g class="legend">
        <line x1="960" y1="640" x2="1000" y2="640" class="wire on" />
        <text x="1008" y="644">数据通路（活跃）</text>
        <line x1="960" y1="662" x2="1000" y2="662" class="bypass on" />
        <text x="1008" y="666">转发旁路</text>
        <line x1="960" y1="684" x2="1000" y2="684" class="ctrl-line on" />
        <text x="1008" y="688">停顿</text>
        <line x1="960" y1="706" x2="1000" y2="706" class="ctrl-line crit on" />
        <text x="1008" y="710">冲刷</text>
      </g>
    </svg>
    </div>
    <p class="dp-tip">按住空白处拖动可平移（也可滚轮/滚动条）· 点击部件看内部实现 · 完整内存/寄存器见「存储与寄存器」页</p>
  </div>
</template>

<style scoped>
.rvdp {
  background: var(--hud-bg);
  border: 1px solid var(--hud-faint);
}
.dp-pan {
  overflow: auto;
  cursor: grab;
  max-height: 780px;
}
.dp-pan:active {
  cursor: grabbing;
}
.dp-pan::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.dp-pan::-webkit-scrollbar-track {
  background: var(--hud-bg);
}
.dp-pan::-webkit-scrollbar-thumb {
  background: var(--hud-faint);
  border-radius: 5px;
}
.dp-pan::-webkit-scrollbar-thumb:hover {
  background: var(--hud-dim);
}
.dp-svg {
  display: block;
  width: 100%;
  min-width: 1900px;
  height: auto;
  user-select: none;
}
.dp-tip {
  margin: 0;
  padding: 6px 12px;
  font-size: 11.5px;
  color: var(--hud-dim);
  border-top: 1px solid var(--hud-faint);
}
.stage-name {
  font-size: 14.5px;
  font-weight: 600;
  fill: var(--hud-dim);
  letter-spacing: 0.08em;
}
.stage-name.on {
  fill: var(--hud-ink);
}
.box {
  fill: rgba(11, 9, 22, 0.9);
  stroke: var(--hud-faint);
  stroke-width: 1;
  transition: stroke 0.15s, fill 0.15s;
}
.box.on {
  stroke: var(--hud-accent);
  fill: rgba(138, 111, 232, 0.10);
}
.box.mux {
  fill: rgba(11, 9, 22, 0.9);
}
.box.hazard.on {
  stroke: var(--hud-warn);
  fill: rgba(217, 178, 60, 0.08);
}
.clickable {
  cursor: pointer;
}
.clickable:hover .box {
  stroke: var(--hud-accent);
}
.box.sel {
  stroke: var(--hud-hot) !important;
  stroke-width: 1.6;
}
.bt {
  font-size: 13.5px;
  font-weight: 600;
  fill: var(--hud-ink);
}
.bv {
  font-size: 14px;
  font-family: ui-monospace, monospace;
  fill: var(--hud-hot);
  font-variant-numeric: tabular-nums;
}
.bv2 {
  font-size: 12.5px;
  font-family: ui-monospace, monospace;
  fill: var(--hud-body);
  font-variant-numeric: tabular-nums;
}
.bs {
  font-size: 11.5px;
  font-family: ui-monospace, monospace;
  fill: var(--hud-dim);
}
.bv2.acc, .bs.acc, .bv.acc {
  fill: var(--hud-accent);
}
.bv2.warn, .bs.warn {
  fill: var(--hud-warn);
}
.bv2.crit, .bs.crit, .bv2.crit {
  fill: var(--hud-crit);
}
.bv2.write {
  fill: var(--hud-good);
  animation: pop 0.4s ease;
}
@keyframes pop {
  from { fill: var(--hud-hot); }
}
.wire {
  stroke: var(--hud-faint);
  stroke-width: 1.6;
}
.wire.on {
  stroke: var(--hud-accent);
  filter: url(#glow);
  stroke-dasharray: 6 6;
  animation: flow 0.8s linear infinite;
}
@keyframes flow {
  to { stroke-dashoffset: -12; }
}
.bypass {
  fill: none;
  stroke: var(--hud-faint);
  stroke-width: 1.4;
  stroke-dasharray: 4 6;
}
.bypass.on {
  stroke: var(--hud-good);
  stroke-width: 2;
  filter: url(#glow);
  animation: flow 0.7s linear infinite;
}
.ctrl-line {
  fill: none;
  stroke: var(--hud-faint);
  stroke-width: 1.4;
  stroke-dasharray: 3 5;
}
.ctrl-line.on {
  stroke: var(--hud-warn);
  stroke-width: 2;
  filter: url(#glow);
  animation: flow 0.7s linear infinite;
}
.ctrl-line.crit {
  stroke: rgba(224, 80, 96, 0.25);
}
.ctrl-line.crit.on {
  stroke: var(--hud-crit);
}
.wbpath {
  fill: none;
  stroke: var(--hud-faint);
  stroke-width: 1.4;
}
.wbpath.on {
  stroke: var(--hud-good);
  stroke-width: 1.8;
  filter: url(#glow);
  stroke-dasharray: 8 8;
  animation: flow 1s linear infinite;
}
.lamp {
  fill: rgba(42, 36, 68, 0.9);
  stroke: var(--hud-faint);
  transition: fill 0.15s;
}
.lamp.on {
  fill: var(--hud-good);
  stroke: var(--hud-good);
  filter: url(#glow);
}
.lamp-label {
  font-size: 10.5px;
  font-family: ui-monospace, monospace;
  fill: var(--hud-dim);
}
.pipe-bar {
  fill: rgba(42, 36, 68, 0.55);
  stroke: var(--hud-faint);
}
.pipe-bar.ok {
  fill: rgba(138, 111, 232, 0.35);
  stroke: var(--hud-dim);
}
.pipe-bar.bub {
  fill: rgba(92, 114, 116, 0.18);
  stroke: var(--hud-faint);
}
.pipe-bar.flush {
  fill: rgba(224, 80, 96, 0.4);
  stroke: var(--hud-crit);
}
.bar-label {
  font-size: 11px;
  font-family: ui-monospace, monospace;
  fill: var(--hud-dim);
  letter-spacing: 0.06em;
}
.bar-sub {
  font-size: 11px;
  font-family: ui-monospace, monospace;
  fill: var(--hud-body);
}
.legend text {
  font-size: 12px;
  fill: var(--hud-dim);
}
.mem-cell {
  fill: rgba(42, 36, 68, 0.5);
  stroke: none;
}
.mem-cell.lit {
  fill: var(--hud-accent);
}
</style>
