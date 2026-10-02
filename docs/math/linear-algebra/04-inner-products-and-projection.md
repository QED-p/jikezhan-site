---
title: 内积、正交与投影
track: math
unit: linear-algebra
order: 4
level: 100
prereq: [linear-algebra/03-linear-maps-and-matrices]
cross: [ml/gradient-descent, ml/transformer, matrix-analysis]
interactive: [orthogonal-projection]
---

<script setup>
import OrthogonalProjection from '../../.vitepress/theme/components/OrthogonalProjection.vue'
import GramSchmidt3D from '../../.vitepress/theme/components/GramSchmidt3D.vue'
</script>

# 内积、正交与投影

上一章留下一个用了一半的工具：A 的每一行是线性泛函，"吃进一个列向量，吐出一个数". 那个数是怎么吃的？用的就是点积——高中的数量积.

但高中只在平面上定义过它，而且靠的是夹角：$\mathbf{a} \cdot \mathbf{b} = |\mathbf{a}||\mathbf{b}|\cos\theta$. 这一章把顺序倒过来：先给点积一个不需要画图的定义（内积），再让长度、夹角、垂直、投影从它里面长出来. 这样，任意维空间第一次有了度量——$\mathbb{R}^{512}$ 里两个向量的夹角不是看出来的，是算出来的.

## 高中那点工具，够用到哪里

这一章的定义你在高中几乎原样见过：

- **必修二 6.2.4 数量积**：几何定义 $\mathbf{a}\cdot\mathbf{b} = |\mathbf{a}||\mathbf{b}|\cos\theta$，垂直等价于点积为零；同一节里还有一个"投影向量"——$\mathbf{a}$ 在 $\mathbf{b}$ 方向上的投影向量是 $\dfrac{\mathbf{a}\cdot\mathbf{b}}{|\mathbf{b}|^2}\mathbf{b}$，这就是本章投影公式的二维原版.
- **必修二 6.3.5 数量积的坐标表示**：$a_1b_1 + a_2b_2$；**选必一 1.1.2** 把它搬进空间. 到了 $n$ 维没有看得见的夹角，于是坐标公式从推论升级成定义.
- **选必一 1.4.2 用空间向量研究距离、夹角**：高中用向量算距离与夹角的标准动作——建系、求坐标、点积——本章给它统一的语言.

**一个高中题，投影读法.** 求点 $P(3,4)$ 到直线 $y = x$ 的距离. 高中的标准做法是套点到直线距离公式；用投影做是这样：直线上取 $Q(0,0)$，方向向量 $\mathbf{d} = (1,1)$，把 $\overrightarrow{QP} = (3,4)$ 在 $\mathbf{d}$ 上投影：

$$
\operatorname{proj}_{\mathbf{d}}\overrightarrow{QP}
= \frac{7}{2}(1,1) = (3.5,\ 3.5),
\qquad
\text{残差} = (3,4) - (3.5,3.5) = (-0.5,\ 0.5).
$$

残差与直线垂直，长度 $\sqrt{0.5} \approx 0.707$，就是点到直线的距离（与公式 $|3-4|/\sqrt{2}$ 一致）. **距离 = 去掉投影后剩下的垂直分量**——本章的投影与最佳逼近，都是这个动作的高维版本.

## 定义：内积

> **定义（内积）** $\mathbb{R}$ 上向量空间 $V$ 的内积是一台"吃两个向量、吐一个实数"的机器 $\langle \cdot, \cdot \rangle$，满足三条：
> (i) 对称：$\langle \mathbf{u}, \mathbf{v} \rangle = \langle \mathbf{v}, \mathbf{u} \rangle$；
> (ii) 对第一变量线性：$\langle a\mathbf{u} + b\mathbf{v}, \mathbf{w} \rangle = a\langle \mathbf{u}, \mathbf{w} \rangle + b\langle \mathbf{v}, \mathbf{w} \rangle$；
> (iii) 正定：$\langle \mathbf{v}, \mathbf{v} \rangle \ge 0$，且 $\langle \mathbf{v}, \mathbf{v} \rangle = 0$ 当且仅当 $\mathbf{v} = \mathbf{0}$.

人话版：可以交换；对加法与伸缩不闹脾气；自己和自己的内积永不为负，只有零向量才为零.

装上内积的实向量空间叫**内积空间**（inner product space）. $\mathbb{R}^n$ 配标准内积、平面向量配数量积，都是内积空间；这个词只是给"能做内积的向量空间"起个名字——本章后半段说"有限维内积空间上的 Riesz 表示"时，指的就是这种空间.

> **定义（标准内积）** $\mathbb{R}^n$ 上的标准内积是
> $$
> \langle \mathbf{x}, \mathbf{y} \rangle = x_1y_1 + x_2y_2 + \cdots + x_ny_n.
> $$

高中数量积就是 $\mathbb{R}^2$ 与 $\mathbb{R}^3$ 的标准内积：几何定义在二维里能画出来，坐标公式才是能带进任意维的形式.

> **几何直觉.** 内积可以读成"长度乘投影"：
> $$
> \langle \mathbf{u}, \mathbf{v} \rangle = |\mathbf{u}|\,|\mathbf{v}|\cos\theta
> = |\mathbf{u}| \times (\mathbf{v} \text{ 在 } \mathbf{u} \text{ 方向上的投影长度}).
> $$
> 符号告诉你三件事：为正表示大致同向，为零表示垂直，为负表示大致反向. 高维里没有"看得见的夹角"，但这条读法原样成立——夹角是算出来的，不是画出来的.

不是随便什么二元函数都叫内积. 比如 $\langle \mathbf{x}, \mathbf{y} \rangle = x_1y_2$ 不对称；$\langle \mathbf{x}, \mathbf{y} \rangle = x_1y_1 - x_2y_2$ 不正定（取 $\mathbf{x} = (0,1)$ 得 $-1$），都不合格.

## 长度、距离与夹角

> **定义（长度与距离）** $|\mathbf{v}| = \sqrt{\langle \mathbf{v}, \mathbf{v} \rangle}$；两个向量的距离是 $d(\mathbf{u}, \mathbf{v}) = |\mathbf{u} - \mathbf{v}|$. 长度为 1 的向量叫单位向量；任何非零向量除以自己的长度就变成单位向量，这个过程叫归一化.

要把夹角从内积里定义出来，得先保证余弦值不会超过 1.

> **命题（柯西–施瓦茨）** $|\langle \mathbf{u}, \mathbf{v} \rangle| \le |\mathbf{u}|\,|\mathbf{v}|$；等号成立当且仅当 $\mathbf{u}$、$\mathbf{v}$ 线性相关.

::: details 证明
若 $\mathbf{v} = \mathbf{0}$，两边都是 $0$，结论显然. 设 $\mathbf{v} \ne \mathbf{0}$. 对任意实数 $t$，
$$
0 \le |\mathbf{u} - t\mathbf{v}|^2 = \langle \mathbf{u} - t\mathbf{v}, \mathbf{u} - t\mathbf{v} \rangle
= |\mathbf{u}|^2 - 2t\langle \mathbf{u}, \mathbf{v} \rangle + t^2|\mathbf{v}|^2.
$$
右边是关于 $t$ 的二次式，开口向上且恒非负，所以判别式不大于零：
$$
4\langle \mathbf{u}, \mathbf{v} \rangle^2 - 4|\mathbf{u}|^2|\mathbf{v}|^2 \le 0,
$$
即 $\langle \mathbf{u}, \mathbf{v} \rangle^2 \le |\mathbf{u}|^2|\mathbf{v}|^2$. 两边开方即可. 等号成立时上述二次式有实根 $t$，此时 $\mathbf{u} = t\mathbf{v}$ 或 $\mathbf{v} = \mathbf{0}$，都是线性相关. $\blacksquare$
:::

有了它，夹角就可以定义了：
$$
\cos\theta = \frac{\langle \mathbf{u}, \mathbf{v} \rangle}{|\mathbf{u}|\,|\mathbf{v}|}.
$$
右边总落在 $[-1, 1]$ 里，不会出现"余弦等于 2"的尴尬. 长度与距离的三条常识性质（非负、对伸缩齐次、三角形不等式）都能从内积公理推出来，最后一条要用柯西–施瓦茨.

> **几何直觉（先算两个数）.**
> - $(1,0,1,0)$ 与 $(0,1,0,1)$ 的内积是 $0$：两个 $\mathbb{R}^4$ 里的向量互相垂直，和平面上的直角是一回事；
> - $(3,4)$ 与 $(1,0)$ 的夹角：内积是 $3$，模分别是 $5$ 和 $1$，所以 $\cos\theta = 3/5$——正是 3-4-5 直角三角形里的邻边比.
>
> 维数越高，"垂直的方向"越多：给定一个非零向量，与它正交的向量会凑成一个 $n-1$ 维的子空间（第 6 章会正式用上这件事）.

## 正交、正交基与正交化

> **定义（正交）** 若 $\langle \mathbf{u}, \mathbf{v} \rangle = 0$，称 $\mathbf{u}$ 与 $\mathbf{v}$ 正交，记作 $\mathbf{u} \perp \mathbf{v}$.

勾股定理在抽象内积里照旧成立：若 $\mathbf{u} \perp \mathbf{v}$，则
$$
|\mathbf{u} + \mathbf{v}|^2 = |\mathbf{u}|^2 + |\mathbf{v}|^2
$$
（把左边按内积展开，交叉项 $\langle \mathbf{u}, \mathbf{v} \rangle + \langle \mathbf{v}, \mathbf{u} \rangle$ 为零）.

> **定义（正交组、正交基、标准正交基）** 两两正交的非零向量组叫正交组；若它还是 $V$ 的基，叫正交基；若每个向量长度都是 1，叫标准正交基.

正交组自动线性无关，这是"基"的条件里最值钱的部分.

::: details 证明
设 $\mathbf{u}_1, \dots, \mathbf{u}_k$ 两两正交且都非零. 若 $c_1\mathbf{u}_1 + \cdots + c_k\mathbf{u}_k = \mathbf{0}$，两边与 $\mathbf{u}_j$ 作内积：左边只剩 $c_j\langle \mathbf{u}_j, \mathbf{u}_j \rangle$（其余项两两正交为零），右边是 $0$. 于是 $c_j|\mathbf{u}_j|^2 = 0$，而 $\mathbf{u}_j \ne \mathbf{0}$ 故 $|\mathbf{u}_j|^2 \ne 0$，得 $c_j = 0$. 每个系数都是零，线性无关. $\blacksquare$
:::

正交基的第一个好处：坐标不用解方程组. 一般基下求坐标要解 $n$ 个方程（上一章的列视角）；正交基下
$$
\mathbf{v} = \frac{\langle \mathbf{v}, \mathbf{u}_1 \rangle}{\langle \mathbf{u}_1, \mathbf{u}_1 \rangle}\mathbf{u}_1 + \cdots + \frac{\langle \mathbf{v}, \mathbf{u}_n \rangle}{\langle \mathbf{u}_n, \mathbf{u}_n \rangle}\mathbf{u}_n,
$$
标准正交基下分母全是 1，坐标就是内积 $\langle \mathbf{v}, \mathbf{e}_i \rangle$. 拿第二章的例子：$\mathbf{v} = (4, 0)$ 在 $\mathbf{u}_1 = (1,1)$、$\mathbf{u}_2 = (1,-1)$ 下的坐标，直接算 $\langle \mathbf{v}, \mathbf{u}_1 \rangle / 2 = 2$、$\langle \mathbf{v}, \mathbf{u}_2 \rangle / 2 = 2$，坐标 $(2, 2)$，不必解方程.

基不正交时，内积没有简写公式，但代价可以当场算清：把两个向量按基展开，用多重线性直接乘开，
$$
\langle \mathbf{u}, \mathbf{v} \rangle = \sum_{i,j} u^i v^j \langle \mathbf{b}_i, \mathbf{b}_j \rangle,
$$
把 $n^2$ 个数 $\langle \mathbf{b}_i, \mathbf{b}_j \rangle$ 算一遍即可. 正交基把这个和省成 $n$ 项——只剩 $i = j$ 的那些，这就是"正交"真正的红利.

任意一组线性无关的向量都能加工成正交基，方法是逐一"减掉已有方向上的分量".

> **算法（Gram–Schmidt 正交化）** 给定线性无关的 $\mathbf{a}_1, \dots, \mathbf{a}_k$：
> 1. $\mathbf{e}_1 = \mathbf{a}_1 / |\mathbf{a}_1|$；
> 2. 对每个 $j > 1$：先减掉它在已有方向上的全部分量，$\mathbf{b}_j = \mathbf{a}_j - \sum_{i<j} \langle \mathbf{a}_j, \mathbf{e}_i \rangle \mathbf{e}_i$；再归一化 $\mathbf{e}_j = \mathbf{b}_j / |\mathbf{b}_j|$.
> 输出 $\mathbf{e}_1, \dots, \mathbf{e}_k$ 两两正交、长度为 1，且张成与原来相同的空间.

二维手算一个：$\mathbf{a} = (1,1)$，$\mathbf{b} = (2,0)$. 先归一化 $\mathbf{e}_1 = (1,1)/\sqrt{2}$；再算 $\langle \mathbf{b}, \mathbf{e}_1 \rangle = 2/\sqrt{2} = \sqrt{2}$，于是
$$
\mathbf{b}_\perp = \mathbf{b} - \sqrt{2}\,\mathbf{e}_1 = (2,0) - (1,1) = (1,-1),
\qquad
\mathbf{e}_2 = \frac{(1,-1)}{\sqrt{2}}.
$$
实验里可以拖动 $\mathbf{a}$、$\mathbf{b}$ 验证这件事.

**三维走一遍，看循环长什么样.** 取 $\mathbb{R}^3$ 里的三支向量

$$
\mathbf{a}_1 = (1,1,0), \quad \mathbf{a}_2 = (1,0,1), \quad \mathbf{a}_3 = (0,1,1).
$$

- $\mathbf{e}_1 = \frac{1}{\sqrt{2}}(1,1,0)$；
- $\mathbf{a}_2$ 减掉在 $\mathbf{e}_1$ 上的影子（$\langle \mathbf{a}_2, \mathbf{e}_1 \rangle = \frac{1}{\sqrt{2}}$）：

$$
\mathbf{b}_2 = (1,0,1) - \frac{1}{2}(1,1,0) = \left(\frac{1}{2}, -\frac{1}{2}, 1\right),
\qquad |\mathbf{b}_2| = \frac{\sqrt{6}}{2},
\qquad \mathbf{e}_2 = \frac{1}{\sqrt{6}}(1,-1,2);
$$

- $\mathbf{a}_3$ 要减**两个**影子（$\langle \mathbf{a}_3, \mathbf{e}_1 \rangle = \frac{1}{\sqrt{2}}$，$\langle \mathbf{a}_3, \mathbf{e}_2 \rangle = \frac{1}{\sqrt{6}}$）：

$$
\mathbf{b}_3 = (0,1,1) - \frac{1}{2}(1,1,0) - \frac{1}{6}(1,-1,2) = \left(-\frac{2}{3}, \frac{2}{3}, \frac{2}{3}\right),
\qquad \mathbf{e}_3 = \frac{1}{\sqrt{3}}(-1,1,1).
$$

逐个验证 $\langle \mathbf{e}_i, \mathbf{e}_j \rangle = 0$、$|\mathbf{e}_i| = 1$，都成立.

**维数只改变求和的项数，循环本身不变**：第 $j$ 步永远是"减掉前 $j-1$ 个方向上的全部影子，再归一化". 在 $\mathbb{R}^n$ 里这个循环最多产出 $n$ 支标准正交向量；如果某一步 $\mathbf{b}_j = \mathbf{0}$，说明 $\mathbf{a}_j$ 已经能被前面的向量拼出来——算法顺手完成了线性相关的检测，跳过它继续即可. （矩阵分析单元的 QR 分解，就是这个循环的矩阵写法.）

> **几何直觉.** 正交化的每一步就是"减掉影子"：把 $\mathbf{a}_j$ 在新方向上投出的影子全部减掉，剩下的部分自然与已有方向垂直. 把 $\mathbf{b}$ 拖近 $\mathbf{a}$ 所在的直线，影子几乎等于 $\mathbf{b}$ 本身，$\mathbf{b}_\perp$ 就缩成零——共线的两个向量撑不出第二个正交方向.

## 投影与最佳逼近

> **定义（沿 $\mathbf{u}$ 的投影）** 设 $\mathbf{u} \ne \mathbf{0}$，$\mathbf{v}$ 在 $\mathbf{u}$ 上的投影是
> $$
> \operatorname{proj}_{\mathbf{u}} \mathbf{v}
> = \frac{\langle \mathbf{v}, \mathbf{u} \rangle}{\langle \mathbf{u}, \mathbf{u} \rangle}\,\mathbf{u}.
> $$

> **命题（正交分解）** $\mathbf{v} = \operatorname{proj}_{\mathbf{u}}\mathbf{v} + (\mathbf{v} - \operatorname{proj}_{\mathbf{u}}\mathbf{v})$，且余项与 $\mathbf{u}$ 正交.

*证明.* 记 $t = \langle \mathbf{v}, \mathbf{u} \rangle / \langle \mathbf{u}, \mathbf{u} \rangle$，余项 $\mathbf{r} = \mathbf{v} - t\mathbf{u}$，则
$$
\langle \mathbf{r}, \mathbf{u} \rangle = \langle \mathbf{v}, \mathbf{u} \rangle - t\langle \mathbf{u}, \mathbf{u} \rangle = \langle \mathbf{v}, \mathbf{u} \rangle - \langle \mathbf{v}, \mathbf{u} \rangle = 0. \qquad \blacksquare
$$

人话版：投影是 $\mathbf{v}$ 里沿着 $\mathbf{u}$ 的那一份，余项是垂直于 $\mathbf{u}$ 的那一份；两块拼回 $\mathbf{v}$，互不干扰.

投影还有一个更实用的身份：离 $\mathbf{v}$ 最近的点. 在 $\mathbf{u}$ 张成的直线上取任意点 $s\mathbf{u}$，用正交分解和勾股定理：

$$
|\mathbf{v} - s\mathbf{u}|^2
= |(\mathbf{v} - \operatorname{proj}_{\mathbf{u}}\mathbf{v}) + (t - s)\mathbf{u}|^2
= |\mathbf{v} - \operatorname{proj}_{\mathbf{u}}\mathbf{v}|^2 + |t - s|^2|\mathbf{u}|^2
\ge |\mathbf{v} - \operatorname{proj}_{\mathbf{u}}\mathbf{v}|^2,
$$

取 $s = t$ 时取到等号. "投影 = 最佳逼近"这个视角是后面最小二乘与 SVD 的种子.

> **几何直觉（直角三角形）.** 把 $\mathbf{v}$ 想成斜边：投影是它在 $\mathbf{u}$ 这条直角边上的"腿"，余项是另一条腿，正交分解画出来就是一个直角三角形. 勾股定理于是写成
> $$
> |\mathbf{v}|^2 = |\operatorname{proj}_{\mathbf{u}}\mathbf{v}|^2 + |\mathbf{v} - \operatorname{proj}_{\mathbf{u}}\mathbf{v}|^2.
> $$
> 拿 $\mathbf{v} = (3,4)$、$\mathbf{u} = (1,0)$ 验证：投影是 $(3,0)$、余项是 $(0,4)$，$3^2 + 4^2 = 5^2$.

## 线性泛函与内积：有限维 Riesz 表示

上一章说 $A$ 的每一行是线性泛函；这一节说明：在有限维里，线性泛函就是内积的化身——每个泛函都是"和某个固定向量做内积".

> **定义（线性泛函）** 从 $V$ 到 $\mathbb{R}$ 的线性映射 $\varphi: V \to \mathbb{R}$ 叫线性泛函.

线性泛函自己也能加起来、乘倍数：两个泛函逐点相加，还是一个泛函. 于是它们构成一个向量空间——这个概念贯穿下一段.

> **定义（对偶空间）** $V$ 上全体线性泛函组成的集合，按逐点定义的加法与数乘
> $$
> (\varphi + \psi)(\mathbf{v}) = \varphi(\mathbf{v}) + \psi(\mathbf{v}), \qquad
> (a\varphi)(\mathbf{v}) = a\,\varphi(\mathbf{v})
> $$
> 构成一个向量空间，记作 $V^{*}$，叫 $V$ 的对偶空间.

对偶空间有多大？$\dim V^{*} = n$：取 $V$ 的一组基，一个线性泛函由它在基上的 $n$ 个取值唯一决定（第 3 章：线性映射由基的像决定），而这 $n$ 个数可以任意指定（同章：任意指定像都能延拓成唯一的线性映射）——$V^{*}$ 与 $\mathbb{R}^n$ 一一对应.

> **命题（有限维 Riesz 表示）** 设 $V$ 是有限维内积空间（例如 $\mathbb{R}^n$ 配标准内积）. 对任意线性泛函 $\varphi: V \to \mathbb{R}$，存在唯一的向量 $\mathbf{w} \in V$，使
> $$
> \varphi(\mathbf{v}) = \langle \mathbf{v}, \mathbf{w} \rangle \quad (\forall \mathbf{v} \in V).
> $$

::: details 证明（正交化路线）
**第一步：把任意基正交单位化.** 取 $V$ 的任意一组基 $\mathbf{b}_1, \dots, \mathbf{b}_n$，用 Gram–Schmidt 得到标准正交基 $\mathbf{e}_1, \dots, \mathbf{e}_n$. 正交化不改变张成——每一步只是减掉已有方向上的影子——所以对每个 $k$，
$$
\operatorname{span}\{\mathbf{e}_1, \dots, \mathbf{e}_k\} = \operatorname{span}\{\mathbf{b}_1, \dots, \mathbf{b}_k\}.
$$
特别地 $\mathbf{e}_1, \dots, \mathbf{e}_n$ 仍是 $V$ 的一组基：任何 $\mathbf{v}$ 都能用它展开，任何 $\varphi$ 也由它在 $\mathbf{e}_i$ 上的取值唯一决定. 换基只是换计算用的坐标尺，被表示的那批线性泛函没有变.

**第二步：在正交基上直接拼出 $\mathbf{w}$.** 令
$$
\mathbf{w} = \varphi(\mathbf{e}_1)\mathbf{e}_1 + \cdots + \varphi(\mathbf{e}_n)\mathbf{e}_n.
$$
对任意 $\mathbf{v} = x_1\mathbf{e}_1 + \cdots + x_n\mathbf{e}_n$，正交基的坐标公式给出 $x_i = \langle \mathbf{v}, \mathbf{e}_i \rangle$，于是
$$
\varphi(\mathbf{v}) = \sum_i x_i \varphi(\mathbf{e}_i)
= \sum_i \langle \mathbf{v}, \mathbf{e}_i \rangle \varphi(\mathbf{e}_i)
= \Bigl\langle \mathbf{v},\ \sum_i \varphi(\mathbf{e}_i)\mathbf{e}_i \Bigr\rangle
= \langle \mathbf{v}, \mathbf{w} \rangle
$$
（最后一步用内积对第二变量的线性）.

**第三步：非正交基自动覆盖.** 上面的论证没有用到 $\mathbf{b}_1, \dots, \mathbf{b}_n$ 的任何特殊性质——它们可以是任意一组基. 正交化只是把"非正交情形"归约成"正交情形"的桥：先在正交基上把 $\mathbf{w}$ 拼出来；因为两组基张成同一个空间，这个 $\mathbf{w}$ 对整个 $V$ 都有效.

**唯一性.** 若 $\mathbf{w}$、$\mathbf{w}'$ 都满足，相减得 $\langle \mathbf{v}, \mathbf{w} - \mathbf{w}' \rangle = 0$ 对一切 $\mathbf{v}$ 成立. 取 $\mathbf{v} = \mathbf{w} - \mathbf{w}'$，得 $|\mathbf{w} - \mathbf{w}'|^2 = 0$，故 $\mathbf{w} = \mathbf{w}'$. $\blacksquare$
:::

**结构视角（对偶空间）.** 把"取内积"本身看成一个映射：
$$
\Phi: V \to V^{*}, \qquad \Phi(\mathbf{w}) = \langle \,\cdot\,, \mathbf{w} \rangle
$$
（把 $\mathbf{w}$ 送到"和 $\mathbf{w}$ 做内积"这台测量仪）. 它把向量空间的元素一一变成对偶空间里的泛函. 内积对第二变量线性，所以 $\Phi$ 是线性的；若 $\Phi(\mathbf{w}) = \mathbf{0}$，取 $\mathbf{v} = \mathbf{w}$ 得 $|\mathbf{w}|^2 = 0$，故 $\mathbf{w} = \mathbf{0}$——核为零，$\Phi$ 是单射. 又 $\dim V = \dim V^{*}$，有限维里单射即满射：

$$
V \cong V^{*}.
$$

结论因此可以说得更强：能写成"和某个向量做内积"的泛函不是一部分，而是**全部**，并且一一对应. 正交化的证明是这个同构的可计算版本——它顺手告诉你 $\mathbf{w}$ 怎么算出来.

推论：上一章"行读法"里的每一行，其实就是这么一个 $\mathbf{w}$——$(AB)_{ij} = \langle A_{i\cdot}, B_{\cdot j} \rangle$ 说的正是"第 $i$ 行这个泛函作用在第 $j$ 列上". 泛函与向量的对偶，在有限维里由内积实现.

> **几何直觉.** 线性泛函是一台"测量仪"：喂一个向量，读出一个数. Riesz 表示说，有限维里每一台这样的仪器都等价于"往某个固定方向投影"——那个方向就是 $\mathbf{w}$. 第 3 章的"行读法"于是有了画面：$A$ 的每一行是一个测量方向，$A\mathbf{x}$ 的第 $i$ 个分量就是 $\mathbf{x}$ 在第 $i$ 个方向上的读数.

### 转置：由 Riesz 表示定义

第三章的"行读法"说 $A$ 的每一行是一个线性泛函，但没说这个泛函和内积的关系. Riesz 表示立刻给出一台工具：把矩阵"搬到内积的另一边". 这台工具就是转置.

设 $A$ 是 $m \times n$ 矩阵. 固定 $\mathbf{y} \in \mathbb{R}^m$，则 $\mathbf{x} \mapsto \langle A\mathbf{x}, \mathbf{y} \rangle$ 是 $\mathbb{R}^n$ 上的线性泛函. 按 Riesz 表示，存在唯一的 $\mathbf{w}$ 使
$$
\langle A\mathbf{x}, \mathbf{y} \rangle = \langle \mathbf{x}, \mathbf{w} \rangle \quad (\forall \mathbf{x} \in \mathbb{R}^n).
$$

> **定义（转置）** 对每个 $\mathbf{y}$，把上面唯一的 $\mathbf{w}$ 记作 $A^{\mathsf{T}}\mathbf{y}$. 这样得到的映射 $A^{\mathsf{T}}: \mathbb{R}^m \to \mathbb{R}^n$ 叫 $A$ 的转置（也叫伴随），它由
> $$
> \langle A\mathbf{x}, \mathbf{y} \rangle = \langle \mathbf{x}, A^{\mathsf{T}}\mathbf{y} \rangle \quad (\forall \mathbf{x}, \mathbf{y})
> $$
> 唯一确定.

**它是线性的.** 对 $\mathbf{y}_1, \mathbf{y}_2$ 与标量 $a, b$，取 $\mathbf{w} = aA^{\mathsf{T}}\mathbf{y}_1 + bA^{\mathsf{T}}\mathbf{y}_2$，则
$$
\langle \mathbf{x}, \mathbf{w} \rangle
= a\langle A\mathbf{x}, \mathbf{y}_1 \rangle + b\langle A\mathbf{x}, \mathbf{y}_2 \rangle
= \langle A\mathbf{x},\ a\mathbf{y}_1 + b\mathbf{y}_2 \rangle,
$$
由 Riesz 表示的唯一性，$\mathbf{w} = A^{\mathsf{T}}(a\mathbf{y}_1 + b\mathbf{y}_2)$.

**元素公式：行列互换.** 想知道 $A^{\mathsf{T}}$ 的第 $i$ 行第 $j$ 列是什么，用一对基向量当探针，把定义等式读三遍：
$$
(A^{\mathsf{T}})_{ij}
= \langle \mathbf{e}_i,\ A^{\mathsf{T}}\mathbf{e}_j \rangle
= \langle A\mathbf{e}_i,\ \mathbf{e}_j \rangle
= a_{ji}.
$$
三个等号分别在说：

- **第一个**：$A^{\mathsf{T}}\mathbf{e}_j$ 是 $A^{\mathsf{T}}$ 的第 $j$ 列，取它的第 $i$ 个分量，就是和 $\mathbf{e}_i$ 做内积（坐标 = 与基向量的内积）；
- **第二个**：这就是定义等式本身，取 $\mathbf{x} = \mathbf{e}_i$、$\mathbf{y} = \mathbf{e}_j$，作用是把 $A^{\mathsf{T}}$ 从内积的右边搬到左边；
- **第三个**：现在轮到 $A$ 上场——$A\mathbf{e}_i$ 是 $A$ 的第 $i$ 列，它的第 $j$ 个分量正是第 $j$ 行第 $i$ 列的 $a_{ji}$.

拿一个具体的矩阵验证，$A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$，取 $i = 1$、$j = 2$，也就是预期中 $A^{\mathsf{T}} = \begin{bmatrix} 1 & 3 \\ 2 & 4 \end{bmatrix}$ 的第一行第二列：

$$
(A^{\mathsf{T}})_{12}
= \langle \mathbf{e}_1, A^{\mathsf{T}}\mathbf{e}_2 \rangle
= \langle A\mathbf{e}_1, \mathbf{e}_2 \rangle
= \langle (1, 3),\ (0, 1) \rangle = 3 = a_{21}.
$$

两步都没有玄机：$\langle \mathbf{e}_1, A^{\mathsf{T}}\mathbf{e}_2 \rangle$ 取的是 $A^{\mathsf{T}}\mathbf{e}_2$ 的第一个坐标，$\langle A\mathbf{e}_1, \mathbf{e}_2 \rangle$ 读的是 $A\mathbf{e}_1$ 的第二个坐标——"行列互换"就是在这两步之间自然发生的. 更一般地说，取基向量当探针之后，转置的定义被迫给出"第 $i$ 行第 $j$ 列是 $a_{ji}$"这条机械规则；它不是约定，是标准的必然结果.

**特例：向量的转置乘另一个向量就是内积.** 列向量 $\mathbf{x}$ 是 $n \times 1$ 矩阵，它的转置 $\mathbf{x}^{\mathsf{T}}$ 是 $1 \times n$ 行矩阵. 按矩阵乘法，
$$
\mathbf{x}^{\mathsf{T}}\mathbf{y}
= \begin{bmatrix} x_1 & \cdots & x_n \end{bmatrix}
\begin{bmatrix} y_1 \\ \vdots \\ y_n \end{bmatrix}
= \bigl[\, x_1y_1 + \cdots + x_ny_n \,\bigr]
= \bigl[\, \langle \mathbf{x}, \mathbf{y} \rangle \,\bigr].
$$
右边是 $1 \times 1$ 矩阵，它的唯一元素就是内积. 此后把内积写成 $\mathbf{x}^{\mathsf{T}}\mathbf{y}$ 是常规操作——伴随的推导与高维内积的计算都用这个写法. 顺带分清两个形状完全不同的东西：$\mathbf{x}^{\mathsf{T}}\mathbf{y}$ 是 $1 \times 1$（内积），$\mathbf{x}\mathbf{y}^{\mathsf{T}}$ 是 $n \times n$（外积），别混.

**性质**，每一条都只用定义等式加 Riesz 唯一性：

- $(A^{\mathsf{T}})^{\mathsf{T}} = A$：把定义等式对调 $\mathbf{x}, \mathbf{y}$ 读一遍，$\langle A^{\mathsf{T}}\mathbf{y}, \mathbf{x} \rangle = \langle \mathbf{y}, A\mathbf{x} \rangle$，唯一性即得；
- $(A + B)^{\mathsf{T}} = A^{\mathsf{T}} + B^{\mathsf{T}}$、$(aA)^{\mathsf{T}} = aA^{\mathsf{T}}$：两边都是同一个泛函的 Riesz 向量，唯一性保证相等；
- $(AB)^{\mathsf{T}} = B^{\mathsf{T}}A^{\mathsf{T}}$：连续搬两次，
  $$
  \langle AB\mathbf{x}, \mathbf{y} \rangle
  = \langle B\mathbf{x}, A^{\mathsf{T}}\mathbf{y} \rangle
  = \langle \mathbf{x}, B^{\mathsf{T}}A^{\mathsf{T}}\mathbf{y} \rangle,
  $$
  顺序反过来是搬运顺序的自然结果；
- $(M^{-1})^{\mathsf{T}} = (M^{\mathsf{T}})^{-1}$：$MM^{-1} = I$ 两边转置，用乘积规则得 $(M^{-1})^{\mathsf{T}}M^{\mathsf{T}} = I$，故 $(M^{-1})^{\mathsf{T}}$ 是 $M^{\mathsf{T}}$ 的逆.

**回到行读法.** $A$ 的第 $i$ 行（作为线性泛函）对应的 Riesz 向量是 $A^{\mathsf{T}}\mathbf{e}_i$，也就是 $A^{\mathsf{T}}$ 的第 $i$ 列、即 $A$ 第 $i$ 行的转置. 第三章的 $(AB)_{ij} = \langle A_{i\cdot}, B_{\cdot j} \rangle$ 到此完全说通：行的泛函作用在列向量上，就是这两个向量的内积.

## 实验：投影与正交化

第一个实验有两个模式，右侧读数实时更新.

1. 投影模式：绿色粗线是 $\mathbf{v}$ 在 $\mathbf{u}$ 上的投影，白色虚线是残差，直角标记表示两者垂直. 拖动 $\mathbf{u}$、$\mathbf{v}$，观察内积为负时投影跑到 $\mathbf{u}$ 的反方向.
2. 点「斜」预设把 $\mathbf{u}$ 转到 $(1.5, 1)$，看系数 $t$ 与投影长度怎么变.
3. 切到正交化模式：把 $\mathbf{b}$ 拖过 $\mathbf{a}$ 所在的直线，$\mathbf{b}_\perp$ 会缩成零——共线的向量正交化不出第二个方向.

<OrthogonalProjection />

**第二个实验：三维 Gram–Schmidt.** 把正文的三维例子转起来：

4. 拖空白处旋转视角（双击复位）；拖三个向量的端点可以改输入，也可以换预设.
5. 点「下一步」逐步走：e₁ 归一化 → a₂ 减影子出 b₂、e₂ → 淡蓝平面是 e₁、e₂ 张成的平面 → a₃ 减掉平面上的全部影子得 b₃、e₃.
6. 「共面」「共线」预设看退化：b₃ = 0 或 b₂ = 0——算法当场报告线性相关.

<GramSchmidt3D />

## 习题

1. 计算 $\mathbb{R}^4$ 中 $\langle (1,2,0,1),\, (3,0,-1,2) \rangle$；这两个向量正交吗？
2. 求 $\mathbf{v} = (3,4)$ 在 $\mathbf{u} = (1,0)$ 与 $\mathbf{u} = (1,1)$ 上的投影.
3. 用 Gram–Schmidt 把 $\mathbf{a} = (1,1)$、$\mathbf{b} = (2,0)$ 正交化，与正文的手算对照.
4. 设 $\varphi(x, y) = 3x - y$. 求 $\mathbf{w}$ 使 $\varphi(\mathbf{v}) = \langle \mathbf{v}, \mathbf{w} \rangle$，并验证.
5. 证明：两两正交的非零向量组线性无关（先自己写，再对正文的折叠证明）.
6. 求 $\mathbf{v} = (4,0)$ 在正交基 $\mathbf{u}_1 = (1,1)$、$\mathbf{u}_2 = (1,-1)$ 下的坐标.
7. 设 $V$ 是有限维内积空间，$\mathbf{u}_1, \dots, \mathbf{u}_n$ 是一组标准正交基，$\varphi$ 是线性泛函. 证明 $\mathbf{w} = \varphi(\mathbf{u}_1)\mathbf{u}_1 + \cdots + \varphi(\mathbf{u}_n)\mathbf{u}_n$ 满足 $\varphi(\mathbf{v}) = \langle \mathbf{v}, \mathbf{w} \rangle$，并说明这就是 Riesz 定理在抽象空间里的证明.
8. 用 $A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$、$\mathbf{x} = (1, 1)$、$\mathbf{y} = (2, -1)$ 验证 $\langle A\mathbf{x}, \mathbf{y} \rangle = \langle \mathbf{x}, A^{\mathsf{T}}\mathbf{y} \rangle$.
9. 对 $\mathbf{a}_1 = (1,1,1)$、$\mathbf{a}_2 = (1,1,0)$、$\mathbf{a}_3 = (1,0,0)$ 做 Gram–Schmidt，验证输出两两正交.

::: details 参考答案

**1.** $\langle (1,2,0,1), (3,0,-1,2) \rangle = 3 + 0 + 0 + 2 = 5 \ne 0$，不正交.

**2.** 在 $(1,0)$ 上：$t = 3/1 = 3$，投影 $(3,0)$. 在 $(1,1)$ 上：$t = (3+4)/2 = 3.5$，投影 $(3.5, 3.5)$，残差 $(-0.5, 0.5)$，确实与 $(1,1)$ 正交（内积为 $0$）.

**3.** $\mathbf{e}_1 = (1,1)/\sqrt{2}$；$\langle \mathbf{b}, \mathbf{e}_1 \rangle = \sqrt{2}$；$\mathbf{b}_\perp = (2,0) - (1,1) = (1,-1)$；$\mathbf{e}_2 = (1,-1)/\sqrt{2}$. 与正文一致.

**4.** 由 Riesz 表示的存在性构造，$\mathbf{w} = (\varphi(1,0), \varphi(0,1)) = (3, -1)$. 验证：$\langle (x,y), (3,-1) \rangle = 3x - y = \varphi(x,y)$.

**5.** 见正文折叠证明：与 $\mathbf{u}_j$ 作内积，把交叉项全部消掉，只剩 $c_j|\mathbf{u}_j|^2 = 0$.

**6.** 坐标是 $\dfrac{\langle \mathbf{v}, \mathbf{u}_1 \rangle}{\langle \mathbf{u}_1, \mathbf{u}_1 \rangle} = \dfrac{4}{2} = 2$ 与 $\dfrac{\langle \mathbf{v}, \mathbf{u}_2 \rangle}{\langle \mathbf{u}_2, \mathbf{u}_2 \rangle} = \dfrac{4}{2} = 2$，即 $(2, 2)$. 验证：$2(1,1) + 2(1,-1) = (4,0)$.

**7.** 把 $\mathbf{v}$ 在标准正交基下展开：$\mathbf{v} = x_1\mathbf{u}_1 + \cdots + x_n\mathbf{u}_n$，其中 $x_i = \langle \mathbf{v}, \mathbf{u}_i \rangle$（正交基坐标公式）. 于是
$$
\varphi(\mathbf{v}) = \sum_i x_i\varphi(\mathbf{u}_i)
= \sum_i \langle \mathbf{v}, \mathbf{u}_i \rangle \varphi(\mathbf{u}_i)
= \Bigl\langle \mathbf{v},\ \sum_i \varphi(\mathbf{u}_i)\mathbf{u}_i \Bigr\rangle
= \langle \mathbf{v}, \mathbf{w} \rangle,
$$
倒数第二步用了内积对第二变量的线性与 $\langle \mathbf{v}, \mathbf{u}_i \rangle$ 是标量. 这就是抽象空间里 Riesz 定理的存在性证明；唯一性同正文（取 $\mathbf{v} = \mathbf{w} - \mathbf{w}'$）.

**8.** $A\mathbf{x} = (3, 7)$，$\langle A\mathbf{x}, \mathbf{y} \rangle = 3 \cdot 2 + 7 \cdot (-1) = -1$. $A^{\mathsf{T}}\mathbf{y} = (1 \cdot 2 + 3 \cdot (-1),\ 2 \cdot 2 + 4 \cdot (-1)) = (-1, 0)$，$\langle \mathbf{x}, A^{\mathsf{T}}\mathbf{y} \rangle = 1 \cdot (-1) + 1 \cdot 0 = -1$. 两边相等.

**9.** $\mathbf{e}_1 = \frac{1}{\sqrt{3}}(1,1,1)$；$\langle \mathbf{a}_2, \mathbf{e}_1 \rangle = \frac{2}{\sqrt{3}}$，$\mathbf{b}_2 = (1,1,0) - \frac{2}{3}(1,1,1) = (\frac{1}{3}, \frac{1}{3}, -\frac{2}{3})$，$\mathbf{e}_2 = \frac{1}{\sqrt{6}}(1,1,-2)$；$\langle \mathbf{a}_3, \mathbf{e}_1 \rangle = \frac{1}{\sqrt{3}}$、$\langle \mathbf{a}_3, \mathbf{e}_2 \rangle = \frac{1}{\sqrt{6}}$，$\mathbf{b}_3 = (1,0,0) - \frac{1}{3}(1,1,1) - \frac{1}{6}(1,1,-2) = (\frac{1}{2}, -\frac{1}{2}, 0)$，$\mathbf{e}_3 = \frac{1}{\sqrt{2}}(1,-1,0)$. 验证：$\mathbf{e}_1 \cdot \mathbf{e}_2 = \frac{1+1-2}{\sqrt{18}} = 0$，$\mathbf{e}_1 \cdot \mathbf{e}_3 = \frac{1-1+0}{\sqrt{6}} = 0$，$\mathbf{e}_2 \cdot \mathbf{e}_3 = \frac{1-1+0}{\sqrt{12}} = 0$ ✓.

:::

## 交叉

- 机器学习：方向导数等于梯度与方向向量的内积；注意力权重是查询与键的内积再过 softmax；投影是最小二乘与 PCA 的几何核心.
- 矩阵分析：QR 分解就是 Gram–Schmidt 的矩阵形式；正交矩阵是保内积的变换；SVD 在每个正交方向上找拉伸倍数.
- 概率与信息论：协方差可以看成一个内积（随机变量之间的"夹角"），相关系数就是余弦.

## 延伸

下一章《行列式：体积与可逆性》会把第一章的面积缩放率扩展成 $n$ 维的体积比，届时"可逆 $\iff \det \ne 0$"可以完整证明. 内积空间的一般理论是泛函分析的起点：有限维的 Riesz 表示已经证完，无限维情形（希尔伯特空间的 Riesz 表示定理）需要完备性，是泛函分析的中心定理之一.
