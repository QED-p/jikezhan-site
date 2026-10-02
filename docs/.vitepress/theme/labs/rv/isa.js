// RV32I 指令子集：编码、解码、控制信号真值表
// 扩展位：M / Zicsr / Zifencei 预留分组（本期只启用 I）

export const ALU = {
  ADD: 'ADD',
  SUB: 'SUB',
  AND: 'AND',
  OR: 'OR',
  XOR: 'XOR',
  SLL: 'SLL',
  SRL: 'SRL',
  SRA: 'SRA',
  SLT: 'SLT',
  SLTU: 'SLTU'
}

export const OPC = {
  R: 0x33,
  I: 0x13,
  LOAD: 0x03,
  STORE: 0x23,
  BRANCH: 0x63,
  JAL: 0x6f,
  JALR: 0x67,
  LUI: 0x37,
  SYS: 0x73
}

// name → { type, op, f3, f7, alu, ctrl }
export const INSTR = {}

function R(name, op, f3, f7, alu) {
  INSTR[name] = { type: 'R', op, f3, f7, alu, ctrl: { regWrite: 1, aluSrc: 0, wbSel: 'ALU', aluCtl: alu } }
}
function I(name, op, f3, f7, alu, extra = {}) {
  INSTR[name] = { type: 'I', op, f3, f7, alu, ctrl: { regWrite: 1, aluSrc: 1, wbSel: 'ALU', aluCtl: alu, ...extra } }
}

R('add', OPC.R, 0x0, 0x00, ALU.ADD)
R('sub', OPC.R, 0x0, 0x20, ALU.SUB)
R('sll', OPC.R, 0x1, 0x00, ALU.SLL)
R('slt', OPC.R, 0x2, 0x00, ALU.SLT)
R('sltu', OPC.R, 0x3, 0x00, ALU.SLTU)
R('xor', OPC.R, 0x4, 0x00, ALU.XOR)
R('srl', OPC.R, 0x5, 0x00, ALU.SRL)
R('sra', OPC.R, 0x5, 0x20, ALU.SRA)
R('or', OPC.R, 0x6, 0x00, ALU.OR)
R('and', OPC.R, 0x7, 0x00, ALU.AND)

I('addi', OPC.I, 0x0, 0, ALU.ADD)
I('slli', OPC.I, 0x1, 0x00, ALU.SLL)
I('slti', OPC.I, 0x2, 0, ALU.SLT)
I('sltiu', OPC.I, 0x3, 0, ALU.SLTU)
I('xori', OPC.I, 0x4, 0, ALU.XOR)
I('srli', OPC.I, 0x5, 0x00, ALU.SRL)
I('srai', OPC.I, 0x5, 0x20, ALU.SRA)
I('ori', OPC.I, 0x6, 0, ALU.OR)
I('andi', OPC.I, 0x7, 0, ALU.AND)
INSTR['lw'] = { type: 'I', op: OPC.LOAD, f3: 0x2, alu: ALU.ADD, ctrl: { regWrite: 1, memRead: 1, aluSrc: 1, wbSel: 'MEM', aluCtl: ALU.ADD } }
INSTR['jalr'] = { type: 'I', op: OPC.JALR, f3: 0x0, alu: ALU.ADD, ctrl: { regWrite: 1, aluSrc: 1, wbSel: 'PC4', aluCtl: ALU.ADD, jump: 1 } }

INSTR['sw'] = { type: 'S', op: OPC.STORE, f3: 0x2, alu: ALU.ADD, ctrl: { memWrite: 1, aluSrc: 1, aluCtl: ALU.ADD } }

INSTR['beq'] = { type: 'B', op: OPC.BRANCH, f3: 0x0, ctrl: { branch: 1, brOp: 'eq' } }
INSTR['bne'] = { type: 'B', op: OPC.BRANCH, f3: 0x1, ctrl: { branch: 1, brOp: 'ne' } }
INSTR['blt'] = { type: 'B', op: OPC.BRANCH, f3: 0x4, ctrl: { branch: 1, brOp: 'lt' } }
INSTR['bge'] = { type: 'B', op: OPC.BRANCH, f3: 0x5, ctrl: { branch: 1, brOp: 'ge' } }

INSTR['lui'] = { type: 'U', op: OPC.LUI, ctrl: { regWrite: 1, aluSrc: 1, wbSel: 'ALU', aluCtl: ALU.ADD } }

INSTR['jal'] = { type: 'J', op: OPC.JAL, ctrl: { regWrite: 1, wbSel: 'PC4', jump: 1 } }

INSTR['ecall'] = { type: 'SYS', op: OPC.SYS, ctrl: { isHalt: 1 } }

export const CTRL_KEYS = ['regWrite', 'memRead', 'memWrite', 'aluSrc', 'branch', 'jump']

export const ABI = {
  zero: 0, ra: 1, sp: 2, gp: 3, tp: 4, t0: 5, t1: 6, t2: 7,
  s0: 8, fp: 8, s1: 9, a0: 10, a1: 11, a2: 12, a3: 13, a4: 14,
  a5: 15, a6: 16, a7: 17, s2: 18, s3: 19, s4: 20, s5: 21, s6: 22,
  s7: 23, s8: 24, s9: 25, s10: 26, s11: 27, t3: 28, t4: 29, t5: 30, t6: 31
}

export const ABI_NAME = (() => {
  const m = ['zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2', 's0', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']
  for (let i = 18; i <= 27; i++) m[i] = 's' + (i - 16)
  m[28] = 't3'; m[29] = 't4'; m[30] = 't5'; m[31] = 't6'
  return m
})()

const sext = (v, bits) => (v << (32 - bits)) >> (32 - bits)

/* ---------- 编码 ---------- */
export function encR(f3, f7, rd, rs1, rs2) {
  return ((f7 << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | (rd << 7) | OPC.R) >>> 0
}
export function encI(op, f3, rd, rs1, imm) {
  return ((imm & 0xfff) << 20 | (rs1 << 15) | (f3 << 12) | (rd << 7) | op) >>> 0
}
export function encS(f3, rs1, rs2, imm) {
  const i = imm & 0xfff
  return (((i >> 5) << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | ((i & 0x1f) << 7) | OPC.STORE) >>> 0
}
export function encB(f3, rs1, rs2, off) {
  const o = off & 0x1fff
  return ((((o >> 12) & 1) << 31) | (((o >> 5) & 0x3f) << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) |
    (((o >> 1) & 0xf) << 8) | (((o >> 11) & 1) << 7) | OPC.BRANCH) >>> 0
}
export function encU(rd, imm20) {
  return (((imm20 & 0xfffff) << 12) | (rd << 7) | OPC.LUI) >>> 0
}
export function encJ(rd, off) {
  const o = off & 0x1fffff
  return ((((o >> 20) & 1) << 31) | (((o >> 1) & 0x3ff) << 21) | (((o >> 11) & 1) << 20) |
    (((o >> 12) & 0xff) << 12) | (rd << 7) | OPC.JAL) >>> 0
}

/* ---------- 解码 ---------- */
const R_DECODE = {}
for (const [n, d] of Object.entries(INSTR)) {
  if (d.type === 'R') R_DECODE[(d.f7 << 3) | d.f3] = n
}
const I_DECODE = { 0x0: 'addi', 0x2: 'slti', 0x3: 'sltiu', 0x4: 'xori', 0x6: 'ori', 0x7: 'andi' }
const B_DECODE = { 0x0: 'beq', 0x1: 'bne', 0x4: 'blt', 0x5: 'bge' }

export function decodeWord(w) {
  w = w >>> 0
  const op = w & 0x7f
  const rd = (w >> 7) & 0x1f
  const f3 = (w >> 12) & 0x7
  const rs1 = (w >> 15) & 0x1f
  const rs2 = (w >> 20) & 0x1f
  const f7 = (w >> 25) & 0x7f
  const shamt = (w >> 20) & 0x1f
  let name = null
  let type = null
  let imm = 0
  if (op === OPC.R) {
    name = R_DECODE[(f7 << 3) | f3] || null
    type = 'R'
  } else if (op === OPC.I) {
    imm = sext(w >> 20, 12)
    if (f3 === 0x1) name = f7 === 0 ? 'slli' : null
    else if (f3 === 0x5) name = f7 === 0x20 ? 'srai' : f7 === 0 ? 'srli' : null
    else name = I_DECODE[f3] || null
    type = 'I'
    if (name) {
      const d = INSTR[name]
      if (d.f7 !== undefined && !(name === 'srai' || name === 'srli' || name === 'slli')) name = name
    }
  } else if (op === OPC.LOAD) {
    imm = sext(w >> 20, 12)
    name = f3 === 0x2 ? 'lw' : null
    type = 'I'
  } else if (op === OPC.JALR) {
    imm = sext(w >> 20, 12)
    name = f3 === 0x0 ? 'jalr' : null
    type = 'I'
  } else if (op === OPC.STORE) {
    imm = sext(((w >> 25) << 5) | ((w >> 7) & 0x1f), 12)
    name = f3 === 0x2 ? 'sw' : null
    type = 'S'
  } else if (op === OPC.BRANCH) {
    const o = (((w >> 31) & 1) << 12) | (((w >> 7) & 1) << 11) | (((w >> 25) & 0x3f) << 5) | (((w >> 8) & 0xf) << 1)
    imm = sext(o, 13)
    name = B_DECODE[f3] || null
    type = 'B'
  } else if (op === OPC.LUI) {
    imm = (w & 0xfffff000) | 0
    name = 'lui'
    type = 'U'
  } else if (op === OPC.JAL) {
    const o = (((w >> 31) & 1) << 20) | (((w >> 12) & 0xff) << 12) | (((w >> 20) & 1) << 11) | (((w >> 21) & 0x3ff) << 1)
    imm = sext(o, 21)
    name = 'jal'
    type = 'J'
  } else if (op === OPC.SYS && w === 0x00000073) {
    name = 'ecall'
    type = 'SYS'
  }
  if (type === 'R') imm = 0
  return { word: w, op, rd, f3, rs1, rs2, f7, imm, shamt, name, type }
}

export function ctrlFor(name) {
  const base = { regWrite: 0, memRead: 0, memWrite: 0, aluSrc: 0, branch: 0, jump: 0, wbSel: 'ALU', aluCtl: null, isHalt: 0, brOp: null }
  const d = INSTR[name]
  if (!d) return base
  return { ...base, ...d.ctrl }
}
