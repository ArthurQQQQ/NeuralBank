import { additionalModels } from './additional-models.js';
import { venueModels } from './venue-models.js';
import { expandedCoreModels } from './expanded-core-models.js';
import { expandedSpecialistModels } from './expanded-specialist-models.js';

// Educational examples. B = batch size, T = sequence length.
// `year` marks a cited historical milestone, not necessarily the architecture's first invention.
export const models = [
  {
    id: 'perceptron', name: 'Perceptron', fullName: '感知机', category: 'foundations',
    prerequisites: [], learningGoal: '能写出单层感知机的前向计算，并说明它的线性可分限制。',
    tagline: '从一次加权求和，理解神经元。',
    description: '把输入乘以权重、加上偏置，再用阈值作出二分类决定。这是理解线性决策边界的最小模型；这里展示的是现代教材中的单层感知机。',
    year: 1958, yearNote: 'Rosenblatt 的经典感知机论文', level: '入门',
    input: '3 个数值特征', output: '1 个二分类标签',
    formula: 'ŷ = 𝟙[wᵀx + b ≥ 0]',
    formulaExplanation: 'w 决定各特征的影响，b 移动决策边界；阈值函数把一个分数转成 0 或 1。',
    keyPoints: ['线性边界：wᵀx + b = 0。', '误分类时更新权重和偏置；经典感知机不对阶跃函数求导。', '仅当训练数据线性可分时，经典感知机算法才保证有限步收敛。'],
    pitfall: '单层感知机无法表示原始二维输入上的 XOR；仅仅调权重并不能改变这一限制。',
    quiz: { question: '单层感知机为什么无法解决原始二维 XOR？', options: ['学习率不够小', 'XOR 不是线性可分的', '输入必须是图像', '偏置一定为零'], answer: 1, explanation: '单层感知机只能给出一条直线决策边界。XOR 的两类点无法被一条直线分开。' },
    layers: [
      { id: 'input', label: '输入特征', detail: 'x₁、x₂、x₃ 组成一个特征向量。图中省略批次维度。', shape: '3' },
      { id: 'sum', label: '加权求和', detail: '计算 z = w₁x₁ + w₂x₂ + w₃x₃ + b，得到一个标量分数。', shape: '1' },
      { id: 'output', label: '阶跃输出', detail: 'z ≥ 0 时输出 1，否则输出 0。输出预测标签 ŷ ∈ {0, 1}，不是概率。', shape: '1' }
    ],
    references: [
      { label: 'Rosenblatt, 1958 · 原始论文', url: 'https://www.cs.cmu.edu/~epxing/Class/10715/reading/Rosenblatt.perceptron.pdf' },
      { label: 'scikit-learn · Perceptron', url: 'https://scikit-learn.org/stable/modules/linear_model.html#perceptron' }
    ]
  },
  {
    id: 'mlp', name: 'MLP', fullName: '多层感知机', category: 'foundations',
    prerequisites: ['perceptron'], learningGoal: '能追踪全连接层的维度与参数量，并解释非线性激活的作用。',
    tagline: '用非线性，把简单变换组合成复杂函数。',
    description: '由全连接层和非线性激活组成的前馈网络。这里用 3 → 6 → 4 → 2 的小型分类器，观察特征如何逐层变换；神经元数量是教学设定。',
    year: 1986, yearNote: '经典反向传播论文，非 MLP 首次提出年份', level: '入门',
    input: '3 维特征向量', output: '2 类概率',
    formula: 'h = ReLU(Wx + b)',
    formulaExplanation: '每个隐藏层先做仿射变换，再做非线性激活；最后用线性层与 softmax 得到类别概率。',
    keyPoints: ['全连接：当前层的每个神经元连接上一层的所有特征。', '参数量：输入 d、输出 k 的带偏置全连接层有 dk + k 个参数。', '反向传播用链式法则计算梯度，优化器再根据梯度更新参数。'],
    pitfall: '如果所有隐藏层都只有线性或仿射变换，多层复合仍等价于一个仿射变换。层数增加本身不产生非线性。',
    quiz: { question: '删去 MLP 所有隐藏层的非线性激活，会怎样？', options: ['自动变成 RNN', '一定无法计算梯度', '隐藏层可合并成一个仿射变换', '参数量一定变成零'], answer: 2, explanation: '仿射变换的复合仍是仿射变换。因此即使保留最后的分类 softmax，前面的隐藏层也不再提供非线性特征变换。' },
    layers: [
      { id: 'input', label: '输入层', detail: '一个样本包含 3 个特征；批处理输入形状为 B × 3。', shape: '3' },
      { id: 'hidden1', label: '隐藏层 1', detail: 'Linear(3, 6) 后接 ReLU。参数量为 3 × 6 + 6 = 24。', shape: '6' },
      { id: 'hidden2', label: '隐藏层 2', detail: 'Linear(6, 4) 后接 ReLU，进一步组合特征。参数量为 28。', shape: '4' },
      { id: 'output', label: '输出层', detail: 'Linear(4, 2) 产生两个 logits；softmax 转成两类概率。本例总计 62 个可训练参数。', shape: '2' }
    ],
    references: [
      { label: 'Deep Learning · 前馈网络', url: 'https://www.deeplearningbook.org/contents/mlp.html' },
      { label: 'Rumelhart et al., 1986 · 反向传播', url: 'https://www.cs.toronto.edu/~hinton/absps/naturebp.pdf' }
    ]
  },
  {
    id: 'cnn', name: 'CNN', fullName: '卷积神经网络', category: 'vision',
    prerequisites: ['mlp'], learningGoal: '能计算卷积和池化的输出形状，区分权重共享与全连接。',
    tagline: '让同一组滤波器，在图像的不同位置寻找模式。',
    description: '通过局部连接与参数共享提取空间特征。这里展示一个简化的数字分类器，输入为 28 × 28 灰度图；它是教学示例，并非完整 LeNet-5。',
    year: 1998, yearNote: 'LeNet-5 经典论文；卷积网络出现更早', level: '入门',
    input: '28 × 28 × 1 灰度图', output: '10 类概率',
    formula: 'Hout = ⌊(Hin + 2p − k) / s⌋ + 1',
    formulaExplanation: '这里假设 dilation = 1。k 是卷积核大小，p 是 padding，s 是 stride；宽度的计算方式相同。',
    keyPoints: ['一个卷积核在所有空间位置共享权重；不同输出通道使用不同卷积核。', '卷积输出通道数由滤波器数量决定；空间尺寸由核大小、步长等共同决定。', '最大池化通常没有可训练参数；它缩小空间尺寸，而不改变通道数。'],
    pitfall: '卷积通常具有平移等变性，不能直接说成完整的平移不变性；padding、stride 和边界还会影响这一性质。',
    quiz: { question: '输入有 1 个通道，使用 8 个 3 × 3 卷积核并带偏置，参数量是多少？', options: ['9', '72', '80', '784'], answer: 2, explanation: '每个输出通道有 3 × 3 × 1 个权重和 1 个偏置；8 × (9 + 1) = 80。输入图像宽高不影响卷积层参数量。' },
    layers: [
      { id: 'input', label: '图像输入', detail: '28 × 28 的单通道图像。尺寸使用 H × W × C；PyTorch 默认布局为 B × C × H × W。', shape: '28 × 28 × 1' },
      { id: 'conv1', label: '卷积 + ReLU', detail: '8 个 3 × 3 卷积核，stride = 1、padding = 1，保持空间尺寸。', shape: '28 × 28 × 8' },
      { id: 'pool', label: '最大池化', detail: '2 × 2 最大池化，stride = 2。每个通道独立下采样。', shape: '14 × 14 × 8' },
      { id: 'flatten', label: '展平', detail: '把空间和通道维度展开：14 × 14 × 8 = 1568，不新增参数。', shape: '1568' },
      { id: 'output', label: '分类输出', detail: '全连接层把 1568 维映射到 10 个 logits；softmax 产生类别概率。', shape: '10' }
    ],
    references: [
      { label: 'PyTorch · Conv2d', url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.Conv2d.html' },
      { label: 'LeCun et al., 1998 · 经典卷积网络', url: 'https://bottou.org/papers/lecun-98h' }
    ]
  },
  {
    id: 'rnn', name: 'RNN', fullName: '循环神经网络', category: 'sequence',
    prerequisites: ['mlp'], learningGoal: '能沿时间追踪隐藏状态，并说明参数共享和时间反向传播。',
    tagline: '用隐藏状态，把前一刻的信息传给下一刻。',
    description: '在每个时间步复用同一个循环单元。这里展示单向、单层的 Elman RNN，对每个时间步输出一个二分类结果。沿时间展开后，多个方框代表同一组参数。',
    year: 1990, yearNote: 'Elman 的 Finding Structure in Time', level: '入门',
    input: 'T 个 3 维向量', output: '每步 2 类概率',
    formula: 'hₜ = tanh(Wₓxₜ + Wₕhₜ₋₁ + b)',
    formulaExplanation: '当前状态由当前输入 xₜ 与上一时刻状态 hₜ₋₁ 共同决定；h₀ 在这个例子中设为零。',
    keyPoints: ['时间步之间共享 Wₓ、Wₕ 和偏置，参数量不随序列长度 T 增长。', '通过时间反向传播（BPTT）对展开的计算图求梯度。', '长链上的重复矩阵乘法可能造成梯度消失或爆炸，影响长期依赖学习。'],
    pitfall: '时间展开不是堆叠多层 RNN：展开表示不同时间步，堆叠表示同一时间步的网络深度。',
    quiz: { question: '把输入序列长度从 10 增加到 20，单层 RNN 的可训练参数量如何变化？', options: ['翻倍', '保持不变', '减半', '只增加输出偏置'], answer: 1, explanation: '循环单元在所有时间步复用同一组参数。序列变长会增加计算量和中间状态，而不会增加这个模型的参数量。' },
    layers: [
      { id: 'input', label: '序列输入', detail: '每个时间步 xₜ 是 3 维向量。省略批次时，整段输入为 T × 3。', shape: 'T × 3' },
      { id: 'previous', label: '上一隐藏状态', detail: 'hₜ₋₁ 是从上一个时间步传来的 6 维向量；第一个时间步的 h₀ 在本例中设为零。它与当前输入汇合，不是输入序列之后的一层。', shape: '6 / 每步' },
      { id: 'recurrent', label: '当前隐藏状态', detail: '共享单元计算 hₜ = tanh(Wₓxₜ + Wₕhₜ₋₁ + b)，产生 6 维状态。每个时间步复用同一组权重。', shape: '6 / 每步' },
      { id: 'output', label: '逐步分类', detail: '同一个 Linear(6, 2) 作用于每个 hₜ，再做 softmax。其他任务也可以只使用最后一个状态。', shape: 'T × 2' }
    ],
    references: [
      { label: 'PyTorch · RNN', url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.RNN.html' },
      { label: 'Elman, 1990 · Finding Structure in Time', url: 'https://doi.org/10.1207/S15516709COG1402_1' }
    ]
  },
  {
    id: 'lstm', name: 'LSTM', fullName: '长短期记忆网络', category: 'sequence',
    prerequisites: ['rnn'], learningGoal: '能区分细胞状态与隐藏状态，并解释三种门如何调节记忆。',
    tagline: '用门控决定什么该记住、写入和输出。',
    description: '在循环单元中加入细胞状态和门控，帮助信息跨越更长的时间。这里展示现代常用的带遗忘门 LSTM；这一版本与 1997 年最初的 LSTM 并不完全相同。',
    year: 1997, yearNote: 'LSTM 原始论文；图中采用后来的带遗忘门版本', level: '进阶',
    input: 'T 个 3 维向量', output: 'T 个 6 维隐藏状态',
    formula: 'cₜ = fₜ ⊙ cₜ₋₁ + iₜ ⊙ gₜ',
    formulaExplanation: 'fₜ 保留旧记忆，iₜ 控制候选记忆 gₜ 的写入；再由 hₜ = oₜ ⊙ tanh(cₜ) 得到隐藏状态。⊙ 表示逐元素乘法。',
    keyPoints: ['fₜ、iₜ、oₜ 由 sigmoid 产生，数值在 0 与 1 之间；gₜ 通常使用 tanh。', 'cₜ 和 hₜ 是两种状态；在这个无投影的示例里，它们都为 6 维。', '加性记忆路径有助于长期梯度传播，但不能保证任意长度上的梯度都不消失。'],
    pitfall: '输入门、遗忘门、输出门通常由同一时刻的 xₜ 和 hₜ₋₁ 分别计算；不要把三道门误读为三个连续时间步。',
    quiz: { question: '如果某个维度的 fₜ ≈ 1、iₜ ≈ 0，该维度的细胞状态会怎样？', options: ['主要保留上一时刻的记忆', '一定被清零', '自动变成类别概率', '隐藏维度会增加'], answer: 0, explanation: '由 cₜ = fₜ ⊙ cₜ₋₁ + iₜ ⊙ gₜ 可知，这时 cₜ ≈ cₜ₋₁，旧记忆被保留而新候选几乎不写入。' },
    layers: [
      { id: 'input', label: '输入与前态', detail: '每步接收 3 维 xₜ、6 维 hₜ₋₁ 和 6 维 cₜ₋₁。整段输入序列为 T × 3。', shape: '3 + 6 + 6 / 每步' },
      { id: 'forget', label: '遗忘门', detail: 'fₜ = sigmoid(W_f[xₜ,hₜ₋₁] + b_f)，逐维控制旧记忆的保留比例。所有门都属于同一时间步。', shape: '6 / 每步' },
      { id: 'write', label: '输入门与候选', detail: 'iₜ 由 sigmoid 得到，gₜ 由 tanh 得到；iₜ ⊙ gₜ 决定新写入的内容。它们与其他门分别从 [xₜ,hₜ₋₁] 计算。', shape: '2 × 6 / 每步' },
      { id: 'memory', label: '细胞状态', detail: '用 fₜ ⊙ cₜ₋₁ + iₜ ⊙ gₜ 更新 cₜ。这是单元内部的记忆路径。', shape: '6 / 每步' },
      { id: 'output', label: '输出门与隐藏态', detail: 'oₜ = sigmoid(W_o[xₜ,hₜ₋₁] + b_o)，再计算 hₜ = oₜ ⊙ tanh(cₜ)。hₜ、cₜ 一起传给下一步；本例没有分类头。', shape: '6 / 每步' }
    ],
    references: [
      { label: 'PyTorch · 现代 LSTM 方程', url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.LSTM.html' },
      { label: 'Hochreiter & Schmidhuber, 1997', url: 'https://doi.org/10.1162/neco.1997.9.8.1735' }
    ]
  },
  {
    id: 'transformer', name: 'Transformer', fullName: 'Transformer 编码器', category: 'attention',
    prerequisites: ['mlp', 'resnet'], learningGoal: '能追踪查询、键、值与注意力矩阵，并识别编码器块的残差路径。',
    tagline: '让每个 token，按内容与其他 token 交换信息。',
    description: '这里展示原始论文风格的一个编码器块：多头自注意力、逐位置前馈网络，以及两次残差连接和层归一化。示例 d_model = 16、4 个头；省略 dropout。',
    year: 2017, yearNote: 'Attention Is All You Need', level: '进阶',
    input: 'T 个 token ID', output: 'T 个上下文向量',
    formula: 'Attention(Q,K,V) = softmax(QKᵀ / √dₖ)V',
    formulaExplanation: 'Q、K 的相似度决定每个查询如何加权 V。softmax 沿 key 维度计算；每一行的注意力权重和为 1。',
    keyPoints: ['4 个注意力头各使用 dₖ = dᵥ = 4，拼接后经输出投影回到 16 维。', '前馈网络逐个 token 应用同一组权重；这里采用 16 → 32 → 16 的 ReLU 网络。', '自注意力本身不编码顺序，因此需要位置信息。标准稠密注意力矩阵大小为 T × T。'],
    pitfall: '这里是双向编码器，不是完整的生成式解码器。自回归解码器还需要因果遮罩；原始编码器—解码器的解码器另有交叉注意力。',
    quiz: { question: '原始 Transformer 为什么需要加入位置信息？', options: ['为了把参数量降到零', '因为自注意力本身无法区分输入的排列顺序', '为了让输出永远等于输入', '因为每个 token 必须使用不同的前馈网络'], answer: 1, explanation: '不带位置信息时，自注意力对输入排列具有等变性，无法仅靠内容知道 token 的先后位置。位置编码或其他位置机制补充了这类信息。' },
    layers: [
      { id: 'embedding', label: 'Token 嵌入', detail: '把长度为 T 的 token ID 序列映射为 T 个 16 维向量。真实任务还需要处理 padding 及其遮罩。', shape: 'T × 16' },
      { id: 'position', label: '位置编码', detail: '为每个位置构造 16 维编码并加到嵌入上，得到 x；这使模型获得顺序信息。', shape: 'T × 16' },
      { id: 'attention', label: '多头自注意力', detail: '4 个头各使用 4 维 Q、K、V，计算 T × T 注意力矩阵，再拼接并投影回 16 维。此编码器使用双向注意力。', shape: 'T × 16' },
      { id: 'block', label: '残差与前馈块', detail: '先做 u = LayerNorm(x + MHA(x))，再做 y = LayerNorm(u + FFN(u))。FFN 为逐 token 共享的 16 → 32 → 16 ReLU 网络。', shape: 'T × 16' },
      { id: 'output', label: '上下文表示', detail: '每个位置输出一个结合上下文的 16 维向量。可继续堆叠编码器块或连接任务头；本图不含解码器。', shape: 'T × 16' }
    ],
    references: [
      { label: 'Vaswani et al., 2017 · 原始论文', url: 'https://arxiv.org/abs/1706.03762' }
    ]
  },
  {
    id: 'autoencoder', name: 'Autoencoder', fullName: '自编码器', category: 'generative',
    prerequisites: ['mlp'], learningGoal: '能说明编码、瓶颈、解码与重建目标的关系，并区分普通 AE 与 VAE。',
    tagline: '压缩，再重建：用信息瓶颈学习表示。',
    description: '编码器把输入压缩为低维表示，解码器尝试重建输入。这里展示 784 → 64 → 8 → 64 → 784 的欠完备自编码器。归入表示与生成类；普通 AE 并不自带可采样的生成分布。',
    year: 1987, yearNote: '早期自编码器研究里程碑，非唯一发明年份', level: '进阶',
    input: '展平的 28 × 28 图像', output: '784 维重建结果',
    formula: 'z = fθ(x),  x̂ = gφ(z),  L = ‖x − x̂‖²',
    formulaExplanation: 'fθ 是编码器，gφ 是解码器；最小化重建误差，使低维表示保留对重建有用的信息。这里采用平方误差作为示例损失。',
    keyPoints: ['训练目标来自输入本身，不需要额外的类别标签。', '瓶颈维度或其他约束限制直接复制，促使模型学习有用表示。', '普通 AE 与 VAE 不同：VAE 还对潜变量分布建模并加入相应正则项。'],
    pitfall: '重建误差低并不自动保证表示适合下游任务，也不意味着在潜空间任取一点就能生成合理样本。',
    quiz: { question: '这个普通自编码器的训练目标是什么？', options: ['预测人工类别标签', '让输出逼近输入', '强制所有潜变量等于零', '让潜变量维度大于输入维度'], answer: 1, explanation: '自编码器通过重建输入学习表示。低维瓶颈是一种约束，但有用的表示仍需结合下游任务或重建分析判断。' },
    layers: [
      { id: 'input', label: '原始输入', detail: '把归一化到 [0, 1] 的 28 × 28 灰度图展开为 784 维向量。', shape: '784' },
      { id: 'encoder', label: '编码器', detail: 'Linear(784, 64) 加 ReLU，学习第一阶段的压缩表示。', shape: '64' },
      { id: 'latent', label: '潜在表示', detail: 'Linear(64, 8) 得到 8 维代码 z；这个瓶颈不额外规定 z 必须服从高斯分布。', shape: '8' },
      { id: 'decoder', label: '解码器', detail: 'Linear(8, 64) 加 ReLU，根据潜在表示恢复较高维特征。', shape: '64' },
      { id: 'output', label: '重建输出', detail: 'Linear(64, 784) 加 sigmoid，得到 [0, 1] 范围内的像素重建，再与原始输入计算损失。', shape: '784' }
    ],
    references: [
      { label: 'Deep Learning · Autoencoders', url: 'https://www.deeplearningbook.org/contents/autoencoders.html' }
    ]
  },
  {
    id: 'resnet', name: 'ResNet', fullName: '残差网络', category: 'vision',
    prerequisites: ['cnn'], learningGoal: '能追踪残差分支与捷径，说明逐元素相加对维度的要求。',
    tagline: '让网络学习改变量，并保留一条直达路径。',
    description: '用捷径把输入加到变换结果上，使深层网络更容易优化。这里放大展示一个原始风格的 BasicBlock，而非完整的 ResNet-18；输入输出通道和空间尺寸相同。',
    year: 2015, yearNote: 'Deep Residual Learning 预印本；CVPR 2016 发表', level: '进阶',
    input: '14 × 14 × 16 特征图', output: '14 × 14 × 16 特征图',
    formula: 'y = ReLU(F(x) + x)',
    formulaExplanation: 'F 是两层卷积的残差分支，x 经过恒等捷径直接参与相加；该式对应这里展示的原始 Post-activation BasicBlock。',
    keyPoints: ['残差学习把目标映射写成 F(x) + x；F(x) 学习相对于输入的改变量。', '逐元素相加要求两条分支形状相同；改变通道或空间尺寸时通常使用投影捷径。', '反向传播时，恒等分支提供直接的梯度路径，有助于优化深层网络。'],
    pitfall: '残差连接使用逐元素相加，不是拼接。它帮助优化，但不保证任意深度都能提升泛化性能。',
    quiz: { question: '残差分支把通道数从 16 改成 32 时，原来的 x 能否直接与它相加？', options: ['可以，通道数无需一致', '不可以，需先匹配形状，例如用 1 × 1 投影', '可以，只要学习率足够小', '不可以，因此 ResNet 不能改变通道数'], answer: 1, explanation: '逐元素相加需要匹配形状。1 × 1 卷积可改变通道数；必要时还可使用 stride 匹配空间尺寸。' },
    layers: [
      { id: 'input', label: '输入特征', detail: 'x 的形状为 14 × 14 × 16，并分流到卷积分支和恒等捷径。', shape: '14 × 14 × 16' },
      { id: 'conv1', label: '卷积 + BN', detail: '3 × 3 卷积，16 个输出通道，stride = 1、padding = 1；随后批归一化，保持形状。', shape: '14 × 14 × 16' },
      { id: 'relu', label: 'ReLU 激活', detail: '对第一个卷积与 BN 的结果逐元素使用 ReLU，引入非线性。', shape: '14 × 14 × 16' },
      { id: 'conv2', label: '卷积 + BN', detail: '第二个 3 × 3 卷积同样保持尺寸，再做批归一化，产生残差 F(x)。此处先不做 ReLU。', shape: '14 × 14 × 16' },
      { id: 'output', label: '残差相加与输出', detail: '把 F(x) 与未经变换的 x 逐元素相加，再使用 ReLU。两条路径都为 14 × 14 × 16，输出可连接下一个块。', shape: '14 × 14 × 16' }
    ],
    references: [
      { label: 'He et al., 2015 · 残差网络原始论文', url: 'https://arxiv.org/abs/1512.03385' }
    ]
  },
  ...additionalModels,
  ...venueModels,
  ...expandedCoreModels,
  ...expandedSpecialistModels
];
