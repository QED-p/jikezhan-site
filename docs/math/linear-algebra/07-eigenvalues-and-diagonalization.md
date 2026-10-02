---
title: 特征值与对角化
track: math
unit: linear-algebra
order: 7
level: 200
prereq: [linear-algebra/06-four-fundamental-subspaces]
cross: [matrix-analysis, ml/gradient-descent, ml/diffusion]
interactive: [eigen-lab]
---

<script setup>
import EigenLab from '../../.vitepress/theme/components/EigenLab.vue'
</script>

# 特征值与对角化

前六章把矩阵拆成了四个子空间和几个维数. 这一章问一个更细的问题：这个变换有没有"顺纹"——那些被作用之后方向纹丝不动、只是被拉伸（或压扁）的向量？

如果有，而且这样的方向足够多，就能把它们当成新基；在这组基下，矩阵变成对角阵. 这正是第 3 章换基公式 $M' = P^{-1}MP$ 埋下的伏笔，现在兑现.

## 高中那点工具，够用到哪里

高中没有"特征值"这个词，但你有它的最小版本，而且选必二里到处都是：

- **选必二 4.3 等比数列**：$a_{n+1} = q a_n$——每一步都乘同一个数 $q$. 这就是一维的"特征值 $q$"：每个非零数都是特征向量.
- **选必二 4.1 阅读与思考"斐波那契数列"**：$a_{n+2} = a_{n+1} + a_n$，教材用它展示递推的丰富性，但没给通项公式——这一章会给你工具把它算出来.
- **选必二 4.2 的待定系数法**：$a_{n+1} = p a_n + q$ 时，高中做法是"构造等比数列"：解不动点 $x^* = q/(1-p)$，令 $b_n = a_n - x^*$，则 $b_{n+1} = p b_n$. 用本章语言：**平移把"带尾巴的递推"变成"纯伸缩"**，伸缩率 $p$ 就是特征值.

**斐波那契的预告.** 把递推写成矩阵：

$$
\begin{bmatrix} a_{n+2} \\ a_{n+1} \end{bmatrix}
= \begin{bmatrix} 1 & 1 \\ 1 & 0 \end{bmatrix}
\begin{bmatrix} a_{n+1} \\ a_n \end{bmatrix}.
$$

算这个矩阵的特征值，会得到黄金比 $\varphi = \frac{1+\sqrt{5}}{2} \approx 1.618$ 和 $\psi = \frac{1-\sqrt{5}}{2} \approx -0.618$——本章的对角化就能把斐波那契的通项公式写出来. 高中阅读材料里的悬念，这一章给答案.

## 定义：特征值与特征向量

> **定义（特征值与特征向量）** 设 $A$ 是 $n \times n$ 方阵. 若存在**非零**向量 $\mathbf{v}$ 和实数 $\lambda$，使
> $$
> A\mathbf{v} = \lambda \mathbf{v},
> $$
> 就称 $\lambda$ 是 $A$ 的**特征值**，$\mathbf{v}$ 是 $\lambda$ 对应的**特征向量**. 固定 $\lambda$，所有满足 $(A - \lambda I)\mathbf{v} = \mathbf{0}$ 的向量（补上零向量）构成一个子空间
> $$
> E_\lambda = N(A - \lambda I),
> $$
> 叫 $\lambda$ 的**特征空间**.

人话版：普通向量被 $A$ 作用后会转向，特征向量不转向，只是被拉长（$\lambda > 1$）、压短（$0 < \lambda < 1$）、压成零（$\lambda = 0$）或反向（$\lambda < 0$）.

> **例子（四个一次性看完）.**
> - 对角阵 $\operatorname{diag}(2, 1)$：两个坐标轴方向都是特征方向，$\lambda = 2$ 与 $1$.
> - 投影 $\operatorname{diag}(1, 0)$：$x$ 轴方向 $\lambda = 1$（不动），$y$ 轴方向 $\lambda = 0$（被压成零）——注意 $\lambda = 0$ 的特征空间就是零空间 $N(A)$，第 6 章的老朋友.
> - 剪切 $\begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$：只有 $\mathbf{e}_1$ 一个特征方向（$\lambda = 1$），其他向量全被推斜.
> - 旋转 $90°$，$\begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}$：任何非零向量都被转走，**没有实特征向量**——它在实数域里没有"顺纹".

> **几何直觉.** 特征方向是变换的"骨架"：$A$ 对整张平面的作用，可以看成沿这些特殊方向各自伸缩. 有 $n$ 个独立方向可伸缩，变换就是"沿着若干把尺子拉"；一个都没有（如旋转），就说明它本质上是"转"，而不是"拉".

**例题（教材风格）.** 已知数列 $\{a_n\}$ 满足 $a_1 = 1$，$a_{n+1} = 2a_n + 3$，求通项公式.

**解（高中）.** 待定系数：设 $a_{n+1} + t = 2(a_n + t)$，展开得 $2t - t = 3$，即 $t = 3$. 于是 $\{a_n + 3\}$ 是首项 $4$、公比 $2$ 的等比数列：

$$
a_n + 3 = 4 \cdot 2^{n-1},
\qquad
a_n = 2^{n+1} - 3.
$$

**线代读法.** 递推 $a_{n+1} = 2a_n + 3$ 是"带尾巴的伸缩"：伸缩率 $2$，外加平移 $3$. 高中构造的 $t = 3$ 正是这个映射的不动点（$2x + 3 = x$ 的解 $x = -3$）的相反数；令 $b_n = a_n + 3$ 之后，递推变成纯伸缩 $b_{n+1} = 2b_n$. **平移把仿射递推化成线性递推，留下的伸缩率 $2$ 就是它的特征值**——这是一维版的特征值理论；本章把它推广到一整个空间.
## 怎么求：特征方程

$A\mathbf{v} = \lambda\mathbf{v}$ 且 $\mathbf{v} \ne \mathbf{0}$，移项得 $(A - \lambda I)\mathbf{v} = \mathbf{0}$：这是在问"$A - \lambda I$ 有没有非零零空间"，也就是它奇不奇异. 由第 5、6 章：

$$
\mathbf{v} \ne \mathbf{0} \text{ 解存在} \iff \det(A - \lambda I) = 0.
$$

> **定义（特征多项式）** $p(\lambda) = \det(A - \lambda I)$ 是 $\lambda$ 的 $n$ 次多项式，叫 $A$ 的特征多项式；特征值就是它的实根.

**手算一个 $2 \times 2$.** 取 $A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$：

$$
p(\lambda) = \det\begin{bmatrix} 2 - \lambda & 1 \\ 1 & 2 - \lambda \end{bmatrix}
= (2 - \lambda)^2 - 1 = \lambda^2 - 4\lambda + 3 = (\lambda - 1)(\lambda - 3).
$$

特征值 $\lambda = 1$ 和 $3$. 再代回去求特征向量：$\lambda = 3$ 时 $A - 3I = \begin{bmatrix} -1 & 1 \\ 1 & -1 \end{bmatrix}$，零空间方向是 $(1,1)$；$\lambda = 1$ 时零空间方向是 $(1,-1)$. 两个方向互相垂直——这不是巧合，对称矩阵总是这样.

## 特征值的几条性质

**迹与行列式.** $\lambda_1 + \cdots + \lambda_n$（按重数计）等于对角线之和，叫**迹**，记 $\operatorname{tr} A$；$\lambda_1\lambda_2\cdots\lambda_n = \det A$. 拿上面的例子验证：$1 + 3 = 4 = \operatorname{tr} A$，$1 \cdot 3 = 3 = \det A$——特征值把"迹"和"行列式"这两个分散的读数统一了起来.

理由可以看特征多项式的两种写法（折叠）.

::: details 为什么 trace 是特征值之和
$p(\lambda) = \det(A - \lambda I)$ 展开后是 $(-\lambda)^n + \operatorname{tr}(A)(-\lambda)^{n-1} + \cdots + \det A$（中间项不展开）；另一方面 $p(\lambda) = (\lambda_1 - \lambda)\cdots(\lambda_n - \lambda)$ 展开，$\lambda^{n-1}$ 的系数是 $-\sum_i \lambda_i$，常数项是 $\prod_i \lambda_i = p(0) = \det A$. 比较系数即得. $\blacksquare$
:::

**$\lambda = 0$ 的含义.** $\det A = \prod \lambda_i$，所以

$$
\lambda = 0 \text{ 是特征值} \iff \det A = 0 \iff A \text{ 奇异} \iff N(A) \ne \{\mathbf{0}\}.
$$

第 6 章结尾那句话现在有了正式身份：矩阵把某些方向压成零，那些方向就是 $\lambda = 0$ 的特征空间.

**换基不变.** 相似矩阵（$M' = P^{-1}MP$，第 3 章）的特征多项式相同：

$$
\det(P^{-1}MP - \lambda I)
= \det\bigl(P^{-1}(M - \lambda I)P\bigr)
= \det(P^{-1})\det(M - \lambda I)\det(P)
= \det(M - \lambda I).
$$

所以特征值是**变换自己的性质**，与拿哪组基记账无关；能变的只是"特征向量长什么样".

## 重数：代数与几何

上面的对称例子是互异特征值，剪切例子是重根. 重根本身不决定命运——要看"重"是哪种重法. 特征值有两种重数：

> **定义（代数重数）** 若特征多项式 $p(\lambda) = (\lambda - \lambda_0)^m \cdot q(\lambda)$，其中 $q(\lambda_0) \ne 0$，就称 $\lambda_0$ 的**代数重数**是 $m$——这是多项式（一维问题）告诉你的重数. 所有特征值的代数重数之和恒等于 $n$.

> **定义（几何重数）** 特征空间的维数 $\dim E_{\lambda_0} = n - \operatorname{rank}(A - \lambda_0 I)$ 叫 $\lambda_0$ 的**几何重数**（最后一步用第 6 章的秩--零化度）——这是真正数得清的特征方向个数，至少是 $1$.

> **几何直觉.** 重数描述的是"方向撞车". 把剪切 $\begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$ 右下角的 $1$ 改成 $1.1$：特征值立刻分裂成 $1$ 和 $1.1$，后者对应的方向是 $(1, 0.1)$. 把 $1.1$ 慢慢改回 $1$，两条特征方向就撞在 $x$ 轴上——代数重数 $2$ 记的是"撞车前有几条"，几何重数 $1$ 是"撞车后还站着几条". 被"推斜"吞掉的方向，任何坐标轴都接不住，所以矩阵对不齐、无法对角化.

> **定理** 对任意特征值，几何重数 $\le$ 代数重数.

::: details 证明（几何重数 ≤ 代数重数）
取 $E_\lambda$ 的一组基 $\mathbf{v}_1, \dots, \mathbf{v}_g$（$g$ 为几何重数），扩充成整个空间的一组基. 由于 $A\mathbf{v}_i = \lambda\mathbf{v}_i$，$A$ 在这组基下的矩阵是分块上三角的

$$
\begin{bmatrix} \lambda I_g & B \\ 0 & C \end{bmatrix}.
$$

用 $t$ 记多项式变量（免得和特征值 $\lambda$ 撞名），分块三角阵的行列式等于对角块行列式之积（第 5 章）：

$$
p(t) = \det(A - tI) = \det(\lambda I_g - tI_g) \cdot \det(C - tI) = (\lambda - t)^g \cdot \det(C - tI).
$$

于是 $\lambda$ 作为根至少出现 $g$ 次，代数重数 $\ge g$. $\blacksquare$
:::

把账一算就明白它为什么重要：代数重数之和恒为 $n$，几何重数之和 = 能凑出的独立特征方向总数，所以后者永远不超过前者. 什么时候恰好凑满 $n$ 个方向？这就是下一节的判据.

## 对角化：把矩阵变成对角阵

> **定义（可对角化）** 若存在可逆矩阵 $P$ 与对角矩阵 $D$，使 $A = PDP^{-1}$（等价地 $D = P^{-1}AP$），就称 $A$ 可对角化.

对角化的意思正是第 3 章那句话：换一组基，让矩阵变成对角阵. 什么时候做得到？

> **几何直觉.** 对角化 = 找到一组"顺纹"的坐标轴，把变换化简成"沿每根轴各自伸缩". $n$ 个独立特征向量正好能张满整个空间，此时拉伸表 $P^{-1}AP$ 只剩对角线上 $n$ 个伸缩率；凑不满（如剪切），就总有一部分空间被"推斜"，换什么轴都会在表上留下消不掉的副对角. 实验里把 $\mathbf{u}$、$\mathbf{w}$ 拖到两条虚线上，$P^{-1}AP$ 的副对角当场消失——那就是这条直觉的现场版.

> **定理（对角化判据）** 对 $n \times n$ 矩阵 $A$，以下三件事等价：
> (1) $A$ 可对角化；
> (2) $A$ 有 $n$ 个线性无关的特征向量；
> (3) 每个特征值的几何重数等于代数重数.

*证明 (1) $\iff$ (2).*
（$\Leftarrow$）取 $n$ 个线性无关的特征向量作 $P$ 的列，对应特征值放进对角阵 $D$，则 $AP = PD$，两边右乘 $P^{-1}$ 得 $A = PDP^{-1}$.
（$\Rightarrow$）设 $A = PDP^{-1}$，则 $AP = PD$. 看 $P$ 的第 $i$ 列：$A\mathbf{p}_i = P D \mathbf{e}_i = \lambda_i \mathbf{p}_i$，每列都是特征向量；$P$ 可逆说明这 $n$ 列线性无关. $\blacksquare$

为什么 (2) $\iff$ (3)：把每个特征空间 $E_{\lambda_i}$ 各取一组基；先把同一特征空间内的组合并成一个向量，再套用"互异特征值的特征向量无关"（下面的折叠证明），可知这些基向量整体线性无关. 所以能凑出的独立特征向量总数恰好是 $\sum_i \dim E_{\lambda_i}$，而

$$
\sum_i \dim E_{\lambda_i} \le \sum_i (\text{代数重数}) = n,
$$

等号成立当且仅当每个特征值都取等——几何重数 = 代数重数.

> **推论** 如果 $n$ 个特征值互不相同，$A$ 一定可对角化.

::: details 证明（互异特征值的特征向量线性无关）
对个数归纳. 设 $c_1\mathbf{v}_1 + \cdots + c_k\mathbf{v}_k = \mathbf{0}$，两边作用 $A - \lambda_k I$：前 $k-1$ 项变成 $c_i(\lambda_i - \lambda_k)\mathbf{v}_i$，最后一项归零. 由归纳假设这些 $\mathbf{v}_1, \dots, \mathbf{v}_{k-1}$ 无关，且 $\lambda_i - \lambda_k \ne 0$，所以 $c_1 = \cdots = c_{k-1} = 0$；代回原式得 $c_k\mathbf{v}_k = \mathbf{0}$，故 $c_k = 0$. $\blacksquare$
:::

**不可对角化的例子：剪切** $A = \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$. $p(\lambda) = (1-\lambda)^2$，$\lambda = 1$ 的代数重数是 $2$；但 $A - I$ 的零空间只有一维（$\mathbf{e}_1$），几何重数 $1 < 2$. 判据第 (3) 条不满足，对角化失败——缺的那个特征方向，就是剪切"推斜所有向量"的代价. 这类矩阵要精确描述就得用 Jordan 标准型（矩阵分析的内容）.

**$A^k$ 的威力.** 一旦对角化，矩阵幂变得平凡：

$$
A^k = (PDP^{-1})^k = PD^kP^{-1},
$$

而 $D^k$ 只是把对角线各元素取 $k$ 次方. 迭代、马尔可夫链、斐波那契数列这些"反复作用同一个矩阵"的问题，全都靠这一行解决.

## 实对称矩阵与谱定理

> **定理（谱定理，实对称情形）** 实对称矩阵的特征值全是实数，并且可以选到 $n$ 个两两正交的特征向量. 于是
> $$
> A = Q\Lambda Q^{\mathsf{T}},
> $$
> 其中 $\Lambda$ 是对角阵（特征值），$Q$ 的列是一组标准正交基——这样的方阵叫**正交矩阵**，满足 $Q^{\mathsf{T}}Q = I$. 由这一条立得 $Q^{\mathsf{T}} = Q^{-1}$：正交矩阵的转置直接就是逆，不用解方程；公式里的 $Q^{\mathsf{T}}$ 其实就是在算 $Q^{-1}$.

拿 $A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$ 验证：特征向量取单位化后的 $(1,1)/\sqrt{2}$、$(1,-1)/\sqrt{2}$，

$$
Q\Lambda Q^{\mathsf{T}}
= \frac{1}{2}\begin{bmatrix} 1 & 1 \\ 1 & -1 \end{bmatrix}
\begin{bmatrix} 3 & 0 \\ 0 & 1 \end{bmatrix}
\begin{bmatrix} 1 & 1 \\ 1 & -1 \end{bmatrix}
= \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}.
$$

（顺带一提：对称矩阵对每个特征值都自动满足几何重数 = 代数重数，所以它的可对角化——而且是正交对角化——是无条件的.）

> **几何直觉.** 谱定理说：对称变换总能找到一组互相垂直的"自然坐标轴"，它的作用就是沿每根轴各自伸缩——没有旋转的纯拉伸. 这对一般矩阵不成立（剪切、旋转都不行）；代价是非对称矩阵的特征方向可能不正交，甚至（在实数域）不存在.

到复数域上，一切方阵都有 $n$ 个特征值（代数基本定理），但复特征值对应旋转成分：重复的共轭对 $a \pm bi$ 表示"旋转角由 $b/a$ 决定、每步缩放 $\sqrt{a^2+b^2}$ 倍". 旋转 $90°$ 的特征值就是 $\pm i$：$|i| = 1$（不缩放），辐角 $90°$（转直角）.

## 实验：特征方向、新基与变形网格

1. 先看网格：浅色是标准网格，亮一层的斜网格是 $A$ 作用后的**变形网格**. 「剪切」把方格推成平行四边形，「投影」把整张网格压扁到一条线——行列式正是它的面积缩放率.
2. 拖绿色 $\mathbf{u}$ 与红色 $\mathbf{w}$：它们是新基，右侧实时显示 $A$ 在新基下的矩阵 $P^{-1}AP$. 用「对称」预设把 $\mathbf{u}$ 拖到 $(1,1)$、$\mathbf{w}$ 拖到 $(1,-1)$（两条虚线），$P^{-1}AP$ 变成 $\operatorname{diag}(3,1)$——对角化的现场演示.
3. 「对称」下把 $\mathbf{v}$ 拖到任意方向、连点「迭代 A」：方向朝 $\lambda = 3$ 那根虚线靠——幂迭代.
4. 「剪切」：只有一条虚线；$\mathbf{u}$、$\mathbf{w}$ 无论怎么拖，$P^{-1}AP$ 只能是上三角，副对角消不掉（几何重数不够）.
5. 「旋转 90°」：没有虚线，迭代轨迹绕圈——没有实特征方向；注意这时变形网格与标准网格重合（方格转 90° 还是方格）.
6. 「投影」：$\lambda = 0$ 的方向被压成零（第 6 章的零空间）；点格子改矩阵，$\operatorname{tr}^2 - 4\det < 0$ 时虚线消失（进入复数域）.

<EigenLab />

## 习题

1. 求 $A = \begin{bmatrix} 4 & 2 \\ 2 & 4 \end{bmatrix}$ 的特征值与特征向量，并验证 trace 与 det.
2. 求上三角矩阵 $B = \begin{bmatrix} 3 & 1 \\ 0 & 2 \end{bmatrix}$ 的特征值与特征向量.
3. 剪切矩阵 $\begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$：求特征多项式与特征值，分别算出代数重数与几何重数，用判据 (3) 说明为什么不可对角化.
4. 判断并证明：若 $\lambda$ 是 $A$ 的特征值，则 $\lambda^2$ 是 $A^2$ 的特征值；若 $A$ 可逆，$1/\lambda$ 是 $A^{-1}$ 的特征值.
5. 投影 $A = \operatorname{diag}(1,0)$ 的特征值是什么？指出 $\lambda = 0$ 的特征空间与零空间的关系.
6. 旋转 $90°$：在实数域有特征向量吗？在复数域上求特征值与一个特征向量.
7. 用对角化求 $\begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}^k$ 的公式.
8. 对 $A = \begin{bmatrix} 2 & 1 \\ 0 & 2 \end{bmatrix}$ 重复习题 3：求两种重数并判断能否对角化，再说明它和 $A = 2I$ 有什么本质区别.

::: details 参考答案

**1.** $p(\lambda) = (4-\lambda)^2 - 4 = \lambda^2 - 8\lambda + 12$，$\lambda = 6, 2$. $\lambda = 6$ 对应 $(1,1)$，$\lambda = 2$ 对应 $(1,-1)$. 验证：$6 + 2 = 8 = \operatorname{tr} A$，$6 \cdot 2 = 12 = \det A$.

**2.** 上三角阵的特征多项式 $p(\lambda) = (3-\lambda)(2-\lambda)$，特征值 $3$、$2$. $\lambda = 2$：$B - 2I = \begin{bmatrix} 1 & 1 \\ 0 & 0 \end{bmatrix}$，特征向量 $(1,-1)$；$\lambda = 3$：$B - 3I = \begin{bmatrix} 0 & 1 \\ 0 & -1 \end{bmatrix}$，特征向量 $(1,0)$.

**3.** $p(\lambda) = (1-\lambda)^2$，$\lambda = 1$ 的代数重数是 $2$；$A - I$ 的秩为 $1$，几何重数 $= 2 - 1 = 1 < 2$. 几何重数凑不满 $n = 2$，由判据 (3) 不可对角化.

**4.** $A^2\mathbf{v} = A(\lambda\mathbf{v}) = \lambda^2\mathbf{v}$，同一个特征向量；$A^{-1}\mathbf{v} = \frac{1}{\lambda}\mathbf{v}$（两边用 $A^{-1}$ 作用 $A\mathbf{v} = \lambda\mathbf{v}$，可逆保证 $\lambda \ne 0$）.

**5.** 特征值 $1$ 与 $0$. $\lambda = 0$ 的特征空间是 $N(A - 0 \cdot I) = N(A)$——就是零空间（这里是 $y$ 轴）.

**6.** 实数域没有：$A\mathbf{v} = \lambda\mathbf{v}$ 要求 $(0,-1;1,0)$ 的实特征值，而 $p(\lambda) = \lambda^2 + 1$ 没有实根. 复数域上 $\lambda = \pm i$，对应特征向量 $(1, \mp i)$：验证 $\begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}\begin{bmatrix} 1 \\ -i \end{bmatrix} = \begin{bmatrix} i \\ 1 \end{bmatrix} = i\begin{bmatrix} 1 \\ -i \end{bmatrix}$.

**7.** 取 $Q = \frac{1}{\sqrt{2}}\begin{bmatrix} 1 & 1 \\ 1 & -1 \end{bmatrix}$、$\Lambda = \operatorname{diag}(3,1)$，则
$$
\begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}^k
= Q\Lambda^k Q^{\mathsf{T}}
= \frac{1}{2}\begin{bmatrix} 3^k + 1 & 3^k - 1 \\ 3^k - 1 & 3^k + 1 \end{bmatrix}.
$$
（$k = 1$ 时验证：$(1/2)\begin{bmatrix} 4 & 2 \\ 2 & 4 \end{bmatrix} = A$ ✓.）

**8.** $p(\lambda) = (2-\lambda)^2$，代数重数 $2$；$A - 2I = \begin{bmatrix} 0 & 1 \\ 0 & 0 \end{bmatrix}$ 的秩为 $1$，几何重数 $1 < 2$，不可对角化. 而 $2I - 2I = 0$ 的零空间是整个平面，几何重数 $2$，可对角化（本来就对角）. 重根本身不致命，特征向量不够多才致命.
:::

## 交叉

- 机器学习：PCA 就是对协方差矩阵用谱定理——特征向量是主方向，特征值告诉你每个方向承载多少方差；梯度下降在最优点附近的收敛速度由 Hessian 的最大/最小特征值之比控制.
- 矩阵分析：谱定理、Jordan 标准型和 SVD 都是"找一组好基把矩阵变简单"的不同版本；SVD 把本章结论推广到非方、非对称矩阵.
- 动力系统与网络：$A^k$ 的长期行为由模最大的特征值决定；马尔可夫链的平稳分布、PageRank 的排名，都是特征向量.

## 延伸

下一章《二次型与正定矩阵》会研究 $q(\mathbf{x}) = \mathbf{x}^{\mathsf{T}}A\mathbf{x}$ 这类"二次的度量"：对称矩阵的特征值符号决定它的等值线是椭圆、双曲线还是鞍形；特征值全为正就是"正定". 特征值理论在那里会从"找方向"变成"判形状".
