---
title: 线性映射与矩阵表示
track: math
unit: linear-algebra
order: 3
level: 100
prereq: [linear-algebra/02-vector-spaces-basis-dimension]
cross: [ml/transformer, cross/gemm-optimization, matrix-analysis]
interactive: [change-of-basis]
---

<script setup>
import ChangeOfBasis from '../../.vitepress/theme/components/ChangeOfBasis.vue'
import MatrixCompose from '../../.vitepress/theme/components/MatrixCompose.vue'
</script>

# 线性映射与矩阵表示

第一章把矩阵当作"对平面的操作"，第二章说坐标是借来的.这一章把两件事合起来，回答两个一直悬着的问题：

1. 矩阵为什么刚好是"一组数"就能描述一个操作？
2. 矩阵乘法的规则，为什么长成"一行碰一列"那个样子？

这两个问题的答案都不在数里，在基里.

## 高中那点工具，够用到哪里

高中的向量坐标运算你已经很熟——**必修二 6.3.3–6.3.5** 的加、减、数乘、数量积的坐标表示，**选必一 1.1** 把它们搬进空间. 这些公式里藏着本章的主角：**"操作"本身**.

一个你更熟的例子：**必修一里函数图象的伸缩变换**. 把图象上每个点 $(x, y)$ 的横坐标拉成 2 倍，对应点的移动规则是

$$
(x, y) \mapsto (2x,\ y),
$$

纵坐标拉 2 倍则是 $(x, y) \mapsto (x,\ 2y)$. 这两种"操作"都满足本章的两条公理（先加后拉与先拉后加结果一样），是线性映射；而图象的**平移** $(x, y) \mapsto (x+1,\ y)$ 不是——它把原点搬走了，而线性映射必须把零送到零. 高中把这两类变换混在一起讲"图象变换"，本章的第一件事就是把它们分开.

高中没有问过的问题是：一个"操作"要记录多少信息才能被完整复原？本章的答案是——一组基上的 $n$ 个像，一个不多一个不少；把这 $n$ 列像排好，就是矩阵.

## 定义：线性映射

> **定义（线性映射）** 设 $T: V \to W$ 是向量空间之间的映射.若对任意 $\mathbf{u}, \mathbf{v} \in V$ 与 $a \in \mathbb{R}$，
> $$
> T(\mathbf{u} + \mathbf{v}) = T(\mathbf{u}) + T(\mathbf{v}), \qquad T(a\mathbf{v}) = a\,T(\mathbf{v}),
> $$
> 就称 $T$ 是线性映射.

人话版：加法与伸缩能穿过 $T$，先算后搬和先搬后算一样.

几个例子，正反都有：

- $T(x, y) = (2x,\ x + y)$ 是线性的：两条公理逐项拆开就能验证.
- $T(x, y) = (x + 1,\ y)$（平移）不是：$T(\mathbf{0}) = (1, 0) \ne \mathbf{0}$，而线性映射一定把零送到零——取 $a = 0$ 代入第二条公理即可.
- $T(x, y) = (x^2,\ y)$ 不是：$T(2, 0) = (4, 0)$，但 $2T(1, 0) = (2, 0)$，伸缩穿不过去.

## 线性映射由基的像决定

这一节是整章的支点.

> **命题** 设 $(\mathbf{u}_1, \dots, \mathbf{u}_n)$ 是 $V$ 的一组基.若线性映射 $T$ 与 $S$ 在基向量上取值相同，即 $T(\mathbf{u}_i) = S(\mathbf{u}_i)$ 对每个 $i$ 成立，则 $T = S$.

证明只有两行.任意 $\mathbf{v} \in V$ 都能唯一写成 $\mathbf{v} = c_1\mathbf{u}_1 + \dots + c_n\mathbf{u}_n$，于是

$$
T(\mathbf{v}) = T\Bigl(\sum_i c_i\mathbf{u}_i\Bigr) = \sum_i c_i T(\mathbf{u}_i) = \sum_i c_i S(\mathbf{u}_i) = S(\mathbf{v}).
$$

第二步用线性，第三步用假设，最后一步再用线性.$\blacksquare$

反过来也对，而且同样重要：随便指定 $n$ 个目标向量 $\mathbf{w}_1, \dots, \mathbf{w}_n \in W$，都存在唯一的线性映射把每个 $\mathbf{u}_i$ 送到 $\mathbf{w}_i$.构造方法是把公式当定义：让 $T(\sum c_i\mathbf{u}_i) := \sum c_i \mathbf{w}_i$.这里藏着一个需要检查的点——坐标 $(c_1, \dots, c_n)$ 唯一，所以这个定义不会自相矛盾.第二章的"坐标存在唯一"在这里第一次真正付工资.

**结论：一组基上指定 $n$ 个像，就唯一确定一个线性映射.** 所以描述一个线性映射，只需要写 $n$ 列数.

## 定义：矩阵表示

设 $V$ 的基 $(\mathbf{u}_1, \dots, \mathbf{u}_n)$、$W$ 的基 $(\mathbf{w}_1, \dots, \mathbf{w}_m)$ 都固定.

> **定义（线性映射的矩阵）** 对线性映射 $T: V \to W$，把 $T(\mathbf{u}_j)$ 在基 $(\mathbf{w}_1, \dots, \mathbf{w}_m)$ 下的坐标写成第 $j$ 列，得到 $m \times n$ 矩阵，称为 $T$ 在给定基下的矩阵.

一句话记忆：**矩阵的每一列，是基向量的像的坐标.**

$\mathbb{R}^2$ 到自身的线性映射配标准基，矩阵就是上一章那种熟悉的形式.例如 $T(x, y) = (y,\ x)$（交换两个坐标）把 $\mathbf{e}_1$ 送到 $\mathbf{e}_2$、把 $\mathbf{e}_2$ 送到 $\mathbf{e}_1$，所以矩阵是

$$
\begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}.
$$

但如果换个基看同一个 $T$：取 $\mathbf{u}_1 = (1, 1)$、$\mathbf{u}_2 = (1, -1)$.交换坐标不改变这两个向量（$T(\mathbf{u}_1) = \mathbf{u}_1$，$T(\mathbf{u}_2) = \mathbf{u}_2$），于是新矩阵是单位矩阵

$$
\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}.
$$

同一个映射，一个矩阵看起来在"翻转"，另一个看起来什么都没做.两个都不错，错的是以为矩阵属于映射.矩阵属于"映射 + 一组基".

**例题（教材风格）.** 把函数 $y = \sin x$ 的图象上每一点的横坐标缩短为原来的 $\frac12$（纵坐标不变），得到 $y = \sin 2x$ 的图象. 用映射的语言写出这个变换，并说明它是线性映射.

**解（高中）.** 原图象上的点 $(x, y)$ 移动到 $\left(\frac{x}{2},\ y\right)$（新图象上横坐标为 $\frac{x}{2}$ 的点，纵坐标与原图象在 $x$ 处相同）. 写成映射：

$$
T(x, y) = \left(\frac{x}{2},\ y\right).
$$

**线代读法.** 验证两条公理：$T\bigl((x_1,y_1) + (x_2,y_2)\bigr) = \bigl(\frac{x_1+x_2}{2},\ y_1+y_2\bigr) = T(x_1,y_1) + T(x_2,y_2)$；数乘同理. 所以 $T$ 是线性映射，在标准基下的矩阵是 $\operatorname{diag}(\frac12, 1)$. 而平移 $(x, y) \mapsto (x+1,\ y)$ 不满足——$T(\mathbf{0}) = (1,0) \ne \mathbf{0}$，线性映射必须把零送到零. **高中"图象变换"里，伸缩是线性的，平移不是**——本章的两条公理就是把这两类动作分开的那把刀.
## 复合与矩阵乘法

两个线性映射可以接起来：先做 $S$，再做 $T$，得到复合 $T \circ S$，定义为 $(T \circ S)(\mathbf{v}) = T(S(\mathbf{v}))$.复合也是线性的（直接把两条公理代进去）.

于是可以问：如果 $S$ 的矩阵是 $B$、$T$ 的矩阵是 $A$（基固定），复合的矩阵是什么？

> **定义（矩阵乘法）** 对 $m \times k$ 矩阵 $A = (a_{ij})$ 与 $k \times n$ 矩阵 $B = (b_{ij})$，定义乘积 $AB$ 为
> $$
> (AB)_{ij} = \sum_{p=1}^{k} a_{ip}\,b_{pj}.
> $$
> 得到的 $AB$ 是 $m \times n$ 矩阵.

这个式子就是"一行碰一列"：$AB$ 第 $i$ 行第 $j$ 列，是 $A$ 的第 $i$ 行与 $B$ 的第 $j$ 列逐项相乘再相加.它不是为了好看才这么定的——它是复合的坐标写法，下面这个命题说明为什么.

> **命题** $T \circ S$ 的矩阵等于 $T$ 的矩阵乘 $S$ 的矩阵.

证明的想法：$S$ 把基向量 $\mathbf{u}_j$ 送到 $B$ 的第 $j$ 列（在基下的坐标），$T$ 再作用一次，用矩阵 $A$ 把那个列向量搬过去，结果正好是 $AB$ 的第 $j$ 列.两边都等于复合映射在第 $j$ 个基向量上的像.

两个 $2 \times 2$ 的例子，手算一遍.取

$$
A = \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix} \quad (\text{剪切}),
\qquad
B = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix} \quad (\text{旋转 } 90°).
$$

先算 $AB$，即先旋转、再剪切.每个元素是"$A$ 的一行点乘 $B$ 的一列"：

$$
AB =
\begin{bmatrix}
1 \cdot 0 + 1 \cdot 1 & 1 \cdot (-1) + 1 \cdot 0 \\
0 \cdot 0 + 1 \cdot 1 & 0 \cdot (-1) + 1 \cdot 0
\end{bmatrix}
=
\begin{bmatrix} 1 & -1 \\ 1 & 0 \end{bmatrix}.
$$

比如左上角那一格：$A$ 的第一行 $(1, 1)$ 与 $B$ 的第一列 $(0, 1)$ 对应相乘再相加，得 $1 \cdot 0 + 1 \cdot 1 = 1$.

再算 $BA$，即先剪切、再旋转，交换两边的顺序：

$$
BA =
\begin{bmatrix}
0 \cdot 1 + (-1) \cdot 0 & 0 \cdot 1 + (-1) \cdot 1 \\
1 \cdot 1 + 0 \cdot 0 & 1 \cdot 1 + 0 \cdot 1
\end{bmatrix}
=
\begin{bmatrix} 0 & -1 \\ 1 & 1 \end{bmatrix}.
$$

$AB \ne BA$：先旋转再剪切，和先剪切再旋转，结果不同.矩阵乘法不满足交换律，因为"先做哪个操作"本来就影响结果——这一点不是矩阵的怪癖，是复合的真实性质.

### 两种读法：行的读法是泛函，列的读法是复合

同一个乘法有两副面孔.

**列的读法.** $AB$ 的第 $j$ 列，等于 $A$ 作用在 $B$ 的第 $j$ 列上：

$$
(AB)_{\cdot j} = A\,(B_{\cdot j}).
$$

为什么必然如此：$B$ 的第 $j$ 列是 $B\mathbf{e}_j$，也就是基向量的像；复合映射先做 $B$ 再做 $A$，把它送到 $A(B\mathbf{e}_j)$；而"矩阵的列 = 基向量的像"是矩阵表示的定义，所以复合矩阵的第 $j$ 列只能是 $A(B\mathbf{e}_j)$.

拿上文那对 $A$（剪切）、$B$（旋转 90°）手算一遍. 先从 $B$ 的矩阵里把两列读出来：

$$
B = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}
\quad\Longrightarrow\quad
B_{\cdot 1} = \begin{bmatrix} 0 \\ 1 \end{bmatrix},\qquad
B_{\cdot 2} = \begin{bmatrix} -1 \\ 0 \end{bmatrix}.
$$

再逐列作用 $A$. 矩阵乘列向量，就是把 $A$ 的两列按这个列向量的坐标组合（$A$ 的两列是 $(1,0)$ 与 $(1,1)$）：

$$
A B_{\cdot 1}
= \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}\begin{bmatrix} 0 \\ 1 \end{bmatrix}
= 0 \cdot \begin{bmatrix} 1 \\ 0 \end{bmatrix} + 1 \cdot \begin{bmatrix} 1 \\ 1 \end{bmatrix}
= \begin{bmatrix} 1 \\ 1 \end{bmatrix},
$$

$$
A B_{\cdot 2}
= \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}\begin{bmatrix} -1 \\ 0 \end{bmatrix}
= (-1) \cdot \begin{bmatrix} 1 \\ 0 \end{bmatrix} + 0 \cdot \begin{bmatrix} 1 \\ 1 \end{bmatrix}
= \begin{bmatrix} -1 \\ 0 \end{bmatrix}.
$$

两列拼起来：

$$
AB = \begin{bmatrix} A B_{\cdot 1} & A B_{\cdot 2} \end{bmatrix}
= \begin{bmatrix} 1 & -1 \\ 1 & 0 \end{bmatrix},
$$

和前面逐项计算得到的 $AB$ 一致. 同一件事，列读法按列整体算，行读法按格子逐个算.

**行的读法（线性泛函）.** $A$ 的每一行可以看成一个线性泛函：吃进一个列向量，吐出一个数，这个数就是两个向量的点积. $AB$ 的第 $i$ 行第 $j$ 列，就是这个泛函作用在 $B$ 的第 $j$ 列上的取值：

$$
(AB)_{ij} = \langle A_{i\cdot},\, B_{\cdot j}\rangle.
$$

这个读法适合手算（一次一个格子），也是"一行碰一列"口诀的来源；但让矩阵乘法与复合真正对上的是列的读法. 两种读法结果一样：列读法展开后，第 $i$ 个分量就是行读法的那个点积.

（点积就是内积；这里先借用高中熟悉的形式，内积的严格定义与性质在下一章《内积、正交与投影》里讲.）

### 实验：把复合画出来

下面的实验里有两个固定的映射 $A$（剪切）和 $B$（旋转 90°），就是刚才手算的那对. 拖动画布上的探针 $\mathbf{v}$，它在两跳之后落到哪里，右侧的读数就跟着走.

1. 默认是「先剪切、后缩放」：网格一次只显示一层，「第一跳 / 第二跳」按钮切换；虚线箭头、实线箭头分别落在对应层级的网格上.
2. 切到「先 A 后 B」：终点的位置与黄色网格一起改变，矩阵卡片里 $BA$ 与 $AB$ 不同.
3. 想复现上文的例子：把 $A$ 选「剪切」、$B$ 选「旋转 90°」——注意旋转把正方形网格转回自身，青色的第一层网格会和灰色网格重合；网格上看不出的差别，矩阵会告诉你.
4. 点乘积矩阵里的任意格子：下方会展开"左矩阵这一行 · 右矩阵这一列"的算式，逐项相乘再相加，数字怎么来的当场看见.
5. 换到「列（左矩阵作用在右列上）」视角，再点任意格子：展开的是"右矩阵的这一列被左矩阵作用"的整列算法. 画布上绿色箭头就是这两列的来历：细虚线是右矩阵的列向量，粗实线是它们被左矩阵作用后的像——后者正是乘积矩阵的两列.

<MatrixCompose />

## 逆：把操作倒回去

复合是"接起来做"，那能不能"倒着做"？先把"什么都不做"命名：恒等映射 $\mathrm{id}(\mathbf{v}) = \mathbf{v}$.

> **定义（逆映射）** 设 $T: V \to W$.若存在映射 $U: W \to V$，使
> $$
> U(T(\mathbf{v})) = \mathbf{v} \quad (\forall \mathbf{v} \in V),
> \qquad
> T(U(\mathbf{w})) = \mathbf{w} \quad (\forall \mathbf{w} \in W),
> $$
> 就称 $T$ 可逆，$U$ 是 $T$ 的逆映射，记作 $T^{-1}$.

人话版：$T$ 把 $\mathbf{v}$ 搬走，$T^{-1}$ 能原路搬回来，两个方向的"来回"都必须是原地不动.

> **命题** 线性映射 $T$ 可逆，当且仅当它是一一对应（单射且满射）；此时 $T^{-1}$ 也是线性的.

单射、满射是高中就熟悉的词：单射是"不同输入不给相同输出"，满射是"每个目标都被打到过".若 $T$ 可逆，两个来回条件说明它既不会把两个点并成一个（单射），也没有漏掉目标（满射）；反过来，一一对应保证每个 $\mathbf{w}$ 有唯一的原像，逆映射就定义为"取那个原像"，而它的线性是这样来的：设 $\mathbf{v}_1 = T^{-1}(\mathbf{w}_1)$、$\mathbf{v}_2 = T^{-1}(\mathbf{w}_2)$，则

$$
T(\mathbf{v}_1 + \mathbf{v}_2) = T(\mathbf{v}_1) + T(\mathbf{v}_2) = \mathbf{w}_1 + \mathbf{w}_2,
$$

由原像唯一，$T^{-1}(\mathbf{w}_1 + \mathbf{w}_2) = \mathbf{v}_1 + \mathbf{v}_2$.数乘同理.$\blacksquare$

矩阵版本的逆同样自然：

> **定义（逆矩阵）** 设 $M$ 是方阵.若存在方阵 $N$ 使
> $$
> MN = NM = I
> $$
> （$I$ 是单位矩阵，对角线上是 1、其余是 0），就称 $M$ 可逆，$N$ 是它的逆，记作 $M^{-1}$；不可逆的方阵叫奇异的.

为什么只对方阵谈逆：$m \times n$ 的矩阵把 $\mathbb{R}^n$ 送到 $\mathbb{R}^m$，维数不同时不可能一一对应——$n > m$ 时 $n$ 个基向量在 $m$ 维空间里必然相关（第二章的定理），有非零向量被压到零，单射就没戏；$n < m$ 时像至多铺满 $n$ 个方向，遮不住整个 $\mathbb{R}^m$.

$2 \times 2$ 的逆有可以直接背的公式.

> **命题（$2 \times 2$ 逆公式）** 设 $M = \begin{bmatrix} a & b \\ c & d \end{bmatrix}$，记 $\Delta = ad - bc$.若 $\Delta \ne 0$，则
> $$
> M^{-1} = \frac{1}{\Delta}\begin{bmatrix} d & -b \\ -c & a \end{bmatrix}.
> $$

验证就是乘一遍（对角线交换、副对角线变号，再除以行列式）：

$$
M M^{-1}
= \frac{1}{\Delta}
\begin{bmatrix} a & b \\ c & d \end{bmatrix}
\begin{bmatrix} d & -b \\ -c & a \end{bmatrix}
= \frac{1}{\Delta}
\begin{bmatrix} ad - bc & -ab + ab \\ cd - dc & -bc + ad \end{bmatrix}
= \frac{1}{\Delta}
\begin{bmatrix} \Delta & 0 \\ 0 & \Delta \end{bmatrix}
= I.
$$

逆唯一吗？是的，而且证明只有一行.

> **命题（逆的唯一性）** 若方阵 $M$ 可逆，它的逆是唯一的.

设 $N$、$N'$ 都满足 $MN = NM = I$ 与 $MN' = N'M = I$，则

$$
N = NI = N(MN') = (NM)N' = IN' = N'.
$$

$\blacksquare$

$2 \times 2$ 的逆公式背起来快，但更高阶需要通用做法. 有两条路，都很具体.

**列视角.** $M^{-1}$ 的第 $j$ 列，就是方程 $M\mathbf{x} = \mathbf{e}_j$ 的解：因为 $MM^{-1} = I$，比较两边的第 $j$ 列，$M$ 乘上"$M^{-1}$ 的第 $j$ 列"等于 $I$ 的第 $j$ 列，也就是 $\mathbf{e}_j$. 拿 $M = \begin{bmatrix} 2 & 1 \\ 1 & 1 \end{bmatrix}$ 试一遍：

- 解 $M\mathbf{x} = \mathbf{e}_1$，即 $2x_1 + x_2 = 1$、$x_1 + x_2 = 0$，得 $\mathbf{x} = (1, -1)$；
- 解 $M\mathbf{x} = \mathbf{e}_2$，即 $2x_1 + x_2 = 0$、$x_1 + x_2 = 1$，得 $\mathbf{x} = (-1, 2)$.

两列拼起来：$M^{-1} = \begin{bmatrix} 1 & -1 \\ -1 & 2 \end{bmatrix}$，和 $2 \times 2$ 公式给的结果一样. "求逆"于是化归为"解 $n$ 个方程组"——第一章的老本行，只是这里的右端项恰好是标准基向量.

**增广矩阵.** 上面两次解方程组的消元步骤几乎一样，只有右端项不同. 把它们并排写、一次消完，就是增广矩阵的做法.

> **定义（增广矩阵）** 把系数矩阵 $A$ 与右端列 $\mathbf{b}$ 并排成矩阵 $[\,A \mid \mathbf{b}\,]$，中间用竖线分隔，称为方程组 $A\mathbf{x} = \mathbf{b}$ 的增广矩阵. 对增广矩阵做初等行变换（交换两行、某行乘非零数、某行加另一行的倍数），等价于对方程组做相应的消元：一行里的系数与右端同步变化，方程之间的这三种操作被原样保留.

把 $n$ 个方程组 $M\mathbf{x} = \mathbf{e}_1,\ \dots,\ M\mathbf{x} = \mathbf{e}_n$ 的右端并排，右端块正好是单位矩阵 $I$，于是写成 $[\,M \mid I\,]$. 一次消元下来，左半边化成 $I$ 时，右半边就是 $n$ 个解拼成的 $M^{-1}$——这就是高斯-约当消元.

**为什么行变换能这样用.** 关键在于：每种初等行变换都能写成"左乘一个固定的矩阵".

交换两行：令 $P = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}$，直接乘一遍

$$
PM = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}\begin{bmatrix} m_{11} & m_{12} \\ m_{21} & m_{22} \end{bmatrix}
= \begin{bmatrix} m_{21} & m_{22} \\ m_{11} & m_{12} \end{bmatrix},
$$

正好是 $M$ 的两行互换（$PM$ 的第一行等于 $P$ 的第一行 $(0, 1)$ 与 $M$ 的各列点乘，得到 $M$ 的第二行）.

第二行减第一行：令 $E = \begin{bmatrix} 1 & 0 \\ -1 & 1 \end{bmatrix}$，则

$$
EM = \begin{bmatrix} 1 & 0 \\ -1 & 1 \end{bmatrix}\begin{bmatrix} m_{11} & m_{12} \\ m_{21} & m_{22} \end{bmatrix}
= \begin{bmatrix} m_{11} & m_{12} \\ m_{21} - m_{11} & m_{22} - m_{12} \end{bmatrix},
$$

第二行恰好变成"原第二行减原第一行".

> **定义（初等矩阵）** 对单位矩阵做一次初等行变换得到的矩阵叫初等矩阵. 用初等矩阵左乘任何矩阵，等于对它做对应的那次行变换.

原理现在可以一行写完：设把 $M$ 化成 $I$ 的那串行变换对应初等矩阵 $E_1, \dots, E_k$，则

$$
E_k \cdots E_1 M = I.
$$

由逆的定义，累计的左乘乘积 $P := E_k \cdots E_1$ 就是 $M^{-1}$. 同一串操作作用在右半边的 $I$ 上，得到 $E_k \cdots E_1 I = P$：右半边悄悄记下了左乘的累计乘积. 所以 $[\,M \mid I\,]$ 化成 $[\,I \mid M^{-1}\,]$ 时，$M^{-1}$ 会直接出现在右边.

用 $M = \begin{bmatrix} 2 & 1 \\ 1 & 1 \end{bmatrix}$ 走一遍. 第 1 步，$R_1 \leftarrow R_1 - R_2$：

$$
\left[\begin{array}{cc|cc} 2 & 1 & 1 & 0 \\ 1 & 1 & 0 & 1 \end{array}\right]
\;\longrightarrow\;
\left[\begin{array}{cc|cc} 1 & 0 & 1 & -1 \\ 1 & 1 & 0 & 1 \end{array}\right]
$$

第 2 步，$R_2 \leftarrow R_2 - R_1$：

$$
\left[\begin{array}{cc|cc} 1 & 0 & 1 & -1 \\ 1 & 1 & 0 & 1 \end{array}\right]
\;\longrightarrow\;
\left[\begin{array}{cc|cc} 1 & 0 & 1 & -1 \\ 0 & 1 & -1 & 2 \end{array}\right]
$$

右边读出来：$M^{-1} = \begin{bmatrix} 1 & -1 \\ -1 & 2 \end{bmatrix}$，和列视角、以及 $2 \times 2$ 公式给的结果都一致. 对任意 $n$ 是同一套操作，只是行数与步骤变多.

**什么时候能求逆.** 对方阵，下面这些说法是同一件事：

- $M$ 可逆；
- $\det M \ne 0$；
- $M$ 的列向量线性无关；
- $M\mathbf{x} = \mathbf{0}$ 只有零解；
- $M$ 作为映射是一一对应.

$2 \times 2$ 的情况上面已经两边都走通了（公式给出逆，压扁论证给出不可逆）. 一般的等价性留到《行列式》与《四个基本子空间》两章严格化.

而 $\Delta = 0$ 时逆不存在，理由用第一章的图景一句话说完：两列成比例（第二章：线性相关），存在不全为零的 $(c_1, c_2)$ 使 $c_1 \cdot \text{列}_1 + c_2 \cdot \text{列}_2 = \mathbf{0}$，也就是 $M$ 把非零向量 $(c_1, c_2)$ 送到了零.此时不同的点会被压到同一点，倒不回去.所以对 $2 \times 2$ 矩阵：

**$M$ 可逆 $\iff \det M \ne 0$.**

几条用起来顺手的性质，证明都是"乘回去等于 $I$"：

- $(M^{-1})^{-1} = M$；
- $(AB)^{-1} = B^{-1}A^{-1}$：先穿袜再穿鞋，脱的时候反着来；

$$
(AB)(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AIA^{-1} = AA^{-1} = I.
$$

## 换基：同一个映射，另一个矩阵

现在把"基"也动起来.设 $M$ 是线性映射 $T$ 在旧基下的矩阵，$\mathbf{u}_1', \dots, \mathbf{u}_n'$ 是一组新基.把新基向量在旧基下的坐标按列排成矩阵 $P$，称 $P$ 为过渡矩阵.

在新基下 $T$ 的矩阵是

$$
M' = P^{-1} M P.
$$

先别急着记公式，看它怎么来的.$P^{-1}$ 就是上一节的逆矩阵（$P$ 本身叫过渡矩阵），$P^{-1}(\,\cdot\,)P$ 这个夹心结构的意思是"用 $P$ 把新坐标翻译成旧坐标，用 $M$ 做变换，再用 $P^{-1}$ 翻译回新坐标".每一步都只是换语言，中间的变换本身没动.

拿上面的交换坐标举例：$M = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}$，新基 $\mathbf{u}_1 = (1,1)$、$\mathbf{u}_2 = (1,-1)$ 给出 $P = \begin{bmatrix} 1 & 1 \\ 1 & -1 \end{bmatrix}$，算一下 $P^{-1}MP$ 就是单位矩阵——和前面直接数基向量的像得到的结果一致.同一个事实，两条路.

## 实验：同一个变换，不同的矩阵

实验里固定一个映射 $M$，你可以拖动基向量 $\mathbf{u}_1$、$\mathbf{u}_2$ 和探针 $\mathbf{v}$：

1. 默认标准基下，$M' = M$，公式退化成自己.
2. 点「斜基」，或手动把 $\mathbf{u}_1$ 拖到 $(1,1)$、$\mathbf{u}_2$ 拖到 $(1,-1)$：青色网格随基一起被拉斜（它就是 $P$），几何箭头一个没变，$M'$ 却变了.试试配合「旋转 90°」这个映射，看 $M'$ 会变成什么样.
3. 点「共线」：青色网格塌成一条线，两个向量不再是基，$P$ 不可逆，换坐标的公式失效——这也说明了公式里 $P^{-1}$ 不是摆设.

<ChangeOfBasis />

## 习题

1. 验证 $T(x, y) = (2x,\ x + y)$ 是线性的（按定义逐条检查）.
2. 判断：线性映射一定把零向量送到零向量吗？把零向量送到零向量的映射一定是线性的吗？分别给出理由或反例.
3. 求 $T(x, y) = (x + y,\ x - y)$ 在基 $\mathbf{u}_1 = (1, 1)$、$\mathbf{u}_2 = (1, -1)$ 下的矩阵.
4. 计算 $AB$ 与 $BA$ 并比较：$A = \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$，$B = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}$.
5. 设 $T$ 在标准基下的矩阵是 $M = \begin{bmatrix} 2 & 0 \\ 0 & 3 \end{bmatrix}$，取新基 $\mathbf{u}_1 = (1, 0)$、$\mathbf{u}_2 = (1, 1)$.求过渡矩阵 $P$，并计算 $T$ 在新基下的矩阵.
6. 用 $2 \times 2$ 逆公式求 $M = \begin{bmatrix} 2 & 1 \\ 1 & 1 \end{bmatrix}$ 的逆，并乘一遍验证.
7. 判断 $M = \begin{bmatrix} 1 & 2 \\ 2 & 4 \end{bmatrix}$ 是否可逆，并说明理由（找一个被它压到零的非零向量）.
8. 证明：若同阶方阵 $A$、$B$ 都可逆，则 $AB$ 可逆，且 $(AB)^{-1} = B^{-1}A^{-1}$.
9. 用高斯-约当消元求 $M = \begin{bmatrix} 1 & 0 & 2 \\ 0 & 1 & 0 \\ 2 & 0 & 1 \end{bmatrix}$ 的逆.
10. 用列视角求 $M = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$ 的逆：分别解 $M\mathbf{x} = \mathbf{e}_1$ 与 $M\mathbf{x} = \mathbf{e}_2$.
11. 用列的读法重算 $AB$：先写出 $B$ 的两列，再分别用 $A$ 作用，拼出结果；同样用列读法算一遍 $BA$ 作对照.

::: details 参考答案

**1.** 设 $\mathbf{u} = (x_1, y_1)$、$\mathbf{v} = (x_2, y_2)$、$a \in \mathbb{R}$.
$T(\mathbf{u} + \mathbf{v}) = T(x_1 + x_2,\ y_1 + y_2) = (2x_1 + 2x_2,\ x_1 + x_2 + y_1 + y_2) = T(\mathbf{u}) + T(\mathbf{v})$；
$T(a\mathbf{u}) = T(ax_1, ay_1) = (2ax_1,\ ax_1 + ay_1) = aT(\mathbf{u})$.两条都成立.

**2.** 前半真：取 $a = 0$，$T(\mathbf{0}) = T(0 \cdot \mathbf{v}) = 0 \cdot T(\mathbf{v}) = \mathbf{0}$.
后半假：$T(x, y) = (x^2, y)$ 把零送到零，但 $T(2,0) = (4,0) \ne 2T(1,0) = (2,0)$，不是线性的.

**3.** $T(\mathbf{u}_1) = (2, 0)$.设 $(2,0) = c_1(1,1) + c_2(1,-1)$，解得 $c_1 = 1$、$c_2 = 1$.
$T(\mathbf{u}_2) = (0, 2)$，解得 $c_1 = 1$、$c_2 = -1$.矩阵是 $\begin{bmatrix} 1 & 1 \\ 1 & -1 \end{bmatrix}$.

**4.** $AB = \begin{bmatrix} 1 & -1 \\ 1 & 0 \end{bmatrix}$，$BA = \begin{bmatrix} 0 & -1 \\ 1 & 1 \end{bmatrix}$，两者不同：先旋转后剪切与先剪切后旋转不是同一个操作.

**5.** 新基向量按列排：$P = \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$，$P^{-1} = \begin{bmatrix} 1 & -1 \\ 0 & 1 \end{bmatrix}$.
$$
P^{-1}MP = \begin{bmatrix} 1 & -1 \\ 0 & 1 \end{bmatrix}
\begin{bmatrix} 2 & 0 \\ 0 & 3 \end{bmatrix}
\begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}
= \begin{bmatrix} 2 & -2 \\ 0 & 3 \end{bmatrix}
\begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}
= \begin{bmatrix} 2 & -1 \\ 0 & 3 \end{bmatrix}.
$$

**6.** $\Delta = 2 \cdot 1 - 1 \cdot 1 = 1$，所以
$$
M^{-1} = \frac{1}{1}\begin{bmatrix} 1 & -1 \\ -1 & 2 \end{bmatrix}
= \begin{bmatrix} 1 & -1 \\ -1 & 2 \end{bmatrix}.
$$
验证：$\begin{bmatrix} 2 & 1 \\ 1 & 1 \end{bmatrix}\begin{bmatrix} 1 & -1 \\ -1 & 2 \end{bmatrix} = \begin{bmatrix} 2-1 & -2+2 \\ 1-1 & -1+2 \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$.

**7.** 不可逆：$\Delta = 1 \cdot 4 - 2 \cdot 2 = 0$.两列成比例，$(-2, 1)$ 被压到零：$M\begin{bmatrix} -2 \\ 1 \end{bmatrix} = \begin{bmatrix} 1 \cdot (-2) + 2 \cdot 1 \\ 2 \cdot (-2) + 4 \cdot 1 \end{bmatrix} = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$.非零向量被压到零，不是单射，没有逆.

**8.** 直接乘：
$$
(AB)(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AIA^{-1} = AA^{-1} = I,
$$
同理 $(B^{-1}A^{-1})(AB) = B^{-1}(A^{-1}A)B = B^{-1}B = I$.由逆的定义，$B^{-1}A^{-1}$ 就是 $AB$ 的逆.

**9.** 增广矩阵与消元：

$$
\left[\begin{array}{ccc|ccc} 1 & 0 & 2 & 1 & 0 & 0 \\ 0 & 1 & 0 & 0 & 1 & 0 \\ 2 & 0 & 1 & 0 & 0 & 1 \end{array}\right]
\xrightarrow{R_3 - 2R_1}
\left[\begin{array}{ccc|ccc} 1 & 0 & 2 & 1 & 0 & 0 \\ 0 & 1 & 0 & 0 & 1 & 0 \\ 0 & 0 & -3 & -2 & 0 & 1 \end{array}\right]
$$
$$
\xrightarrow{R_3 \div (-3)}
\left[\begin{array}{ccc|ccc} 1 & 0 & 2 & 1 & 0 & 0 \\ 0 & 1 & 0 & 0 & 1 & 0 \\ 0 & 0 & 1 & \tfrac{2}{3} & 0 & -\tfrac{1}{3} \end{array}\right]
\xrightarrow{R_1 - 2R_3}
\left[\begin{array}{ccc|ccc} 1 & 0 & 0 & -\tfrac{1}{3} & 0 & \tfrac{2}{3} \\ 0 & 1 & 0 & 0 & 1 & 0 \\ 0 & 0 & 1 & \tfrac{2}{3} & 0 & -\tfrac{1}{3} \end{array}\right]
$$
右边即 $M^{-1} = \begin{bmatrix} -1/3 & 0 & 2/3 \\ 0 & 1 & 0 \\ 2/3 & 0 & -1/3 \end{bmatrix}$.

**10.** 解 $M\mathbf{x} = \mathbf{e}_1$：$x_1 + 2x_2 = 1$、$3x_1 + 4x_2 = 0$，由第一式 $x_1 = 1 - 2x_2$，代入第二式得 $3 - 2x_2 = 0$，故 $x_2 = \tfrac{3}{2}$、$x_1 = -2$，第一列 $(-2,\ 3)$. 解 $M\mathbf{x} = \mathbf{e}_2$：$x_1 + 2x_2 = 0$、$3x_1 + 4x_2 = 1$，同理得 $x_2 = -\tfrac{1}{2}$、$x_1 = 1$，第二列 $(1,\ -\tfrac{1}{2})$. 所以 $M^{-1} = \begin{bmatrix} -2 & 1 \\ 3 & -\tfrac{1}{2} \end{bmatrix}$，与 $2 \times 2$ 公式一致.

**11.** $B$ 的列是 $(0,1)$ 与 $(-1,0)$：
$$
A(0,1) = (1 \cdot 0 + 1 \cdot 1,\ 0 \cdot 0 + 1 \cdot 1) = (1, 1),
\qquad
A(-1,0) = (-1, 0).
$$
拼起来 $AB = \begin{bmatrix} 1 & -1 \\ 1 & 0 \end{bmatrix}$，与逐项计算一致.
对照：$A$ 的列是 $(1,0)$ 与 $(1,1)$，$B(1,0) = (0,1)$、$B(1,1) = (-1,1)$，拼起来 $BA = \begin{bmatrix} 0 & -1 \\ 1 & 1 \end{bmatrix}$，也对.


:::

## 交叉

- 矩阵分析：相似矩阵 $M' = P^{-1}MP$ 是同一映射的不同写法，SVD 与特征值都在这个框架里说"换到合适的基下看".
- 机器学习：一个线性层就是一个矩阵；"换基"在模型里对应换一组特征表示，而注意力机制则更进一步——基本身随输入实时改变.
- 体系结构：复合对应矩阵乘法，矩阵乘法对应 GEMM，这是体系结构线里第一个真正吃性能的算子.

## 延伸

下一章《内积、正交与投影》会给向量加上长度的度量，并把线性泛函表示为内积（有限维 Riesz 表示定理），届时"A 的每一行是一个泛函"这句话会得到完整的解释.再往后，特征值那一章会把 $M' = P^{-1}MP$ 用到极致：找一组基，让矩阵变成对角阵.
