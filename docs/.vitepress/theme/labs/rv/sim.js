// 周期精确 RV32I 五级流水线模拟器：IF / ID / EX / MEM / WB
// 冒险处理：全转发（可关）、load-use 停顿、分支在 EX 解决（可配静态预测）
import { decodeWord, ctrlFor, ALU } from './isa.js'

export const DATA_BASE = 0x100
export const DMEM_WORDS = 64

const bubble = () => ({ valid: false })

export function createCpu(opts = {}) {
  const cpu = {
    imem: Uint32Array.from(opts.words || []),
    dmem: new Int32Array(DMEM_WORDS),
    regs: new Int32Array(32),
    pc: 0,
    btb: new Map(),
    cycle: 0,
    retired: 0,
    stalls: 0,
    flushes: 0,
    mispredicts: 0,
    branches: 0,
    seq: 0,
    halted: false,
    forwarding: opts.forwarding !== false,
    predict: opts.predict || 'none',
    ifid: bubble(),
    idex: bubble(),
    exmem: bubble(),
    memwb: bubble()
  }
  for (const d of opts.data || []) {
    const idx = (d.addr - DATA_BASE) >> 2
    if (idx >= 0 && idx < DMEM_WORDS) cpu.dmem[idx] = d.word | 0
  }
  return cpu
}

export function alu(op, a, b) {
  a = a | 0
  b = b | 0
  switch (op) {
    case ALU.ADD: return (a + b) | 0
    case ALU.SUB: return (a - b) | 0
    case ALU.AND: return a & b
    case ALU.OR: return a | b
    case ALU.XOR: return a ^ b
    case ALU.SLL: return (a << (b & 31)) | 0
    case ALU.SRL: return (a >>> (b & 31)) | 0
    case ALU.SRA: return a >> (b & 31)
    case ALU.SLT: return a < b ? 1 : 0
    case ALU.SLTU: return (a >>> 0) < (b >>> 0) ? 1 : 0
  }
  return 0
}

export function branchTaken(op, a, b) {
  switch (op) {
    case 'eq': return a === b
    case 'ne': return a !== b
    case 'lt': return (a | 0) < (b | 0)
    case 'ge': return (a | 0) >= (b | 0)
  }
  return false
}

export function wbValue(stage) {
  if (!stage.valid) return 0
  const sel = stage.ctrl ? stage.ctrl.wbSel : 'ALU'
  if (sel === 'MEM') return stage.loadVal | 0
  if (sel === 'PC4') return stage.pc4 | 0
  return stage.aluOut | 0
}

function forward(reg, orig, exmem, memwb) {
  if (exmem.valid && exmem.ctrl.regWrite && !exmem.ctrl.memRead && exmem.rd !== 0 && exmem.rd === reg) {
    return [2, exmem.aluOut | 0]
  }
  if (memwb.valid && memwb.ctrl.regWrite && memwb.rd !== 0 && memwb.rd === reg) {
    return [1, wbValue(memwb)]
  }
  return [0, orig | 0]
}

const snap = (s) => (s.valid ? { ...s, ctrl: s.ctrl ? { ...s.ctrl } : s.ctrl } : bubble())

export function step(cpu) {
  if (cpu.halted) return null
  const fr = { cycle: cpu.cycle, pc: cpu.pc }

  // ---------- WB ----------
  let wb = null
  let haltRetire = false
  if (cpu.memwb.valid) {
    cpu.retired++
    const st = cpu.memwb
    if (st.ctrl.regWrite && st.rd !== 0) {
      const v = wbValue(st)
      cpu.regs[st.rd] = v
      wb = { rd: st.rd, value: v }
    }
    if (st.ctrl.isHalt) {
      cpu.halted = true
      haltRetire = true
    }
  }

  // ---------- MEM ----------
  let memEv = null
  if (cpu.exmem.valid) {
    const st = cpu.exmem
    const addr = st.aluOut | 0
    const idx = (addr - DATA_BASE) >> 2
    if (st.ctrl.memRead) {
      st.loadVal = idx >= 0 && idx < DMEM_WORDS ? cpu.dmem[idx] | 0 : 0
      memEv = { type: 'load', addr, value: st.loadVal }
    }
    if (st.ctrl.memWrite) {
      if (idx >= 0 && idx < DMEM_WORDS) cpu.dmem[idx] = st.storeVal | 0
      memEv = { type: 'store', addr, value: st.storeVal | 0 }
    }
  }

  // ---------- EX ----------
  let ex = null
  let redirect = null
  let flush = false
  if (cpu.idex.valid) {
    const st = cpu.idex
    let fwdA = 0
    let fwdB = 0
    let aVal = st.rs1v | 0
    let bVal = st.rs2v | 0
    if (cpu.forwarding) {
      ;[fwdA, aVal] = forward(st.rs1, st.rs1v, cpu.exmem, cpu.memwb)
      ;[fwdB, bVal] = forward(st.rs2, st.rs2v, cpu.exmem, cpu.memwb)
    }
    const isShiftI = st.name === 'slli' || st.name === 'srli' || st.name === 'srai'
    const operB = st.ctrl.aluSrc ? (isShiftI ? st.shamt : st.imm) : bVal
    const aluOut = alu(st.ctrl.aluCtl, aVal, operB)
    let taken = false
    let target = 0
    if (st.ctrl.branch || st.ctrl.jump) {
      cpu.branches++
      if (st.ctrl.branch) {
        taken = branchTaken(st.ctrl.brOp, aVal, bVal)
        target = (st.pc + st.imm) | 0
      } else {
        taken = true
        target = st.name === 'jalr' ? (aVal + st.imm) & ~1 : (st.pc + st.imm) | 0
      }
      const predicted = cpu.predict === 'taken' && !!st.predicted
      if (taken) cpu.btb.set(st.pc, target)
      if (taken && !predicted) {
        flush = true
        cpu.mispredicts++
        redirect = target
      } else if (!taken && predicted) {
        flush = true
        cpu.mispredicts++
        redirect = (st.pc + 4) | 0
      }
    }
    ex = {
      pc: st.pc,
      pc4: st.pc4,
      instr: st.instr,
      name: st.name,
      rd: st.rd,
      rs1: st.rs1,
      rs2: st.rs2,
      fwdA,
      fwdB,
      aVal,
      bVal,
      operB: operB | 0,
      aluOut: aluOut | 0,
      taken,
      target
    }
  }

  // ---------- ID ----------
  let id = null
  let stall = false
  if (cpu.ifid.valid) {
    const d = decodeWord(cpu.ifid.instr)
    const ctrl = ctrlFor(d.name)
    id = {
      valid: true,
      pc: cpu.ifid.pc,
      pc4: (cpu.ifid.pc + 4) | 0,
      instr: cpu.ifid.instr,
      name: d.name,
      type: d.type,
      rd: d.rd,
      rs1: d.rs1,
      rs2: d.rs2,
      imm: d.imm,
      shamt: d.shamt,
      rs1v: cpu.regs[d.rs1] | 0,
      rs2v: cpu.regs[d.rs2] | 0,
      predicted: !!cpu.ifid.predicted,
      seq: cpu.ifid.seq,
      ctrl
    }
    const matchEX =
      cpu.idex.valid && cpu.idex.ctrl.regWrite && cpu.idex.rd !== 0 &&
      (cpu.idex.rd === d.rs1 || cpu.idex.rd === d.rs2)
    const matchMEM =
      cpu.exmem.valid && cpu.exmem.ctrl.regWrite && cpu.exmem.rd !== 0 &&
      (cpu.exmem.rd === d.rs1 || cpu.exmem.rd === d.rs2)
    stall = cpu.forwarding ? matchEX && cpu.idex.ctrl.memRead : matchEX || matchMEM
  }
  if (stall) cpu.stalls++

  // ---------- IF ----------
  const haltInFlight =
    (cpu.ifid.valid && decodeWord(cpu.ifid.instr).name === 'ecall') ||
    (cpu.idex.valid && cpu.idex.ctrl.isHalt) ||
    (cpu.exmem.valid && cpu.exmem.ctrl.isHalt) ||
    (cpu.memwb.valid && cpu.memwb.ctrl.isHalt)
  let ifs = null
  let predicted = false
  let nextPc = (cpu.pc + 4) | 0
  if (!cpu.halted && !haltInFlight) {
    const idx = cpu.pc >> 2
    const instr = idx >= 0 && idx < cpu.imem.length ? cpu.imem[idx] >>> 0 : 0
    ifs = { pc: cpu.pc, instr, seq: cpu.seq++ }
    if (cpu.predict === 'taken' && cpu.btb.has(cpu.pc)) {
      predicted = true
      nextPc = cpu.btb.get(cpu.pc)
    }
  }

  // ---------- 统计与冲刷 ----------
  if (flush) {
    cpu.flushes += 2
  }

  // ---------- 锁存下一拍 ----------
  const nextIfid = flush
    ? bubble()
    : stall
      ? cpu.ifid
      : ifs
        ? { valid: true, pc: ifs.pc, instr: ifs.instr, seq: ifs.seq, predicted }
        : bubble()
  const nextIdex = flush ? bubble() : stall ? bubble() : id ? snap(id) : bubble()
  const nextExmem = ex
    ? {
        valid: true,
        seq: cpu.idex.seq,
        pc: ex.pc,
        pc4: ex.pc4,
        instr: ex.instr,
        name: ex.name,
        rd: ex.rd,
        rs1: ex.rs1,
        rs2: ex.rs2,
        aluOut: ex.aluOut,
        storeVal: ex.bVal,
        ctrl: { ...cpu.idex.ctrl },
        loadVal: 0
      }
    : bubble()
  const nextMemwb = cpu.exmem.valid ? { ...cpu.exmem, ctrl: { ...cpu.exmem.ctrl } } : bubble()

  // ---------- 帧（本拍状态） ----------
  fr.if = ifs ? { ...ifs, predicted } : null
  fr.id = id ? { pc: id.pc, instr: id.instr, name: id.name, rd: id.rd, rs1: id.rs1, rs2: id.rs2, rs1v: id.rs1v, rs2v: id.rs2v, imm: id.imm, ctrl: { ...id.ctrl } } : null
  fr.ex = ex
  fr.mem = memEv
  fr.wb = wb
  fr.signals = {
    stall,
    flush,
    redirect,
    pcWrite: !stall && !cpu.halted,
    ifidWrite: !stall && !flush,
    fwdA: ex ? ex.fwdA : 0,
    fwdB: ex ? ex.fwdB : 0
  }
  fr.latches = {
    ifid: snap(cpu.ifid),
    idex: snap(cpu.idex),
    exmem: snap(cpu.exmem),
    memwb: snap(cpu.memwb)
  }
  fr.regs = Int32Array.from(cpu.regs)
  fr.dmem = Int32Array.from(cpu.dmem)
  fr.stats = {
    cycle: cpu.cycle,
    retired: cpu.retired,
    stalls: cpu.stalls,
    flushes: cpu.flushes,
    mispredicts: cpu.mispredicts,
    branches: cpu.branches,
    cpi: cpu.retired ? (cpu.cycle + 1) / cpu.retired : 0
  }
  fr.haltRetire = haltRetire

  // ---------- 提交 ----------
  cpu.memwb = nextMemwb
  cpu.exmem = nextExmem
  cpu.idex = nextIdex
  cpu.ifid = nextIfid
  if (redirect !== null) cpu.pc = redirect
  else if (!stall && !cpu.halted && ifs) cpu.pc = nextPc
  cpu.cycle++

  return fr
}

export function runToHalt(cpu, maxCycles = 2000) {
  const frames = []
  while (!cpu.halted && cpu.cycle < maxCycles) {
    const fr = step(cpu)
    if (!fr) break
    frames.push(fr)
  }
  return frames
}
