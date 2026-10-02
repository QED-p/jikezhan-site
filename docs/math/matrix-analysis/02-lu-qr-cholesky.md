---
title: LU、QR 与 Cholesky 分解
track: math
unit: matrix-analysis
order: 2
level: 200
prereq: [matrix-analysis/01-vector-and-matrix-norms, linear-algebra/08-quadratic-forms-and-positive-definite]
cross: [cross/gemm-optimization]
interactive: [decomp-lab]
---

<script setup>
import DecompLab from '../../.vitepress/theme/components/DecompLab.vue'
</script>

# LU、QR 与 Cholesky 分解

第 1 章有了范数这把尺子. 这一章开始拆矩阵：工程里解 $A\mathbf{x} = \mathbf{b}$ 是日常，但直接求 $A^{-1}$ 又慢又不稳；正确的做法是把 $A$ 拆成"好解"的零件. 三种分解对应三种结构——**LU**（消元的语言）、**QR**（正交化的语言）、**Cholesky**（正定的专属通道）.

## 高中那点工具，够用到哪里

初中解二元一次方程组时用过"加减消元"：把一个方程乘上倍数加到另一个上，消掉一个未知数. 高斯消元就是这套动作的系统化——这一章第一部分把它写成矩阵语言，然后你会发现消元的副产品比解方程本身更值钱.

## 高斯消元与 LU 分解

**消元就是左乘初等矩阵.** 要把第二行第一列消成 0，用

$$
E = \begin{bmatrix} 1 & 0 \\ -m & 1 \end{bmatrix},
\qquad
EA = \begin{bmatrix} a_{11} & a_{12} \\ a_{21} - m a_{11} & a_{22} - m a_{12} \end{bmatrix},
$$

只要取 $m = a_{21}/a_{11}$，第二行第一列就变成 0. 这个 $m$ 叫**乘数**.

一路消下去：$E_k \cdots E_1 A = U$（$U$ 上三角），把初等矩阵的逆挪到另一边：

$$
A = \underbrace{E_1^{-1} \cdots E_k^{-1}}_{L} U = LU.
$$

**关键观察**：每个 $E^{-1}$ 就是把 $m$ 放回原位的单位下三角矩阵，乘起来之后，$L$ 的对角线全是 1，下三角元素就是一路的乘数——**消元过程不浪费任何计算，全被 $L$ 记了下来**.

> **例子.** $A = \begin{bmatrix} 2 & 1 \\ 4 & 3 \end{bmatrix}$：乘数 $m = 4/2 = 2$，

$$
L = \begin{bmatrix} 1 & 0 \\ 2 & 1 \end{bmatrix},
\qquad
U = \begin{bmatrix} 2 & 1 \\ 0 & 1 \end{bmatrix},
\qquad
LU = \begin{bmatrix} 2 & 1 \\ 4 & 3 \end{bmatrix} = A \ ✓
$$

> **几何直觉.** 消元是"逐列扫楼梯"：每一步用当前主元把这一列下面的元素扫平，乘数记录"扫平这一格需要多少力". $L$ 是动作清单，$U$ 是结果.

**为什么有用**：解 $A\mathbf{x} = \mathbf{b}$ 变成两步——

1. 前代：解 $L\mathbf{y} = \mathbf{b}$（从上往下代入，$O(n^2)$）；
2. 回代：解 $U\mathbf{x} = \mathbf{y}$（从下往上代入，$O(n^2)$）.

分解本身 $O(n^3)$，但**换一个 $\mathbf{b}$ 只需要新的两次 $O(n^2)$**——同一张矩阵、很多次右端项时（比如迭代求解），这是数量级的节省. 顺带的两个读数：$\det A = u_{11}u_{22}\cdots u_{nn}$（三角阵的行列式 = 对角积），主元的个数就是**秩**（第 6 章）.

**部分主元.** 如果主元 $a_{11} = 0$，消元第一步就除不动；即使它很小（比如 $10^{-8}$），用它当除数也会把误差放大. 解决办法：每一步把当前列绝对值最大的行换上来——用置换矩阵 $P$ 记下换行，得到

$$
PA = LU.
$$

> 数值上的理由（小主元如何放大误差）留到第 4 章条件数细说；现在记住结论：**实用中的 LU 一律带部分主元**.

## QR 分解：正交化的矩阵版

回忆第 4 章的 Gram–Schmidt：把一组基逐个"掰正"成标准正交基，张成不变. 把 $A$ 的列向量喂进去：

$$
\mathbf{a}_1, \dots, \mathbf{a}_n \ \longrightarrow\ \mathbf{q}_1, \dots, \mathbf{q}_n,
$$

把"掰"的过程写成矩阵，就是 $A = QR$：$Q$ 的列标准正交（$Q^{\mathsf{T}}Q = I$），$R$ 上三角，对角元是每一步残差的长度.

> **例子.** $A = \begin{bmatrix} 1 & 1 \\ 1 & 0 \end{bmatrix}$，列 $\mathbf{a}_1 = (1,1)$、$\mathbf{a}_2 = (1,0)$：
> - $\mathbf{q}_1 = \mathbf{a}_1/\|\mathbf{a}_1\| = \frac{1}{\sqrt{2}}(1,1)$；
> - 投影系数 $c = \mathbf{a}_2 \cdot \mathbf{q}_1 = \frac{1}{\sqrt{2}}$，残差 $\mathbf{u}_2 = \mathbf{a}_2 - c\mathbf{q}_1 = (\frac{1}{2}, -\frac{1}{2})$；
> - $\mathbf{q}_2 = \mathbf{u}_2/\|\mathbf{u}_2\| = \frac{1}{\sqrt{2}}(1,-1)$，$\|\mathbf{u}_2\| = \frac{1}{\sqrt{2}}$；
>
> 于是 $R = \begin{bmatrix} \sqrt{2} & 1/\sqrt{2} \\ 0 & 1/\sqrt{2} \end{bmatrix}$，验证 $QR = A$ ✓.

> **几何直觉.** QR 把"斜的列"掰成"互相垂直的单位列"：$R$ 记录每一次掰的力度（投影系数 $c$）和剩余长度（对角元）. 正交矩阵 $Q$ 的作用是旋转/反射，**不改变任何长度**：$\|Q\mathbf{x}\| = \|\mathbf{x}\|$——这就是它数值稳定的来源（第 1 章算子范数：$\|Q\|_2 = 1$）.

**为什么用 QR**：

- 最小二乘 $A\mathbf{x} \approx \mathbf{b}$：正规方程 $A^{\mathsf{T}}A\mathbf{x} = A^{\mathsf{T}}\mathbf{b}$ 会把条件数平方，QR 直接且稳定（第 6 章会算这笔账）；
- 投影矩阵 $P = QQ^{\mathsf{T}}$（第 4 章）——投影到列空间只需要 $Q$；
- 特征值算法（QR 迭代）的核心零件.

$R$ 的对角元取正时，QR 分解唯一.

## Cholesky 分解：正定的专属通道

第 8 章说过：正定矩阵可以写 $A = R^{\mathsf{T}}R$. 现在给出算法——$R$ 上三角、对角为正，对 $2 \times 2$ 逐项解出来：

$$
A = \begin{bmatrix} a_{11} & a_{12} \\ a_{12} & a_{22} \end{bmatrix}
= \begin{bmatrix} r_{11} & 0 \\ r_{12} & r_{22} \end{bmatrix}
\begin{bmatrix} r_{11} & r_{12} \\ 0 & r_{22} \end{bmatrix},
$$

$$
r_{11} = \sqrt{a_{11}}, \qquad r_{12} = \frac{a_{12}}{r_{11}}, \qquad r_{22} = \sqrt{a_{22} - r_{12}^2}.
$$

> **例子.** $A = \begin{bmatrix} 4 & 2 \\ 2 & 3 \end{bmatrix}$：$r_{11} = 2$，$r_{12} = 1$，$r_{22} = \sqrt{3 - 1} = \sqrt{2}$，

$$
R = \begin{bmatrix} 2 & 1 \\ 0 & \sqrt{2} \end{bmatrix},
\qquad
R^{\mathsf{T}}R = \begin{bmatrix} 4 & 2 \\ 2 & 1 + 2 \end{bmatrix} = A \ ✓
$$

**最后一步开根号就是判据**：$a_{22} - r_{12}^2 < 0$ 就开不出实数——矩阵不是正定. 这正是第 8 章 Sylvester 判据的算法版，所以 Cholesky **不需要选主元**（正定保证主元全正）.

> **几何直觉.** $A = R^{\mathsf{T}}R$ 意味着二次型 $\mathbf{x}^{\mathsf{T}}A\mathbf{x} = \|R\mathbf{x}\|^2$：正定矩阵是"某个三角变换的平方长度". 第 8 章的超椭球，就是把单位球先用 $R$ 压一遍、再转回来的结果.

**用途**：解方程组的代价减半（$\frac{n^3}{3}$ vs LU 的 $\frac{2n^3}{3}$）；判断正定；统计里从多元正态分布采样（协方差 $\Sigma = RR^{\mathsf{T}}$，取 $\mathbf{x} = R\mathbf{z}$，$\mathbf{z}$ 是标准正态）；最小二乘的正规方程.

## 三种分解对照

| 分解 | 适用条件 | 代价（$n \times n$） | 稳定性 | 典型用途 |
| --- | --- | --- | --- | --- |
| $PA = LU$ | 任意方阵 | $\frac{2n^3}{3}$ | 需部分主元 | 解方程、行列式、秩 |
| $A = QR$ | 任意矩阵（列满秩） | $\approx 2mn^2$（$m \times n$） | 稳（正交不放大误差） | 最小二乘、特征值算法 |
| $A = R^{\mathsf{T}}R$ | 对称正定 | $\frac{n^3}{3}$ | 无需主元 | 解方程、判正定、采样 |

## 实验：三种分解的阶梯

1. 选矩阵（点格子或预设）、选分解（LU / QR / Cholesky），点「下一步」逐步走.
2. LU：看乘数怎么进 $L$、消元结果怎么进 $U$；「主元为零」预设会让你撞上换行问题.
3. QR：几何版——$\mathbf{a}_1$ 先单位化成 $\mathbf{q}_1$，$\mathbf{a}_2$ 减去投影剩下 $\mathbf{u}_2$，再单位化成 $\mathbf{q}_2$；$R$ 的对角元就是残差长度.
4. Cholesky：$r_{11}$、$r_{12}$、$r_{22}$ 依次算出；遇到非正定，计算在开根号处中断.
5. 「秩亏」预设让三种分解一起失败：QR 在 $\mathbf{u}_2 = 0$ 处、Cholesky 在 $r_{22}$ 处、LU 的 $u_{22} = 0$——三种分解一起告诉你"秩不够".

<DecompLab />

## 习题

1. 对 $A = \begin{bmatrix} 1 & 2 \\ 3 & 7 \end{bmatrix}$ 手算 LU，并用它解 $A\mathbf{x} = (1,1)^{\mathsf{T}}$.
2. 为什么需要 $PA = LU$？举一个不换行就失败的 $2 \times 2$ 例子.
3. 对 $A = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}$ 做 Gram–Schmidt，写出 $Q$ 与 $R$.
4. 对 $A = \begin{bmatrix} 9 & 3 \\ 3 & 5 \end{bmatrix}$ 做 Cholesky，并验证 $R^{\mathsf{T}}R = A$.
5. 设 $A$ 可逆. 证明 QR 分解中的 $R$ 可逆，并说明 $\|Q\mathbf{x}\| = \|\mathbf{x}\|$.
6. 用 Cholesky 判断 $\begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$ 是否正定.

::: details 参考答案

**1.** 乘数 $m = 3$，$L = \begin{bmatrix} 1 & 0 \\ 3 & 1 \end{bmatrix}$，$U = \begin{bmatrix} 1 & 2 \\ 0 & 1 \end{bmatrix}$. 前代 $L\mathbf{y} = (1,1)$：$y_1 = 1$，$3y_1 + y_2 = 1 \Rightarrow y_2 = -2$. 回代 $U\mathbf{x} = \mathbf{y}$：$x_2 = -2$，$x_1 + 2x_2 = 1 \Rightarrow x_1 = 5$. 验证 $A(5,-2) = (5-4,\ 15-14) = (1,1)$ ✓.

**2.** 取 $A = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}$：$a_{11} = 0$，乘数 $m = a_{21}/a_{11}$ 除不动. 换行后 $PA = I$，$L = U = I$. （更隐蔽的是主元很小但非零的情形，误差会被放大——第 4 章细说.）

**3.** $\mathbf{a}_1 = (1,1)$：$\mathbf{q}_1 = \frac{1}{\sqrt{2}}(1,1)$，$r_{11} = \sqrt{2}$. $\mathbf{a}_2 = (0,1)$：$c = \mathbf{a}_2 \cdot \mathbf{q}_1 = \frac{1}{\sqrt{2}}$，$\mathbf{u}_2 = (0,1) - \frac{1}{\sqrt{2}} \cdot \frac{1}{\sqrt{2}}(1,1) = (-\frac{1}{2}, \frac{1}{2})$，$\mathbf{q}_2 = \frac{1}{\sqrt{2}}(-1,1)$，$r_{22} = \frac{1}{\sqrt{2}}$. 所以 $Q = \frac{1}{\sqrt{2}}\begin{bmatrix} 1 & -1 \\ 1 & 1 \end{bmatrix}$，$R = \begin{bmatrix} \sqrt{2} & 1/\sqrt{2} \\ 0 & 1/\sqrt{2} \end{bmatrix}$.

**4.** $r_{11} = 3$，$r_{12} = 3/3 = 1$，$r_{22} = \sqrt{5 - 1} = 2$：$R = \begin{bmatrix} 3 & 1 \\ 0 & 2 \end{bmatrix}$；$R^{\mathsf{T}}R = \begin{bmatrix} 9 & 3 \\ 3 & 1+4 \end{bmatrix} = A$ ✓.

**5.** $\det A = \det Q \cdot \det R$，而 $Q$ 正交，$|\det Q| = 1$（第 4 章：正交变换保持体积），所以 $\det R = \pm \det A \ne 0$，$R$ 可逆. $\|Q\mathbf{x}\|^2 = \mathbf{x}^{\mathsf{T}}Q^{\mathsf{T}}Q\mathbf{x} = \mathbf{x}^{\mathsf{T}}\mathbf{x} = \|\mathbf{x}\|^2$——正交变换不放大误差.

**6.** $r_{11} = 1$，$r_{12} = 2$，$r_{22}^2 = a_{22} - r_{12}^2 = 1 - 4 = -3 < 0$：开根号中断，不是正定（$\det = 1 - 4 = -3 < 0$，与第 8 章判据一致）.
:::

## 交叉

- 数值线性代数：主元策略、误差分析、条件数——第 4 章把"稳不稳"变成可计算的数.
- 最小二乘与统计：QR 是稳定的最小二乘解法；Cholesky 用于正规方程与多元正态采样.
- 特征值算法：QR 迭代是计算特征值的主力算法之一.

## 延伸

下一章《SVD 与低秩逼近》：三种分解各有门槛——LU 要方阵、QR 要列满秩、Cholesky 要正定. SVD 对**任意**矩阵无条件成立，是本章三种分解的统一终点；它也是低秩逼近、PCA、推荐系统的数学底座.
