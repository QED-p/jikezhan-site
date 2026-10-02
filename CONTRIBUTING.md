# 极客栈教程站 · 贡献指南

## 写作流程

每章从模板开始，按顺序完成，缺一不可：

1. **动机**：这个概念为什么被创造出来，不用它会卡在哪
2. **高中衔接**：声明读者已知什么（人教A版选必 1、2 基线），本章在哪个点上不够用
3. **核心概念**：定义 → 性质 → 最小例子，先定义后使用
4. **交互实验**：章节级至少 1 个完整实验，每个二级标题至少 1 个可操作对象
5. **习题**：3–5 题，含 1 道反例或边界题；答案统一放进 `::: details 参考答案`
6. **交叉链接**：frontmatter 的 `prereq` / `cross` 自动渲染
7. **延伸**：可选

### 标点

- 句号一律用半角 `.`，`，；：？！` 保持全角；代码块、行内代码与公式内部不动
- 写完跑一次 `npm run fix:punct`（即 `python3 scripts/fix-punct.py`）

### 两道文字工序

- 数学章先过 `math-writing` 规范（动机驱动、定义先行、反直觉前置）
- 全部章节终稿过 `Humanizer-zh`，29 种 AI 模式全检，实验引导文案与图注同样处理

### 交互自检

写完问一句：「这一节读者能动手操作什么？」答不上来就不算完成.
实验必须由组件库的声明式配置组合而来，禁止一次性手写组件.

## 章节 frontmatter

```yaml
---
title: 组相联 Cache
track: arch                        # math | arch | ml | cross
unit: organization
order: 6
level: 200                         # 100 入门 / 200 核心 / 300 进阶
prereq: [discrete-math, organization/isa]
cross: [ml/transformer, cross/gemm-optimization]
interactive: [matrix-heat, mapping-grid]
lab: null                          # 可选：挂载实验页路径
---
```

## 组件库

组件位于 `docs/.vitepress/theme/components/`，在 markdown 中按需引入：

```md
<script setup>
import MatrixHeat from '../.vitepress/theme/components/MatrixHeat.vue'
import DistributionBars from '../.vitepress/theme/components/DistributionBars.vue'
</script>

<MatrixHeat :matrix="m" :row-labels="rows" :col-labels="cols" :selected="{r:0,c:0}" />
```

原则：

- 组件只通过 props 接收数据，通过 emit 向外传递交互事件
- 不全局注册，正文页保持零实验 JS 开销
- 色域由外层 `data-palette` 决定（math=cyan / arch=green / ml=violet / cross=mono）
- 中文字体思源黑体、公式 KaTeX，均自托管，禁止外部 CDN

## 目录约定

```
docs/
├── math/<unit>/           # 单元目录，index.md 为单元页，后续章节同级
├── arch/<unit>/
├── ml/<unit>/
├── cross/<unit>/
├── labs/                  # 独立实验页
└── .vitepress/
    ├── curriculum.ts      # 大纲与依赖关系（唯一数据源）
    └── theme/             # 组件与样式
```

新增单元：先改 `curriculum.ts`，再跑 `npm run gen:units`.

## 本地开发

```bash
npm run docs:dev      # 本地预览
npm run docs:build    # 构建（提交前必须通过）
npm run gen:units     # 依据 curriculum.ts 重新生成单元页
```
