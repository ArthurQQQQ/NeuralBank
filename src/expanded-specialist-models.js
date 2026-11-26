// Original-paper mechanisms with deliberately small teaching configurations.
// Every entry has five conceptual modules, not necessarily five sequential layers.
// Graph rows are nodes; temporal/spatial dimensions omit the batch axis.
const specialistPaper = (id, label) => ({ label, url: `https://arxiv.org/abs/${id}` });

export const expandedSpecialistModels = [
  {
    id: 's4', name: 'S4', fullName: '结构化状态空间序列模型', category: 'sequence',
    year: 2021, yearNote: 'Gu 等的 S4 预印本；ICLR 2022 发表', level: '深入',
    prerequisites: ['rnn'], learningGoal: '能把线性状态递推展开成卷积核，并解释 S4 的结构化参数作用。',
    tagline: '同一条线性状态方程，可以递推，也可以卷积。',
    description: 'S4 用特殊结构参数化连续状态矩阵，并高效构造长卷积核。本图只展示长度 8、单输入单输出、4 维状态的线性核心；完整深层网络还包含通道混合与非线性。',
    input: '8 × 1 标量序列', output: '8 × 1 输出序列',
    formula: 'hₜ = Āhₜ₋₁ + B̄uₜ,  Kₖ = CĀᵏB̄,  y = K ∗ u + Du',
    formulaExplanation: '零初态下，固定 Ā、B̄、C 的递推等价于因果卷积。S4 从连续 A、B 以步长 Δ 做双线性离散化；D 是直接输入通路。',
    keyPoints: ['原始 S4 使用 normal-plus-low-rank 结构及 HiPPO 初始化，核心不只是任意稠密矩阵。', '整段序列可用卷积并行计算；逐步生成可使用同一系统的递推形式。', '固定有限状态仍压缩历史；长感受范围不等于无损保存任意输入。'],
    pitfall: '离散化和卷积核构造是参数到算子的准备过程，不是每个 token 都串行执行的三个额外神经层。',
    quiz: { question: '这里为何能用一条固定卷积核替代状态递推？', options: ['系统是线性且时间不变的', '隐藏状态一定等于输入', '所有参数都随当前输入变化', '卷积不需要边界条件'], answer: 0, explanation: '固定线性递推、固定读出及零初态可以展开成 Kₖ = CĀᵏB̄；输入依赖参数一般不再给出固定卷积核。' },
    layers: [
      { id: 'input', label: '输入序列', detail: '接收 8 个标量 u₀…u₇，教学初态 h₋₁ = 0；一个通道对应一个 4 维状态。', shape: '8 × 1' },
      { id: 'structured', label: '结构化状态空间', detail: 'A 为 4 × 4，B 为 4 × 1，C 为 1 × 4；原方法利用 normal-plus-low-rank 表示组织 A。', shape: '状态 4；A: 4 × 4' },
      { id: 'discretize', label: '双线性离散化', detail: 'Ā = (I−ΔA/2)⁻¹(I+ΔA/2)，B̄ = (I−ΔA/2)⁻¹ΔB；这是离散算子的构造。', shape: 'Ā: 4 × 4；B̄: 4 × 1' },
      { id: 'kernel', label: '构造长卷积核', detail: '生成 K₀…K₇，其中 Kₖ = CĀᵏB̄；实际 S4 使用结构化算法，避免逐项稠密矩阵幂。', shape: 'K: 8' },
      { id: 'output', label: '输出序列', detail: '对输入做长度保持的因果卷积，再加逐点 Du；也可逐步更新 4 维状态得到相同线性输出。', shape: '8 × 1' }
    ],
    references: [specialistPaper('2111.00396', 'Gu et al. · Efficiently Modeling Long Sequences with Structured State Spaces')]
  },
  {
    id: 'mamba', name: 'Mamba', fullName: '选择性状态空间模型', category: 'sequence',
    year: 2023, yearNote: 'Gu 与 Dao 的 Mamba 原始预印本；本条不是 Mamba-2 或 Mamba-3', level: '深入',
    prerequisites: ['s4'], learningGoal: '能说明哪些参数依赖输入，以及为何选择性扫描不等于固定长卷积。',
    tagline: '让当前输入决定，什么写进状态、什么被读出来。',
    description: 'Mamba 将选择性状态空间嵌入门控块。本例模型宽 4、内部宽 8、每通道状态 4，局部因果卷积核宽 3；展示一个核心块，省略块外归一化和残差。',
    input: '8 × 4 token 表示', output: '8 × 4 更新表示',
    formula: 'hₜ = Āₜhₜ₋₁ + B̄ₜuₜ,  yₜ = Cₜhₜ + Duₜ',
    formulaExplanation: '省略通道索引后写出递推；Δₜ、Bₜ、Cₜ 来自当前输入，Āₜ、B̄ₜ由离散化得到。基础 A 和直接通路 D 仍是学习到的输入无关参数。',
    keyPoints: ['输入依赖的写入、读出与步长，使模型能按内容选择信息。', '参数随时间变化后通常不能共享一条固定卷积核，原方法使用硬件感知的选择性扫描。', '状态大小固定并不保证任意精确检索；线性长度复杂度也不代表所有硬件和长度都更快。'],
    pitfall: '不能把原始 Mamba 的所有矩阵都说成输入依赖，也不能把它的短因果卷积混同于整个选择性 SSM。',
    quiz: { question: '相对固定参数 S4，Mamba 选择性机制的关键是什么？', options: ['存储完整 T × T 注意力矩阵', '让步长、写入和读出参数依赖输入', '强制删除所有历史', '只用一条固定长卷积核'], answer: 1, explanation: '原始选择性 SSM 让 Δ、B、C 随输入变化；这改变了状态保留、写入与读出的行为。' },
    layers: [
      { id: 'project', label: '输入投影', detail: '每个 4 维输入分成主分支与门控分支；两支都投影到内部宽度 8。', shape: '8 × 4 → 两支 8 × 8' },
      { id: 'conv', label: '因果卷积与激活', detail: '主支做核宽 3 的逐通道因果卷积，左侧补零，再用 SiLU；门控支保留供最后混合。', shape: '8 × 8' },
      { id: 'selection', label: '输入依赖参数', detail: '从主支生成每步 Δₜ:8、Bₜ:4、Cₜ:4；B、C 在内部通道间共享，A:8 × 4 为固定学习参数。', shape: '每步 Δ:8，B/C:各4' },
      { id: 'scan', label: '选择性扫描', detail: '各内部通道维护 4 维状态，按输入依赖离散参数更新，再读出 8 维 yₜ并加直接输入项。', shape: '状态 8 × 4；读出 8' },
      { id: 'output', label: '门控与输出投影', detail: '读出与门控支的 SiLU 值逐元素相乘，再用 Linear(8,4) 回到模型宽度。', shape: '8 × 4' }
    ],
    references: [specialistPaper('2312.00752', 'Gu & Dao · Mamba: Linear-Time Sequence Modeling with Selective State Spaces')]
  },
  {
    id: 'gcn', name: 'GCN', fullName: '图卷积网络', category: 'graph',
    year: 2017, yearNote: 'Kipf 与 Welling 的 ICLR 2017 论文；预印本始于 2016', level: '进阶',
    prerequisites: ['mlp'], learningGoal: '能区分邻接归一化、节点特征聚合与通道线性变换。',
    tagline: '沿图上的边，把邻居特征平滑地汇聚到自己。',
    description: '这里采用 Kipf–Welling 的对称归一化传播。本图有 5 个节点、每节点 3 维特征；一个 3→4 的 GCN 层后接额外的 2 类节点分类头，不是完整原论文配置。',
    input: '节点 X:5 × 3；无向邻接 A:5 × 5', output: '5 × 2 节点类别概率',
    formula: 'H′ = ReLU(D̃⁻¹ᐟ²(A + I)D̃⁻¹ᐟ²HW)',
    formulaExplanation: 'D̃ 由加自环后的 A+I 计算。归一化矩阵沿节点轴混合，W:3 × 4 沿特征轴变换；两种操作不可混为一谈。',
    keyPoints: ['自环让节点在聚合时保留自身特征。', '一层传播使用一跳邻域；堆叠多层才扩展到更远节点。', '邻接结构与特征一起决定结果；深层传播可能过度平滑，也受图的同配性影响。'],
    pitfall: '图卷积不是在节点编号构成的二维网格上做普通卷积；重排节点时，邻接和特征必须同步重排。',
    quiz: { question: '若有 5 个节点、每个节点 3 维特征，W 是 3 × 4，输出隐藏表示的形状是什么？', options: ['3 × 5', '5 × 4', '4 × 3', '5 × 5 × 4'], answer: 1, explanation: '邻接传播保留节点数 5，特征线性变换把每个节点从 3 维映射到 4 维。' },
    layers: [
      { id: 'nodes', label: '节点特征', detail: '5 行分别对应节点，每行 3 个属性；A 记录节点之间是否有边。', shape: 'X:5 × 3；A:5 × 5' },
      { id: 'normalize', label: '加自环与归一化', detail: '构造 Ã=A+I，再用自身度矩阵得到 Â=D̃⁻¹ᐟ²ÃD̃⁻¹ᐟ²。', shape: 'Â:5 × 5' },
      { id: 'aggregate', label: '邻居聚合', detail: '计算 ÂX，节点从自身和邻居接收归一化加权的 3 维特征。', shape: '5 × 3' },
      { id: 'update', label: '线性变换与激活', detail: '乘共享 W:3 × 4 后做 ReLU；所有节点使用相同的特征变换。', shape: '5 × 4' },
      { id: 'output', label: '节点预测', detail: '额外 Linear(4,2) 与逐节点 softmax 给出类别概率；该头本身不再做邻接传播。', shape: '5 × 2' }
    ],
    references: [specialistPaper('1609.02907', 'Kipf & Welling · Semi-Supervised Classification with Graph Convolutional Networks')]
  },
  {
    id: 'gat', name: 'GAT', fullName: '图注意力网络', category: 'graph',
    year: 2018, yearNote: 'Veličković 等的 ICLR 2018 论文；预印本始于 2017', level: '进阶',
    prerequisites: ['gcn', 'transformer'], learningGoal: '能说明注意力在谁的邻域中归一化，并追踪多头拼接维度。',
    tagline: '邻居都能发来信息，但权重由节点特征决定。',
    description: '原始 GAT 在已给定的图邻域上学习加性注意力。本例 5 个节点、3 维输入，使用两个各输出 2 维的头，拼接成 4 维后接节点分类头。',
    input: 'X:5 × 3 与图边', output: '5 × 2 节点类别概率',
    formula: 'eᵢⱼ = LeakyReLU(aᵀ[Whᵢ ∥ Whⱼ]),  αᵢⱼ = softmaxⱼ(eᵢⱼ)',
    formulaExplanation: 'j 只遍历 i 的邻居与自身；每头独立计算注意力和加权和，本例将两头的 2 维结果拼接。',
    keyPoints: ['注意力权重依赖特征，邻域掩码仍来自图结构。', '隐藏层多头通常拼接，原论文输出层可平均；必须说明具体采用哪种。', '大邻域仍有计算成本；注意力权重本身不是因果解释或事实证明。'],
    pitfall: '一个头的 softmax 在目标节点的邻域内求和为 1，不是在整个图的所有边上归一化。',
    quiz: { question: '两个注意力头各输出 2 维，采用 concat 后每个节点有多少维？', options: ['2', '4', '5', '10'], answer: 1, explanation: '拼接保留两头各自的坐标，因此维度为 2+2=4；平均才仍是 2 维。' },
    layers: [
      { id: 'project', label: '节点特征投影', detail: '两个头分别用 3→2 的线性投影，把每个节点映射为各自的 2 维表示。', shape: '2 头 × 5 × 2' },
      { id: 'scores', label: '边注意力打分', detail: '对每条邻接边及自环，将目标与邻居的投影拼接，再用共享 a 和 LeakyReLU 打分。', shape: '每头 Ẽ 个标量' },
      { id: 'softmax', label: '邻域 softmax', detail: '固定目标节点 i，在其邻居和自环上分别归一化，得到 αᵢⱼ。', shape: '每头 Ẽ 个权重' },
      { id: 'aggregate', label: '多头聚合', detail: '每头加权汇聚邻居投影并用 ELU，两头沿特征维拼接。', shape: '5 × 4' },
      { id: 'output', label: '节点输出', detail: '教学分类头使用 Linear(4,2) 与逐节点 softmax；不是再把两个头相加。', shape: '5 × 2' }
    ],
    references: [specialistPaper('1710.10903', 'Veličković et al. · Graph Attention Networks')]
  },
  {
    id: 'graphsage', name: 'GraphSAGE', fullName: '采样与聚合的归纳式图表示框架', category: 'graph',
    year: 2017, yearNote: 'Hamilton 等的 NIPS 2017 论文', level: '进阶',
    prerequisites: ['gcn'], learningGoal: '能解释邻居采样与共享聚合函数如何用于未见过的节点。',
    tagline: '学习生成表示的函数，而不是给每个节点背一个编号向量。',
    description: 'GraphSAGE 是采样与聚合框架，不是唯一固定算子。本例采用 mean 聚合：5 个节点各 3 维，每个目标最多采样 2 个邻居，拼接自身与邻居均值后更新为 4 维。',
    input: '节点特征 5 × 3 与采样邻域', output: '5 × 2 节点类别概率',
    formula: 'mᵥ = meanᵤ∈S(v)(hᵤ),  h′ᵥ = σ(W[hᵥ ∥ mᵥ])',
    formulaExplanation: '本例 mᵥ 为 3 维，拼接向量为 6 维，W 映射至 4 维。聚合与更新共享于所有节点；这里不是把自身也混入均值的 GCN-style 变体。',
    keyPoints: ['mean、pooling、LSTM 等聚合器属于不同变体；本页只选 mean。', '采样控制每层访问的邻居数量，但采样会带来信息损失。', '可在有合适特征的新节点上应用共享函数；这不保证跨分布泛化。'],
    pitfall: '归纳式不等于不需要图或节点特征；mean 也可能把不同邻居多重集映射为相同表示。',
    quiz: { question: '本例自身特征 3 维、邻居均值 3 维，拼接后的共享更新层输入为几维？', options: ['3', '5', '6', '9'], answer: 2, explanation: 'concat 把自身和邻居两份 3 维表示保留下来，得到 6 维，再线性更新到 4 维。' },
    layers: [
      { id: 'sample', label: '目标节点与采样邻居', detail: '对每个目标在邻域中取最多 2 个节点；目标节点自身另走一条分支。', shape: '5 个目标；每目标 ≤2 邻居' },
      { id: 'features', label: '收集邻居特征', detail: '读取自身及被采样邻居的 3 维输入表示；本例 mean 前不额外插入 pooling 变体的 MLP。', shape: '每个被访问节点 3 维' },
      { id: 'mean', label: '邻居均值', detail: '沿邻居轴做逐坐标平均，得到 3 维 mᵥ；本例空邻域约定为零向量。', shape: '5 × 3' },
      { id: 'update', label: '拼接自身与共享更新', detail: '将 [hᵥ,mᵥ] 的 6 维向量经共享 Linear(6,4)、ReLU，再做 L2 归一化；零向量保持为零。', shape: '5 × 4' },
      { id: 'output', label: '节点输出', detail: '额外 Linear(4,2) 与 softmax 进行节点分类；所有目标节点共享此头。', shape: '5 × 2' }
    ],
    references: [specialistPaper('1706.02216', 'Hamilton et al. · Inductive Representation Learning on Large Graphs')]
  },
  {
    id: 'gin', name: 'GIN', fullName: '图同构网络', category: 'graph',
    year: 2019, yearNote: 'Xu 等的 ICLR 2019 论文；预印本始于 2018', level: '深入',
    prerequisites: ['gcn', 'graphsage'], learningGoal: '能用邻居计数例子说明 sum 与 mean 的区别，并说出 1-WL 边界。',
    tagline: '邻居出现多少次，也是一种需要保留的信息。',
    description: 'GIN 用求和聚合与 MLP 更新增强多重集区分能力。本例是 5 个节点、3 维输入的一层 GIN，再做图级求和与二分类；不声称这份小网络实现完整理论上界。',
    input: 'X:5 × 3 与图边', output: '整张图的 2 类概率',
    formula: 'h′ᵥ = MLP((1 + ε)hᵥ + Σᵤ∈N(v) hᵤ)',
    formulaExplanation: 'ε 控制自身项，邻居使用 sum 而非 mean。本例 MLP 为 3→8→4，随后把所有节点表示求和成图表示。',
    keyPoints: ['sum 能保留计数差异；mean 相同并不说明邻居多重集相同。', '原论文的表达力结论需要注入式聚合/读出等条件及足够层数。', '即便达到 1-WL 的区分能力，也不能解决所有图同构情形。'],
    pitfall: 'GIN 的名字不表示任意训练后的有限宽网络都能判定所有图同构；连续特征与实际优化也不能忽略。',
    quiz: { question: '邻居特征为 {1,1} 与 {1,1,1}，哪种聚合能直接保留数量差异？', options: ['mean', 'max', 'sum', '只取第一个邻居'], answer: 2, explanation: '两者 mean 和 max 都为 1，但 sum 分别为 2 和 3；GIN 的理论分析正关注多重集信息。' },
    layers: [
      { id: 'nodes', label: '节点特征', detail: '5 个节点各有 3 维输入；邻接只用于确定消息来自哪些邻居。', shape: '5 × 3' },
      { id: 'sum', label: '邻域求和', detail: '对每个节点的邻居特征逐坐标求和，不除以邻居数量。', shape: '5 × 3' },
      { id: 'self', label: '加权自身相加', detail: '将邻居和与 (1+ε)hᵥ 相加；ε 是可学习或固定的标量约定。', shape: '5 × 3' },
      { id: 'mlp', label: 'MLP 更新', detail: '对每个节点使用共享 3→8→4 的两层 MLP，中间使用 ReLU。', shape: '5 × 4' },
      { id: 'readout', label: '图级读出', detail: '对 5 个节点的 4 维表示求和，再经 Linear(4,2) 和 softmax；原论文也组合不同深度的读出。', shape: '图表示 4 → 类别 2' }
    ],
    references: [specialistPaper('1810.00826', 'Xu et al. · How Powerful are Graph Neural Networks?')]
  },
  {
    id: 'tcn', name: 'TCN', fullName: '时序卷积网络', category: 'sequence',
    year: 2018, yearNote: 'Bai 等的卷积与循环网络系统比较；TCN 并非此时才首次出现', level: '进阶',
    prerequisites: ['cnn', 'resnet'], learningGoal: '能计算因果膨胀卷积的感受范围，并说明残差分支的形状要求。',
    tagline: '沿时间扩张卷积范围，同时严格挡住未来输入。',
    description: 'TCN 组合因果卷积、膨胀与残差。本例为核宽 3、膨胀率依次 1 和 2 的简化两层残差块；原文通常在同一残差块内使用相同膨胀率的两层卷积。',
    input: '16 × 2 时间序列', output: '16 × 1 逐时预测',
    formula: 'y[t] = Σⱼ₌₀ᵏ⁻¹ Wⱼ x[t − d·j]',
    formulaExplanation: 'k 是核宽，d 是膨胀率；只访问 t 及过去。两个 k=3、d=1/2 的步幅 1 卷积给本例 7 个连续时间位置的感受范围。',
    keyPoints: ['仅在左侧补零可保持长度且避免看见未来。', '膨胀率扩大感受范围，不通过下采样缩短序列。', '卷积并行训练不等于无限记忆；有效范围取决于层数、核宽和膨胀率。'],
    pitfall: '“same padding”若对称补零并读取右侧，就可能泄露未来；TCN 的因果性必须由具体索引或裁剪保证。',
    quiz: { question: '本例两个核宽 3、膨胀率 1 与 2 的卷积，感受范围大小是多少？', options: ['3', '5', '7', '16'], answer: 2, explanation: '步幅均为 1，范围为 1+(3−1)×1+(3−1)×2=7；残差捷径不扩大它。' },
    layers: [
      { id: 'input', label: '输入序列', detail: '16 步、每步 2 维；右侧未来值不能进入当前位置的运算。', shape: '16 × 2' },
      { id: 'conv1', label: '因果膨胀卷积 1', detail: 'k=3、d=1、2→4 通道，左补 2 个位置，随后 ReLU。', shape: '16 × 4' },
      { id: 'conv2', label: '因果膨胀卷积 2', detail: 'k=3、d=2、4→4 通道，左补 4 个位置，随后 ReLU。', shape: '16 × 4' },
      { id: 'residual', label: '残差相加', detail: '原输入另经 1 × 1 卷积从 2 通道投影为 4，与主支逐元素相加并激活。', shape: '16 × 4' },
      { id: 'output', label: '逐时输出', detail: '逐点 Linear(4,1) 给每步一个实数预测；这里没有时间池化或未来输入。', shape: '16 × 1' }
    ],
    references: [specialistPaper('1803.01271', 'Bai et al. · An Empirical Evaluation of Generic Convolutional and Recurrent Networks for Sequence Modeling')]
  },
  {
    id: 'wavenet', name: 'WaveNet', fullName: '原始波形自回归生成网络', category: 'sequence',
    year: 2016, yearNote: 'van den Oord 等的 WaveNet 原始论文', level: '进阶',
    prerequisites: ['tcn'], learningGoal: '能区分并行条件概率训练与逐采样点生成，追踪残差和 skip 通路。',
    tagline: '用因果卷积预测，下一个声音采样点的分布。',
    description: 'WaveNet 对波形做自回归建模。本例使用 256 档 μ-law 离散采样、4 个残差通道，以及核宽 2、膨胀率 1/2 的两个块；不是语音合成系统的完整配置。',
    input: '16 个历史离散音频采样值', output: '每位置下一采样的 256 类分布',
    formula: 'p(x₁,…,xT) = ∏ₜ p(xₜ | x₁,…,xₜ₋₁),  z = tanh(Wf ∗ x) ⊙ sigmoid(Wg ∗ x)',
    formulaExplanation: '条件中只包含早于 t 的采样。门控作用在每个膨胀残差块内部，第 2–4 模块会随块重复，并非所有卷积结束后才统一门控。',
    keyPoints: ['因果卷积保证训练时每个位置不看到它要预测的未来采样。', '残差支便于深层传播，skip 支把不同深度的信息送到输出头。', '训练可并行计算已知波形的条件分布；原始生成仍须逐点采样。'],
    pitfall: 'softmax 给出离散幅值分布，不是已经生成的音频；真实生成还需要循环采样，有限卷积栈也只有有限感受范围。',
    quiz: { question: '为什么原始 WaveNet 训练可并行，而生成通常仍逐点进行？', options: ['训练时不使用卷积', '生成时未来采样尚不存在，必须依次得到', '生成时所有 softmax 都相同', '训练不要求因果性'], answer: 1, explanation: '训练已知整段真实历史，可用因果掩码并行；生成下一点依赖已生成历史，尚未出现的采样不能直接使用。' },
    layers: [
      { id: 'waveform', label: '历史波形', detail: '把 16 个 μ-law 类别索引嵌入为 4 维；第 t 位置的表示用于预测 xₜ₊₁。', shape: '16 → 16 × 4' },
      { id: 'dilated', label: '膨胀因果卷积', detail: '两个残差块分别用 k=2、d=1/2 的因果卷积，每块产生 filter 和 gate 两份 4 通道特征。', shape: '每块两支 16 × 4' },
      { id: 'gates', label: '门控激活', detail: '在每个块内分别做 tanh 与 sigmoid，再逐元素相乘，保留长度和通道数。', shape: '每块 16 × 4' },
      { id: 'skip', label: '残差与 skip 汇聚', detail: '每块各用 1 × 1 投影形成残差更新与 skip 输出；两块的 4 通道 skip 相加送往输出头。', shape: '16 × 4' },
      { id: 'distribution', label: '下一采样分布', detail: '经 ReLU 与逐点输出投影得到 256 logits，再 softmax；生成时取最后位置的分布采样并继续。', shape: '16 × 256' }
    ],
    references: [specialistPaper('1609.03499', 'van den Oord et al. · WaveNet: A Generative Model for Raw Audio')]
  },
  {
    id: 'nbeats', name: 'N-BEATS', fullName: '神经基函数展开时序预测', category: 'sequence',
    year: 2019, yearNote: 'Oreshkin 等的 N-BEATS 原始预印本', level: '进阶',
    prerequisites: ['mlp', 'resnet'], learningGoal: '能区分 backcast 的历史残差与 forecast 的未来累加。',
    tagline: '解释一部分过去，再把各块对未来的贡献加起来。',
    description: 'N-BEATS 以全连接块同时输出 backcast 和 forecast。本例取 12 步单变量历史、4 步未来、两个通用块；每块四个宽 16 的 ReLU 层，合并展示等效线性输出头。',
    input: '12 个历史实数', output: '未来 4 步点预测',
    formula: 'xₗ₊₁ = xₗ − bₗ,  ŷ = Σₗ fₗ',
    formulaExplanation: 'bₗ 是长度 12 的 backcast，用来形成下一个块的残差输入；fₗ 是长度 4 的 forecast，跨块相加。两者不在同一时间范围。',
    keyPoints: ['通用版本学习基函数，可解释版本才对趋势和季节性基函数作专门约束。', '历史残差逐块相减，未来预测逐块相加，形成两套残差通路。', '本例是单变量点预测，不自带已知未来协变量或概率区间。'],
    pitfall: 'backcast 不是模型已经看见未来；也不能把任意通用块的中间输出自动解释为真实趋势或因果成分。',
    quiz: { question: '下一块的输入应是什么？', options: ['未来真实标签', '当前历史残差减去该块 backcast', '把 forecast 当作全部历史', '各块预测的最大值'], answer: 1, explanation: 'backcast 用于减去已解释的历史部分；forecast 则加入独立的未来预测累加器。' },
    layers: [
      { id: 'history', label: '历史窗口', detail: '第一块接收最近 12 个观测值，第二块接收相同长度的残差；未来标签不作为输入。', shape: '12' },
      { id: 'fc', label: '全连接块', detail: '四层 ReLU 网络：12→16→16→16→16；输出分别送往 backcast 与 forecast 分支。', shape: '每块隐藏表示 16' },
      { id: 'backcast', label: 'Backcast 回溯', detail: '通用线性输出头将隐藏表示映射为长度 12 的 bₗ；它近似当前块输入。', shape: '12' },
      { id: 'residual', label: '残差输入更新', detail: '计算 xₗ−bₗ 送下一块；本例执行两个块，forecast 分支不参与这次相减。', shape: '12' },
      { id: 'forecast', label: 'Forecast 累加', detail: '每块另用线性头从 16 维产生 4 步预测，将两块 f₁、f₂相加。', shape: '4' }
    ],
    references: [specialistPaper('1905.10437', 'Oreshkin et al. · N-BEATS: Neural basis expansion analysis for interpretable time series forecasting')]
  },
  {
    id: 'tft', name: 'TFT', fullName: '时序融合 Transformer', category: 'sequence',
    year: 2019, yearNote: 'Lim 等的 Temporal Fusion Transformer 原始预印本', level: '深入',
    prerequisites: ['lstm', 'transformer'], learningGoal: '能辨别静态、仅历史可见与未来已知输入，解释变量选择和时间注意力的不同作用。',
    tagline: '把不同可用时刻的信息，送到适合它们的模块。',
    description: 'TFT 组合变量选择、LSTM、静态上下文、门控与可解释注意力。本例历史 12 步、未来 4 步，隐藏宽 8；过去有 3 个动态变量，未来仅提供 1 个事先已知变量。',
    input: '过去 12 × 3；未来已知 4 × 1；静态特征 2', output: '4 步 × 3 个预测分位数',
    formula: 'vₜ = Σⱼ softmax(aₜ)ⱼ GRNⱼ(xₜ,ⱼ),  q̂ₜ,τ = Wτzₜ + bτ',
    formulaExplanation: '第一式是在变量间选择和混合，后续注意力则沿时间轴检索。输出头分别估计 τ=0.1、0.5、0.9 的条件分位数。',
    keyPoints: ['未来已知协变量可来自日历或计划，未来真实目标不能泄露进输入。', '可解释多头注意力共享 value 投影并平均各头，使时间权重更易比较。', '权重与门控提供模型行为线索，不能据此证明因果影响；独立分位数也可能交叉。'],
    pitfall: 'TFT 不等于只给普通 Transformer 加一个名字；变量选择、循环局部处理、静态富集与门控都是不同机制。',
    quiz: { question: '预测未来销量时，哪个量通常可作为“未来已知”输入？', options: ['未来真实销量', '尚未发生的实际观测误差', '已确定的日历星期信息', '测试集预测答案'], answer: 2, explanation: '日历在预测时已知；未来目标和事后误差在当时不可得，使用它们会造成信息泄漏。' },
    layers: [
      { id: 'inputs', label: '静态与时变输入', detail: '过去 12 步有目标、历史观测与已知协变量三类数值；未来 4 步只输入已知协变量，另有 2 维静态特征。', shape: '12 × 3；4 × 1；静态 2' },
      { id: 'selection', label: '变量选择', detail: '将各变量映射为 8 维，经变量选择网络加权组合；静态编码另产生 8 维上下文。', shape: '过去 12 × 8；未来 4 × 8' },
      { id: 'lstm', label: '局部 LSTM', detail: '编码过去并解码未来已知输入，使用静态上下文、门控和富集模块形成时间表示；细节在本模块合并。', shape: '16 × 8' },
      { id: 'attention', label: '可解释自注意力', detail: '未来位置查询过去与可见当前位置；两头共享 4 维 value，平均后投影到 8 维，并保留时间因果掩码。', shape: '未来输出 4 × 8' },
      { id: 'quantiles', label: '分位数预测', detail: '各未来步分别产生 0.1、0.5、0.9 分位数，使用 pinball 损失训练；不保证自动满足单调约束。', shape: '4 × 3' }
    ],
    references: [specialistPaper('1912.09363', 'Lim et al. · Temporal Fusion Transformers for Interpretable Multi-horizon Time Series Forecasting')]
  },
  {
    id: 'patchtst', name: 'PatchTST', fullName: '通道独立的时序 Patch Transformer', category: 'sequence',
    year: 2022, yearNote: 'Nie 等的原始预印本；ICLR 2023 发表', level: '进阶',
    prerequisites: ['transformer'], learningGoal: '能计算 patch token 数量，并说明共享权重不等于跨变量注意力。',
    tagline: '每个变量独立切成小段，用同一个 Transformer 阅读。',
    description: 'PatchTST 将单变量子序列作为 token，并在不同变量间共享编码器。本例有 3 个变量、16 步历史，patch 长 4、步幅 4、无补齐，因此每变量产生 4 个 token。',
    input: '16 × 3 历史序列', output: '未来 4 × 3 预测',
    formula: 'Npatch = ⌊(L − P)/S⌋ + 1,  Xⱼ ∈ ℝ^(Npatch × P)',
    formulaExplanation: '本例 L=16、P=S=4，所以 Npatch=4；每个变量独立处理，但使用相同嵌入与 Transformer 权重。实际实现若末端补齐，token 数还会改变。',
    keyPoints: ['时间 patch 保留局部片段内容，并减少注意力的 token 数。', '这里注意力沿单个变量的 patch 轴计算，不在变量之间直接建边。', '通道独立降低耦合，也可能遗漏跨变量关系；效果仍依赖具体预测协议。'],
    pitfall: '通道共享权重不是把 3 个变量先混成一个 token；也不能把无补齐的 patch 数公式套到有末端 padding 的配置。',
    quiz: { question: '16 步历史、patch 长 4、步幅 4、无 padding，每个变量有几个 patch？', options: ['3', '4', '12', '16'], answer: 1, explanation: '⌊(16−4)/4⌋+1=4；三个变量各有四个，不是在同一注意力序列中拼成十二个。' },
    layers: [
      { id: 'series', label: '按变量独立输入', detail: '将 16 × 3 转成三个长度 16 的单变量序列；可独立标准化，未来输出时恢复尺度。', shape: '3 × 16' },
      { id: 'patches', label: '时间分 Patch', detail: '每变量按长度 4、步幅 4 切成 4 片，不在本例追加末端补齐。', shape: '3 × 4 × 4' },
      { id: 'embedding', label: 'Patch 嵌入与位置', detail: '共享 Linear(4,8) 将每片映射为 8 维，加对应 patch 位置编码。', shape: '3 × 4 × 8' },
      { id: 'transformer', label: '共享 Transformer', detail: '逐变量使用同一个两头编码器；每头维度 4，注意力矩阵是每变量各自的 4 × 4。', shape: '3 × 4 × 8' },
      { id: 'forecast', label: '预测头', detail: '每变量展平为 32 维，经共享 Linear(32,4) 预测四步，再转回时间在前的布局。', shape: '3 × 4 → 4 × 3' }
    ],
    references: [specialistPaper('2211.14730', 'Nie et al. · A Time Series is Worth 64 Words: Long-term Forecasting with Transformers')]
  },
  {
    id: 'itransformer', name: 'iTransformer', fullName: '以变量为 Token 的反转 Transformer', category: 'sequence',
    year: 2023, yearNote: 'Liu 等的 iTransformer 原始预印本；2024 版本进一步修订', level: '进阶',
    prerequisites: ['patchtst'], learningGoal: '能解释反转的是 token 轴，而不是把时间顺序倒放。',
    tagline: '让一个变量的整段历史，成为一个 token。',
    description: 'iTransformer 把各变量的历史嵌入为变量 token，再在变量间做注意力。本例使用 16 步、3 个变量、8 维表示；线性历史嵌入的输入长度在这个配置中固定为 16。',
    input: '16 × 3 历史序列', output: '未来 4 × 3 预测',
    formula: 'hⱼ = Embed(x₁:ᴸ,ⱼ),  H′ = Transformer(H),  ŷⱼ = Wout h′ⱼ',
    formulaExplanation: 'H 的行是变量，不是时间点。历史嵌入将每变量的 16 个时间坐标映射到 8 维，注意力矩阵沿 3 个变量形成。',
    keyPoints: ['注意力主要学习变量之间的关系；逐 token 前馈网络继续变换每变量的表示。', '历史顺序仍编码在固定坐标输入与嵌入权重中，不是把过去当无序集合。', '变量很多时变量间注意力也有二次成本；改变回看长度需要相应配置或实现支持。'],
    pitfall: '“反转”不是反向因果，也不是完全取消时间信息；不能把某个固定 16→8 的线性层直接喂任意历史长度。',
    quiz: { question: '本例有 3 个变量，变量自注意力每头的权重矩阵大小是什么？', options: ['16 × 16', '3 × 3', '4 × 4', '16 × 3'], answer: 1, explanation: 'token 轴是变量轴，因此三个变量构成 3 × 3 的相互注意力。' },
    layers: [
      { id: 'history', label: '多变量历史', detail: '输入 16 步、3 变量；每变量可独立中心化与缩放，只使用历史统计量。', shape: '16 × 3' },
      { id: 'tokens', label: '逐变量 Token 嵌入', detail: '将输入转为 3 × 16，共享时间嵌入把每个变量的整段历史映射到 8 维。', shape: '3 × 8' },
      { id: 'attention', label: '变量间注意力', detail: '两头注意力的每头宽 4，各自在三个变量 token 间计算关系，随后合并与残差归一化。', shape: '3 × 8；每头权重 3 × 3' },
      { id: 'ffn', label: '逐 Token 前馈', detail: '共享前馈网络 8→16→8 与残差、LayerNorm 更新每个变量表示。', shape: '3 × 8' },
      { id: 'output', label: '各变量预测', detail: '共享 Linear(8,4) 产生每变量四步预测，转置并按历史尺度反归一化。', shape: '3 × 4 → 4 × 3' }
    ],
    references: [specialistPaper('2310.06625', 'Liu et al. · iTransformer: Inverted Transformers Are Effective for Time Series Forecasting')]
  },
  {
    id: 'vqvae', name: 'VQ-VAE', fullName: '向量量化变分自编码器', category: 'generative',
    year: 2017, yearNote: 'van den Oord 等的 Neural Discrete Representation Learning 论文', level: '进阶',
    prerequisites: ['autoencoder'], learningGoal: '能区分连续编码、离散码字索引与用于生成的潜变量先验。',
    tagline: '把连续编码，替换为码本里最近的一条向量。',
    description: 'VQ-VAE 用可学习码本量化编码。本例将 16 × 16 灰度图编码为 4 × 4 × 4，码本含 8 个 4 维向量；图展示重建路径，生成用的离散先验另行训练。',
    input: '16 × 16 × 1 图像', output: '同尺寸重建图像与 4 × 4 码字索引',
    formula: 'k = argminⱼ ‖zₑ − eⱼ‖²,  zq = eₖ',
    formulaExplanation: '对每个空间位置选择最近码字。训练结合重建、码本和 commitment 项，并用 straight-through 近似传递重建梯度；argmin 本身不可直接微分。',
    keyPoints: ['离散的是每个位置的码字选择，解码器接收的仍是选中码字的向量。', '码本与编码器需要配合更新，可能出现部分码字很少使用的情况。', '从零生成新图像需要码字先验；量化重建器本身不规定合理的采样分布。'],
    pitfall: '8 个码字不是 8 个语义类别，也不是整张图只存一个索引；本例有 16 个位置分别选码字。',
    quiz: { question: '本例的 4 × 4 编码网格需要多少个码字索引？', options: ['1', '4', '8', '16'], answer: 3, explanation: '每个空间位置单独量化，4×4=16 个位置各有一个索引，索引范围为 0…7。' },
    layers: [
      { id: 'input', label: '图像输入', detail: '输入为 16 × 16 单通道图像；像素缩放到适合重建损失的范围。', shape: '16 × 16 × 1' },
      { id: 'encoder', label: '连续编码器', detail: '两次 k=4、stride=2、padding=1 卷积将 16→8→4，最终输出 4 个潜特征通道。', shape: '4 × 4 × 4' },
      { id: 'quantize', label: '最近码字量化', detail: '对每个 4 维位置向量，在 8 × 4 的码本中寻找最近向量并替换；保存对应离散索引。', shape: '量化向量 4 × 4 × 4；索引 4 × 4' },
      { id: 'decoder', label: '解码器', detail: '接收量化向量网格，两次上采样与卷积恢复到 16 × 16，并投影到 1 通道。', shape: '16 × 16 × 1' },
      { id: 'reconstruction', label: '重建与训练目标', detail: '重建损失约束图像，码本项更新 eₖ，commitment 项约束编码；此路径不是自动训练好的码字先验。', shape: '重建图 16 × 16 × 1' }
    ],
    references: [specialistPaper('1711.00937', 'van den Oord et al. · Neural Discrete Representation Learning')]
  },
  {
    id: 'ddpm', name: 'DDPM', fullName: '去噪扩散概率模型', category: 'generative',
    year: 2020, yearNote: 'Ho 等的 Denoising Diffusion Probabilistic Models 论文', level: '深入',
    prerequisites: ['vae', 'unet'], learningGoal: '能区分训练时的前向加噪与生成时从纯噪声开始的反向链。',
    tagline: '学会在不同噪声水平下去噪，再逐步生成样本。',
    description: 'DDPM 定义固定前向加噪与学习到的反向过程。本例为 8 × 8 灰度图、100 个扩散时间步和小型 U-Net；图同时概括训练与采样，不是一条必须从真实图像开始的生成管线。',
    input: '训练：图像 x₀、时间 t 与噪声；生成：xT ∼ N(0,I)', output: '8 × 8 × 1 生成图像',
    formula: 'xₜ = √ᾱₜ x₀ + √(1−ᾱₜ) ε,  Lsimple = E‖ε − εθ(xₜ,t)‖²',
    formulaExplanation: 'αₜ=1−βₜ，ᾱₜ为累乘；训练随机选 t 与 ε 即可构造 xₜ。生成从高斯噪声出发，重复使用同一个带时间条件的网络。',
    keyPoints: ['预测噪声是反向均值的一种参数化，不是要求网络直接分类噪声等级。', '训练可直接采样任意 t 的带噪图，不必每次完整模拟 100 步前向链。', '原始采样要多次网络求值，时间与噪声日程会影响生成结果。'],
    pitfall: '生成时没有真实 x₀；不能把训练用的加噪支路说成生成新样本必需的输入。',
    quiz: { question: '无条件 DDPM 生成一张新图时，最初从哪里开始？', options: ['测试集真实图像', '已知答案标签图', '高斯噪声 xT', '训练目标 ε 的固定均值'], answer: 2, explanation: '训练学到反向去噪后，采样从 xT 的简单高斯分布开始，逐步得到 x₀。' },
    layers: [
      { id: 'clean', label: '干净样本（训练）', detail: '训练数据 x₀ 是 8 × 8 × 1；这条输入仅用于构造训练配对，不在无条件生成时提供。', shape: '8 × 8 × 1' },
      { id: 'noise', label: '前向加噪（训练）', detail: '选 t∈1…100 与同形状 ε，用闭式公式构造 xₜ；生成则直接采样 xT 而不经过本支路。', shape: 'xₜ、ε:各 8 × 8 × 1' },
      { id: 'denoiser', label: '噪声预测网络', detail: '小型 U-Net 接收 xₜ 和 16 维时间嵌入，输出同尺寸 εθ；参数在各时间步共享。', shape: 'εθ:8 × 8 × 1' },
      { id: 'reverse', label: '反向去噪一步', detail: 'μθ=(xₜ−βₜ εθ/√(1−ᾱₜ))/√αₜ，再加固定日程的 σₜz；最后一步取 z=0。', shape: 'xₜ₋₁:8 × 8 × 1' },
      { id: 'sample', label: '迭代生成', detail: '从高斯 xT 重复上一模块至 t=1，得到新图；本例步数和分辨率仅作教学。', shape: 'x₀:8 × 8 × 1' }
    ],
    references: [specialistPaper('2006.11239', 'Ho et al. · Denoising Diffusion Probabilistic Models')]
  },
  {
    id: 'latent-diffusion', name: 'Latent Diffusion', fullName: '潜空间扩散模型', category: 'generative',
    year: 2021, yearNote: 'Rombach 等的原始预印本；CVPR 2022 发表', level: '深入',
    prerequisites: ['ddpm', 'autoencoder'], learningGoal: '能解释压缩空间中的扩散与像素空间重建之间的取舍。',
    tagline: '先压缩图像，再在较小的潜空间里去噪。',
    description: 'LDM 把扩散移到预训练自编码器的潜空间。本例 32 × 32 RGB 图像压缩为 8 × 8 × 4，并用 5 个 8 维条件 token；不是某个 Stable Diffusion 权重的原样配置。',
    input: '训练图像 32 × 32 × 3；可选条件 5 × 8', output: '生成图像 32 × 32 × 3',
    formula: 'z₀ = E(x),  L = E‖ε − εθ(zₜ,t,c)‖²,  x̂ = D(ẑ₀)',
    formulaExplanation: '先学习编码器 E 和解码器 D，再在其潜表示上训练带条件去噪器；生成从潜空间高斯噪声出发，得到 ẑ₀ 后只需解码成图像。',
    keyPoints: ['扩散与图像编解码是两个阶段，常在扩散训练时固定自编码器。', '条件可经 cross-attention 注入 U-Net，不限于类别或固定长度文本。', '压缩降低空间计算量，但自编码器的重建瓶颈与采样成本仍然存在。'],
    pitfall: '潜空间并非无损压缩，也不是训练时把目标图的潜变量直接当作生成答案；生成仍从潜噪声开始。',
    quiz: { question: '相对像素 DDPM，LDM 主要把反复去噪放在哪里？', options: ['原图所有像素上', '自编码器得到的较小潜空间', '离散分类标签上', '固定真实图像索引中'], answer: 1, explanation: '反复去噪发生在较小的 latent 网格，最后再由解码器还原到像素空间。' },
    layers: [
      { id: 'encode', label: '图像编码到 Latent', detail: '本例使用预训练、连续且正则化的自编码器，空间压缩因子为 4；图像训练样本得到 z₀。', shape: '32 × 32 × 3 → 8 × 8 × 4' },
      { id: 'noise', label: 'Latent 加噪', detail: '训练时对 z₀加同形状高斯噪声形成 zₜ；生成时以 8 × 8 × 4 的高斯 zT 初始化。', shape: '8 × 8 × 4' },
      { id: 'unet', label: '条件 U-Net', detail: 'U-Net 接收潜变量、时间与条件 c；教学 cross-attention 用潜特征查询 5 个 8 维条件 token。', shape: '噪声预测 8 × 8 × 4' },
      { id: 'reverse', label: '反向 Latent 去噪', detail: '多次使用带条件去噪器更新 zₜ→zₜ₋₁，最终得到生成的潜变量 ẑ₀。', shape: 'ẑ₀:8 × 8 × 4' },
      { id: 'decode', label: '图像解码', detail: '固定解码器把生成潜变量恢复到 32 × 32 × 3；细节能力受训练表示空间限制。', shape: '32 × 32 × 3' }
    ],
    references: [specialistPaper('2112.10752', 'Rombach et al. · High-Resolution Image Synthesis with Latent Diffusion Models')]
  },
  {
    id: 'dit', name: 'DiT', fullName: '扩散 Transformer', category: 'generative',
    year: 2022, yearNote: 'Peebles 与 Xie 的 DiT 原始预印本；ICCV 2023 发表', level: '深入',
    prerequisites: ['latent-diffusion', 'vit'], learningGoal: '能追踪 latent patch token，并区分图像分类头与扩散预测头。',
    tagline: '让 Transformer 在带噪潜图像的 patch 上学习去噪。',
    description: 'DiT 以 Transformer 替代扩散 U-Net。本图用 8 × 8 × 4 带噪 latent、2 × 2 patch、宽 32 和四头注意力，展示 adaLN-Zero 条件块；不是 DiT-XL/2 的规模。',
    input: 'zₜ:8 × 8 × 4，时间 t 与类别', output: '同网格的噪声与对角方差参数',
    formula: 'Z = PatchEmbed(zₜ) + P,  Z′ = DiTBlock(Z, Embed(t)+Embed(c))',
    formulaExplanation: '时间和类别调制 adaLN 与残差门控；最后每 token 解码为 p×p×2C，用于预测噪声与反向过程方差参数，而不是图像类别概率。',
    keyPoints: ['patch 大小改变 token 数与注意力开销，不只是改变模型名称。', 'adaLN-Zero 通过条件生成的缩放、偏移和门控注入时间及类别。', 'DiT 是去噪骨干；采样器与潜图像自编码器仍是完整生成系统的组成部分。'],
    pitfall: 'ViT 式的 CLS 分类头不适用于这里的 DiT 输出；也不能把本页小型 token 示例当成论文大模型的生成质量。',
    quiz: { question: '8 × 8 latent、patch 为 2 × 2 时，有多少个 patch token？', options: ['4', '8', '16', '64'], answer: 2, explanation: '每个空间轴有 8/2=4 片，因此共有 4×4=16 个 token；通道数影响每片内容，不增加片数。' },
    layers: [
      { id: 'latent', label: '带噪 Latent', detail: '输入 zₜ 有 8 × 8 空间位置、4 个通道；本块不直接处理最终 RGB 图像。', shape: '8 × 8 × 4' },
      { id: 'patches', label: 'Patchify 与位置', detail: '切成 16 个 2 × 2 × 4 的 patch，每片 16 个数，投影为 32 维并加位置嵌入。', shape: '16 × 32' },
      { id: 'condition', label: '时间与类别条件', detail: 't 和类别各嵌入到 32 维后相加，供条件调制网络使用，不作为额外图像 token 计数。', shape: '条件向量 32' },
      { id: 'blocks', label: 'DiT 条件块', detail: '四头注意力每头 8 维，配合前馈、条件 adaLN 与残差门控；各块保持 token 形状。', shape: '16 × 32' },
      { id: 'unpatch', label: '去 Patch 与预测', detail: '每 token 输出 2 × 2 × 8=32 个数，重排为 8 × 8 × 8；分成噪声和方差参数各 4 通道。', shape: '噪声/方差参数：各 8 × 8 × 4' }
    ],
    references: [specialistPaper('2212.09748', 'Peebles & Xie · Scalable Diffusion Models with Transformers')]
  },
  {
    id: 'realnvp', name: 'Real NVP', fullName: '实值非体积保持归一化流', category: 'generative',
    year: 2016, yearNote: 'Dinh 等的原始预印本；ICLR 2017 发表', level: '深入',
    prerequisites: ['vae', 'mlp'], learningGoal: '能写出仿射耦合的逆变换和 Jacobian 行列式。',
    tagline: '保留一部分坐标，用它们控制另一部分的可逆变换。',
    description: 'Real NVP 用可逆仿射耦合实现可计算密度。本图只取 4 维连续变量上的一个耦合层，前两维保持不动，后两维变换；完整流需交替掩码与更多层。',
    input: '连续向量 x∈ℝ⁴', output: '潜变量 z∈ℝ⁴ 与 log p(x)',
    formula: 'zₐ=xₐ,  zᵦ=xᵦ⊙exp(s(xₐ))+t(xₐ),  log p(x)=log pZ(z)+Σs(xₐ)',
    formulaExplanation: '这里 f 将数据 x 映到基分布 z。固定 zₐ后，xᵦ=(zᵦ−t(zₐ))⊙exp(−s(zₐ))；三角 Jacobian 的 log-det 是尺度输出之和。',
    keyPoints: ['s 和 t 子网络本身无需可逆，可逆性来自耦合结构。', '变换保留维度；交换掩码能让之前未变换的坐标也参与后续更新。', '连续密度可精确按变换公式计算，但图像等离散数据仍需明确去量化与评估约定。'],
    pitfall: 'Real NVP 不是把 4 维压缩成 2 维；非体积保持表示 Jacobian 行列式不必等于 1，而非变换不可逆。',
    quiz: { question: '一个仿射耦合层的 s、t 子网络必须可逆吗？', options: ['必须，且只能是线性层', '必须各自保持体积', '不必，给定保留坐标后可直接求逆', '只能取常数'], answer: 2, explanation: '保留的 xₐ=zₐ可重新计算 s、t，再逐元素缩放与平移求回 xᵦ。' },
    layers: [
      { id: 'input', label: '输入向量', detail: '连续数据 x 有 4 个坐标；这是小型 flow 变换，不是图像编码压缩器。', shape: '4' },
      { id: 'mask', label: '二分 Mask', detail: '拆成保留的 xₐ=(x₁,x₂) 与待变换的 xᵦ=(x₃,x₄)。', shape: '2 + 2' },
      { id: 'networks', label: '尺度与平移网络', detail: '仅用 xₐ通过小型 2→8→4 的网络产生 s、t 各 2 维；它不读取待变换支 xᵦ。', shape: 's:2；t:2' },
      { id: 'coupling', label: '仿射耦合', detail: '保留 zₐ=xₐ，对另一支做 exp(s) 缩放及 t 平移，拼回 4 维；计算 log-det=Σs。', shape: 'z:4；log-det:1' },
      { id: 'density', label: '潜变量与密度', detail: '教学基分布为 4 维标准高斯；把 log pZ(z) 与 log-det 相加求密度，反向可从 z 采样数据。', shape: '潜变量 4；log p(x) 1' }
    ],
    references: [specialistPaper('1605.08803', 'Dinh et al. · Density estimation using Real NVP')]
  },
  {
    id: 'memn2n', name: 'MemN2N', fullName: '端到端记忆网络', category: 'memory',
    year: 2015, yearNote: 'Sukhbaatar 等的 End-To-End Memory Networks，NIPS 2015', level: '进阶',
    prerequisites: ['mlp', 'transformer'], learningGoal: '能追踪问题向量如何多次读取事实记忆，并区别读记忆与改写记忆。',
    tagline: '带着更新后的问题，再读一次同一组事实。',
    description: '端到端记忆网络用 soft attention 对事实做多跳读取。本例 3 个事实、8 维 key/value、2 跳和 5 个候选答案；使用简单句子嵌入，不是完整语言理解系统。',
    input: '3 个事实及一个问题', output: '5 个答案的概率',
    formula: 'pᵢ = softmaxᵢ(uᵀmᵢ),  o = Σᵢpᵢcᵢ,  u⁺ = u + o',
    formulaExplanation: 'mᵢ用于寻址，cᵢ用于读出；两者是事实的不同可学习嵌入。更新后的 u 在下一跳重新寻址，最后由答案分类头输出。',
    keyPoints: ['多跳是每次回答前的多次计算，不等同于多个输入时间步。', '事实槽在这些跳中被读取，query 更新不等于像 NTM 一样向槽中执行写操作。', '句子词袋嵌入可能丢失顺序；原方法还使用位置和时间编码等改进。'],
    pitfall: '注意力权重或多跳过程不保证模型已学会可靠的逻辑推理；检索到什么仍受嵌入、训练数据与记忆容量限制。',
    quiz: { question: '按本例 u⁺=u+o，多跳中主要被更新的是什么？', options: ['问题/query 向量', '原文事实中的文字', '任意外部内存地址', '已经生成的真实答案'], answer: 0, explanation: '读出 o 加入问题状态，下一跳用新 query 重新读取；事实槽没有在该操作中被改写。' },
    layers: [
      { id: 'embed', label: '事实与问题嵌入', detail: '事实分别形成 key 矩阵 M 和 value 矩阵 C，各 3 × 8；问题嵌入为 8 维 u。', shape: 'M/C:各 3 × 8；u:8' },
      { id: 'address', label: '记忆寻址', detail: '计算 u 与三个 mᵢ的内积，softmax 得到三个事实的权重。', shape: 'p:3' },
      { id: 'read', label: '加权读出', detail: '用同一组三个权重对 value cᵢ加权求和，得到读出 o。', shape: 'o:8' },
      { id: 'hops', label: '多跳 Query 更新', detail: '用 u+o 得到新 query，再重复寻址与读取，共两跳；事实嵌入参数可按具体权重共享方案配置。', shape: '每跳 Query 8' },
      { id: 'answer', label: '答案分布', detail: '最后 query 经 Linear(8,5) 和 softmax；这只是从五个候选答案中选择的教学头。', shape: '5' }
    ],
    references: [specialistPaper('1503.08895', 'Sukhbaatar et al. · End-To-End Memory Networks')]
  },
  {
    id: 'transformer-xl', name: 'Transformer-XL', fullName: '带分段循环记忆的 Transformer', category: 'memory',
    year: 2019, yearNote: 'Dai 等的 Transformer-XL，ACL 2019 长文', level: '深入',
    prerequisites: ['transformer', 'rnn'], learningGoal: '能区分当前查询与扩展键值，解释相对位置和 stop-gradient 缓存。',
    tagline: '换到下一段时，把上一段的隐藏表示带过去。',
    description: 'Transformer-XL 通过分段循环与相对位置连接上下文。本例 2 层、宽 8、每段 4 token、每层最多缓存 4 个对应前层表示；使用 10 词词表的教学语言模型。',
    input: '当前 4 token 与 2 层各 4 × 8 缓存', output: '4 × 10 下一词概率及新缓存',
    formula: 'H̃τˡ⁻¹ = [SG(Mτˡ⁻¹); Hτˡ⁻¹],  Q = Hτˡ⁻¹WQ,  K/V = H̃τˡ⁻¹WK/V',
    formulaExplanation: '当前段形成 query，旧缓存与当前段沿长度轴拼接形成 key/value；SG 切断跨段反向梯度。缓存对应的是进入该层的前层表示，并非同层 RNN 式递推。',
    keyPoints: ['相对位置避免旧隐藏态重复使用时的绝对位置歧义。', '因果掩码允许读取旧段与当前段已可见位置，不能访问当前段未来 token。', '缓存有固定保留长度；多层循环扩展有效上下文，但不等于保存无限完整历史。'],
    pitfall: 'stop-gradient 不表示忽略旧段信息，只是不把梯度沿这些缓存继续反传；也不能把 Transformer-XL 说成普通的同层隐藏态 RNN。',
    quiz: { question: '当前段 4 token、缓存 4 token 时，每头当前段 attention 的 query×key 大小是多少？', options: ['8 × 8', '4 × 8', '4 × 4', '8 × 4'], answer: 1, explanation: 'query 仅来自当前四个位置，key 包含四个缓存与四个当前位置，因此是 4×8，再按因果规则掩码。' },
    layers: [
      { id: 'segment', label: '当前 Segment', detail: '四个输入 token 嵌入为宽 8；两层块逐层处理，图中五模块概括整段的处理与缓存关系。', shape: '4 × 8' },
      { id: 'memory', label: '缓存前段隐藏态', detail: '每层读取上一段中对应前层的最近四行表示并 stop-gradient；本例两层各有一份缓存。', shape: '2 × 4 × 8' },
      { id: 'attention', label: '相对位置注意力', detail: '每层两头、每头宽 4，当前 Q 长 4、扩展 K/V 长 8；采用相对位置项和因果掩码。', shape: '输出 4 × 8；每头权重 4 × 8' },
      { id: 'ffn', label: '前馈与残差', detail: '各层以 8→16→8 的前馈网络、残差和归一化更新当前段；不是对全部旧缓存重新前向计算。', shape: '4 × 8' },
      { id: 'cache', label: '下一段缓存与预测', detail: '当前段输出经 Linear(8,10) 形成词概率；每层另外保存与下一次 K/V 输入对应的本段表示，各保留四行。', shape: '概率 4 × 10；缓存 2 × 4 × 8' }
    ],
    references: [specialistPaper('1901.02860', 'Dai et al. · Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context')]
  }
];
