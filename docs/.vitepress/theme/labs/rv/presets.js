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
    id: 'msort',
    name: '随机数 + 归并',
    note: '递归归并排序（辅助数组 + 栈）· 访存/分支/返回指令混合',
    asm: `# 1) 生成 8 个伪随机数：seed = (seed*5 + 1) mod 256
li x10, 256
li x9, 320
li x2, 512
li x5, 1
li x6, 0
li x12, 8
gen:
slli x7, x5, 2
add x7, x7, x5
addi x7, x7, 1
andi x5, x7, 255
slli x7, x6, 2
add x7, x7, x10
sw x5, 0(x7)
addi x6, x6, 1
blt x6, x12, gen

# 2) 归并排序 a[0..n-1]，辅助数组在 0x140
li x11, 0
addi x12, x12, -1
jal x1, msort
ecall

# ---- msort(a0=base, a1=lo, a2=hi) ----
msort:
bge x11, x12, msort_ret
addi x2, x2, -16
sw x1, 0(x2)
sw x11, 4(x2)
sw x12, 8(x2)
add x5, x11, x12
srli x5, x5, 1
sw x5, 12(x2)
add x12, x5, x0
jal x1, msort
lw x11, 4(x2)
lw x12, 8(x2)
lw x5, 12(x2)
addi x11, x5, 1
jal x1, msort
lw x11, 4(x2)
lw x12, 8(x2)
lw x5, 12(x2)
jal x1, merge
lw x1, 0(x2)
addi x2, x2, 16
msort_ret:
jalr x0, x1, 0

# ---- merge(a0=base, a1=lo, a2=hi; x5=mid, x9=aux) ----
merge:
add x13, x11, x0
addi x14, x5, 1
add x15, x11, x0
merge_loop:
blt x5, x13, merge_tail_j
blt x12, x14, merge_tail_i
slli x6, x13, 2
add x6, x6, x10
slli x7, x14, 2
add x7, x7, x10
lw x16, 0(x6)
lw x17, 0(x7)
blt x17, x16, merge_take_j
slli x6, x15, 2
add x6, x6, x9
sw x16, 0(x6)
addi x13, x13, 1
j merge_next
merge_take_j:
slli x6, x15, 2
add x6, x6, x9
sw x17, 0(x6)
addi x14, x14, 1
merge_next:
addi x15, x15, 1
j merge_loop
merge_tail_i:
blt x5, x13, merge_copy
slli x6, x13, 2
add x6, x6, x10
lw x16, 0(x6)
slli x7, x15, 2
add x7, x7, x9
sw x16, 0(x7)
addi x13, x13, 1
addi x15, x15, 1
j merge_tail_i
merge_tail_j:
blt x12, x14, merge_copy
slli x6, x14, 2
add x6, x6, x10
lw x16, 0(x6)
slli x7, x15, 2
add x7, x7, x9
sw x16, 0(x7)
addi x14, x14, 1
addi x15, x15, 1
j merge_tail_j
merge_copy:
add x15, x11, x0
merge_copy_loop:
blt x12, x15, merge_ret
slli x6, x15, 2
add x6, x6, x9
lw x16, 0(x6)
slli x7, x15, 2
add x7, x7, x10
sw x16, 0(x7)
addi x15, x15, 1
j merge_copy_loop
merge_ret:
jalr x0, x1, 0`,
    expect: {
      regs: { 12: 7 },
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
