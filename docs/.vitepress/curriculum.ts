export interface Unit {
  id: string
  title: string
  track: TrackId
  level: 100 | 200 | 300
  summary: string
  prereq: string[]
  cross: string[]
  chapters: string[]
}

export type TrackId = 'math' | 'arch' | 'ml' | 'cross'

export const tracks: { id: TrackId; title: string; palette: string; blurb: string }[] = [
  {
    id: 'math',
    title: '数学',
    palette: 'cyan',
    blurb: '从高中数学出发，补齐线性代数、微积分、概率与信息论.'
  },
  {
    id: 'arch',
    title: '体系结构',
    palette: 'green',
    blurb: '从数字逻辑到操作系统与网络，理解机器真实的样子.'
  },
  {
    id: 'ml',
    title: '机器学习',
    palette: 'violet',
    blurb: '从梯度下降到 Transformer 与 Diffusion，全部配可交互实验.'
  },
  {
    id: 'cross',
    title: '交叉专题',
    palette: 'mono',
    blurb: '体系结构与机器学习的真正交点：GEMM、推理与训练基础设施.'
  }
]

export const units: Unit[] = [
  {
    id: 'linear-algebra',
    title: '线性代数',
    track: 'math',
    level: 100,
    summary: '从线性方程组出发，把矩阵理解为线性映射，建立空间视角.',
    prereq: [],
    cross: ['ml/gradient-descent', 'cross/gemm-optimization'],
    chapters: [
      '从线性方程组到空间结构',
      '向量空间、基与维数',
      '线性映射与矩阵表示',
      '内积、正交与投影',
      '行列式：体积与可逆性',
      '四个基本子空间',
      '特征值与对角化',
      '二次型与正定矩阵'
    ]
  },
  {
    id: 'calculus',
    title: '微积分',
    track: 'math',
    level: 100,
    summary: '从高中导数出发，补上极限的严格化与积分，直到多元微分与链式法则.',
    prereq: [],
    cross: ['ml/gradient-descent', 'probability'],
    chapters: [
      '高中导数的回顾：它解决了什么、掩盖了什么',
      '极限与连续',
      '导数：严格化与线性逼近',
      '积分与微积分基本定理',
      '泰勒展开',
      '多元微分与链式法则',
      '多元积分'
    ]
  },
  {
    id: 'vector-analysis',
    title: '向量分析',
    track: 'math',
    level: 200,
    summary: '场论三算子与三大定理，以及它为什么是理解高维世界的地图.',
    prereq: ['calculus'],
    cross: ['ml/diffusion'],
    chapters: [
      '向量场',
      '梯度、散度、旋度',
      '线积分与保守场',
      '格林、高斯、斯托克斯定理',
      '为什么机器学习要学场论'
    ]
  },
  {
    id: 'matrix-analysis',
    title: '矩阵分析',
    track: 'math',
    level: 200,
    summary: '范数、分解与矩阵微积分：反向传播与 SVD 的数学底座.',
    prereq: ['linear-algebra'],
    cross: ['ml/backpropagation', 'cross/gemm-optimization'],
    chapters: [
      '向量与矩阵范数',
      'LU、QR 与 Cholesky 分解',
      'SVD 与低秩逼近',
      '谱定理与条件数',
      '矩阵微积分',
      '广义逆与最小二乘'
    ]
  },
  {
    id: 'probability',
    title: '概率论',
    track: 'math',
    level: 100,
    summary: '从古典概型重新起课：概率空间、随机变量、分布与马尔可夫链.',
    prereq: ['calculus'],
    cross: ['ml/diffusion', 'information-theory'],
    chapters: [
      '古典概型的严格化：样本空间与事件代数',
      '概率公理、条件概率与 Bayes',
      '随机变量与分布列',
      '期望、方差、协方差',
      '连续型随机变量与密度',
      '大数定律与中心极限定理',
      '多元分布与高斯分布',
      '马尔可夫链'
    ]
  },
  {
    id: 'information-theory',
    title: '信息论',
    track: 'math',
    level: 200,
    summary: '熵、互信息与 KL 散度：损失函数背后的度量.',
    prereq: ['probability'],
    cross: ['ml/mlp', 'ml/diffusion'],
    chapters: [
      '熵：不确定性的度量',
      '联合熵、条件熵与互信息',
      'KL 散度与交叉熵',
      '最大熵原理',
      '信源编码与信道容量',
      '信息论与机器学习'
    ]
  },
  {
    id: 'discrete-math',
    title: '离散数学',
    track: 'math',
    level: 100,
    summary: '集合、逻辑、组合、图论与布尔代数：体系结构线的数学入口.',
    prereq: [],
    cross: ['arch/organization', 'arch/networking'],
    chapters: [
      '集合与逻辑',
      '关系与函数',
      '组合计数与二项式定理',
      '图论',
      '布尔代数与逻辑门',
      '自动机与可计算性初步'
    ]
  },
  {
    id: 'organization',
    title: '组成原理',
    track: 'arch',
    level: 100,
    summary: '从逻辑门到流水线与存储层次，机器如何执行一条指令.',
    prereq: ['discrete-math'],
    cross: ['cross/gemm-optimization', 'cross/transformer-inference'],
    chapters: [
      '数字逻辑：门与电路',
      '数的表示：补码与浮点',
      '指令集与 RISC-V',
      '数据通路与控制器',
      '流水线：冒险、转发与分支预测',
      '存储层次与 Cache',
      '虚拟内存',
      '并行性：ILP、多核与 SIMD'
    ]
  },
  {
    id: 'os',
    title: '操作系统',
    track: 'arch',
    level: 100,
    summary: '进程、内存、文件与虚拟化：抽象与资源管理的故事.',
    prereq: ['organization'],
    cross: ['cross/training-in-containers'],
    chapters: [
      '操作系统是什么',
      '进程与线程',
      '调度',
      '并发与同步',
      '死锁',
      '内存管理',
      '文件系统',
      'I/O 与中断',
      '虚拟化与容器'
    ]
  },
  {
    id: 'networking',
    title: '网络常识',
    track: 'arch',
    level: 100,
    summary: '分层、IP、TCP 与 HTTP：数据如何穿过互联网.',
    prereq: ['discrete-math'],
    cross: [],
    chapters: [
      '分层的动机',
      '链路层：以太网与交换机',
      '网络层、子网与路由',
      '传输层：TCP 与 UDP',
      '应用层：DNS 与 HTTP',
      '抓包实验',
      '从网络到分布式'
    ]
  },
  {
    id: 'gradient-descent',
    title: '梯度下降',
    track: 'ml',
    level: 200,
    summary: '从方向导数推导最速下降，直到动量与自适应方法.',
    prereq: ['calculus', 'linear-algebra'],
    cross: ['math/calculus'],
    chapters: [
      '优化问题：解析解与迭代解',
      '梯度：最速下降方向',
      '学习率与收敛直觉',
      '随机梯度下降与 mini-batch',
      '动量与自适应方法',
      '二阶方法简介'
    ]
  },
  {
    id: 'backpropagation',
    title: '反向传播',
    track: 'ml',
    level: 200,
    summary: '计算图、链式法则与自动微分：深度学习的地基.',
    prereq: ['gradient-descent', 'matrix-analysis'],
    cross: ['math/matrix-analysis'],
    chapters: [
      '计算图',
      '链式法则的两种模式',
      '反向模式自动微分',
      '手推两层网络',
      '实现迷你 autograd',
      '梯度检查与数值稳定'
    ]
  },
  {
    id: 'mlp',
    title: '多层感知机',
    track: 'ml',
    level: 200,
    summary: '非线性、损失与正则化：第一个真正能学的模型.',
    prereq: ['backpropagation'],
    cross: ['math/information-theory'],
    chapters: [
      '从线性模型到非线性',
      '激活函数',
      '万能逼近定理',
      '损失函数：MSE 与交叉熵',
      '过拟合与正则化',
      '训练技巧'
    ]
  },
  {
    id: 'rnn',
    title: 'RNN',
    track: 'ml',
    level: 200,
    summary: '序列建模、BPTT 与梯度消失：注意力之前的语言模型.',
    prereq: ['mlp'],
    cross: ['math/matrix-analysis'],
    chapters: [
      '序列建模的动机',
      'RNN 结构与展开',
      '时间反向传播',
      '梯度消失与爆炸',
      'LSTM 与 GRU',
      '语言模型初步'
    ]
  },
  {
    id: 'cnn',
    title: 'CNN',
    track: 'ml',
    level: 200,
    summary: '局部性与平移不变性：卷积核、感受野与架构演进.',
    prereq: ['mlp'],
    cross: ['arch/organization'],
    chapters: [
      '局部性与平移不变性',
      '卷积运算',
      '池化与感受野',
      '参数效率对比',
      '经典架构演进',
      '卷积的等变视角'
    ]
  },
  {
    id: 'transformer',
    title: 'Transformer',
    track: 'ml',
    level: 300,
    summary: '注意力机制到完整架构，以及它为什么统治了语言模型.',
    prereq: ['mlp'],
    cross: ['arch/organization', 'rnn', 'cnn', 'cross/transformer-inference'],
    chapters: [
      '从 RNN 的串行瓶颈到注意力',
      '注意力机制：查询、键、值',
      '多头自注意力',
      '位置编码',
      '架构组件：残差、LayerNorm 与前馈',
      '复杂度与效率'
    ]
  },
  {
    id: 'diffusion',
    title: 'Diffusion',
    track: 'ml',
    level: 300,
    summary: '从加噪到去噪：扩散模型如何学会生成.',
    prereq: ['probability', 'gradient-descent'],
    cross: ['math/information-theory', 'math/vector-analysis'],
    chapters: [
      '生成模型谱系',
      '前向过程：加噪为马尔可夫链',
      '反向去噪与训练目标',
      '采样：从 DDPM 到 DDIM',
      '与分数匹配、SDE 的联系',
      '条件生成'
    ]
  },
  {
    id: 'gemm-optimization',
    title: 'GEMM 优化',
    track: 'cross',
    level: 300,
    summary: '从朴素三重循环到分块、向量化：矩阵乘法的性能考古.',
    prereq: ['matrix-analysis', 'organization'],
    cross: [],
    chapters: [
      '朴素三重循环',
      '内存层级与分块',
      'SIMD 与向量化',
      '多核与基准测试'
    ]
  },
  {
    id: 'transformer-inference',
    title: 'Transformer 推理',
    track: 'cross',
    level: 300,
    summary: 'KV Cache、FlashAttention 与量化：把注意力跑快的工程手段.',
    prereq: ['transformer', 'organization'],
    cross: [],
    chapters: ['KV Cache', '注意力 IO 与 FlashAttention', '量化', '批处理与吞吐']
  },
  {
    id: 'training-in-containers',
    title: '容器里跑训练',
    track: 'cross',
    level: 300,
    summary: '用 Podman 搭建可复现的训练环境：GPU 直通、数据卷与镜像.',
    prereq: ['os'],
    cross: ['ml/gradient-descent'],
    chapters: ['容器基础与 Podman', 'GPU 直通', '数据卷与镜像', '可复现的训练环境']
  }
]

export function unitsOf(track: TrackId): Unit[] {
  return units.filter((u) => u.track === track)
}

export function unitById(id: string): Unit | undefined {
  return units.find((u) => u.id === id)
}

export function urlOf(unit: Unit): string {
  return `/${unit.track}/${unit.id}/`
}
