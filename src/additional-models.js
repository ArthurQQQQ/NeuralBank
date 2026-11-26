// Small, explicitly specified teaching configurations; diagrams do not execute inference.
// Spatial dimensions are H × W × C; sequence examples omit the batch dimension.
export const additionalModels = [
  {
    id: 'gru', name: 'GRU', fullName: '门控循环单元', category: 'sequence',
    tagline: '用两个门，在旧状态与新候选之间做选择。',
    description: '用更新门和重置门调节循环状态，不单独维护 LSTM 的细胞状态。本例使用 3 维输入、6 维隐藏状态及 2 类逐步分类头；候选计算采用 Cho 等人的 reset-before 形式。',
    year: 2014, yearNote: 'Cho 等人在 RNN Encoder–Decoder 中提出门控单元', level: '进阶',
    prerequisites: ['rnn'], learningGoal: '能说明重置门、更新门各控制什么，并辨别不同教材的更新门约定。',
    input: 'T 个 3 维向量', output: '每步 2 类概率',
    formula: 'hₜ = zₜ ⊙ hₜ₋₁ + (1 − zₜ) ⊙ h̃ₜ',
    formulaExplanation: '本页中 zₜ 越接近 1，旧状态保留越多。候选 h̃ₜ = tanh(Wxₜ + U(rₜ ⊙ hₜ₋₁) + b)，rₜ 控制旧状态参与候选计算的程度。',
    keyPoints: ['rₜ、zₜ 都是 6 维 sigmoid 门，在同一时间步分别计算。', '没有独立的 cₜ；隐藏状态 hₜ 同时承担记忆和对外表示。', '有的文献把 z 的两项权重对调；PyTorch 的候选还采用 reset-after 变体，比较公式时要先核对约定。'],
    pitfall: '重置门影响候选状态的计算，不直接清空最终隐藏状态；即使 rₜ 接近零，更新门仍可能保留旧 hₜ₋₁。',
    quiz: { question: '按本页公式，zₜ ≈ 1 时隐藏状态主要来自哪里？', options: ['新候选 h̃ₜ', '上一时刻 hₜ₋₁', '固定的零向量', '分类 softmax'], answer: 1, explanation: 'hₜ = zₜ ⊙ hₜ₋₁ + (1 − zₜ) ⊙ h̃ₜ，因此 zₜ ≈ 1 时 hₜ ≈ hₜ₋₁。' },
    layers: [
      { id: 'input', label: '输入与前态', detail: '每步接收 3 维 xₜ 与 6 维 hₜ₋₁；h₀ 在本例设为零。', shape: '3 + 6 / 每步' },
      { id: 'gates', label: '重置与更新门', detail: '从 [xₜ,hₜ₋₁] 分别计算 6 维 rₜ 和 zₜ，使用独立权重及 sigmoid；它们不是相邻时间步。', shape: '2 × 6 / 每步' },
      { id: 'candidate', label: '候选隐藏态', detail: '先做 rₜ ⊙ hₜ₋₁，再经 U 变换；与输入分支相加后用 tanh，得到 h̃ₜ。', shape: '6 / 每步' },
      { id: 'hidden', label: '隐藏态混合', detail: '逐元素组合 zₜ ⊙ hₜ₋₁ 与 (1 − zₜ) ⊙ h̃ₜ；hₜ 被传给下一时间步。', shape: '6 / 每步' },
      { id: 'output', label: '逐步输出', detail: '额外的共享 Linear(6, 2) 和 softmax 把每步 hₜ 转成 2 类概率；分类头不属于 GRU 单元本身。', shape: 'T × 2' }
    ],
    references: [{ label: 'Cho et al., 2014 · GRU 原始方程', url: 'https://arxiv.org/abs/1406.1078' }]
  },
  {
    id: 'unet', name: 'U-Net', fullName: 'U 形分割网络', category: 'vision',
    tagline: '把语义上下文与浅层细节，在相同分辨率处接起来。',
    description: '编码路径提取上下文，解码路径恢复空间分辨率，跳连补充细节。本页是仅一次下采样的 same-padding 教学变体；原始 U-Net 使用 valid 卷积，并在拼接前裁剪编码特征。',
    year: 2015, yearNote: 'U-Net 生物医学图像分割论文', level: '进阶',
    prerequisites: ['cnn'], learningGoal: '能追踪下采样、上采样和通道拼接，并区分分割与整图分类。',
    input: '32 × 32 × 1 灰度图', output: '32 × 32 × 2 像素概率',
    formula: 'd = ConvBlock(concat(Up(b), e))',
    formulaExplanation: 'e 是浅层编码特征，b 是低分辨率瓶颈；上采样后沿通道维拼接，再用卷积融合。空间尺寸必须对齐。',
    keyPoints: ['下采样减少空间尺寸；更深处通常增加通道数以表示语义。', 'U-Net 典型跳连使用 concat，ResNet 典型跳连使用逐元素相加。', '1 × 1 卷积把每个像素的特征映射到类别 logits，本例沿类别维做 softmax。'],
    pitfall: '拼接要求空间尺寸相同，但不要求通道数相同；两支各 8 通道会得到 16 通道，不是仍为 8。',
    quiz: { question: '两个 32 × 32 × 8 特征图沿通道维拼接，结果是什么？', options: ['64 × 64 × 8', '32 × 32 × 8', '32 × 32 × 16', '16 × 16 × 16'], answer: 2, explanation: 'concat 保留高和宽，把通道数量相加：8 + 8 = 16。' },
    layers: [
      { id: 'input', label: '图像输入', detail: '输入为 32 × 32 的单通道图像；本例所有 3 × 3 卷积使用 stride = 1、padding = 1。', shape: '32 × 32 × 1' },
      { id: 'encoder', label: '编码特征', detail: '两次 3 × 3 卷积与 ReLU，输出 8 通道；保留这份特征 e，供解码路径跳连使用。', shape: '32 × 32 × 8' },
      { id: 'down', label: '下采样', detail: '2 × 2 最大池化，stride = 2，空间尺寸减半，通道数不变。', shape: '16 × 16 × 8' },
      { id: 'bottleneck', label: '瓶颈特征', detail: '两次 3 × 3 卷积与 ReLU，将通道数变为 16；此处得到低分辨率表示 b。', shape: '16 × 16 × 16' },
      { id: 'skip', label: '上采样与拼接', detail: '2 × 2、stride = 2 的转置卷积输出 32 × 32 × 8；与编码特征 e 沿通道拼接，得到 16 通道。', shape: '32 × 32 × 16' },
      { id: 'decoder', label: '解码融合', detail: '两次 3 × 3 卷积与 ReLU，把拼接结果融合为 8 通道，并保持 32 × 32 空间尺寸。', shape: '32 × 32 × 8' },
      { id: 'output', label: '逐像素分类', detail: '1 × 1 卷积输出 2 类 logits；对每个像素分别做 softmax。输出是一张分割概率图。', shape: '32 × 32 × 2' }
    ],
    references: [{ label: 'Ronneberger et al., 2015 · U-Net', url: 'https://arxiv.org/abs/1505.04597' }]
  },
  {
    id: 'vit', name: 'ViT', fullName: '视觉 Transformer', category: 'attention',
    tagline: '把图像切成 patch，让 Transformer 读取图像序列。',
    description: '将图像分块并线性嵌入，加入分类 token 和位置信息，再送入 Transformer 编码器。本页使用 32 × 32 图像、8 × 8 patch、32 维表示；这些是教学尺寸，不是 ViT-Base 配置。',
    year: 2020, yearNote: 'ViT 预印本；ICLR 2021 发表', level: '深入',
    prerequisites: ['transformer'], learningGoal: '能计算 patch 数量与 token 形状，解释 CLS token 如何汇聚分类信息。',
    input: '32 × 32 × 3 彩色图', output: '2 类概率',
    formula: 'N = HW / P²,  Z₀ = [xCLS; XP E] + Epos',
    formulaExplanation: 'P = 8，因此 N = (32/8)² = 16。每个 patch 展平为 8 × 8 × 3 = 192 维，再投影到 32 维；加上 CLS 后共 17 个 token。',
    keyPoints: ['patch 划分确定序列长度；patch 更小通常意味着更长的序列。', '原始 ViT 使用 Pre-LN 编码器，并在整个编码器堆叠后再次做 LayerNorm。', '本例用 CLS 输出进行分类；也存在平均池化等变体，CLS 不是所有视觉 Transformer 的必选项。'],
    pitfall: 'patch 不是一个原始像素。模型接收的是各 patch 的嵌入序列；分类头只读取本例的 CLS 表示，不为每个像素输出类别。',
    quiz: { question: '32 × 32 图像用不重叠的 8 × 8 patch 分块，加一个 CLS token 后有几个 token？', options: ['4', '16', '17', '65'], answer: 2, explanation: '每边 32/8 = 4 块，共 4 × 4 = 16 个 patch；再加一个 CLS，序列长度为 17。' },
    layers: [
      { id: 'patches', label: '图像分块', detail: '把 32 × 32 × 3 图像切成 16 个不重叠的 8 × 8 patch；每块展开成 192 维向量。', shape: '16 × 192' },
      { id: 'embedding', label: 'Patch 投影', detail: '对所有 patch 使用同一个 Linear(192, 32)，产生 16 个 32 维 token。', shape: '16 × 32' },
      { id: 'positions', label: 'CLS 与位置', detail: '在序列前加入可学习的 32 维 CLS token，再加上形状为 17 × 32 的位置嵌入。', shape: '17 × 32' },
      { id: 'encoder', label: 'Transformer 编码器', detail: '示例编码器使用 Pre-LN：u = z + MHA(LN(z))，再做 z′ = u + MLP(LN(u))；4 个头各 8 维，MLP 为 32 → 64 → 32，使用 GELU。', shape: '17 × 32' },
      { id: 'head', label: 'CLS 分类头', detail: '对编码结果做最终 LayerNorm，取 CLS 的 32 维表示，再用 Linear(32, 2) 分类。', shape: '32 → 2' },
      { id: 'output', label: '类别输出', detail: '对两个 logits 做 softmax，得到整张图像的 2 类概率。', shape: '2' }
    ],
    references: [{ label: 'Dosovitskiy et al., 2020 · ViT', url: 'https://arxiv.org/abs/2010.11929' }]
  },
  {
    id: 'vae', name: 'VAE', fullName: '变分自编码器', category: 'generative',
    tagline: '学习潜变量的分布，让重建与采样共享一个模型。',
    description: '编码器预测近似后验的参数，用重参数化抽样，再由解码器定义输入的条件分布。本例使用 784 维二值图像、8 维对角高斯潜变量与 Bernoulli 解码分布。',
    year: 2013, yearNote: 'Auto-Encoding Variational Bayes 预印本；ICLR 2014', level: '深入',
    prerequisites: ['autoencoder'], learningGoal: '能区分潜变量、后验参数和重建，并解释 ELBO 的两部分作用。',
    input: '784 维二值图像', output: '784 维像素 Bernoulli 参数',
    formula: 'L = −E_q[log pθ(x|z)] + KL(qφ(z|x) ‖ N(0,I))',
    formulaExplanation: '这是要最小化的负 ELBO。第一项要求解码分布能解释输入，第二项约束近似后验与先验；期望通常用重参数化样本估计。',
    keyPoints: ['编码器输出 μ 与 log σ²，不是直接输出唯一确定的 z。', '重参数化：z = μ + exp(½ log σ²) ⊙ ε，ε ∼ N(0,I)，使梯度能流向 μ 和 σ。', '生成新样本时从先验 z ∼ N(0,I) 采样，再通过解码器；不必先输入一张图。'],
    pitfall: 'KL 项不要求每个输入的均值都精确等于零；其权衡由整个目标决定。标准 VAE 也不保证每个潜在点都生成高质量样本。',
    quiz: { question: '重参数化中随机噪声 ε 的作用是什么？', options: ['替代所有可训练参数', '在保留随机采样的同时，将 z 写成可对 μ、σ 求导的形式', '让 KL 项恒为零', '提供人工类别标签'], answer: 1, explanation: '把随机性移到与编码器参数独立的 ε 中，z 对 μ、σ 成为可微函数，从而可用路径导数估计重建项的梯度。' },
    layers: [
      { id: 'encoder', label: '输入与编码器', detail: '输入二值图像展开为 784 维，经 Linear(784, 64) 与 ReLU 得到隐藏特征。', shape: '784 → 64' },
      { id: 'distribution', label: '均值与对数方差', detail: '两个独立的 Linear(64, 8) 分支分别输出 μ 和 log σ²，定义对角高斯 qφ(z|x)。', shape: 'μ: 8, log σ²: 8' },
      { id: 'sample', label: '重参数化采样', detail: '抽取 8 维标准正态噪声 ε，计算 z = μ + exp(½ log σ²) ⊙ ε。图中展示一次样本路径。', shape: '8' },
      { id: 'decoder', label: '解码器', detail: 'Linear(8, 64) 与 ReLU 把潜变量映射为解码特征。', shape: '8 → 64' },
      { id: 'output', label: '重建与目标', detail: 'Linear(64, 784) 加 sigmoid 输出各像素的 Bernoulli 参数。重建负对数似然与 μ、σ 分支计算的 KL 一起组成目标；KL 不是输出像素的一层。', shape: '784；损失为标量' }
    ],
    references: [{ label: 'Kingma & Welling, 2013 · VAE', url: 'https://arxiv.org/abs/1312.6114' }]
  },
  {
    id: 'gan', name: 'GAN', fullName: '生成对抗网络', category: 'generative',
    tagline: '让生成器制造样本，让判别器学习区分来源。',
    description: 'GAN 是生成器与判别器之间的训练框架，不限定为某一种网络拓扑。这里用两个小 MLP：G 把 8 维噪声变成 784 维图像，D 对真实与生成样本共用同一组参数。',
    year: 2014, yearNote: 'Goodfellow 等人的生成对抗网络论文', level: '进阶',
    prerequisites: ['mlp'], learningGoal: '能区分生成器和判别器的输入、目标，以及生成阶段实际使用的部分。',
    input: 'G: 8 维噪声；D: 784 维图像', output: 'G: 784 维样本；D: 来源概率',
    formula: 'min_G max_D E_x[log D(x)] + E_z[log(1 − D(G(z)))]',
    formulaExplanation: 'D 最大化正确区分真实与生成样本的目标，G 在原始 minimax 形式中最小化它；两者交替优化。生成器常用的非饱和损失 −log D(G(z)) 与这个 minimax 写法不同。',
    keyPoints: ['真实样本 x 与生成样本 G(z) 并行送入同一个 D，而不是两个判别器。', '更新 G 时冻结 D 的参数，但梯度仍要穿过 D 传回 G；冻结参数不等于切断计算图。', '生成阶段通常只需 z 和 G；对抗训练可能不稳定，也可能发生模式坍塌。'],
    pitfall: '图中的 G、真实数据、D 和损失是训练关系，不是一条从噪声依次穿过全部方框的前向链。',
    quiz: { question: '训练完成后，只想生成一张新图像，通常需要什么？', options: ['真实图像和判别器', '随机噪声和生成器', '人工类别标签和 KL 项', '必须同时更新 G 与 D'], answer: 1, explanation: '从先验分布抽取 z，再计算 G(z) 即可生成样本；普通无条件 GAN 的采样阶段通常不需要 D。' },
    layers: [
      { id: 'noise', label: '噪声输入', detail: '从标准正态先验抽取 z ∈ R⁸。它不由真实图像编码得到。', shape: '8' },
      { id: 'generator', label: '生成器 G', detail: 'Linear(8, 64)、ReLU、Linear(64, 784)、sigmoid 产生 [0,1] 范围的图像向量。', shape: '8 → 64 → 784' },
      { id: 'real', label: '真实样本', detail: '来自数据集的 784 维归一化图像，作为另一条输入分支送入同一个判别器。', shape: '784' },
      { id: 'discriminator', label: '共享判别器 D', detail: 'Linear(784, 64)、LeakyReLU、Linear(64, 1)、sigmoid；分别评估真实和生成样本的来源概率。', shape: '784 → 64 → 1' },
      { id: 'objectives', label: '对抗目标', detail: '根据真实/生成来源计算 D 的目标，并以 D(G(z)) 计算 G 的目标。两组参数分步更新，不能混成同一个最小化目标。', shape: '两个标量目标' }
    ],
    references: [{ label: 'Goodfellow et al., 2014 · GAN', url: 'https://arxiv.org/abs/1406.2661' }]
  },
  {
    id: 'hopfield', name: 'Hopfield', fullName: '经典 Hopfield 联想记忆', category: 'memory',
    tagline: '把记忆存成吸引子，从受损线索逐步恢复状态。',
    description: '一组二值神经元彼此连接，状态在固定权重下反复更新。本页使用 8 个取值为 ±1 的单元、对称权重 W、零对角和零阈值；每次只更新一个单元，局部场为零时保留旧值。',
    year: 1982, yearNote: 'Hopfield 的离散联想记忆经典论文', level: '进阶',
    prerequisites: ['perceptron'], learningGoal: '能用能量函数解释异步检索为何停止，并区分存储权重与检索状态。',
    input: '8 个 ±1 的带噪线索', output: '8 单元稳定状态',
    formula: 'E(s) = −½sᵀWs,  ΔE = −(sᵢ′ − sᵢ)(Ws)ᵢ',
    formulaExplanation: '仅更新 sᵢ：局部场 (Ws)ᵢ > 0 取 +1，小于 0 取 −1，等于 0 时保持原值。W 对称且 Wᵢᵢ = 0 时，发生翻转就严格降低能量。',
    keyPoints: ['一种存储方式是 Hebbian 外积：Wᵢⱼ = (1/8)Σμ ξᵢ^μξⱼ^μ（i ≠ j），再把对角清零。', '在有限状态空间中，公平的逐单元异步更新配合零场不变规则会到达不再翻转的稳定状态。', '检索过程中修改的是 s，W 保持固定；稳定点可能是目标记忆，也可能是伪吸引子。'],
    pitfall: '能量论证不保证恢复任意受损线索，也不保证到达全局最小值。同步更新多个单元可能出现循环，不能直接沿用本页异步收敛结论。',
    quiz: { question: '哪些条件支持本页的能量不增与最终稳定结论？', options: ['任意非对称权重与同步更新', '对称零对角权重、逐单元异步更新、零场不翻转，并公平访问各单元', '每步随机修改所有权重', '只要神经元数量足够多'], answer: 1, explanation: '这些条件使每次实际翻转严格降低能量，有限状态空间排除无限翻转；公平访问保证最终没有遗漏的可翻转单元。' },
    layers: [
      { id: 'cue', label: '输入线索', detail: '将 8 个双极性值组成初始状态 s⁽⁰⁾；受损位可用翻转的 ±1 表示。', shape: '8' },
      { id: 'state', label: '循环记忆状态', detail: '8 个单元共享一个固定的 8 × 8 权重矩阵。连接满足 Wᵢⱼ = Wⱼᵢ，且每个单元没有自连接。', shape: 's: 8；W: 8 × 8' },
      { id: 'update', label: '异步更新与能量', detail: '每次选一个 i 计算局部场，再按符号更新；零场保持旧值。持续公平访问所有单元，直到整轮都不变。', shape: '每次更新 1 个单元' },
      { id: 'recall', label: '检索结果', detail: '输出固定点 s*。它是给定动力学下的吸引结果，不保证等于某个预先存入的模式。', shape: '8' }
    ],
    references: [{ label: 'Hopfield, 1982 · 原始联想记忆论文', url: 'https://authors.library.caltech.edu/records/w41x7-8bn13' }]
  },
  {
    id: 'modern-hopfield', name: 'Modern Hopfield', fullName: '连续状态现代 Hopfield', category: 'memory',
    tagline: '用连续查询和 softmax 关联，检索一组存储模式。',
    description: '本页聚焦 Ramsauer 等人的连续状态模型：8 个 16 维模式按行组成 X，查询 q 为 16 维。使用相同模式计算相似度并返回加权和；这是对应能量模型的 tied-pattern 教学形式。',
    year: 2020, yearNote: '连续状态 Hopfield 预印本；ICLR 2021', level: '深入',
    prerequisites: ['hopfield', 'transformer'], learningGoal: '能推导一次连续联想更新的维度，并准确说明它与注意力操作的联系。',
    input: 'X: 8 × 16；查询 q: 16', output: '16 维联想向量',
    formula: 'q′ = Xᵀ softmax(βXq),  β > 0',
    formulaExplanation: '8 个相似度经 softmax 变为权重，再对 8 个模式取加权和。本页把模式按行存储，与原论文按列存储的 X 记号互为转置。',
    keyPoints: ['对应能量为 E(q) = ½‖q‖² − β⁻¹ log Σᵢ exp(βxᵢᵀq) + 常数；更新以此能量为基础。', '结果可以接近单个模式，也可以混合多个模式；β 与模式分离程度影响关联行为。', '通过查询、键、值投影与合适缩放，可将该更新联系到注意力计算；整个 Transformer 还包含残差、归一化和前馈等结构。'],
    pitfall: '“一次更新必定完美找回任意记忆”不成立；单步准确检索需要模式分离和查询位置等条件。也不能据此把所有 Transformer 直接等同于完整 Hopfield 动力系统。',
    quiz: { question: 'X 为 8 × 16、q 为 16 维时，softmax(βXq) 有多少个权重？', options: ['1', '8', '16', '128'], answer: 1, explanation: 'Xq 为 8 维，每个分量对应一个存储模式；softmax 产生 8 个和为 1 的权重，Xᵀ 再将其映射回 16 维。' },
    layers: [
      { id: 'patterns', label: '存储模式', detail: '8 个 16 维模式按行组成 X；本例以同一份 X 同时参与相似度计算和加权检索。', shape: '8 × 16' },
      { id: 'query', label: '查询状态', detail: 'q 是 16 维连续向量，可来自带噪线索或上游网络。模式与查询是两条汇合的输入分支。', shape: '16' },
      { id: 'scores', label: '关联相似度', detail: '计算 βXq，为 8 个模式各产生一个点积分数；β 为正的逆温度参数。', shape: '8' },
      { id: 'weights', label: 'Softmax 权重', detail: '把分数归一化为 p；每个 pᵢ ≥ 0，且 Σᵢpᵢ = 1。', shape: '8' },
      { id: 'retrieve', label: '联想结果', detail: 'q′ = Xᵀp 为模式的凸组合。可以把 q′ 作为新查询继续更新；图中只展开一次关联。', shape: '16' }
    ],
    references: [{ label: 'Ramsauer et al., 2020 · 连续状态 Hopfield', url: 'https://arxiv.org/abs/2008.02217' }]
  },
  {
    id: 'ntm', name: 'NTM', fullName: '神经图灵机', category: 'memory',
    tagline: '把计算交给控制器，把可读写状态放进外部记忆。',
    description: '控制器通过软寻址访问外部记忆，使读取和写入可参与梯度计算。本例采用 32 维循环控制器、16 × 8 记忆、一个读头和一个写头；尺寸是教学设定。',
    year: 2014, yearNote: 'Graves、Wayne 与 Danihelka 的 NTM 论文', level: '深入',
    prerequisites: ['lstm'], learningGoal: '能区分内容寻址与位置寻址，并追踪软读写和下一时间步的反馈。',
    input: '每步 3 维输入与前次读向量', output: '每步 2 维任务输出',
    formula: 'rₜ = Mₜᵀwₜʳ;  Mₜ = Mₜ₋₁ ⊙ (1 − wₜʷeₜᵀ) + wₜʷaₜᵀ',
    formulaExplanation: 'wʳ、wʷ 各有 16 个位置权重；e、a 是 8 维擦除与添加向量。外积产生 16 × 8 写入项，读向量 r 为 8 维；本例按写入后的 Mₜ 定义读取。',
    keyPoints: ['内容寻址用查询键与每行记忆的相似度定位；位置寻址再结合前次权重、插值、循环位移与锐化。', '软读头对多行加权求和；软写头对多行按权重执行擦除与添加，不是硬指针。', 'Mₜ 是处理序列时变化的运行状态；控制器权重是跨样本学习的参数，两者作用不同。'],
    pitfall: '名字中的“图灵机”不表示这里真的执行离散指令或拥有无限内存。本例外存只有 16 个位置，读写与寻址均是连续运算。',
    quiz: { question: '一个读头访问 16 × 8 的记忆矩阵，读出的 rₜ 是几维？', options: ['8', '16', '128', '取决于序列长度'], answer: 0, explanation: '16 个寻址权重对 16 行做加权和；每行宽度为 8，所以读向量保持为 8 维。' },
    layers: [
      { id: 'controller', label: '输入与控制器', detail: '32 维循环控制器接收 3 维 xₜ 和上一时刻的 8 维 rₜ₋₁，并产生读写接口参数。', shape: '(3 + 8) → 32' },
      { id: 'address', label: '内容与位置寻址', detail: '每个头通过内容相似度、与前次权重的插值、循环位移及锐化，产生 16 维非负归一化权重。读写头各有自己的权重。', shape: 'wʳ: 16；wʷ: 16' },
      { id: 'heads', label: '读写头', detail: '写头用 8 维 e、a 更新记忆；读头取加权和得到 8 维 rₜ。两者是不同接口，不是两个串联隐藏层。', shape: 'rₜ: 8；eₜ、aₜ: 各 8' },
      { id: 'memory', label: '外部记忆', detail: '16 行位置、每行 8 维的矩阵 Mₜ；保存可被之后时间步访问的内容，并与控制器隐藏状态分开维护。', shape: '16 × 8' },
      { id: 'output', label: '输出与反馈', detail: '本例对 [hₜ,rₜ] 的 40 维向量做 Linear(40, 2)，得到任务输出；rₜ 另反馈给下一时间步的控制器。', shape: '任务输出 2；反馈 8' }
    ],
    references: [{ label: 'Graves et al., 2014 · Neural Turing Machines', url: 'https://arxiv.org/abs/1410.5401' }]
  },
  {
    id: 'dnc', name: 'DNC', fullName: '可微神经计算机', category: 'memory',
    tagline: '不仅记住内容，还记录哪里可写、写入先后是什么。',
    description: '在控制器与外部记忆之间加入动态分配和时序链接机制。本例使用 32 维循环控制器、16 × 8 记忆、1 个写头和 2 个读头；省略次要接口参数，但保留两项关键寻址机制。',
    year: 2016, yearNote: 'Hybrid computing using a neural network with dynamic external memory', level: '深入',
    prerequisites: ['ntm'], learningGoal: '能解释动态分配与时序链接分别解决什么问题，并与 NTM 的位置位移区分。',
    input: '每步 3 维输入与 2 个前次读向量', output: '每步 2 维任务输出',
    formula: 'wₜʷ = gₜʷ[gₜᵃaₜ + (1 − gₜᵃ)cₜʷ]',
    formulaExplanation: 'aₜ 是按使用率分配的写位置权重，cₜʷ 是内容寻址权重；gᵃ 控制二者混合，gʷ 控制写入量。aₜ 和最终 wₜʷ 的和可以小于 1，不应强制当作概率分布。',
    keyPoints: ['使用率与释放门管理可重用位置；分配偏向低使用率位置，不依赖这些位置在地址上连续。', 'Lₜ[i,j] 表示位置 i 在 j 之后被写入的链接强度；Lₜ 对角为零，记录的是写入关系，不是物理相邻关系。', '每个读头混合内容读取、沿 Lₜ 向前读取、沿 Lₜᵀ 向后读取；两头各返回一个 8 维向量。'],
    pitfall: '动态分配不是自动扩容；此教学配置始终只有 16 个位置。时序链接允许地址跳跃后仍跟踪写入顺序，不能简化成 NTM 的地址加一。',
    quiz: { question: 'DNC 的时序链接矩阵主要记录什么？', options: ['模型参数的训练梯度', '图像中像素的邻接关系', '外部记忆位置被写入的先后关系', '所有位置的物理地址差'], answer: 2, explanation: 'L[i,j] 追踪 i 接在 j 后被写入的程度，读头由此沿写入顺序前进或后退，即使两位置的地址不相邻。' },
    layers: [
      { id: 'controller', label: '输入与控制器', detail: '将 3 维 xₜ 与两个上一时刻的 8 维读向量送入 32 维循环控制器，产生读写接口、门和读模式。', shape: '(3 + 2 × 8) → 32' },
      { id: 'allocation', label: '内容与分配寻址', detail: '16 维使用率由写入和释放共同更新；按使用率排序得到分配权重 aₜ，与内容权重 cₜʷ 经门控组成写权重。', shape: 'usage、aₜ、wₜʷ: 各 16' },
      { id: 'links', label: '时序链接', detail: '维护 16 × 16 的软链接矩阵及 16 维写入优先状态。对上一读权重做 Lₜw 或 Lₜᵀw，获得向前、向后候选读权重。', shape: 'Lₜ: 16 × 16' },
      { id: 'memory', label: '外部记忆与读写', detail: '一个写头对 16 × 8 记忆做擦除与添加；两个读头各混合内容、向前与向后三种模式，读取 8 维向量。', shape: 'Mₜ: 16 × 8；读取: 2 × 8' },
      { id: 'output', label: '输出与反馈', detail: '本例对 [hₜ,rₜ¹,rₜ²] 的 48 维向量做 Linear(48, 2)。两个读向量另一起反馈给下一时间步控制器。', shape: '任务输出 2；反馈 16' }
    ],
    references: [{ label: 'Graves et al., 2016 · DNC 原始论文', url: 'https://www.nature.com/articles/nature20101' }]
  }
];
