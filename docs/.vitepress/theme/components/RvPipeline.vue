<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import HudFrame from './HudFrame.vue'
import HudRule from './HudRule.vue'
import HudButton from './HudButton.vue'
import HudSlider from './HudSlider.vue'
import HudTextarea from './HudTextarea.vue'
import TitleTab from './TitleTab.vue'
import ReadoutCells from './ReadoutCells.vue'
import RvDatapath from './rv/RvDatapath.vue'
import RvPanels from './rv/RvPanels.vue'
import RvTimeline from './rv/RvTimeline.vue'
import { assemble } from '../labs/rv/assembler.js'
import { createCpu, step } from '../labs/rv/sim.js'
import { PRESETS, presetById } from '../labs/rv/presets.js'
import { ctrlFor, INSTR } from '../labs/rv/isa.js'

const asmText = ref(presetById('dep').asm)
const presetId = ref('dep')
const error = ref(null)
const tab = ref('datapath')
const selected = ref('cu')
const showEditor = ref(false)
const playing = ref(false)
const speed = ref(6)
const forwarding = ref(true)
const predict = ref('none')

let cpu = null
let listingMap = new Map()
let history = []
let timer = 0
const version = ref(0)
const viewing = ref(null)

const frame = computed(() => {
  void version.value
  if (!history.length) return null
  const i = viewing.value === null ? history.length - 1 : viewing.value
  return history[Math.min(i, history.length - 1)]
})
const prevFrame = computed(() => {
  void version.value
  const i = viewing.value === null ? history.length - 1 : viewing.value
  return i > 0 ? history[i - 1] : null
})

function init() {
  stopPlay()
  const res = assemble(asmText.value)
  if (!res.ok) {
    error.value = res.errors.map((e) => `第 ${e.line} 行：${e.msg}`).join('；')
    return
  }
  error.value = null
  listingMap = new Map(res.listing.map((l) => [l.addr, l.text]))
  cpu = createCpu({ words: res.words, data: res.data, forwarding: forwarding.value, predict: predict.value })
  history = []
  viewing.value = null
  version.value++
  stepOnce(true)
}

function stepOnce(initial = false) {
  if (!cpu || cpu.halted) {
    stopPlay()
    return
  }
  if (!initial && viewing.value !== null) {
    viewing.value = null
    return
  }
  const fr = step(cpu)
  if (fr) {
    history.push(fr)
    version.value++
  }
  if (cpu.halted) stopPlay()
}

function startPlay() {
  if (!cpu || cpu.halted) return
  playing.value = true
  tick()
}
function tick() {
  clearTimeout(timer)
  if (!playing.value) return
  stepOnce()
  timer = setTimeout(tick, Math.max(16, Math.round(620 / speed.value)))
}
function stopPlay() {
  playing.value = false
  clearTimeout(timer)
}
function reset() {
  init()
}
function setupPreset(p) {
  presetId.value = p.id
  asmText.value = p.asm
  init()
}
function setConfig() {
  init()
}
function seek(i) {
  viewing.value = i
  stopPlay()
}
function toLive() {
  viewing.value = null
}

init()

onBeforeUnmount(() => stopPlay())

const readouts = computed(() => {
  const fr = frame.value
  const s = fr ? fr.stats : { cycle: 0, retired: 0, cpi: 0, stalls: 0, flushes: 0, mispredicts: 0 }
  return [
    { label: '周期', value: String(history.length) },
    { label: '退休指令', value: String(s.retired) },
    { label: 'CPI', value: s.cpi ? s.cpi.toFixed(2) : '—' },
    { label: '停顿', value: String(s.stalls) },
    { label: '冲刷', value: String(s.flushes) },
    { label: '预测错误', value: String(s.mispredicts) }
  ]
})

const hex = (v, w = 8) => '0x' + (v >>> 0).toString(16).padStart(w, '0')

/* ---------- 检查器 ---------- */
const TRUTH_ROWS = [
  'add', 'sub', 'and', 'or', 'xor', 'sll', 'srl', 'sra', 'slt', 'sltu',
  'addi', 'andi', 'ori', 'xori', 'slti', 'slli', 'srli', 'srai',
  'lw', 'sw', 'beq', 'bne', 'blt', 'bge', 'jal', 'jalr', 'lui', 'ecall'
].map((n) => ({ n, c: ctrlFor(n) }))

const aluBits = computed(() => {
  const fr = frame.value
  if (!fr || !fr.ex) return null
  const ex = fr.ex
  const bits = 8
  const bitsOf = (v) => Array.from({ length: bits }, (_, i) => (v >>> (bits - 1 - i)) & 1)
  const op = (INSTR[ex.name] && INSTR[ex.name].ctrl && INSTR[ex.name].ctrl.aluCtl) || 'ADD'
  const a = ex.aVal >>> 0
  const b = ex.operB >>> 0
  const rows = [
    { label: 'A', cls: 'a', bits: bitsOf(a) },
    { label: 'B', cls: 'b', bits: bitsOf(b) }
  ]
  let note = ''
  if (op === 'ADD' || op === 'SUB') {
    const bb = op === 'SUB' ? (~b + 1) >>> 0 : b
    const carries = []
    let carry = op === 'SUB' ? 1 : 0
    for (let i = 0; i < bits; i++) {
      const s = ((a >>> i) & 1) + ((bb >>> i) & 1) + carry
      carries.push(carry)
      carry = s > 1 ? 1 : 0
    }
    rows.push({ label: 'C', cls: 'carry', bits: carries.slice().reverse() })
    note = op === 'SUB' ? '（减法 = 加上 b 的补码，进位链初始 carry-in = 1）' : '（全加器链逐位进位）'
  }
  const out = (ex.aluOut) >>> 0
  rows.push({ label: '=', cls: 'out', bits: bitsOf(out) })
  return { rows, op, note, dec: { a: ex.aVal, b: ex.operB, out: ex.aluOut }, bits }
})

const fwdInfo = computed(() => {
  const fr = frame.value
  if (!fr) return null
  const idex = fr.latches.idex
  const exmem = fr.latches.exmem
  const memwb = fr.latches.memwb
  const ex = fr.ex
  return {
    rs1: idex.valid ? idex.rs1 : null,
    rs2: idex.valid ? idex.rs2 : null,
    exmemRd: exmem.valid ? exmem.rd : null,
    exmemOn: exmem.valid && exmem.ctrl && exmem.ctrl.regWrite,
    memwbRd: memwb.valid ? memwb.rd : null,
    memwbOn: memwb.valid && memwb.ctrl && memwb.ctrl.regWrite,
    fwdA: ex ? ex.fwdA : 0,
    fwdB: ex ? ex.fwdB : 0
  }
})

const hazardInfo = computed(() => {
  const fr = frame.value
  if (!fr) return null
  const idex = fr.latches.idex
  return {
    memRead: !!(idex.valid && idex.ctrl && idex.ctrl.memRead),
    rd: idex.valid ? idex.rd : null,
    rs1: fr.id ? fr.id.rs1 : null,
    rs2: fr.id ? fr.id.rs2 : null,
    stall: fr.signals.stall,
    flush: fr.signals.flush
  }
})

const generic = computed(() => {
  const fr = frame.value
  const map = {
    pc: {
      title: 'PC 与下一拍地址',
      text: 'PC 正常 +4；停顿信号到来时保持；分支在 EX 解决后重定向到目标地址。',
      vals: [
        ['PC', fr ? hex(fr.pc) : '—'],
        ['下一拍 +4', fr && fr.if ? hex(fr.if.pc + 4) : '—'],
        ['重定向', fr && fr.signals.redirect !== null ? hex(fr.signals.redirect) : '无']
      ]
    },
    'ifid-next': {
      title: '下一拍 PC 逻辑',
      text: '多路器在 +4、分支目标与“保持”之间选择。停顿优先于一切（不取新指令）。',
      vals: [
        ['停顿', fr && fr.signals.stall ? '1（保持）' : '0'],
        ['冲刷', fr && fr.signals.flush ? '1（重定向）' : '0']
      ]
    },
    imem: {
      title: '指令内存',
      text: '按 PC 取指：地址 = PC >> 2 索引，本实验程序很短，全部置零填充。',
      vals: [['本拍取指', fr && fr.if ? hex(fr.if.instr) : '（停顿/停机）']]
    },
    rf: {
      title: '寄存器堆',
      text: '两个读口（ID 段用）+ 一个写口（WB 段用）。x0 恒为 0；同一拍先写后读。',
      vals: fr && fr.id ? [['读口 1', `x${fr.id.rs1} = ${fr.id.rs1v}`], ['读口 2', `x${fr.id.rs2} = ${fr.id.rs2v}`]] : [['读口', '—']]
    },
    dmem: {
      title: '数据内存',
      text: 'lw/sw 用；地址基址 0x100，64 个字。访存在 MEM 段完成。',
      vals: [['本拍', fr && fr.mem ? `${fr.mem.type === 'load' ? '读' : '写'} ${hex(fr.mem.addr, 3)} = ${fr.mem.value}` : '空闲']]
    },
    branch: {
      title: '分支 / 跳转单元',
      text: '在 EX 段比较（转发后的）操作数：成立则重定向 PC；未预测到时冲刷两拍。静态预测用 BTB 缓存固定目标（分支与 jal）；jalr 的返回地址随调用点变化，不参与预测。',
      vals: [
        ['结果', fr && fr.ex && fr.ex.taken ? '成立' : '不成立'],
        ['目标', fr && fr.ex && fr.ex.taken ? hex(fr.ex.target) : '—'],
        ['预测', predict.value === 'taken' ? '静态 taken（BTB）' : '不预测']
      ]
    },
    wbmux: {
      title: '写回多路器',
      text: '在 ALU 结果、内存读出值与 PC+4 之间选择写入寄存器的值。',
      vals: [['选择', fr && fr.id && fr.id.ctrl ? fr.id.ctrl.wbSel : '—']]
    },
    wbval: {
      title: '写回端口',
      text: 'WB 段把值写入 rd；写口与 ID 读口同拍时先写后读（无冒险）。',
      vals: [['本拍写', fr && fr.wb ? `x${fr.wb.rd} ← ${fr.wb.value}` : '无']]
    },
    muxa: {
      title: '转发多路器 A',
      text: 'ALU 操作数 A 的来源：00 = 寄存器堆读出，01 = EX/MEM 旁路，10 = MEM/WB 旁路。',
      vals: [['选择', fwdInfo.value ? fwdInfo.value.fwdA : '—']]
    },
    muxb: {
      title: '转发多路器 B',
      text: 'ALU 操作数 B 的来源：寄存器堆 / EX/MEM / MEM/WB；若 ALUSrc=1 则改用立即数。',
      vals: [['选择', fwdInfo.value ? fwdInfo.value.fwdB : '—']]
    },
    imm: {
      title: '立即数生成器',
      text: '按指令类型从机器码中拼出立即数：I 型 12 位、S 型拆两段、B 型错位、U 型高 20 位、J 型 20 位。',
      vals: fr && fr.id ? [['类型', fr.id.type], ['数值', String(fr.id.imm)]] : [['类型', '—']]
    }
  }
  return selected.value ? map[selected.value] || null : null
})

const TABS = [
  { k: 'datapath', name: '数据通路' },
  { k: 'panels', name: '存储与寄存器' },
  { k: 'timeline', name: '时空图' }
]
</script>

<template>
  <HudFrame palette="violet">
    <header class="rp-head">
      <div class="rp-title">
        <TitleTab text="实验 01" />
        <h3>RV32I 五级流水线</h3>
        <span class="rp-sub">IF · ID · EX · MEM · WB ｜ 转发 / 停顿 / 冲刷 可视化</span>
      </div>
      <ReadoutCells :items="readouts" />
    </header>

    <HudRule class="rp-rule" :split="56" />

    <div class="rp-presets">
      <span class="rp-label">预设</span>
      <HudButton
        v-for="p in PRESETS"
        :key="p.id"
        :class="{ 'rp-active': presetId === p.id }"
        @click="setupPreset(p)"
      >{{ p.name }}</HudButton>
      <span class="rp-note">{{ presetById(presetId).note }}</span>
    </div>

    <div class="rp-controls">
      <HudButton @click="reset">复位</HudButton>
      <HudButton @click="stepOnce()">单步</HudButton>
      <HudButton :class="{ 'rp-active': playing }" @click="playing ? stopPlay() : startPlay()">
        {{ playing ? '暂停' : '运行' }}
      </HudButton>
      <div class="rp-speed">
        <span class="rp-label">速度</span>
        <HudSlider v-model="speed" :min="1" :max="20" :step="1" />
      </div>
      <span class="rp-sep" />
      <HudButton :class="{ 'rp-active': forwarding }" @click="forwarding = !forwarding; setConfig()">
        转发：{{ forwarding ? '开' : '关' }}
      </HudButton>
      <HudButton
        :class="{ 'rp-active': predict === 'taken' }"
        @click="predict = predict === 'taken' ? 'none' : 'taken'; setConfig()"
      >
        分支预测：{{ predict === 'taken' ? '静态 taken' : '关' }}
      </HudButton>
      <span class="rp-sep" />
      <HudButton :class="{ 'rp-active': showEditor }" @click="showEditor = !showEditor">编辑汇编</HudButton>
      <HudButton v-if="viewing !== null" @click="toLive">回到最新</HudButton>
    </div>

    <p v-if="error" class="rp-error">{{ error }}</p>

    <div v-if="showEditor" class="rp-editor">
      <HudTextarea v-model="asmText" label="RV32I 汇编（支持 li/mv/nop/j/ret/beqz/bnez 伪指令与 .data 段）" :rows="8" :maxlength="4000" />
      <div class="rp-editor-actions">
        <HudButton @click="init">装入并复位</HudButton>
        <span class="rp-note">支持指令：算术/逻辑/移位、lw/sw、beq/bne/blt/bge、jal/jalr、lui、ecall（停机）</span>
      </div>
    </div>

    <div class="rp-tabs">
      <HudButton
        v-for="t in TABS"
        :key="t.k"
        :class="{ 'rp-active': tab === t.k }"
        @click="tab = t.k"
      >{{ t.name }}</HudButton>
      <span v-if="viewing !== null" class="rp-replay">回看第 {{ viewing + 1 }} 拍</span>
    </div>

    <div class="rp-body">
      <div class="rp-main">
        <RvDatapath
          v-if="tab === 'datapath'"
          :frame="frame"
          :listing="listingMap"
          :selected="selected"
          @select="(k) => (selected = k)"
        />
        <RvPanels v-else-if="tab === 'panels'" :frame="frame" :prev="prevFrame" :listing="listingMap" />
        <RvTimeline
          v-else
          :frames="history"
          :version="version"
          :viewing="viewing"
          :listing="listingMap"
          @seek="seek"
        />
      </div>

      <aside class="rp-inspect">
        <div class="rp-inspect-head">
          <span>内部实现</span>
          <span class="rp-note">{{ selected ? '已选：' + selected : '点击部件' }}</span>
        </div>

        <template v-if="selected === 'cu'">
          <p class="rp-desc">控制单元真值表：opcode / funct 组合决定控制信号。高亮行 = 当前 ID 段指令。</p>
          <table class="truth">
            <thead>
              <tr><th>指令</th><th>RW</th><th>MR</th><th>MW</th><th>AS</th><th>Br</th><th>Jp</th><th>WB</th></tr>
            </thead>
            <tbody>
              <tr
                v-for="row in TRUTH_ROWS"
                :key="row.n"
                :class="{ on: frame && frame.id && frame.id.name === row.n }"
              >
                <td>{{ row.n }}</td>
                <td>{{ row.c.regWrite || 0 }}</td>
                <td>{{ row.c.memRead || 0 }}</td>
                <td>{{ row.c.memWrite || 0 }}</td>
                <td>{{ row.c.aluSrc || 0 }}</td>
                <td>{{ row.c.branch || 0 }}</td>
                <td>{{ row.c.jump || 0 }}</td>
                <td>{{ row.c.wbSel === 'MEM' ? 'M' : row.c.wbSel === 'PC4' ? 'P' : 'A' }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-else-if="selected === 'alu'">
          <p class="rp-desc">
            ALU 内部：{{ aluBits ? aluBits.op : '—' }} 运算的低 8 位示意（A={{ aluBits ? aluBits.dec.a : '·' }}，
            B={{ aluBits ? aluBits.dec.b : '·' }}，结果={{ aluBits ? aluBits.dec.out : '·' }}）。
          </p>
          <div v-if="aluBits" class="bits">
            <div v-for="row in aluBits.rows" :key="row.label" class="bitrow">
              <span class="bitlabel">{{ row.label }}</span>
              <span v-for="(b, i) in row.bits" :key="i" class="bit" :class="[row.cls, { one: b === 1 }]">{{ b }}</span>
            </div>
            <p class="rp-note">{{ aluBits.note }}</p>
          </div>
          <p v-else class="rp-note">本拍 EX 段为空.</p>
        </template>

        <template v-else-if="selected === 'fwd'">
          <p class="rp-desc">转发单元：比较 EX/MEM、MEM/WB 的目标寄存器与当前 EX 段的源寄存器。</p>
          <div v-if="fwdInfo" class="cond">
            <p>EX/MEM：RegWrite={{ fwdInfo.exmemOn ? 1 : 0 }}，rd={{ fwdInfo.exmemRd !== null ? 'x' + fwdInfo.exmemRd : '·' }}</p>
            <p>MEM/WB：RegWrite={{ fwdInfo.memwbOn ? 1 : 0 }}，rd={{ fwdInfo.memwbRd !== null ? 'x' + fwdInfo.memwbRd : '·' }}</p>
            <p>ID/EX 源：rs1={{ fwdInfo.rs1 !== null ? 'x' + fwdInfo.rs1 : '·' }}，rs2={{ fwdInfo.rs2 !== null ? 'x' + fwdInfo.rs2 : '·' }}</p>
            <p class="hl">→ ForwardA = {{ fwdInfo.fwdA }}（{{ ['寄存器堆', 'MEM/WB', 'EX/MEM'][fwdInfo.fwdA] }}）</p>
            <p class="hl">→ ForwardB = {{ fwdInfo.fwdB }}（{{ ['寄存器堆', 'MEM/WB', 'EX/MEM'][fwdInfo.fwdB] }}）</p>
          </div>
        </template>

        <template v-else-if="selected === 'hazard'">
          <p class="rp-desc">冒险检测：只需盯住 load-use——ID/EX 是 load 且目标寄存器正好被 ID 段读到。</p>
          <div v-if="hazardInfo" class="cond">
            <p>ID/EX.MemRead = {{ hazardInfo.memRead ? 1 : 0 }}</p>
            <p>ID/EX.rd = {{ hazardInfo.rd !== null ? 'x' + hazardInfo.rd : '·' }}</p>
            <p>ID.rs1 = {{ hazardInfo.rs1 !== null ? 'x' + hazardInfo.rs1 : '·' }}，ID.rs2 = {{ hazardInfo.rs2 !== null ? 'x' + hazardInfo.rs2 : '·' }}</p>
            <p class="hl warn">→ 停顿（stall）= {{ hazardInfo.stall ? 1 : 0 }}</p>
            <p class="hl crit">→ 冲刷（flush）= {{ hazardInfo.flush ? 1 : 0 }}（分支在 EX 解决，未预测到时）</p>
          </div>
        </template>

        <template v-else-if="generic">
          <p class="rp-desc">{{ generic.title }}. {{ generic.text }}</p>
          <div class="cond">
            <p v-for="([k, v], i) in generic.vals" :key="i" class="hl">{{ k }}：{{ v }}</p>
          </div>
        </template>

        <template v-else>
          <p class="rp-desc">点击左侧数据通路上的任意部件，这里会展开它的内部实现（控制单元真值表、ALU 逐位运算、转发与冒险判断条件）。</p>
        </template>
      </aside>
    </div>
  </HudFrame>
</template>

<style scoped>
.rp-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px 36px;
}
.rp-title {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
}
.rp-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--hud-ink);
}
.rp-sub {
  font-size: 12.5px;
  color: var(--hud-dim);
  font-family: ui-monospace, monospace;
}
.rp-rule {
  margin: 18px 0;
}
.rp-presets,
.rp-controls,
.rp-tabs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.rp-presets {
  margin-bottom: 12px;
}
.rp-controls {
  margin-bottom: 12px;
}
.rp-tabs {
  margin: 14px 0;
}
.rp-label {
  font-size: 12.5px;
  color: var(--hud-dim);
}
.rp-note {
  font-size: 12px;
  color: var(--hud-dim);
}
.rp-sep {
  width: 1px;
  height: 18px;
  background: var(--hud-faint);
  margin: 0 6px;
}
.rp-speed {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 180px;
}
.rp-active {
  border-color: var(--hud-accent) !important;
  color: var(--hud-accent) !important;
}
.rp-replay {
  margin-left: auto;
  font-size: 12px;
  color: var(--hud-warn);
  font-family: ui-monospace, monospace;
}
.rp-error {
  margin: 0 0 12px;
  padding: 8px 12px;
  border-left: 2px solid var(--hud-crit);
  background: rgba(224, 80, 96, 0.08);
  color: var(--hud-crit);
  font-size: 12.5px;
  font-family: ui-monospace, monospace;
}
.rp-editor {
  margin-bottom: 12px;
}
.rp-editor-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
}
.rp-body {
  display: block;
}
.rp-main {
  min-width: 0;
}
.rp-inspect {
  margin-top: 16px;
  border: 1px solid var(--hud-faint);
  background: var(--hud-panel);
  padding: 12px 16px;
  max-height: 420px;
  overflow: auto;
  max-width: 1400px;
}
.rp-inspect-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12.5px;
  color: var(--hud-ink);
  margin-bottom: 10px;
}
.rp-desc {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.75;
  color: var(--hud-body);
}
.truth {
  width: 100%;
  border-collapse: collapse;
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.truth th {
  color: var(--hud-dim);
  font-weight: 500;
  text-align: center;
  padding: 3px 2px;
  border-bottom: 1px solid var(--hud-faint);
}
.truth td {
  text-align: center;
  padding: 2.5px 2px;
  color: var(--hud-body);
}
.truth td:first-child {
  text-align: left;
  color: var(--hud-ink);
}
.truth tr.on {
  background: rgba(138, 111, 232, 0.22);
}
.truth tr.on td {
  color: var(--hud-hot);
}
.bits {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.bitrow {
  display: flex;
  align-items: center;
  gap: 3px;
}
.bitlabel {
  width: 16px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--hud-dim);
}
.bit {
  width: 22px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ui-monospace, monospace;
  font-size: 10.5px;
  border: 1px solid var(--hud-faint);
  color: var(--hud-dim);
}
.bit.one.a { background: rgba(95, 211, 216, 0.35); color: var(--hud-hot); border-color: #5fd3d8; }
.bit.one.b { background: rgba(138, 111, 232, 0.4); color: var(--hud-hot); border-color: var(--hud-accent); }
.bit.one.out { background: rgba(120, 168, 112, 0.4); color: var(--hud-hot); border-color: var(--hud-good); }
.bit.one.carry { background: rgba(217, 178, 60, 0.45); color: var(--hud-hot); border-color: var(--hud-warn); }
.bitrow:hover .bit { border-color: var(--hud-dim); }
.cond p {
  margin: 0 0 6px;
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
  color: var(--hud-body);
}
.cond p.hl {
  color: var(--hud-ink);
}
.cond p.hl.warn {
  color: var(--hud-warn);
}
.cond p.hl.crit {
  color: var(--hud-crit);
}

</style>
