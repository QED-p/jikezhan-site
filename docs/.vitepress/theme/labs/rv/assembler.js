// 两遍汇编器：标签 + 伪指令 → 机器码；输出机器码、反汇编 listing 与数据段
import { ABI, INSTR, OPC, encR, encI, encS, encB, encU, encJ, decodeWord } from './isa.js'

export const DATA_BASE = 0x100
const DATA_LIMIT = 64

function reg(tok, line, errors) {
  tok = (tok || '').trim()
  if (/^x\d+$/.test(tok)) {
    const n = +tok.slice(1)
    if (n >= 0 && n < 32) return n
  }
  if (tok in ABI) return ABI[tok]
  errors.push({ line, msg: `未知寄存器 ${tok}` })
  return 0
}

function litVal(tok) {
  tok = (tok || '').trim()
  if (/^-?0x[0-9a-f]+$/i.test(tok)) return parseInt(tok, 16) | 0
  if (/^-?\d+$/.test(tok)) return parseInt(tok, 10) | 0
  return null
}

const NEEDS_2 = { li: true }

export function assemble(text) {
  const errors = []
  const symbols = new Map()

  // ---------- 第一遍：分节、标签、地址 ----------
  let addr = 0
  let dataAddr = DATA_BASE
  let section = 'text'
  const items = []
  const srcLines = text.split('\n')
  srcLines.forEach((raw, idx) => {
    const line = idx + 1
    let s = raw.replace(/#.*$/, '').replace(/\/\/.*$/, '').replace(/;.*$/, '').trim()
    if (!s) return
    let guard = 0
    while (/^[A-Za-z_.][\w.]*:/.test(s) && guard++ < 4) {
      const m = /^([A-Za-z_.][\w.]*):/.exec(s)
      const name = m[1]
      if (symbols.has(name)) errors.push({ line, msg: `标签 ${name} 重复定义` })
      symbols.set(name, section === 'data' ? dataAddr : addr)
      s = s.slice(m[0].length).trim()
    }
    if (!s) return
    if (s === '.text') { section = 'text'; return }
    if (s === '.data') { section = 'data'; return }
    if (/^\.word\b/.test(s)) {
      const toks = s.replace(/^\.word/, '').split(',').map((t) => t.trim()).filter(Boolean)
      for (const t of toks) {
        items.push({ kind: 'word', addr: dataAddr, tok: t, line })
        dataAddr += 4
        if ((dataAddr - DATA_BASE) / 4 > DATA_LIMIT) errors.push({ line, msg: '数据段超出 64 字上限' })
      }
      return
    }
    const sp = s.indexOf(' ')
    const name = (sp < 0 ? s : s.slice(0, sp)).toLowerCase()
    const ops = sp < 0 ? '' : s.slice(sp + 1).trim()
    items.push({ kind: 'instr', addr, name, ops, line, raw })
    addr += estimateSize(name, ops)
  })

  // ---------- 第二遍：编码 ----------
  const words = []
  const listing = []
  const data = []
  const labelAt = (a) => {
    for (const [n, v] of symbols) if (v === a && !n.startsWith('.')) return n
    return '0x' + (a >>> 0).toString(16)
  }
  const num = (tok, line) => {
    const v = litVal(tok)
    if (v !== null) return v
    if (symbols.has(tok)) return symbols.get(tok)
    errors.push({ line, msg: `无法解析的数或符号 ${tok}` })
    return 0
  }

  for (const it of items) {
    if (it.kind === 'word') {
      data.push({ addr: it.addr, word: num(it.tok, it.line) | 0 })
      continue
    }
    const { name, ops, line, addr: at, raw } = it
    const o = ops ? ops.split(',').map((t) => t.trim()) : []
    const push = (w) => {
      words.push(w >>> 0)
      listing.push({ addr: at, word: w >>> 0, text: disasmText(w, at, labelAt), line, src: raw })
    }
    switch (name) {
      case 'li': {
        const rd = reg(o[0], line, errors)
        const isSym = !symbols.has(o[1]) ? litVal(o[1]) === null : true
        const v = num(o[1], line)
        if (!isSym && v >= -2048 && v <= 2047) push(encI(OPC.I, 0, rd, 0, v))
        else {
          const hi = (v + 0x800) >> 12
          const lo = v - (hi << 12)
          push(encU(rd, hi & 0xfffff))
          push(encI(OPC.I, 0, rd, rd, lo))
        }
        break
      }
      case 'mv': push(encI(OPC.I, 0, reg(o[0], line, errors), reg(o[1], line, errors), 0)); break
      case 'nop': push(encI(OPC.I, 0, 0, 0, 0)); break
      case 'j': push(encJ(0, num(o[0], line) - at)); break
      case 'jal': {
        const rd = o.length > 1 ? reg(o[0], line, errors) : 1
        const tgt = o.length > 1 ? o[1] : o[0]
        push(encJ(rd, num(tgt, line) - at))
        break
      }
      case 'ret': push(encI(OPC.JALR, 0, 0, 1, 0)); break
      case 'beqz': push(encB(0, reg(o[0], line, errors), 0, num(o[1], line) - at)); break
      case 'bnez': push(encB(1, reg(o[0], line, errors), 0, num(o[1], line) - at)); break
      case 'lw': {
        const rd = reg(o[0], line, errors)
        const m = memOperand(o[1], line)
        push(encI(OPC.LOAD, 2, rd, m.rs, m.off))
        break
      }
      case 'sw': {
        const rs2 = reg(o[0], line, errors)
        const m = memOperand(o[1], line)
        push(encS(2, m.rs, rs2, m.off))
        break
      }
      case 'addi': case 'slti': case 'sltiu': case 'xori': case 'ori': case 'andi':
      case 'slli': case 'srli': case 'srai':
        push(encI(OPC.I, INSTR[name].f3, reg(o[0], line, errors), reg(o[1], line, errors), num(o[2], line)))
        break
      case 'jalr':
        push(encI(OPC.JALR, 0, reg(o[0], line, errors), reg(o[1], line, errors), o[2] !== undefined ? num(o[2], line) : 0))
        break
      case 'lui': push(encU(reg(o[0], line, errors), num(o[1], line) & 0xfffff)); break
      case 'beq': case 'bne': case 'blt': case 'bge':
        push(encB(INSTR[name].f3, reg(o[0], line, errors), reg(o[1], line, errors), num(o[2], line) - at))
        break
      case 'add': case 'sub': case 'sll': case 'slt': case 'sltu': case 'xor': case 'srl': case 'sra': case 'or': case 'and': {
        const d = INSTR[name]
        push(encR(d.f3, d.f7, reg(o[0], line, errors), reg(o[1], line, errors), reg(o[2], line, errors)))
        break
      }
      case 'ecall': push(0x00000073); break
      default:
        errors.push({ line, msg: `未知指令 ${name}` })
    }
  }

  function memOperand(tok, line) {
    const m = /^(.+?)\((\w+)\)$/.exec((tok || '').trim())
    if (m) return { off: num(m[1], line), rs: reg(m[2], line, errors) }
    return { off: num(tok, line), rs: 0 }
  }

  return {
    ok: errors.length === 0,
    errors,
    words,
    listing,
    data,
    symbols: Object.fromEntries(symbols)
  }
}

function estimateSize(name, ops) {
  if (name === 'li') {
    const v = ops.split(',')[1]?.trim() || ''
    const lit = litVal(v)
    if (lit !== null && lit >= -2048 && lit <= 2047) return 4
    return 8
  }
  return 4
}

export function disasmText(w, at, labelAt) {
  const d = decodeWord(w)
  if (!d.name) return '.word 0x' + (w >>> 0).toString(16).padStart(8, '0')
  const r = (n) => 'x' + n
  switch (d.type) {
    case 'R': return `${d.name} ${r(d.rd)}, ${r(d.rs1)}, ${r(d.rs2)}`
    case 'I':
      if (d.name === 'lw') return d.rs1 === 0 ? `lw ${r(d.rd)}, [${labelAt(d.imm)}]` : `lw ${r(d.rd)}, ${d.imm}(${r(d.rs1)})`
      if (d.name === 'jalr') return `jalr ${r(d.rd)}, ${d.imm}(${r(d.rs1)})`
      if (d.name === 'slli' || d.name === 'srli' || d.name === 'srai') return `${d.name} ${r(d.rd)}, ${r(d.rs1)}, ${d.shamt}`
      return `${d.name} ${r(d.rd)}, ${r(d.rs1)}, ${d.imm}`
    case 'S': return `sw ${r(d.rs2)}, ${d.imm}(${r(d.rs1)})`
    case 'B': return `${d.name} ${r(d.rs1)}, ${r(d.rs2)}, ${labelAt(at + d.imm)}`
    case 'U': return `lui ${r(d.rd)}, 0x${((d.imm >>> 12) & 0xfffff).toString(16)}`
    case 'J': return `jal ${r(d.rd)}, ${labelAt(at + d.imm)}`
    case 'SYS': return 'ecall'
  }
  return ''
}
