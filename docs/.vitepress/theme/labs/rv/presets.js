// 预设程序：每题都带期望结果（node 测试与 UI 提示共用）
export const PRESETS = [
  {
    id: 'seq',
    name: '顺序执行',
    note: '无冒险：各算各的',
    asm: `# 顺序执行：互不依赖
addi x1, x0, 5
addi x2, x0, 6
addi x3, x0, 7
add x4, x1, x2
ecall`,
    expect: { regs: { 1: 5, 2: 6, 3: 7, 4: 11 }, data: {} }
  },
  {
    id: 'dep',
    name: '依赖链',
    note: '转发的主场：链式加法',
    asm: `# 依赖链：每步都用到上一步结果
addi x1, x0, 4
addi x2, x1, 3
addi x3, x2, 2
addi x4, x3, 1
ecall`,
    expect: { regs: { 1: 4, 2: 7, 3: 9, 4: 10 }, data: {} }
  },
  {
    id: 'loaduse',
    name: 'load-use',
    note: '装填后立即使用：必停顿 1 拍',
    asm: `# load-use 冒险
li x1, 256
lw x2, val
addi x3, x2, 1
ecall

.data
val: .word 42`,
    expect: { regs: { 1: 256, 2: 42, 3: 43 }, data: {} }
  },
  {
    id: 'loop',
    name: '循环求和',
    note: '分支与冲刷：1+2+…+10',
    asm: `# 循环求和
li x1, 0
li x2, 10
loop:
add x1, x1, x2
addi x2, x2, -1
bnez x2, loop
ecall`,
    expect: { regs: { 1: 55, 2: 0 }, data: {} }
  },
  {
    id: 'bubble',
    name: '随机数 + 冒泡',
    note: 'LCG 生成 8 个随机数后原地冒泡排序',
    asm: `# 1) 生成 8 个伪随机数：seed = (seed*5 + 1) mod 256
li x1, 256
li x2, 1
li x3, 0
li x4, 8
gen:
slli x5, x2, 2
add x5, x5, x2
addi x5, x5, 1
andi x2, x5, 255
slli x6, x3, 2
add x6, x6, x1
sw x2, 0(x6)
addi x3, x3, 1
blt x3, x4, gen

# 2) 冒泡排序（升序）
li x7, 0
addi x13, x4, -1
outer:
li x8, 0
sub x9, x13, x7
inner:
bge x8, x9, nexti
slli x10, x8, 2
add x10, x10, x1
lw x11, 0(x10)
lw x12, 4(x10)
blt x11, x12, noswap
sw x12, 0(x10)
sw x11, 4(x10)
noswap:
addi x8, x8, 1
j inner
nexti:
addi x7, x7, 1
blt x7, x13, outer
ecall`,
    expect: {
      regs: { 4: 8 },
      data: { 256: 6, 260: 13, 264: 31, 268: 66, 272: 75, 276: 89, 280: 120, 284: 156 }
    }
  },
  {
    id: 'mem',
    name: '访存',
    note: 'sw/lw 往返数据内存',
    asm: `# 访存：写 1，读回 +4，再写
li x1, 256
li x3, 1
sw x3, 0(x1)
lw x4, 0(x1)
addi x4, x4, 4
sw x4, 4(x1)
ecall`,
    expect: { regs: { 1: 256, 4: 5 }, data: { 256: 1, 260: 5 } }
  }
]

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0]
}
