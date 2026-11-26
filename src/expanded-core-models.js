// Historical teaching entries, not executable models or reported checkpoints.
// The five rows are explanatory modules; some group many layers or describe
// branches/training concepts, so they must not all be read as a serial chain.
const layer = (id, label, detail, shape) => ({ id, label, detail, shape });
const teachingModel = value => ({ ...value, description: `${value.description} 图示为教学缩略，不执行模型推理。` });

export const expandedCoreModels = [
  {
    id: 'rbf', name: 'RBF Network', fullName: '径向基函数网络', category: 'foundations',
    year: 1988, yearNote: 'Broomhead 与 Lowe 的径向基插值网络论文节点，非所有径向基方法的起源', level: '进阶',
    prerequisites: ['mlp'], learningGoal: '能解释中心、宽度与线性读出如何共同形成非线性函数。',
    tagline: '先衡量离各个中心有多近，再组合局部响应。',
    description: '选用 Gaussian 径向基的 2 → 3 → 2 回归示例。隐藏响应取决于输入与中心的距离；固定中心和宽度后，读出权重可用线性方法拟合。',
    input: '二维连续特征 x', output: '两个连续回归值，不是概率',
    formula: 'φⱼ(x) = exp(−‖x − cⱼ‖² / (2σⱼ²)); ŷ = Wφ(x) + b',
    formulaExplanation: 'cⱼ 是二维中心，σⱼ > 0 控制响应范围。三个基函数组成 φ ∈ ℝ³，W ∈ ℝ²ˣ³ 将其映射为二维输出。',
    keyPoints: ['非线性来自基函数；输出层本身可保持线性。', '中心与宽度可以预先确定，也可以作为训练参数；不同训练策略不能混为一谈。', '过窄的 Gaussian 只响应中心附近，过宽则可能难以区分局部结构。'],
    pitfall: '具有三个径向基不代表能精确拟合任意函数；高维空间中的中心选择和覆盖仍可能昂贵。',
    quiz: { question: '固定 RBF 的中心和宽度后，哪个部分仍可用线性最小二乘拟合？', options: ['输出权重与偏置', '输入维数', '数据标签的定义', 'Gaussian 的距离度量必然消失'], answer: 0, explanation: 'φ(x) 此时是固定的非线性特征，ŷ = Wφ(x) + b 对 W 和 b 是线性的。' },
    layers: [
      layer('input', '二维输入', '一个样本 x = (x₁, x₂)，不包含批次维度。', '2'),
      layer('distance', '到各中心的距离', '对三个二维中心分别计算 ‖x − cⱼ‖²，得到三个距离标量。', '3'),
      layer('basis', '径向基响应', '用三个正宽度 σⱼ 将距离变换为 Gaussian 响应。', '3'),
      layer('readout', '线性读出', 'W 的形状为 2 × 3，另有两个输出偏置。', '2 × 3 → 2'),
      layer('output', '回归输出', '保留两个连续值；这里不添加 softmax。', '2')
    ],
    references: [{ label: 'Broomhead & Lowe, 1988 · 原论文出版页', url: 'https://www.complex-systems.com/abstracts/v02_i03_a05/' }]
  },
  {
    id: 'rbm', name: 'RBM', fullName: 'Restricted Boltzmann Machine · 受限玻尔兹曼机', category: 'foundations',
    year: 2002, yearNote: 'Hinton 对比散度训练论文的期刊年份，非 RBM 最早提出年份', level: '深入',
    prerequisites: ['mlp'], learningGoal: '能从二部能量函数推导条件独立性，并区分重构与精确似然训练。',
    tagline: '用可见层与隐藏层之间的无向连接定义联合分布。',
    description: '采用 6 个二值可见单元、3 个二值隐藏单元的 Bernoulli–Bernoulli RBM。图中重构与对比学习是同一组权重的训练过程，不是再增加两层神经元。',
    input: '6 维二值可见向量 v', output: '隐藏样本、可见重构概率与联合能量',
    formula: 'E(v,h) = −bᵀv − cᵀh − vᵀWh; p(v,h) = exp(−E(v,h)) / Z',
    formulaExplanation: 'W ∈ ℝ⁶ˣ³。p(hⱼ=1|v)=sigmoid(cⱼ+W[:,j]ᵀv)，而 p(vᵢ=1|h)=sigmoid(bᵢ+W[i,:]h)；固定另一层后，同层单元条件独立。',
    keyPoints: ['“受限”指没有可见层内部或隐藏层内部的连接。', '联合分布由能量与配分函数 Z 定义；能量本身不是归一化概率。', 'CD-k 从数据启动短 Gibbs 链，用重构统计近似负相；有限 k 通常不是精确的似然梯度。'],
    pitfall: '一次重构误差较小不等于模型已经学到准确的数据分布；RBM 也不是使用固定编码器、解码器的普通自编码器。',
    quiz: { question: '为什么 RBM 可以在给定 v 时并行采样所有隐藏单元？', options: ['隐藏单元恒为零', '隐藏层内没有连接，故在给定 v 时条件独立', '配分函数必定等于一', '它没有随机变量'], answer: 1, explanation: '二部连接使 p(h|v) 分解为各隐藏单元的 Bernoulli 条件分布；p(v|h) 同理。' },
    layers: [
      layer('visible', '可见状态 v', '六个 Bernoulli 单元表示观测数据；没有可见层内部边。', '6 个二值单元'),
      layer('weights', '共享二部权重', '同一个 W 连接 v 与 h，两个采样方向使用 W 或 Wᵀ，不是两套独立权重。', '6 × 3'),
      layer('hidden', '隐藏状态 h', '先计算三个条件概率，再可独立采样隐藏状态。', '3 个二值单元'),
      layer('reconstruction', '可见重构', '给定 h 计算六个可见概率，可继续交替 Gibbs 采样。', '6 个概率'),
      layer('energy', '能量与对比学习', '能量为一个标量。对比学习比较数据相和短链负相的统计；此项是训练解释。', '能量标量')
    ],
    references: [{ label: 'Hinton, 2002 · 期刊论文及作者文献表', url: 'https://www.cs.utoronto.ca/~hinton/papers.html' }, { label: 'Training Products of Experts · 作者预印本', url: 'https://www.cs.toronto.edu/~hinton/absps/tr00-004.pdf' }]
  },
  {
    id: 'dbn', name: 'DBN', fullName: 'Deep Belief Network · 深度信念网络', category: 'foundations',
    year: 2006, yearNote: 'Hinton、Osindero 与 Teh 的逐层学习论文', level: '深入',
    prerequisites: ['rbm'], learningGoal: '能区分 DBN 顶层的无向联合分布与下层的有向生成条件分布。',
    tagline: '顶层联想记忆向下生成，而非所有层都双向相连。',
    description: '用 6 个可见变量、4 个第一隐藏变量和 3 个第二隐藏变量说明生成式 DBN。顶层 h¹ 与 h² 构成 RBM，下面用 p(v|h¹) 生成观测；逐层 RBM 预训练是学习方法。',
    input: '6 维观测，或从顶层分布开始采样', output: '观测的生成分布及分层表征',
    formula: 'p(v,h¹,h²) = p(v | h¹) · p(h¹,h²)',
    formulaExplanation: 'p(h¹,h²) 是顶层无向 RBM 的联合分布，p(v|h¹) 是向下的有向条件分布。生成时先在顶层采样，再向下采样 v。',
    keyPoints: ['除顶层两层外，生成模型中的连接方向向下。', '逐层训练 RBM 可初始化网络；后续生成式微调与用于分类的监督微调需要分别说明。', '向上的快速识别过程提供近似推断，不代表一般 DBN 的精确后验计算已经免费完成。'],
    pitfall: '“堆叠 RBM 预训练”不是说最终 DBN 的每一对相邻层都保持无向；那会混淆 DBN 与深度玻尔兹曼机。',
    quiz: { question: '在这个具有两层隐藏变量的 DBN 中，哪一项是无向联合分布？', options: ['p(v|h¹)', '输入预处理', 'p(h¹,h²)', '所有层都必须独立'], answer: 2, explanation: '顶层 h¹ 与 h² 形成无向联想记忆，底层通过有向条件分布 p(v|h¹) 连接到可见变量。' },
    layers: [
      layer('visible', '可见变量', 'v 含六个二值观测；向上推断与向下生成需要区分。', '6'),
      layer('hidden1', '第一隐藏变量', 'h¹ 有四个变量，既属于顶层 RBM，也向下决定可见条件分布。', '4'),
      layer('hidden2', '第二隐藏变量', 'h² 有三个变量，与 h¹ 构成无向顶层。', '3'),
      layer('top', '顶层 RBM', 'p(h¹,h²) 是 4+3 个变量的联合模型。它是前两隐藏层关系的说明，不是新增隐藏层。', '4 ↔ 3'),
      layer('generation', '向下生成', '从 h¹ 经 4 → 6 的条件映射得到 v 的 Bernoulli 概率，再采样观测。', '4 → 6')
    ],
    references: [{ label: 'Hinton, Osindero & Teh, 2006 · 作者论文', url: 'https://www.stats.ox.ac.uk/~teh/research/unsup/nc2006.pdf' }]
  },
  {
    id: 'kan', name: 'KAN', fullName: 'Kolmogorov–Arnold Network', category: 'foundations',
    year: 2024, yearNote: 'Liu 等人的 KAN 预印本年份', level: '深入',
    prerequisites: ['mlp'], learningGoal: '能辨别边上的可学习一元函数与 MLP 节点上的固定激活。',
    tagline: '让每条边学习一条曲线，让节点负责求和。',
    description: '展示 2 → 3 → 1 的两层 KAN。每条边使用可学习一元函数，原论文以样条为核心参数化；节点把输入边的响应相加。这不是对任意函数都足够的最小网络。',
    input: '2 维连续输入', output: '1 个连续函数值',
    formula: 'hⱼ = Σᵢ φⱼᵢ(xᵢ); y = Σⱼ ψⱼ(hⱼ)',
    formulaExplanation: '第一层有 2×3 个边函数，第二层有 3×1 个边函数。φ、ψ 的曲线参数参与学习；原始实现还可包含基函数残差与样条缩放。',
    keyPoints: ['MLP 常用“标量权重+节点激活”，KAN 把非线性函数放在边上。', '样条网格与系数影响表达能力和计算成本，不能只按边数比较参数量。', '边函数可视化有助于分析，但容易解释仍取决于数据、拟合与简化过程。'],
    pitfall: 'Kolmogorov–Arnold 表示定理不保证一个有限小型样条网络能高效解决所有任务；也不证明 KAN 在所有问题上优于 MLP。',
    quiz: { question: '原始 KAN 与常见 MLP 的一个主要结构区别是什么？', options: ['KAN 不允许训练', 'KAN 的可学习一元非线性放在边上', 'KAN 只能接受图像', 'KAN 的节点必须执行 softmax'], answer: 1, explanation: 'KAN 的节点求和，边负责可学习的一元函数变换；这是此图要强调的结构差别。' },
    layers: [
      layer('input', '二维输入', '两个输入坐标分别送入每个隐藏节点对应的边函数。', '2'),
      layer('edge1', '第一层边函数', '六条边各学习一元函数 φⱼᵢ，可采用 B 样条参数化。', '2 × 3 个函数'),
      layer('sum', '隐藏节点求和', '每个隐藏节点把来自两个输入坐标的函数值相加。', '3'),
      layer('edge2', '第二层边函数', '对三个 hⱼ 分别应用 ψⱼ，再送往输出求和。', '3 × 1 个函数'),
      layer('output', '标量输出', '将三个第二层边响应相加得到 y。', '1')
    ],
    references: [{ label: 'Liu et al., 2024 · KAN 原论文', url: 'https://arxiv.org/abs/2404.19756' }, { label: '作者实现 · pykan', url: 'https://github.com/KindXiaoming/pykan' }]
  },
  {
    id: 'lenet', name: 'LeNet-5', fullName: 'LeNet-5 · 手写数字卷积网络', category: 'vision',
    year: 1998, yearNote: 'Gradient-Based Learning Applied to Document Recognition 中的 LeNet-5', level: '入门',
    prerequisites: ['cnn'], learningGoal: '能沿 LeNet-5 计算空间尺寸，并识别原型与现代复刻的区别。',
    tagline: '从局部卷积、子采样一路走向数字识别。',
    description: '按 1998 年 LeNet-5 原型分组展示：32×32 输入经 C1/S2、C3/S4、C5/F6 到十个输出。原型使用子采样和 RBF 距离输出，不能把现代 max-pool/softmax 复刻当成完全相同的结构。',
    input: '32 × 32 × 1 灰度图', output: '10 个数字类别的距离分数',
    formula: 'dₖ = Σⱼ₌₁⁸⁴ (hⱼ − wₖⱼ)²; ŷ = argminₖ dₖ',
    formulaExplanation: '这是原型输出端的 Euclidean RBF 距离形式，h 为 F6 的 84 维表示。距离越小越匹配；它与常见现代复刻中的 softmax logits 不同。',
    keyPoints: ['5×5 valid 卷积使 32→28，2×2 子采样使 28→14；下一组使 14→10→5。', '原型 C3 有部分通道连接；S2/S4 有可训练缩放和偏置，不是现代无参数最大池化。', 'C5 在此输入尺寸上产生 120 个 1×1 特征，接 84 维 F6。'],
    pitfall: '“LeNet”也指一系列历史模型。这里明确选择 LeNet-5 原型，不把所有同名教材简化版的激活与输出头混用。',
    quiz: { question: '28 × 28 特征图经 2 × 2、步长 2 的子采样后，空间尺寸是多少？', options: ['26 × 26', '14 × 14', '28 × 14', '56 × 56'], answer: 1, explanation: '每个空间维度减半，得到 14 × 14；该操作本身不把六个通道合成一个。' },
    layers: [
      layer('input', '图像输入', '原型输入为 32×32 单通道图像；尺寸按 H×W×C 表示。', '32 × 32 × 1'),
      layer('first', 'C1 与 S2', 'C1：六个 5×5 valid 卷积得到 28×28×6；S2 子采样得到 14×14×6。', '14 × 14 × 6'),
      layer('second', 'C3 与 S4', 'C3：16 个 10×10 特征图；S4：2×2 子采样。C3 原型并非全通道稠密连接。', '5 × 5 × 16'),
      layer('dense', 'C5 与 F6', 'C5 用 5×5 卷积得到 1×1×120，再接 84 维 F6。', '120 → 84'),
      layer('output', 'RBF 距离输出', '对十个类别计算距离；低分更匹配。不是在此处直接得到十类概率。', '10 个距离')
    ],
    references: [{ label: 'LeCun et al., 1998 · 论文 DOI', url: 'https://doi.org/10.1109/5.726791' }, { label: '原论文全文 · 大学课程存档', url: 'https://princetonuniversity.github.io/NEU-PSY-502/_static/pdf/Class%204/LeCunn1998.pdf' }]
  },
  {
    id: 'alexnet', name: 'AlexNet', fullName: 'AlexNet · 深层卷积分类网络', category: 'vision',
    year: 2012, yearNote: 'Krizhevsky、Sutskever 与 Hinton 的 ImageNet 分类论文', level: '进阶',
    prerequisites: ['lenet'], learningGoal: '能追踪五个卷积层到三层分类头，并解释 ReLU、池化与 dropout 的分工。',
    tagline: '更深的卷积特征配合 ReLU 与大规模训练。',
    description: '展示五个卷积层与三个全连接层。几何按官方 Caffe 部署采用 227×227 输入，使 11×11、步长 4、无 padding 的首层得到 55×55；这是明确的实现配置，不把它与原论文图中的输入标记混用。',
    input: '227 × 227 × 3 RGB 图', output: '1000 类概率',
    formula: 'h = max(0, W ∗ x + b); p = softmax(Wout hFC + bout)',
    formulaExplanation: '∗ 表示卷积，max(0,·) 为 ReLU。卷积特征经池化与全连接变换，最后输出 1000 个 logits 并归一化。',
    keyPoints: ['五个卷积层的通道依次为 96、256、384、384、256；分类头为 4096→4096→1000。', '原设计包括重叠最大池化、局部响应归一化与部分分组连接；这些不等同于后来的 BatchNorm。', 'Dropout 用于全连接隐藏层的训练过程，推理时不随机丢弃单元。'],
    pitfall: 'AlexNet 的经典结果同时依赖数据、优化、数据增强与硬件实现，不能把成功仅归因于某一种激活函数。',
    quiz: { question: '五个卷积层加三个全连接层，通常为何称为八个可学习层？', options: ['把每个 ReLU 都算一个卷积', '池化替代了所有权重', '统计带可学习权重的卷积与全连接层', '八个层都必须输出同样形状'], answer: 2, explanation: '经典“八层”计数指五个卷积与三个全连接权重层，不是图中所有操作的数量。' },
    layers: [
      layer('input', 'RGB 输入', 'Caffe 配置的单张输入为 227×227×3；批次维省略。', '227 × 227 × 3'),
      layer('early', '前两组卷积与池化', 'Conv1 11×11 s4：55×55×96→Pool 27×27；Conv2 5×5 p2：256 通道→Pool 13×13。', '13 × 13 × 256'),
      layer('deep', '后三个卷积与池化', '三个 3×3 卷积保持 13×13，通道为 384、384、256，最终池化到 6×6。', '6 × 6 × 256'),
      layer('dense', '全连接与 Dropout', '展平为 9216 维，经 4096→4096 隐藏层；ReLU 与训练期 dropout 作用在此。', '9216 → 4096 → 4096'),
      layer('output', '分类输出', '最后一个全连接产生 1000 logits，softmax 得到类别概率。', '1000')
    ],
    references: [{ label: 'Krizhevsky et al., 2012 · 原论文', url: 'https://proceedings.neurips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html' }, { label: 'BVLC 官方 Caffe · AlexNet 部署定义', url: 'https://github.com/BVLC/caffe/blob/master/models/bvlc_alexnet/deploy.prototxt' }]
  },
  {
    id: 'vgg', name: 'VGG-16', fullName: 'Very Deep Convolutional Network · 配置 D', category: 'vision',
    year: 2014, yearNote: 'VGG 原预印本年份；此条采用含16个权重层的配置D', level: '进阶',
    prerequisites: ['cnn'], learningGoal: '能说明小卷积核堆叠如何增加感受野，并核对 VGG-16 的层数。',
    tagline: '反复堆叠简单的 3×3 卷积，逐级压缩空间。',
    description: '选择 VGG-16 的 13 个卷积层与 3 个全连接层，而非把所有 VGG 变体当成同一个网络。五次 2×2 池化把 224×224 压到 7×7。',
    input: '224 × 224 × 3 RGB 图', output: '1000 类概率',
    formula: 'h = ReLU(W₂ ∗ ReLU(W₁ ∗ x + b₁) + b₂)',
    formulaExplanation: '两个 stride=1 的 3×3 卷积具有 5×5 的理论感受野，并在中间引入额外非线性。保持相同通道宽度时，可比一个 5×5 卷积使用更少权重。',
    keyPoints: ['配置 D 的各块卷积层数为 2、2、3、3、3，共 13 层。', '卷积采用 stride 1、padding 1 保持空间尺寸；池化负责下采样。', '末端大型全连接头占用大量参数；网络规则整齐不代表参数或内存开销很小。'],
    pitfall: 'VGG-16 的“16”不是所有算子总数，也不代表 16 个卷积层；VGG-19 和带 BatchNorm 的版本需要另行区分。',
    quiz: { question: 'VGG-16 的经典配置 D 有多少个卷积权重层？', options: ['16', '13', '5', '3'], answer: 1, explanation: '13 个卷积层加 3 个全连接层，合计 16 个带权重层。' },
    layers: [
      layer('input', 'RGB 输入', '224×224 图像，按 H×W×C 表示。', '224 × 224 × 3'),
      layer('early', '卷积块 1–2', '两个64通道卷积、池化，再两个128通道卷积、池化。', '56 × 56 × 128'),
      layer('deep', '卷积块 3–5', '256/512/512 通道块，每块三个3×3卷积与一次池化。', '7 × 7 × 512'),
      layer('dense', '全连接隐藏层', '展平为25088维，经过两个4096维隐藏层及训练期dropout。', '25088 → 4096 → 4096'),
      layer('output', '分类输出', '第三个全连接产生1000 logits，再转成概率。', '1000')
    ],
    references: [{ label: 'Simonyan & Zisserman · VGG 原论文', url: 'https://arxiv.org/abs/1409.1556' }]
  },
  {
    id: 'inception', name: 'Inception v1', fullName: 'Inception Module · GoogLeNet 的多分支模块', category: 'vision',
    year: 2014, yearNote: 'Going Deeper with Convolutions 原预印本年份', level: '进阶',
    prerequisites: ['cnn'], learningGoal: '能解释并行分支的通道拼接与1×1降维，算出输出通道总数。',
    tagline: '在同一分辨率并行观察多个尺度。',
    description: '选择 GoogLeNet 的 Inception 3a 型模块：28×28×192 输入分成四路，输出通道为64、128、32、32。五个讲解模块并不代表完整22层GoogLeNet只有五层。',
    input: '28 × 28 × 192 特征图', output: '28 × 28 × 256 特征图',
    formula: 'Y = Concat(B₁(X), B₃(X), B₅(X), Bpool(X))',
    formulaExplanation: 'B₃、B₅ 在较大卷积前先用1×1压缩通道；池化分支后接1×1投影。四路保持相同空间尺寸，只沿通道维拼接。',
    keyPoints: ['1×1卷积可以改变通道数，并在卷积前降低较大核的计算量。', '分支并行处理同一个输入，不是依次通过1×1、3×3、5×5。', '此例通道相加得到64+128+32+32=256；融合操作是拼接而非逐元素求和。'],
    pitfall: 'Inception是模块和家族名称；v1、v2/v3、Inception-ResNet的分支和卷积分解方式不同。',
    quiz: { question: '四个分支各输出64、128、32、32通道，拼接后是多少通道？', options: ['128', '256', '64', '四路必须逐元素相加才能融合'], answer: 1, explanation: '通道拼接保留各分支特征，所以输出通道数为四路通道数的总和。' },
    layers: [
      layer('input', '共享输入', '同一个28×28×192特征图同时送到四个分支。', '28 × 28 × 192'),
      layer('branches', '四路并行处理', '1×1；1×1(96)→3×3；1×1(16)→5×5；3×3池化→1×1。采用padding保持28×28。', '4 个并行分支'),
      layer('features', '分支输出', '四路分别输出64、128、32和32通道。', '28 × 28 × (64 / 128 / 32 / 32)'),
      layer('concat', '通道拼接', '沿通道轴连接，不相加，也不改变宽高。', '64 + 128 + 32 + 32 = 256'),
      layer('output', '融合特征', '输出仍是空间特征图，后续GoogLeNet还会继续堆叠模块和分类头。', '28 × 28 × 256')
    ],
    references: [{ label: 'Szegedy et al. · Inception / GoogLeNet 原论文', url: 'https://arxiv.org/abs/1409.4842' }]
  },
  {
    id: 'densenet', name: 'DenseNet', fullName: 'Densely Connected Convolutional Network', category: 'vision',
    year: 2016, yearNote: 'DenseNet 原预印本年份，正式视觉会议论文为2017年', level: '进阶',
    prerequisites: ['cnn', 'resnet'], learningGoal: '能区分DenseNet的拼接与ResNet的相加，计算growth rate导致的通道增长。',
    tagline: '每一层都能直接使用块内此前产生的特征。',
    description: '展示一个三个组合层、growth rate k=16 的dense block及压缩transition。输入32通道，块末变成80通道，再压到40并下采样；这不是某个完整DenseNet检查点。',
    input: '16 × 16 × 32 特征图', output: '8 × 8 × 40 transition 特征',
    formula: 'xₗ = Hₗ([x₀, x₁, …, xₗ₋₁]); Cend = C₀ + Lk',
    formulaExplanation: '[·]表示通道拼接。每个Hₗ产生16个新通道；C₀=32、L=3，所以块末32+3×16=80。transition用1×1压缩到40，再2×2平均池化。',
    keyPoints: ['块内每层读取此前所有特征，原特征通过拼接被保留。', 'DenseNet-BC可用1×1瓶颈卷积，再用3×3卷积产生k个新通道。', '特征复用可以提高参数效率，但存储和访存开销仍需单独衡量。'],
    pitfall: '“Dense”指块内跨层密集连接，不是把空间特征全部展平做全连接；也不是ResNet式的同形状相加。',
    quiz: { question: '起始32通道，三个层各产生16个新通道，块末共有多少通道？', options: ['48', '64', '80', '512'], answer: 2, explanation: 'DenseNet保留初始特征并拼接每一层的新特征，因此32+3×16=80。' },
    layers: [
      layer('input', '块输入', '输入为16×16×32，供块内各后续层重复访问。', '16 × 16 × 32'),
      layer('dense', '三个组合层', '各层通过BN/ReLU与卷积产生16个新通道，输入依次为32、48、64通道。', '3 × 16 个新通道'),
      layer('concat', '密集特征拼接', '把块输入及三层新特征拼接；空间尺寸保持。', '16 × 16 × 80'),
      layer('transition', '压缩与下采样', '1×1卷积80→40，随后2×2平均池化、步长2。', '16 × 16 × 80 → 8 × 8 × 40'),
      layer('output', '下一阶段特征', '该特征可连接下一个dense block，或接汇聚与任务输出头。', '8 × 8 × 40')
    ],
    references: [{ label: 'Huang et al. · DenseNet 原论文', url: 'https://arxiv.org/abs/1608.06993' }]
  },
  {
    id: 'mobilenet-v2', name: 'MobileNetV2', fullName: 'Inverted Residuals and Linear Bottlenecks', category: 'vision',
    year: 2018, yearNote: 'MobileNetV2 原论文年份', level: '进阶',
    prerequisites: ['cnn', 'resnet'], learningGoal: '能追踪倒残差块的扩展、逐通道卷积和线性投影，并判断何时可使用捷径。',
    tagline: '在宽空间做非线性，在窄瓶颈保留线性投影。',
    description: '选取stride=1、输入输出均16通道、扩展倍率6的单个倒残差块。完整MobileNetV2由多个不同分辨率和通道数的块构成。',
    input: '16 × 16 × 16 特征图', output: '16 × 16 × 16 残差块特征',
    formula: 'Y = X + Projectlinear(DW3×3(Expand1×1(X)))',
    formulaExplanation: '扩展和depthwise阶段使用非线性，最后1×1投影后不加ReLU6。此处stride=1且输入输出形状相同，才能使用恒等捷径。',
    keyPoints: ['1×1扩展把16通道变成96，非线性主要在较宽的中间表示上计算。', 'Depthwise卷积对每个通道独立做空间滤波；1×1卷积负责通道混合。', '下采样或通道不匹配的块不能直接使用此例的恒等相加。'],
    pitfall: '最后投影中的“线性”指不再添加非线性激活；不能在窄输出后随意补ReLU而仍声称完全等同原块。',
    quiz: { question: '这个块的16通道输入使用扩展倍率6，扩展后是多少通道？', options: ['6', '22', '96', '256'], answer: 2, explanation: '中间扩展宽度为16×6=96，随后逐通道滤波，再线性投影回16。' },
    layers: [
      layer('input', '窄输入', 'stride=1、16通道，输入同时保留给残差支路。', '16 × 16 × 16'),
      layer('expand', '1×1扩展', '16→96通道，配合BN与ReLU6。', '16 × 16 × 96'),
      layer('depthwise', '3×3逐通道卷积', '96个通道独立滤波，padding=1保持宽高，接BN/ReLU6。', '16 × 16 × 96'),
      layer('project', '线性瓶颈投影', '1×1把96通道投影到16，带BN、不加ReLU6。', '16 × 16 × 16'),
      layer('output', '残差输出', '把投影结果与原输入逐元素相加。', '16 × 16 × 16')
    ],
    references: [{ label: 'Sandler et al., 2018 · MobileNetV2', url: 'https://arxiv.org/abs/1801.04381' }]
  },
  {
    id: 'efficientnet', name: 'EfficientNet-B0', fullName: 'EfficientNet · 复合缩放卷积网络家族', category: 'vision',
    year: 2019, yearNote: 'EfficientNet 原论文年份；图示选择B0基线', level: '进阶',
    prerequisites: ['mobilenet-v2'], learningGoal: '能区分B0的前向结构与跨模型的深度、宽度、分辨率复合缩放规则。',
    tagline: '协调增加深度、宽度和分辨率，而非只堆层数。',
    description: 'B0以MBConv和SE组成分阶段卷积网络。图示是B0从224×224输入到分类头的分组结构；B1–B7由缩放规则导出，缩放系数不是推理时的一层。',
    input: '224 × 224 × 3 RGB 图', output: '1000 类概率',
    formula: 'd = αᵠ, w = βᵠ, r = γᵠ; αβ²γ² ≈ 2',
    formulaExplanation: 'φ控制模型规模，α、β、γ分别控制深度、宽度与输入分辨率的增长；在近似卷积成本模型下使φ增加1时预算约翻倍。实际层数和通道还需取整。',
    keyPoints: ['B0是搜索得到的基线结构，主要使用带SE的MBConv。', 'SE对汇聚后的通道描述计算门控，再对空间特征通道重标定。', '缩放规则用于构建一组模型；它不保证所有硬件上的延迟、能耗都按同一比例变化。'],
    pitfall: '不能把B7的精度、训练预算或输入尺寸归给B0；参数量、理论FLOPs和实际速度也是不同指标。',
    quiz: { question: 'EfficientNet的compound scaling协调改变哪三项？', options: ['学习率、随机种子、标签数', '深度、通道宽度、输入分辨率', '只改变卷积核大小', '只改变输出类别数'], answer: 1, explanation: '原方法以一个复合系数协调深度、宽度和分辨率的缩放。' },
    layers: [
      layer('input', 'B0图像输入', '选择224×224的B0配置；不代表其他家族成员输入相同。', '224 × 224 × 3'),
      layer('stem', 'Stem卷积', '3×3卷积、stride=2，将输入变成32通道特征。', '112 × 112 × 32'),
      layer('stages', 'MBConv与SE阶段', '依次经过16/24/40/80/112/192/320通道阶段，分阶段下采样到7×7。', '7 × 7 × 320'),
      layer('pool', '特征头与汇聚', '1×1投影到1280通道，再做全局平均池化。', '7 × 7 × 1280 → 1280'),
      layer('output', '分类输出', '分类线性层产生1000 logits，再做softmax；dropout属于训练配置。', '1000')
    ],
    references: [{ label: 'Tan & Le, 2019 · EfficientNet', url: 'https://arxiv.org/abs/1905.11946' }]
  },
  {
    id: 'convnext', name: 'ConvNeXt', fullName: 'A ConvNet for the 2020s', category: 'vision',
    year: 2022, yearNote: 'ConvNeXt 原论文年份；此图选择v1核心块', level: '进阶',
    prerequisites: ['resnet', 'mobilenet-v2'], learningGoal: '能识别ConvNeXt的depthwise大卷积核、通道扩展与残差路径。',
    tagline: '借鉴现代训练与结构设计，继续发展纯卷积骨干。',
    description: '展示14×14×96的单个v1风格核心块，通道扩展倍率4；该宽高与通道组合是教学设定，不等同某个完整Tiny模型阶段。完整网络还包含stem、降采样和多个阶段。',
    input: '14 × 14 × 96 特征图', output: '14 × 14 × 96 残差特征',
    formula: 'Y = X + γ ⊙ W₂ GELU(W₁ LN(DW7×7(X)))',
    formulaExplanation: '7×7 depthwise卷积混合空间邻域，LayerNorm后用点式线性映射96→384→96混合通道；γ表示v1中的LayerScale，沿空间广播。',
    keyPoints: ['大核depthwise卷积与点式通道映射分工不同。', '块内采用LayerNorm、GELU和倒瓶颈式通道扩展，而不是在每个卷积后重复BN/ReLU。', '借鉴Transformer设计不意味着网络在使用自注意力；这里的空间混合仍是卷积。'],
    pitfall: '不要把ConvNeXt v1的LayerScale块与v2加入GRN的版本混写；单个块的复杂度也不等于完整骨干的复杂度。',
    quiz: { question: 'ConvNeXt在这个块中用什么操作进行空间邻域混合？', options: ['全局softmax自注意力', '7×7 depthwise卷积', '随机丢弃全部通道', '只用全连接分类器'], answer: 1, explanation: 'DW7×7承担空间混合，后面的点式映射主要处理通道。' },
    layers: [
      layer('input', '块输入', '输入保留给残差路径；此例省略批次维。', '14 × 14 × 96'),
      layer('depthwise', '大核逐通道卷积', '96通道分别进行7×7、padding=3卷积，保持空间尺寸。', '14 × 14 × 96'),
      layer('expand', '归一化与通道扩展', 'LayerNorm后逐位置进行96→384线性映射。', '14 × 14 × 384'),
      layer('project', 'GELU与投影', 'GELU后映射384→96，并应用LayerScale；训练时可配置随机深度。', '14 × 14 × 96'),
      layer('output', '残差输出', '变换支路与原输入逐元素相加。', '14 × 14 × 96')
    ],
    references: [{ label: 'Liu et al., 2022 · ConvNeXt', url: 'https://arxiv.org/abs/2201.03545' }, { label: 'Meta作者实现 · Block的卷积、LayerNorm与LayerScale', url: 'https://github.com/facebookresearch/ConvNeXt/blob/main/models/convnext.py' }]
  },
  {
    id: 'bert', name: 'BERT', fullName: 'Bidirectional Encoder Representations from Transformers', category: 'attention',
    year: 2018, yearNote: 'BERT原预印本年份；正式语言学会议论文为2019年', level: '进阶',
    prerequisites: ['transformer'], learningGoal: '能解释双向编码器与masked language modeling，并与因果语言模型比较。',
    tagline: '让被遮住的位置同时利用左右文。',
    description: '选择BERT-Base uncased的12层、768维编码器与30522词表，画出8个token中两个被遮位置的MLM分支。两个mask是演示设定，不是原训练mask比例；原模型的NSP分支未绘出。',
    input: '含被遮位置的8个token', output: '两个被遮位置的词表分布及预测token',
    formula: 'LMLM = −Σᵢ∈M log pθ(xᵢ | xcorrupted)',
    formulaExplanation: 'M是训练时选中的预测位置，编码器可以利用左右两侧上下文。原BERT对选中位置混用[MASK]、随机替换与保留原词，并非全部都替换为[MASK]。',
    keyPoints: ['Encoder的双向可见性与GPT式从左到右的因果mask不同。', '原BERT输入表示相加token、segment和position嵌入。', 'MLM预训练头、原始NSP头与下游任务头应分别区分；并非每个任务都输出词表概率。'],
    pitfall: 'BERT的双向编码不是训练时偷看未遮住的正确答案；目标位置经过破坏，训练目标与普通逐token自回归似然不同。',
    quiz: { question: 'BERT的被遮位置通常可以利用哪些上下文？', options: ['只有左文', '只有右文', '左右两侧可见上下文', '只能使用该位置原本的真实标签'], answer: 2, explanation: '双向encoder让该位置与左右文交互；标签仅用于损失计算，不作为被遮位置的正确输入直接提供。' },
    layers: [
      layer('tokens', '含Mask的token', '八个token中选择两个[MASK]作示意；这不是预训练mask比例的精确缩放。', '8 个token'),
      layer('embedding', '三类嵌入相加', 'Token、segment与位置嵌入相加，维度均为768。', '8 × 768'),
      layer('encoder', '双向Encoder', '12个BERT-Base编码块，每块含多头双向自注意力与前馈子层。', '8 × 768'),
      layer('mlm', 'MLM词表头', '抽取两个被预测位置，经MLM变换和词表投影得到logits。', '2 × 30522'),
      layer('output', '被遮位置预测', '对每个位置的词表维做softmax，可选出两个token；不是一个句子的类别概率。', '2 个词表分布 → 2 个token')
    ],
    references: [{ label: 'Devlin et al. · BERT原论文', url: 'https://arxiv.org/abs/1810.04805' }, { label: 'Google Research · BERT原始实现', url: 'https://github.com/google-research/bert' }, { label: 'BERT-Base uncased · 层数、维度与词表配置', url: 'https://huggingface.co/google-bert/bert-base-uncased/blob/main/config.json' }]
  },
  {
    id: 'gpt', name: 'GPT', fullName: 'Generative Pre-trained Transformer · 因果解码器语言模型', category: 'attention',
    year: 2018, yearNote: 'Improving Language Understanding by Generative Pre-Training 报告节点', level: '进阶',
    prerequisites: ['transformer'], learningGoal: '能写出自回归概率分解，并说明训练并行与生成逐步进行为何不矛盾。',
    tagline: '每个位置只使用此前上下文，预测下一个token。',
    description: '以GPT式decoder-only语言模型为对象，使用8个token、32维、2个因果块与1000词表的缩略示意。这些不是2018原模型的实际规模，也不把GPT各代产品视为已公开的同一拓扑。',
    input: '8个上下文token', output: '每位置下一token分布；生成时选择一个新token',
    formula: 'p(x₁:T) = ∏ₜ₌₁ᵀ p(xₜ | x₁:ₜ₋₁)',
    formulaExplanation: '训练时每个输入位置预测下一个token；也可把目标右移后构造输入，在因果mask下并行计算损失。生成时当前分布产生下一个token，再把它加入上下文继续计算。',
    keyPoints: ['Decoder-only这里不含编码器—解码器cross-attention。', '因果mask阻止当前位置访问未来token；已知训练序列不等于允许看未来标签。', '同一生成分布可以采用不同解码策略；采样温度不是模型新增的一层。'],
    pitfall: '网站缩略结构不能被称为GPT-4等未完整公开系统的准确内部架构；预训练目标、模型规模与后训练也需要区分。',
    quiz: { question: '自回归生成出一个新token后，下一步通常怎么做？', options: ['把新token加入上下文再预测', '让过去token查看未来标签', '删除全部模型权重', '直接得到整段未来文本的真实标签'], answer: 0, explanation: '自回归生成不断扩展已知前缀，每一步产生下一个token的条件分布。' },
    layers: [
      layer('tokens', '上下文token', '输入8个token ID，各位置标签为下一个token。例如输入[x₁,x₂]对应目标[x₂,x₃]。', '8 个token'),
      layer('embedding', '词与位置嵌入', '缩略例将token映射到32维，并加入位置信息。', '8 × 32'),
      layer('decoder', '因果Decoder堆叠', '两个32维块，示意4个8维注意力头；每个块还包含前馈与残差路径。', '8 × 32'),
      layer('head', '语言模型头', '逐位置投影到1000词表，训练时各位置可并行评分。', '8 × 1000'),
      layer('output', '下一token与续写', '生成时使用最后位置分布选一个token，再反馈到前缀；不代表本页正在执行采样。', '1 个新增token / 步')
    ],
    references: [{ label: 'Radford et al., 2018 · 原始GPT报告', url: 'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf' }, { label: 'OpenAI · 原始finetune-transformer-lm实现', url: 'https://github.com/openai/finetune-transformer-lm' }]
  },
  {
    id: 't5', name: 'T5', fullName: 'Text-to-Text Transfer Transformer', category: 'attention',
    year: 2019, yearNote: 'T5原预印本年份；JMLR期刊论文为2020年', level: '进阶',
    prerequisites: ['transformer', 'gpt'], learningGoal: '能区分T5的encoder、自回归decoder与cross-attention，并解释text-to-text任务统一。',
    tagline: '把不同语言任务统一成“文本输入，文本输出”。',
    description: '展示源端6个token、目标端4个右移token、32维和1000词表的encoder–decoder示意。图中目标自注意力与cross-attention/FFN属于同一个decoder块的不同子层，并不是两个独立模型。',
    input: '源文本6个token与右移目标4个token', output: '目标4个位置的词表分布',
    formula: 'p(y | x) = ∏ₜ p(yₜ | x, y₍<t₎)',
    formulaExplanation: 'Encoder可双向阅读源文本x；decoder以因果方式阅读目标前缀，并通过cross-attention访问encoder表示。预训练可用sentinel标记被删除的连续片段，目标是相应片段序列。',
    keyPoints: ['分类、翻译、摘要等任务都可用文本形式表达输入和目标，但任务监督与评分仍各不相同。', 'Cross-attention中的Q来自目标端，K/V来自源端，不要求源目标长度相等。', '原T5使用相对位置偏置；它不是简单给BERT接一个相同的MLM头。'],
    pitfall: '目标端输入必须右移或进行相应因果遮罩；把未移位的真实目标直接暴露给预测位置会造成标签泄漏。',
    quiz: { question: '这个T5示例cross-attention的Q、K/V分别来自哪里？', options: ['都来自未来目标标签', 'Q来自源端，K/V来自目标端', 'Q来自目标端，K/V来自源端encoder', '三者必须是同一个矩阵'], answer: 2, explanation: '目标位置查询源文本表示，因此Q有4个位置，而K/V可有6个源位置。' },
    layers: [
      layer('input', '源与右移目标', '源序列长6；目标序列长4，训练时按自回归规则右移。', '源6 + 目标4 个token'),
      layer('encoder', '源Encoder', '源token映射到32维并经过双向编码，保留6个源位置。', '6 × 32'),
      layer('self', '目标因果自注意力', '右移目标嵌入为4×32；这是decoder块的masked self-attention子层。', '4 × 32'),
      layer('cross', 'Cross-attention与FFN', '目标Q读取6×32源K/V，再接FFN；与上一项共同构成decoder块，并可重复。', 'Q:4×32；K/V:6×32 → 4×32'),
      layer('output', '目标词表头', '逐目标位置映射到1000词表；生成时则逐步产生目标token。', '4 × 1000')
    ],
    references: [{ label: 'Raffel et al. · T5原论文', url: 'https://arxiv.org/abs/1910.10683' }, { label: 'Google Research · T5原始实现', url: 'https://github.com/google-research/text-to-text-transfer-transformer' }]
  },
  {
    id: 'swin', name: 'Swin Transformer', fullName: 'Hierarchical Vision Transformer using Shifted Windows', category: 'attention',
    year: 2021, yearNote: 'Swin Transformer原论文年份；图示采用Tiny型阶段宽度', level: '深入',
    prerequisites: ['vit'], learningGoal: '能解释窗口、移位窗口与patch merging各自如何改变可见范围或特征形状。',
    tagline: '局部窗口省计算，移位窗口交换信息。',
    description: '以224×224输入、4×4 patch和Tiny型96→192→384→768通道层次说明Swin。前两个注意力模块强调相邻W-MSA与SW-MSA块，末项合并后续阶段和分类头，并非只执行两次注意力。',
    input: '224 × 224 × 3 图像', output: '1000类概率；中间为多尺度特征',
    formula: 'Attnwindow(Q,K,V) = softmax(QKᵀ / √d + B + M) V',
    formulaExplanation: 'B为相对位置偏置，M为窗口实现所需的attention mask。移位后需要屏蔽循环移位产生的错误边界连接；这不是语言模型的因果mask。',
    keyPoints: ['固定窗口7×7时，56×56网格可分为64个窗口，每窗49个token。', '交替普通和移位窗口可建立跨窗口连接，但单个窗口块并不立即等于全局注意力。', 'Patch merging把2×2邻域的4C拼接后映射到2C，宽高各减半。'],
    pitfall: '窗口平移不是把图像随意滚动后直接跨边界注意；实现mask是保持正确邻域关系的重要部分。',
    quiz: { question: '56×56×96特征经一次标准patch merging后，形状是什么？', options: ['28×28×192', '56×56×384', '112×112×48', '28×28×96'], answer: 0, explanation: '2×2邻域合并使宽高减半；拼接后的384通道经线性映射压到192通道。' },
    layers: [
      layer('patch', 'Patch嵌入', '224×224图像切为4×4 patch并映射到96维，形成56×56网格。', '56 × 56 × 96'),
      layer('window', '窗口注意力块', '使用7×7普通窗口；每块还有归一化、残差与MLP。', '64 个窗口 × 49 × 96'),
      layer('shift', '移位窗口块', '下一块移动窗口划分并使用边界mask，再恢复空间网格。', '56 × 56 × 96'),
      layer('merge', 'Patch Merging', '第一阶段后合并2×2邻域，投影4C→2C。', '28 × 28 × 192'),
      layer('head', '后续层次与分类', '继续28²×192→14²×384→7²×768阶段；Tiny型深度为2/2/6/2，再汇聚并分类。', '7 × 7 × 768 → 1000')
    ],
    references: [{ label: 'Liu et al., 2021 · Swin原论文', url: 'https://arxiv.org/abs/2103.14030' }, { label: 'Microsoft · Swin官方实现', url: 'https://github.com/microsoft/Swin-Transformer' }]
  },
  {
    id: 'performer', name: 'Performer', fullName: 'Performer · FAVOR+ 随机特征注意力', category: 'attention',
    year: 2020, yearNote: 'Rethinking Attention with Performers 原预印本年份，非会议认证字段', level: '深入',
    prerequisites: ['transformer'], learningGoal: '能写出随机特征注意力的重排形式，并说明近似误差与线性序列复杂度的条件。',
    tagline: '用正随机特征近似softmax核，避免构造完整两两矩阵。',
    description: '展示长度8、模型维32、4个8维头、每头16个随机特征的非因果attention子层。FAVOR+以正交正随机特征近似softmax核；因果版本需把全局汇总改为前缀汇总。',
    input: '8 × 32 序列表示', output: '8 × 32 注意力子层表示',
    formula: 'Y ≈ [φ(Q)(φ(K)ᵀV)] / [φ(Q)(φ(K)ᵀ1)]',
    formulaExplanation: '按每个头计算，分母按行广播。先计算16×8的KV汇总及16维归一化统计，再供8个query读取；无需显式保存8×8的注意力矩阵。Q/K的缩放包含在核特征映射定义中。',
    keyPoints: ['随机特征近似的是注意力核，不是直接删去所有远处token。', '固定特征数与头宽时，序列长度方向的时间/空间成本可线性增长；特征数也影响精度和成本。', '归一化分母不可随意删除，否则一般不再是同一个归一化attention近似。'],
    pitfall: '有限随机特征不保证每次输出与精确softmax注意力完全相同；也不能把非因果全局汇总直接用于因果生成而不改计算顺序。',
    quiz: { question: 'Performer为何能避免显式构造长度×长度的attention矩阵？', options: ['它不需要输入', '先计算φ(K)ᵀV等小型统计，再由φ(Q)读取', '把所有query强制设为零', '输出与输入无关'], answer: 1, explanation: '核分解与矩阵乘法重排使计算通过特征维汇总进行，而不是保存每一对token的分数。' },
    layers: [
      layer('qkv', '多头Q/K/V', '32维投影分为4个头，每头Q/K/V维度8。', '8 × 4 × 8'),
      layer('features', '正随机特征', '每头把Q和K映射到16维正特征，用于近似softmax核。', 'Qφ/Kφ:8 × 4 × 16'),
      layer('summary', 'KV与分母汇总', '每头计算φ(K)ᵀV与φ(K)ᵀ1；此图是非因果汇总。', '4 × (16×8 + 16)'),
      layer('read', '归一化读取', '每个query读取汇总，并逐行除以正归一化项。', '8 × 4 × 8'),
      layer('output', '拼头与投影', '4个8维头拼为32维，再做输出投影；完整模型还包含FFN等子层。', '8 × 32')
    ],
    references: [{ label: 'Choromanski et al. · Performer原论文', url: 'https://arxiv.org/abs/2009.14794' }, { label: 'Google Research · Performer原始实现', url: 'https://github.com/google-research/google-research/tree/master/performer' }]
  },
  {
    id: 'retnet', name: 'RetNet', fullName: 'Retentive Network · 多尺度Retention', category: 'attention',
    year: 2023, yearNote: 'Retentive Network原预印本年份；标题中的successor是作者定位', level: '深入',
    prerequisites: ['transformer', 'rnn'], learningGoal: '能连接retention的并行与递归形式，并区分它与softmax注意力。',
    tagline: '同一因果Retention可并行计算，也可递归更新状态。',
    description: '展示8×32输入、4个头、每头8×8状态的多尺度retention子层。按相关机制放在attention谱系中，但它以带衰减的retention代替softmax注意力；完整RetNet还堆叠FFN。',
    input: '8 × 32 因果序列表示', output: '8 × 32 子层表示；每头递归状态8×8',
    formula: 'Sₜ = γSₜ₋₁ + kₜᵀvₜ; yₜ = qₜSₜ',
    formulaExplanation: 'q、k、v按行向量书写，q/k包含相对位置相位，γ为每头的衰减系数。输出还需多头拼接、逐头GroupNorm、swish门控与输出投影；式子不是softmax概率。',
    keyPoints: ['并行、递归与chunkwise三种计算形式描述同一类因果retention，而非三个互不相关模型。', '不同头采用不同衰减尺度；头状态大小取决于头宽，不随已处理token数增长。', '原设计用GroupNorm分别归一化各头输出，再用输入相关门控增强非线性。'],
    pitfall: '常数大小状态指相对序列长度，不是相对模型宽度；它也不表示能无损保存任意长历史或所有任务都优于Transformer。',
    quiz: { question: '固定头维度时，递归RetNet的单头状态S大小如何随前缀长度变化？', options: ['每个token增加一行KV', '保持固定大小', '必定变成一个标量', '等于完整attention矩阵'], answer: 1, explanation: 'S累积为固定的key维×value维矩阵；它压缩历史，而不逐token存储无限增长的KV缓存。' },
    layers: [
      layer('qkv', '投影、相位与衰减', '8×32输入映射到四个8维头的Q/K/V；Q/K携带位置相位，各头使用自己的γ。', '8 × 4 × 8'),
      layer('state', '递归状态更新', '每头以外积kₜᵀvₜ写入8×8矩阵，并按γ衰减旧状态。', '4 × 8 × 8'),
      layer('heads', '多尺度读取', 'qₜ读取各头状态。并行形式则使用带因果指数衰减的两两权重。', '8 × 4 × 8'),
      layer('gate', '逐头归一化与门控', '拼接为32维，按头GroupNorm，再乘以swish(XWg)门。', '8 × 32'),
      layer('output', '输出投影与残差', '输出投影后与输入残差相加；后续FFN属于完整RetNet块的另一子层。', '8 × 32')
    ],
    references: [{ label: 'Sun et al., 2023 · RetNet原论文', url: 'https://arxiv.org/abs/2307.08621' }, { label: 'Microsoft · RetNet官方实现', url: 'https://github.com/microsoft/torchscale/tree/main/torchscale/architecture' }]
  },
  {
    id: 'rwkv', name: 'RWKV', fullName: 'Receptance Weighted Key Value · 2023论文版本', category: 'sequence',
    year: 2023, yearNote: 'Reinventing RNNs for the Transformer Era论文节点；此处采用v4型机制', level: '深入',
    prerequisites: ['rnn', 'gpt'], learningGoal: '能说明token shift、逐通道WKV统计与递归推理，并与完整QK注意力区分。',
    tagline: '用逐通道衰减统计连接并行训练与循环生成。',
    description: '选择2023论文的v4型RWKV，展示8个token、32维与1000词表的单块缩略语言模型。机制归入序列网络；后续RWKV版本的状态与门控有变化，不能直接套用这张图。',
    input: '8 × 32 嵌入表示，或逐步输入一个token', output: '8 × 1000 下一token logits；递归统计与前态',
    formula: 'wkvₜ = [Σᵢ<t e^{−(t−1−i)w+kᵢ}⊙vᵢ + e^{u+kₜ}⊙vₜ] / [Σᵢ<t e^{−(t−1−i)w+kᵢ} + e^{u+kₜ}]',
    formulaExplanation: '运算均逐通道进行；这里w>0表示正衰减率，可由exp(θ)参数化，代码也可能直接存−exp(θ)并相应改写符号。u调整当前token贡献；输出再经receptance门与投影。历史分子/分母可递归更新。',
    keyPoints: ['Token shift以可学习插值混合当前和上一时刻输入，再产生time-mixing与channel-mixing投影。', 'WKV核心可用每通道分子a、分母b统计表示；稳定实现还缓存指数尺度及移位所需前态。', 'Channel-mixing是另一个带门控的逐位置变换；2023论文采用平方ReLU，不能与time-mixing混为同一操作。'],
    pitfall: '递归状态固定于序列长度不等于历史信息无损；也不表示所有RWKV版本都只有两个状态向量或使用同一WKV公式。',
    quiz: { question: '这个RWKV版本的WKV历史汇总主要保存什么？', options: ['整个长度×长度softmax矩阵', '每个通道的衰减分子/分母统计', '所有未来token的标签', '只有输入图像的卷积核'], answer: 1, explanation: '历史信息通过逐通道加权统计累积；额外的移位输入与稳定化状态也要保留，但不需要随前缀增长的完整attention矩阵。' },
    layers: [
      layer('input', '序列嵌入', '缩略例把8个token表示为32维；实际模型有更多层与不同词表。', '8 × 32'),
      layer('shift', 'Token Shift与Time-mix', '混合xₜ和xₜ₋₁，再分别投影出r、k、v；这些投影可有各自插值系数。', '8 × 32'),
      layer('wkv', 'WKV与输出门控', '逐通道聚合衰减历史，核心a/b各32维，再乘receptance门并投影；实现还需其他前态。', '8 × 32；a/b各32'),
      layer('channel', 'Channel-mixing', '另一个token-shift门控子层，示意32→128→32的平方ReLU通道变换，并配合残差。', '8 × (32 → 128 → 32)'),
      layer('output', '语言模型头', '最终表示投影到1000词表logits；生成时逐步产生token，不是并行生成全部未来。', '8 × 1000')
    ],
    references: [{ label: 'Peng et al., 2023 · RWKV原论文', url: 'https://arxiv.org/abs/2305.13048' }, { label: '作者实现 · RWKV-LM', url: 'https://github.com/BlinkDL/RWKV-LM' }]
  }
].map(teachingModel);
