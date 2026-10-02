<script setup>
import { computed } from 'vue'

const props = defineProps({
  frame: { type: Object, default: null },
  prev: { type: Object, default: null },
  listing: { type: Object, default: null }
})

const f = computed(() => props.frame)
const hex = (v) => '0x' + (v >>> 0).toString(16).padStart(8, '0')
const hex2 = (v) => '0x' + (v >>> 0).toString(16).padStart(2, '0')
const dec = (v) => (v | 0).toString()

const imemRows = computed(() => {
  if (!props.listing) return []
  return Array.from(props.listing.entries()).map(([addr, text]) => ({ addr, text }))
})

const regs = computed(() => {
  if (!f.value) return []
  return Array.from(f.value.regs).map((v, i) => ({
    i,
    v,
    read1: f.value.id && f.value.id.rs1 === i && f.value.id.name,
    read2: f.value.id && f.value.id.rs2 === i && f.value.id.name,
    write: f.value.wb && f.value.wb.rd === i && f.value.wb.rd !== 0
  }))
})

const dmem = computed(() => {
  if (!f.value) return []
  const cur = f.value.mem ? ((f.value.mem.addr - 256) >> 2) : -1
  return Array.from(f.value.dmem).map((v, i) => ({
    i,
    v,
    addr: 256 + i * 4,
    cur: i === cur,
    changed: props.prev ? props.prev.dmem[i] !== v : false
  }))
})

const ctrlChips = (ctrl) => {
  if (!ctrl) return []
  return [
    ['RegWrite', ctrl.regWrite],
    ['MemRead', ctrl.memRead],
    ['MemWrite', ctrl.memWrite],
    ['ALUSrc', ctrl.aluSrc],
    ['Branch', ctrl.branch],
    ['Jump', ctrl.jump]
  ].map(([k, v]) => ({ k, on: !!v }))
}

const latchCards = computed(() => {
  if (!f.value) return []
  const L = f.value.latches
  const P = props.prev ? props.prev.latches : null
  const mk = (key, title, fields) => ({
    key,
    title,
    valid: L[key].valid,
    name: L[key].valid ? (L[key].name || '?') : '气泡',
    fields: fields.map(([label, value, changed]) => ({ label, value, changed: !!changed }))
  })
  const pcTxt = (l, p) => (l.valid ? '0x' + (l.pc >>> 0).toString(16) : '·')
  return [
    mk('ifid', 'IF/ID', [
      ['PC', pcTxt(L.ifid)],
      ['指令', L.ifid.valid ? hex(L.ifid.instr) : '·'],
      ['时序', L.ifid.predicted ? '预测 taken' : '顺序', P && P.ifid.predicted !== L.ifid.predicted]
    ]),
    mk('idex', 'ID/EX', [
      ['指令', L.idex.valid ? L.idex.name : '·'],
      ['PC', pcTxt(L.idex)],
      ['rd', L.idex.valid ? 'x' + L.idex.rd : '·'],
      ['rs1', L.idex.valid ? `x${L.idex.rs1} = ${dec(L.idex.rs1v)}` : '·'],
      ['rs2', L.idex.valid ? `x${L.idex.rs2} = ${dec(L.idex.rs2v)}` : '·'],
      ['imm', L.idex.valid ? dec(L.idex.imm) : '·'],
      ['wbSel', L.idex.valid && L.idex.ctrl ? L.idex.ctrl.wbSel : '·']
    ]),
    mk('exmem', 'EX/MEM', [
      ['指令', L.exmem.valid ? L.exmem.name : '·'],
      ['ALU 结果', L.exmem.valid ? dec(L.exmem.aluOut) : '·'],
      ['存储数据', L.exmem.valid ? dec(L.exmem.storeVal) : '·'],
      ['rd', L.exmem.valid ? 'x' + L.exmem.rd : '·']
    ]),
    mk('memwb', 'MEM/WB', [
      ['指令', L.memwb.valid ? L.memwb.name : '·'],
      ['读出值', L.memwb.valid ? dec(L.memwb.loadVal) : '·'],
      ['ALU 结果', L.memwb.valid ? dec(L.memwb.aluOut) : '·'],
      ['pc+4', L.memwb.valid ? '0x' + (L.memwb.pc4 >>> 0).toString(16) : '·'],
      ['rd', L.memwb.valid ? 'x' + L.memwb.rd : '·']
    ])
  ]
})

const ctrlOf = (key) => {
  const l = f.value && f.value.latches[key]
  return l && l.valid && l.ctrl ? l.ctrl : null
}
</script>

<template>
  <div class="rvp" data-palette="violet">
    <div class="rvp-grid">
      <section class="card imem">
        <h4>指令内存 <span class="dim">IMEM</span></h4>
        <div class="table">
          <div
            v-for="row in imemRows"
            :key="row.addr"
            class="trow"
            :class="{ cur: f && f.pc === row.addr }"
          >
            <span class="ta">{{ '0x' + (row.addr >>> 0).toString(16).padStart(4, '0') }}</span>
            <span class="tt">{{ row.text }}</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h4>寄存器堆 <span class="dim">x0 – x31</span></h4>
        <div class="regs">
          <div
            v-for="r in regs"
            :key="r.i"
            class="reg"
            :class="{ r1: r.read1, r2: r.read2, wr: r.write, zero: r.i === 0 }"
          >
            <span class="rn">x{{ r.i }}</span>
            <span class="rv">{{ r.v }}</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h4>数据内存 <span class="dim">DMEM · 基址 0x100</span></h4>
        <div class="dmem">
          <div
            v-for="c in dmem"
            :key="c.i"
            class="dcell"
            :class="{ cur: c.cur, changed: c.changed }"
            :title="'0x' + c.addr.toString(16) + ' = ' + c.v"
          >
            <span class="dv">{{ c.v !== 0 ? hex2(c.v & 0xff) : '' }}</span>
          </div>
        </div>
      </section>

      <section class="card latches">
        <h4>流水线寄存器</h4>
        <div class="lcards">
          <div v-for="c in latchCards" :key="c.key" class="lcard" :class="{ bub: !c.valid }">
            <div class="lhead">
              <span class="ltitle">{{ c.title }}</span>
              <span class="lname">{{ c.name }}</span>
            </div>
            <div v-for="fl in c.fields" :key="fl.label" class="lfield" :class="{ ch: fl.changed }">
              <span class="fl">{{ fl.label }}</span>
              <span class="fv">{{ fl.value }}</span>
            </div>
            <div v-if="c.key === 'idex' && ctrlOf('idex')" class="chips">
              <span v-for="ch in ctrlChips(ctrlOf('idex'))" :key="ch.k" class="chip" :class="{ on: ch.on }">{{ ch.k }}</span>
            </div>
            <div v-if="c.key === 'exmem' && ctrlOf('exmem')" class="chips">
              <span class="chip" :class="{ on: ctrlOf('exmem').memRead }">MemRead</span>
              <span class="chip" :class="{ on: ctrlOf('exmem').memWrite }">MemWrite</span>
            </div>
            <div v-if="c.key === 'memwb' && ctrlOf('memwb')" class="chips">
              <span class="chip" :class="{ on: ctrlOf('memwb').regWrite }">RegWrite</span>
              <span class="chip" :class="{ on: ctrlOf('memwb').wbSel === 'MEM' }">MEM</span>
              <span class="chip" :class="{ on: ctrlOf('memwb').wbSel === 'PC4' }">PC4</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.rvp {
  color: var(--hud-ink);
}
.rvp-grid {
  display: grid;
  grid-template-columns: 1.15fr 1.2fr 1fr;
  grid-template-areas:
    'imem regs dmem'
    'latches latches latches';
  gap: 16px;
}
.card {
  background: var(--hud-panel);
  border: 1px solid var(--hud-faint);
  padding: 12px 14px;
}
.card h4 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hud-ink);
}
.dim {
  color: var(--hud-dim);
  font-weight: 400;
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.imem {
  grid-area: imem;
}
.imem .table {
  max-height: 236px;
  overflow: auto;
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
}
.trow {
  display: flex;
  gap: 10px;
  padding: 2px 6px;
  border-left: 2px solid transparent;
  white-space: nowrap;
}
.trow.cur {
  border-left-color: var(--hud-accent);
  background: rgba(138, 111, 232, 0.12);
  color: var(--hud-hot);
}
.ta {
  color: var(--hud-dim);
}
.regs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.reg {
  display: flex;
  justify-content: space-between;
  padding: 3px 7px;
  border: 1px solid var(--hud-faint);
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
}
.reg .rn {
  color: var(--hud-dim);
}
.reg .rv {
  color: var(--hud-body);
  font-variant-numeric: tabular-nums;
}
.reg.r1,
.reg.r2 {
  border-color: var(--hud-accent);
}
.reg.r1 .rn,
.reg.r2 .rn {
  color: var(--hud-accent);
}
.reg.r1 .rv,
.reg.r2 .rv {
  color: var(--hud-ink);
}
.reg.wr {
  animation: regflash 0.6s ease;
  border-color: var(--hud-good);
}
.reg.wr .rv {
  color: var(--hud-good);
}
@keyframes regflash {
  0% { background: rgba(120, 168, 112, 0.4); }
  100% { background: transparent; }
}
.reg.zero {
  opacity: 0.75;
}
.dmem {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
}
.dcell {
  height: 26px;
  border: 1px solid var(--hud-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ui-monospace, monospace;
  font-size: 9.5px;
  color: var(--hud-body);
}
.dcell.cur {
  border-color: var(--hud-warn);
  color: var(--hud-warn);
}
.dcell.changed {
  animation: dflash 0.6s ease;
}
@keyframes dflash {
  0% { background: rgba(120, 168, 112, 0.45); }
  100% { background: transparent; }
}
.latches {
  grid-area: latches;
}
.lcards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.lcard {
  border: 1px solid var(--hud-faint);
  padding: 8px 10px;
  background: rgba(11, 9, 22, 0.55);
}
.lcard.bub {
  opacity: 0.72;
}
.lhead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.ltitle {
  font-size: 11px;
  color: var(--hud-dim);
  letter-spacing: 0.08em;
}
.lname {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--hud-accent);
}
.lcard.bub .lname {
  color: var(--hud-dim);
}
.lfield {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 1.5px 0;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  border-radius: 2px;
}
.lfield .fl {
  color: var(--hud-dim);
}
.lfield .fv {
  color: var(--hud-body);
  font-variant-numeric: tabular-nums;
}
.lfield.ch {
  animation: fflash 0.6s ease;
}
@keyframes fflash {
  0% { background: rgba(138, 111, 232, 0.35); }
  100% { background: transparent; }
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 6px;
}
.chip {
  font-size: 9.5px;
  font-family: ui-monospace, monospace;
  padding: 1px 5px;
  border: 1px solid var(--hud-faint);
  color: var(--hud-dim);
}
.chip.on {
  color: var(--hud-good);
  border-color: var(--hud-good);
}
@media (max-width: 900px) {
  .rvp-grid {
    grid-template-columns: 1fr;
    grid-template-areas: 'imem' 'regs' 'dmem' 'latches';
  }
  .lcards {
    grid-template-columns: repeat(2, 1fr);
  }
  .regs {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
