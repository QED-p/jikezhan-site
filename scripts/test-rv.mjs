// RV32I 五级流水线自测：汇编器、控制真值表、冒险处理、架构等价性
import { assemble } from '../docs/.vitepress/theme/labs/rv/assembler.js'
import { createCpu, runToHalt, step } from '../docs/.vitepress/theme/labs/rv/sim.js'
import { ctrlFor, decodeWord, INSTR, ALU } from '../docs/.vitepress/theme/labs/rv/isa.js'
import { PRESETS } from '../docs/.vitepress/theme/labs/rv/presets.js'

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log(`  ok  ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name} ${extra}`)
  }
}

function build(preset, opts = {}) {
  const res = assemble(preset.asm)
  if (!res.ok) throw new Error('assemble error: ' + JSON.stringify(res.errors))
  const cpu = createCpu({ words: res.words, data: res.data, ...opts })
  return { cpu, res }
}

function archState(cpu) {
  return { regs: Array.from(cpu.regs), dmem: Array.from(cpu.dmem) }
}

function checkExpect(cpu, preset) {
  for (const [r, v] of Object.entries(preset.expect.regs)) {
    if ((cpu.regs[+r] | 0) !== (v | 0)) return `x${r}=${cpu.regs[+r]} want ${v}`
  }
  for (const [a, v] of Object.entries(preset.expect.data)) {
    const idx = (+a - 0x100) >> 2
    if ((cpu.dmem[idx] | 0) !== (v | 0)) return `mem[${a}]=${cpu.dmem[idx]} want ${v}`
  }
  return null
}

console.log('== 汇编器 ==')
{
  const res = assemble('addi x1, x0, 5\nloop: bnez x1, loop\njal x0, loop\necall')
  check('汇编成功', res.ok, JSON.stringify(res.errors))
  check('编码 addi', res.words[0] === 0x00500093)
  const d = decodeWord(res.words[1])
  check('bnez 解码', d.name === 'bne' && d.imm === 0)
  const j = decodeWord(res.words[2])
  check('j 解码', j.name === 'jal' && j.imm === -4 && j.rd === 0)
  check('listing 标签', res.listing[1].text.includes('loop'))
}

console.log('== 控制信号真值表 ==')
{
  const cases = [
    ['add', { regWrite: 1, aluSrc: 0, aluCtl: ALU.ADD }],
    ['sub', { aluCtl: ALU.SUB }],
    ['andi', { regWrite: 1, aluSrc: 1, aluCtl: ALU.AND }],
    ['lw', { regWrite: 1, memRead: 1, aluSrc: 1, wbSel: 'MEM' }],
    ['sw', { regWrite: 0, memWrite: 1, aluSrc: 1 }],
    ['beq', { branch: 1, brOp: 'eq' }],
    ['jal', { jump: 1, wbSel: 'PC4', regWrite: 1 }],
    ['ecall', { isHalt: 1 }]
  ]
  for (const [n, want] of cases) {
    const c = ctrlFor(n)
    let ok = true
    for (const [k, v] of Object.entries(want)) if (c[k] !== v) ok = false
    check(`ctrl ${n}`, ok, JSON.stringify(c))
  }
}

console.log('== 各预设：三种模式架构状态一致 ==')
const modes = [
  { forwarding: true, predict: 'none' },
  { forwarding: false, predict: 'none' },
  { forwarding: true, predict: 'taken' }
]
for (const preset of PRESETS) {
  const states = []
  const stats = []
  for (const m of modes) {
    const { cpu } = build(preset, m)
    runToHalt(cpu)
    check(`${preset.id} 完成 (${m.forwarding ? 'F' : 'noF'},${m.predict})`, cpu.halted)
    const err = checkExpect(cpu, preset)
    check(`${preset.id} 结果 (${m.forwarding ? 'F' : 'noF'},${m.predict})`, !err, err || '')
    states.push(JSON.stringify(archState(cpu)))
    stats.push({ cycles: cpu.cycle, cpi: cpu.retired ? cpu.cycle / cpu.retired : 0, stalls: cpu.stalls, flushes: cpu.flushes, mispredicts: cpu.mispredicts })
  }
  check(`${preset.id} 架构等价`, states[0] === states[1] && states[0] === states[2])
  console.log(
    `      cycles F/none=${stats[0].cycles} noF=${stats[1].cycles} ptaken=${stats[2].cycles} | stalls=${stats[0].stalls} | flush=${stats[0].flushes}/${stats[2].flushes} | CPI ${stats[0].cpi.toFixed(2)} → ${stats[1].cpi.toFixed(2)}`
  )
}

console.log('== 冒险细节 ==')
{
  const { cpu } = build(PRESETS[1], { forwarding: true, predict: 'none' })
  runToHalt(cpu)
  check('依赖链：转发模式 0 停顿', cpu.stalls === 0, `stalls=${cpu.stalls}`)
  const off = build(PRESETS[1], { forwarding: false, predict: 'none' })
  runToHalt(off.cpu)
  check('依赖链：关转发后出现停顿', off.cpu.stalls > 0, `stalls=${off.cpu.stalls}`)
  check('依赖链：转发更快', cpu.cycle < off.cpu.cycle, `${cpu.cycle} vs ${off.cpu.cycle}`)

  const lu = build(PRESETS[2], { forwarding: true, predict: 'none' })
  runToHalt(lu.cpu)
  check('load-use：恰好 1 停顿', lu.cpu.stalls === 1, `stalls=${lu.cpu.stalls}`)

  const lp = build(PRESETS[3], { forwarding: true, predict: 'none' })
  runToHalt(lp.cpu)
  check('循环：无预测冲刷 9×2=18 拍', lp.cpu.flushes === 18, `flushes=${lp.cpu.flushes}`)
  const lpt = build(PRESETS[3], { forwarding: true, predict: 'taken' })
  runToHalt(lpt.cpu)
  check('循环：预测 taken 后冲刷 2 次事件', lpt.cpu.mispredicts === 2, `mispredicts=${lpt.cpu.mispredicts}`)
  check('循环：预测 taken 更快', lpt.cpu.cycle < lp.cpu.cycle, `${lpt.cpu.cycle} vs ${lp.cpu.cycle}`)
}

console.log('== 转发路径选择 ==')
{
  const { cpu } = build(
    {
      asm: `addi x1, x0, 4
add x2, x1, x1
add x3, x1, x1
ecall`,
      expect: {}
    },
    { forwarding: true, predict: 'none' }
  )
  const frames = runToHalt(cpu)
  const f1 = frames.find((f) => f.ex && f.ex.name === 'add' && f.ex.rd === 2)
  check('距离 1：EX/MEM 转发 (fwd=2)', f1 && f1.ex.fwdA === 2 && f1.ex.fwdB === 2, f1 ? `fwdA=${f1.ex.fwdA}` : 'frame missing')
  const f2 = frames.find((f) => f.ex && f.ex.name === 'add' && f.ex.rd === 3)
  check('距离 2：MEM/WB 转发 (fwd=1)', f2 && f2.ex.fwdA === 1 && f2.ex.fwdB === 1, f2 ? `fwdA=${f2.ex.fwdA}` : 'frame missing')
  check('转发开：0 停顿', cpu.stalls === 0)
}

console.log('== 断言汇总 ==')
{
  const { cpu } = build(PRESETS[2], { forwarding: true, predict: 'none' })
  const frames = runToHalt(cpu)
  const stalls = frames.filter((f) => f.signals.stall)
  check('load-use 停顿发生在正确拍', stalls.length === 1 && stalls[0].id && stalls[0].id.name === 'addi')
  check('load 结果经 MEM/WB 写回', cpu.regs[2] === 42)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
