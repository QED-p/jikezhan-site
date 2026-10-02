---
title: 向量与矩阵范数
track: math
unit: matrix-analysis
order: 1
level: 200
prereq: [linear-algebra/07-eigenvalues-and-diagonalization, linear-algebra/08-quadratic-forms-and-positive-definite]
cross: [ml/gradient-descent]
interactive: [norm-lab]
---

<script setup>
import NormLab from '../../.vitepress/theme/components/NormLab.vue'
</script>

# 向量与矩阵范数

《线性代数》里"长度"是内积给的. 但工程上"大小"不止一种量法：误差向量 $(0.1, 0.1, 0.1)$ 和 $(0.3, 0, 0)$，谁的误差"更大"？看总误差、平方误差还是最大分量，答案不一样. 范数就是把"长度应该满足什么"公理化，然后你会发现合格的"尺子"有一整个家族——它们对应着不同的单位球形状.

## 高中那点工具，够用到哪里

高中：向量的模 $|\mathbf{v}| = \sqrt{x^2 + y^2}$，数轴上的绝对值 $|x|$，两点间距离. 这些都是 2-范数的特例. 这一章要问：把"长度"的规则写下来，还有哪些函数合格？

## 定义：长度的三条公理

> **定义（范数）** 函数 $\|\cdot\| : \mathbb{R}^n \to \mathbb{R}$ 若满足
> (i) **正定**：$\|\mathbf{x}\| \ge 0$，且 $\|\mathbf{x}\| = 0$ 当且仅当 $\mathbf{x} = \mathbf{0}$；
> (ii) **齐次**：对任何实数 $c$，$\|c\mathbf{x}\| = |c| \, \|\mathbf{x}\|$；
> (iii) **三角不等式**：$\|\mathbf{x} + \mathbf{y}\| \le \|\mathbf{x}\| + \|\mathbf{y}\|$，
> 就称为 $\mathbb{R}^n$ 上的一个**范数**.

人话版：(i) 只有零向量的长度是零；(ii) 拉伸 $c$ 倍，长度变 $|c|$ 倍——注意绝对值，反向也要变正；(iii) 直着走不会比绕路远.

## 范数家族：1、2、∞ 与 p

- **2-范数**：$\|\mathbf{x}\|_2 = \sqrt{x_1^2 + \cdots + x_n^2}$——高中那个，来自内积.
- **1-范数**：$\|\mathbf{x}\|_1 = |x_1| + \cdots + |x_n|$——"出租车距离"（沿坐标轴走）.
- **∞-范数**：$\|\mathbf{x}\|_\infty = \max(|x_1|, \dots, |x_n|)$——只看最大的分量.
- **p-范数**：$\|\mathbf{x}\|_p = (|x_1|^p + \cdots + |x_n|^p)^{1/p}$，$p \ge 1$.

验证三公理：齐次与正定一眼可见；三角不等式对 2-范数要证（下一节），对一般 $p$ 是 Minkowski 不等式——名字记住即可，证明属于分析课.

**为什么 $p \ge 1$**：$p < 1$ 时三角不等式会坏掉. 取 $p = 1/2$、$\mathbf{x} = (1,0)$、$\mathbf{y} = (0,1)$：$\|\mathbf{x}\| = \|\mathbf{y}\| = 1$，但 $\|\mathbf{x} + \mathbf{y}\| = (1 + 1)^2 = 4 > 2$.

**$p \to \infty$ 为什么变成 max**：记 $m = \max|x_i|$，则

$$
\|\mathbf{x}\|_p = m \left( \sum_i \left(\frac{|x_i|}{m}\right)^p \right)^{1/p},
$$

括号里介于 $1$ 与 $n$ 之间（非零项至多 $n$ 个），开 $p$ 次方后当 $p \to \infty$ 趋于 $1$.

## 单位球：范数的形状

> **定义（单位球）** $B = \{\mathbf{x} : \|\mathbf{x}\| \le 1\}$.

> **几何直觉.** 2-范数的单位球是圆（高维里是球）；1-范数是菱形；∞-范数是正方形. $p$ 从 $1$ 涨到 $\infty$，球从菱形出发，经过圆，越来越接近正方形——像一只被慢慢"吹方"的气球. **给向量选范数，就是给空间选单位球的形状**；反过来，任何一个凸的、中心对称的、不含直线的紧集，都唯一决定一个范数.

## Cauchy–Schwarz 与三角不等式

> **定理（Cauchy–Schwarz 不等式）** 对任意 $\mathbf{u}, \mathbf{v}$：
> $$
> |\langle \mathbf{u}, \mathbf{v} \rangle| \le \|\mathbf{u}\|_2 \, \|\mathbf{v}\|_2,
> $$
> 等号成立当且仅当 $\mathbf{u}$、$\mathbf{v}$ 线性相关.

::: details 证明（配方/判别式法）
若 $\mathbf{v} = \mathbf{0}$ 显然. 否则对任何实数 $t$：

$$
0 \le \|\mathbf{u} - t\mathbf{v}\|_2^2 = \|\mathbf{u}\|_2^2 - 2t\langle \mathbf{u}, \mathbf{v} \rangle + t^2\|\mathbf{v}\|_2^2.
$$

右边是关于 $t$ 的二次函数，取最小值点 $t = \langle \mathbf{u}, \mathbf{v} \rangle / \|\mathbf{v}\|_2^2$，得

$$
0 \le \|\mathbf{u}\|_2^2 - \frac{\langle \mathbf{u}, \mathbf{v} \rangle^2}{\|\mathbf{v}\|_2^2},
\quad\text{即}\quad
\langle \mathbf{u}, \mathbf{v} \rangle^2 \le \|\mathbf{u}\|_2^2 \, \|\mathbf{v}\|_2^2.
$$

等号成立意味着 $\mathbf{u} - t\mathbf{v} = \mathbf{0}$，即线性相关. $\blacksquare$
:::

高中那个"$\cos\theta = \mathbf{u}\cdot\mathbf{v}/(|\mathbf{u}||\mathbf{v}|)$"现在才真正合法：CS 保证这个比值落在 $[-1, 1]$ 里.

**2-范数的三角不等式**（用 CS 直接推）：

$$
\|\mathbf{u} + \mathbf{v}\|_2^2 = \|\mathbf{u}\|_2^2 + 2\langle \mathbf{u}, \mathbf{v} \rangle + \|\mathbf{v}\|_2^2
\le \|\mathbf{u}\|_2^2 + 2\|\mathbf{u}\|_2\|\mathbf{v}\|_2 + \|\mathbf{v}\|_2^2
= (\|\mathbf{u}\|_2 + \|\mathbf{v}\|_2)^2.
$$

## 范数之间的换算

对任意 $\mathbf{x} \in \mathbb{R}^n$ 有

$$
\|\mathbf{x}\|_\infty \le \|\mathbf{x}\|_2 \le \|\mathbf{x}\|_1.
$$

第一条：最大分量的平方不超过全部分量平方之和；第二条：两边平方，右边多出的交叉项 $2\sum_{i<j}|x_i||x_j|$ 非负. 反方向也有界：

$$
\|\mathbf{x}\|_1 \le \sqrt{n}\,\|\mathbf{x}\|_2, \qquad \|\mathbf{x}\|_2 \le \sqrt{n}\,\|\mathbf{x}\|_\infty
$$

（第一条把每个 $|x_i|$ 看成 $|x_i| \cdot 1$ 用 Cauchy–Schwarz）.

意义：**有限维里所有范数彼此等价**——一个向量在任何范数下都"有界"，只是换算常数随维数 $n$ 增长. 工程含义：稳定性、收敛性的结论不依赖范数选择，但常数会进误差估计——高维里 $\sqrt{n}$ 不是小数.

## 矩阵范数：拉直与放大率

向量有了长度，矩阵的"大小"有两种自然定义：

> **定义（Frobenius 范数）** $\|A\|_F = \sqrt{\sum_{i,j} a_{ij}^2}$——把矩阵拉直成向量，用 2-范数.

> **定义（算子范数）** $\|A\| = \max_{\mathbf{x} \ne \mathbf{0}} \|\mathbf{x}\|^{-1}\|A\mathbf{x}\| = \max_{\|\mathbf{x}\| = 1} \|A\mathbf{x}\|$——单位向量被拉长最多的倍数（齐次性把比例消掉，所以只看单位球上的像）.

> **几何直觉.** 单位球被 $A$ 映成椭球（或者更扁的形状），算子范数就是最长的半轴. 对 2-范数：
> $$
> \|A\|_2 = \sqrt{\lambda_{\max}(A^{\mathsf{T}}A)},
> $$
> 因为 $\max_{\|\mathbf{x}\|=1}\|A\mathbf{x}\|_2^2 = \max \mathbf{x}^{\mathsf{T}}A^{\mathsf{T}}A\mathbf{x}$，而 $A^{\mathsf{T}}A$ 半正定（第 8 章），半正定二次型在单位球上的最大值就是最大特征值（第 8 章习题 6）. 第 3 章会看到，$\sqrt{\lambda_{\max}(A^{\mathsf{T}}A)}$ 正是**最大奇异值** $\sigma_{\max}$. 若 $A$ 对称，则 $\|A\|_2 = \max_i |\lambda_i|$——不用再乘 $A^{\mathsf{T}}A$.

**常用性质**（算子范数）：

- $\|A\mathbf{x}\| \le \|A\|\,\|\mathbf{x}\|$（定义直接推）；
- **次可乘性**：$\|AB\| \le \|A\|\,\|B\|$.

::: details 次可乘性的证明
对任何 $\mathbf{x}$：$\|AB\mathbf{x}\| \le \|A\|\,\|B\mathbf{x}\| \le \|A\|\,\|B\|\,\|\mathbf{x}\|$. 两边除以 $\|\mathbf{x}\|$（$\mathbf{x} \ne \mathbf{0}$）再对 $\mathbf{x}$ 取最大，即得 $\|AB\| \le \|A\|\,\|B\|$. $\blacksquare$
:::

Frobenius 范数也满足次可乘性（把矩阵看成向量后用 CS 逐项配对）.

**1-范数与 ∞-范数诱导的矩阵范数**有现成公式：$\|A\|_1$ = 最大的列绝对值和，$\|A\|_\infty$ = 最大的行绝对值和. 例如 $A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$：行和 $\max(3, 7) = 7$，列和 $\max(4, 6) = 6$.

（Frobenius 不是任何向量范数诱导的算子范数，但同样好用；总有 $\|A\|_2 \le \|A\|_F \le \sqrt{n}\,\|A\|_2$.）

## 为什么工程在乎

- **1-范数促稀疏**：它的单位球有"尖角"（顶点在坐标轴上），优化最优点容易落在尖角处——那一堆分量就自动变成零. Lasso、稀疏编码偏爱 1-范数的几何根源就在这里.
- **∞-范数管最坏情况**：误差的每个分量都不超过某个值——嵌入式、控制里的最坏情况保证用它.
- **2-范数 = 能量**：平方误差、最小二乘天然长在它上面.
- **算子范数 = 放大率**：$A$ 把误差放大的倍数；条件数 $\kappa(A) = \|A\|\,\|A^{-1}\|$ 是"解方程组对误差多敏感"的度量（第 4 章）.
- 深度学习里的"梯度裁剪""权重衰减"，全部是范数语言.

## 实验：单位球与单位圆的像

1. 三张虚线单位球：菱形（1-范数）、圆（2-范数）、正方形（∞-范数），它们在 $(1,0)$、$(0,1)$ 这些轴上点重合.
2. 拖滑块 $p$：实线球从菱形出发，经过圆（$p = 2$），越来越接近正方形；推到 $p = 8$ 已经非常方.
3. 拖圆点：右上角实时显示它的 1、2、∞、p 范数——注意排序 $\|\mathbf{x}\|_\infty \le \|\mathbf{x}\|_2 \le \|\mathbf{x}\|_1$ 永远不变.
4. 把点拖到对角线上，1-范数与 2-范数差最大（$\sqrt{2}$ 倍）；拖回坐标轴附近，两者几乎一样——稀疏的几何就在这里.
5. 下半场是矩阵：点格子改 $A$ 或换预设，虚线单位圆被映成实线椭圆；亮线（最长半轴）的长度就是谱范数 $\|A\|_2$.
6. 拖圆上的白点绕一圈：$\|A\mathbf{x}\|$ 实时变化，在最长轴方向取到最大——剪切预设的最大拉伸是黄金比 $1.62$.
7. 黄色对角线：两条半轴互相垂直，矩形对角线长 $\sqrt{\sigma_1^2 + \sigma_2^2}$，正好是 Frobenius 范数 $\|A\|_F$——它不"诱导"自向量范数，但符合勾股定理.

<NormLab />

## 习题

1. 手算 $\mathbf{x} = (3, -4)$ 的 1、2、∞ 范数，验证链式不等式.
2. 证明：$\|\mathbf{x}\|_\infty \le \|\mathbf{x}\|_2 \le \|\mathbf{x}\|_1$（各写一行）.
3. 用 Cauchy–Schwarz 证明 $\|\mathbf{x}\|_1 \le \sqrt{n}\,\|\mathbf{x}\|_2$.
4. 验证 $p = 1/2$ 不满足三角不等式（举 $(1,0)$ 与 $(0,1)$）.
5. 对 $A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$ 计算 $\|A\|_F$、$\|A\|_1$、$\|A\|_\infty$.
6. 证明算子范数的次可乘性 $\|AB\| \le \|A\|\,\|B\|$.
7. 设 $A$ 对称，用第 7 章谱定理证明 $\|A\|_2 = \max_i |\lambda_i|$.

::: details 参考答案

**1.** $\|\mathbf{x}\|_1 = 3 + 4 = 7$，$\|\mathbf{x}\|_2 = \sqrt{9 + 16} = 5$，$\|\mathbf{x}\|_\infty = \max(3,4) = 4$；$4 \le 5 \le 7$ ✓.

**2.** $\|\mathbf{x}\|_\infty \le \|\mathbf{x}\|_2$：最大分量的平方不超过全部分量平方之和. $\|\mathbf{x}\|_2 \le \|\mathbf{x}\|_1$：两边平方，$\sum x_i^2 \le \sum x_i^2 + 2\sum_{i<j}|x_i||x_j|$，右边多出的交叉项非负.

**3.** 把 $|x_i|$ 看成 $|x_i| \cdot 1$，用 CS：$\sum |x_i| \le \sqrt{\sum x_i^2} \cdot \sqrt{1^2 + \cdots + 1^2} = \sqrt{n}\,\|\mathbf{x}\|_2$.

**4.** $\|(1,0)\| = \|(0,1)\| = 1$（单项的 p-范数不变），但 $\|(1,1)\| = (1 + 1)^2 = 4 > 1 + 1 = 2$，三角不等式不成立.

**5.** $\|A\|_F = \sqrt{1 + 4 + 9 + 16} = \sqrt{30} \approx 5.48$；行绝对值和 $3, 7$ → $\|A\|_\infty = 7$；列绝对值和 $4, 6$ → $\|A\|_1 = 6$.

**6.** 对任意 $\mathbf{x} \ne \mathbf{0}$：$\|AB\mathbf{x}\| \le \|A\|\,\|B\mathbf{x}\| \le \|A\|\,\|B\|\,\|\mathbf{x}\|$；除以 $\|\mathbf{x}\|$，再对所有 $\mathbf{x}$ 取最大值.

**7.** 由谱定理 $A = Q\Lambda Q^{\mathsf{T}}$，令 $\mathbf{y} = Q^{\mathsf{T}}\mathbf{x}$（保持长度）：$\|A\mathbf{x}\|_2^2 = \|\Lambda\mathbf{y}\|_2^2 = \sum \lambda_i^2 y_i^2 \le (\max_i |\lambda_i|)^2 \sum y_i^2 = (\max_i |\lambda_i|)^2 \|\mathbf{x}\|_2^2$. 取 $\mathbf{x}$ 为最大特征值对应的特征向量，等号成立.
:::

## 交叉

- 机器学习：L1/L2 正则化（稀疏 vs 平滑）、梯度裁剪、距离度量.
- 数值线性代数：误差分析、条件数、迭代法的收敛判据——全都建立在范数上.
- 优化：范数是"距离"与"惩罚项"的通用语言.

## 延伸

下一章《LU、QR 与 Cholesky 分解》：有了范数这把尺子，才能谈分解算法"稳不稳"——消元怎么选主元、正交化为什么数值上更优、正定矩阵的专属通道是什么.
