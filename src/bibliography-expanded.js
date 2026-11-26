// Curated from the original papers, publisher records and linked author code.
// `year` is the selected publication's year, matching venue.year. An earlier
// arXiv first-public year is retained separately as optional preprintYear.
// An arXiv identifier does not establish conference acceptance.
// Repository relationships describe provenance, not reproduction certification.
const expandedPaper = (title, authors, year, url, doi, arxivId, name, venueYear, type, venueUrl) => ({
  title, authors, year: venueYear, url, doi, arxivId,
  ...(arxivId && year < venueYear ? { preprintYear: year } : {}),
  venue: { name, year: venueYear, type, url: venueUrl },
});
const expandedRepository = (url, label, relationship, scope, note) => ({ url, label, relationship, scope, ...(note ? { note } : {}) });
const expandedCitation = (note = '') => ({
  count: null, source: null, url: null, retrievedAt: null, scope: 'primary-paper',
  note: `尚未收录可核对的引用次数快照；null 表示未知，并非零。${note}`,
});

export const expandedBibliography = {
  rbf: {
    primaryPaper: expandedPaper(
      'Multivariable Functional Interpolation and Adaptive Networks',
      ['D. S. Broomhead', 'David Lowe'], 1988,
      'https://www.complex-systems.com/abstracts/v02_i03_a05/', null, null,
      'Complex Systems', 1988, 'journal', 'https://www.complex-systems.com/abstracts/v02_i03_a05/'),
    repositories: [],
    citation: expandedCitation('此处对应 Broomhead 与 Lowe 的 1988 年论文，不是所有径向基方法的起源文献。'),
  },
  rbm: {
    primaryPaper: expandedPaper(
      'Training Products of Experts by Minimizing Contrastive Divergence',
      ['Geoffrey E. Hinton'], 2002,
      'https://doi.org/10.1162/089976602760128018', '10.1162/089976602760128018', null,
      'Neural Computation', 2002, 'journal', 'https://doi.org/10.1162/089976602760128018'),
    repositories: [],
    citation: expandedCitation('所选主文献解释对比散度训练，不声称 RBM 始于 2002 年。'),
  },
  dbn: {
    primaryPaper: expandedPaper(
      'A Fast Learning Algorithm for Deep Belief Nets',
      ['Geoffrey E. Hinton', 'Simon Osindero', 'Yee-Whye Teh'], 2006,
      'https://doi.org/10.1162/neco.2006.18.7.1527', '10.1162/neco.2006.18.7.1527', null,
      'Neural Computation', 2006, 'journal', 'https://doi.org/10.1162/neco.2006.18.7.1527'),
    repositories: [],
    citation: expandedCitation(),
  },
  kan: {
    primaryPaper: expandedPaper(
      'KAN: Kolmogorov-Arnold Networks',
      ['Ziming Liu', 'Yixuan Wang', 'Sachin Vaidya', 'Fabian Ruehle', 'James Halverson', 'Marin Soljačić', 'Thomas Y. Hou', 'Max Tegmark'], 2024,
      'https://arxiv.org/abs/2404.19756', null, '2404.19756',
      'International Conference on Learning Representations (ICLR)', 2025, 'conference', 'https://openreview.net/forum?id=Ozo7qJ5vZi'),
    repositories: [expandedRepository('https://github.com/KindXiaoming/pykan', '作者实现 · pykan', 'author-official', 'KAN 的样条边函数、训练和可视化实现。', '仓库也收录 KAN 2.0；新版本功能不等于原论文的全部实验配置。')],
    citation: expandedCitation(),
  },
  lenet: {
    primaryPaper: expandedPaper(
      'Gradient-Based Learning Applied to Document Recognition',
      ['Yann LeCun', 'Léon Bottou', 'Yoshua Bengio', 'Patrick Haffner'], 1998,
      'https://doi.org/10.1109/5.726791', '10.1109/5.726791', null,
      'Proceedings of the IEEE', 1998, 'journal', 'https://doi.org/10.1109/5.726791'),
    repositories: [],
    citation: expandedCitation('对应介绍 LeNet-5 的整篇文档识别论文。'),
  },
  alexnet: {
    primaryPaper: expandedPaper(
      'ImageNet Classification with Deep Convolutional Neural Networks',
      ['Alex Krizhevsky', 'Ilya Sutskever', 'Geoffrey E. Hinton'], 2012,
      'https://proceedings.neurips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html', null, null,
      'Advances in Neural Information Processing Systems 25 (NIPS)', 2012, 'conference',
      'https://proceedings.neurips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html'),
    repositories: [expandedRepository('https://github.com/BVLC/caffe/tree/master/models/bvlc_alexnet', 'BVLC Caffe · AlexNet 参考实现', 'reference-implementation', 'Caffe 的 AlexNet 模型定义与训练模型说明。', '由 BVLC 提供，不是原论文作者的原始发布；部分实现细节与论文不同。')],
    citation: expandedCitation('所选节点是 2012 年 NIPS 原文，不是 2017 年 Communications of the ACM 再版。'),
  },
  vgg: {
    primaryPaper: expandedPaper(
      'Very Deep Convolutional Networks for Large-Scale Image Recognition',
      ['Karen Simonyan', 'Andrew Zisserman'], 2014,
      'https://arxiv.org/abs/1409.1556', null, '1409.1556',
      'International Conference on Learning Representations (ICLR)', 2015, 'conference', 'https://www.robots.ox.ac.uk/~vgg/publications/2015/Simonyan15/'),
    repositories: [expandedRepository('https://github.com/pytorch/vision/blob/main/torchvision/models/vgg.py', 'TorchVision · VGG 参考实现', 'reference-implementation', 'VGG 家族模型定义，本站教学配置选择 VGG-16。', 'PyTorch 维护的参考实现，不能标作 Simonyan 与 Zisserman 的原始代码。')],
    citation: expandedCitation(),
  },
  inception: {
    primaryPaper: expandedPaper(
      'Going Deeper with Convolutions',
      ['Christian Szegedy', 'Wei Liu', 'Yangqing Jia', 'Pierre Sermanet', 'Scott Reed', 'Dragomir Anguelov', 'Dumitru Erhan', 'Vincent Vanhoucke', 'Andrew Rabinovich'], 2014,
      'https://openaccess.thecvf.com/content_cvpr_2015/html/Szegedy_Going_Deeper_With_2015_CVPR_paper.html', '10.1109/CVPR.2015.7298594', '1409.4842',
      'IEEE Conference on Computer Vision and Pattern Recognition (CVPR)', 2015, 'conference', 'https://openaccess.thecvf.com/content_cvpr_2015/html/Szegedy_Going_Deeper_With_2015_CVPR_paper.html'),
    repositories: [expandedRepository('https://github.com/pytorch/vision/blob/main/torchvision/models/googlenet.py', 'TorchVision · GoogLeNet 参考实现', 'reference-implementation', '包含 Inception v1 模块的 GoogLeNet 定义。', '不是 Inception v3，也不是原论文作者的原始发布。')],
    citation: expandedCitation(),
  },
  densenet: {
    primaryPaper: expandedPaper(
      'Densely Connected Convolutional Networks',
      ['Gao Huang', 'Zhuang Liu', 'Laurens van der Maaten', 'Kilian Q. Weinberger'], 2016,
      'https://openaccess.thecvf.com/content_cvpr_2017/html/Huang_Densely_Connected_Convolutional_CVPR_2017_paper.html', '10.1109/CVPR.2017.243', '1608.06993',
      'IEEE Conference on Computer Vision and Pattern Recognition (CVPR)', 2017, 'conference', 'https://openaccess.thecvf.com/content_cvpr_2017/html/Huang_Densely_Connected_Convolutional_CVPR_2017_paper.html'),
    repositories: [expandedRepository('https://github.com/liuzhuang13/DenseNet', '作者实现 · DenseNet', 'author-official', 'DenseNet 的 Torch 实现、模型及实验说明。', '仓库也提供后续内存优化实现；复现时需选择相应版本。')],
    citation: expandedCitation(),
  },
  'mobilenet-v2': {
    primaryPaper: expandedPaper(
      'MobileNetV2: Inverted Residuals and Linear Bottlenecks',
      ['Mark Sandler', 'Andrew Howard', 'Menglong Zhu', 'Andrey Zhmoginov', 'Liang-Chieh Chen'], 2018,
      'https://openaccess.thecvf.com/content_cvpr_2018/html/Sandler_MobileNetV2_Inverted_Residuals_CVPR_2018_paper.html', '10.1109/CVPR.2018.00474', '1801.04381',
      'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)', 2018, 'conference', 'https://openaccess.thecvf.com/content_cvpr_2018/html/Sandler_MobileNetV2_Inverted_Residuals_CVPR_2018_paper.html'),
    repositories: [expandedRepository('https://github.com/tensorflow/models/tree/master/research/slim/nets/mobilenet', 'Google / TensorFlow · MobileNet', 'author-official', 'TF-Slim 中的 MobileNetV2 定义与模型说明。', '同目录也含其他 MobileNet 版本；本站对应 V2。')],
    citation: expandedCitation(),
  },
  efficientnet: {
    primaryPaper: expandedPaper(
      'EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks',
      ['Mingxing Tan', 'Quoc V. Le'], 2019,
      'https://proceedings.mlr.press/v97/tan19a.html', null, '1905.11946',
      'International Conference on Machine Learning (ICML)', 2019, 'conference', 'https://proceedings.mlr.press/v97/tan19a.html'),
    repositories: [expandedRepository('https://github.com/tensorflow/tpu/tree/master/models/official/efficientnet', '作者官方实现 · EfficientNet', 'author-official', 'EfficientNet-B0 至 B7、复合缩放及训练代码。', '仓库另含 AdvProp、Noisy Student 等后续配置，不能混作原论文基线结果。')],
    citation: expandedCitation(),
  },
  convnext: {
    primaryPaper: expandedPaper(
      'A ConvNet for the 2020s',
      ['Zhuang Liu', 'Hanzi Mao', 'Chao-Yuan Wu', 'Christoph Feichtenhofer', 'Trevor Darrell', 'Saining Xie'], 2022,
      'https://openaccess.thecvf.com/content/CVPR2022/html/Liu_A_ConvNet_for_the_2020s_CVPR_2022_paper.html', '10.1109/CVPR52688.2022.01167', '2201.03545',
      'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)', 2022, 'conference', 'https://openaccess.thecvf.com/content/CVPR2022/html/Liu_A_ConvNet_for_the_2020s_CVPR_2022_paper.html'),
    repositories: [expandedRepository('https://github.com/facebookresearch/ConvNeXt', '作者官方实现 · ConvNeXt', 'author-official', 'ConvNeXt v1 模型、训练和评估。')],
    citation: expandedCitation(),
  },
  bert: {
    primaryPaper: expandedPaper(
      'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
      ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'], 2018,
      'https://aclanthology.org/N19-1423/', '10.18653/v1/N19-1423', '1810.04805',
      'North American Chapter of the Association for Computational Linguistics: Human Language Technologies (NAACL-HLT)', 2019, 'conference', 'https://aclanthology.org/N19-1423/'),
    repositories: [expandedRepository('https://github.com/google-research/bert', 'Google Research · BERT', 'author-official', 'BERT 的 TensorFlow 原始发布、预训练模型与微调示例。', '仓库后续加入更多小型模型；本站教学选择 BERT-Base。')],
    citation: expandedCitation(),
  },
  gpt: {
    primaryPaper: expandedPaper(
      'Improving Language Understanding by Generative Pre-Training',
      ['Alec Radford', 'Karthik Narasimhan', 'Tim Salimans', 'Ilya Sutskever'], 2018,
      'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf', null, null,
      'OpenAI technical report', 2018, 'technical-report', 'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf'),
    repositories: [expandedRepository('https://github.com/openai/finetune-transformer-lm', 'OpenAI · GPT 原始代码', 'author-official', '原始 GPT 代码、模型与 ROCStories 微调实验。', 'README 的运行示例覆盖 ROCStories，不表示一条命令复现论文所有任务。')],
    citation: expandedCitation('对应 2018 年原始 GPT 技术报告，不是 GPT-2 或后续模型。'),
  },
  t5: {
    primaryPaper: expandedPaper(
      'Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer',
      ['Colin Raffel', 'Noam Shazeer', 'Adam Roberts', 'Katherine Lee', 'Sharan Narang', 'Michael Matena', 'Yanqi Zhou', 'Wei Li', 'Peter J. Liu'], 2019,
      'https://jmlr.org/papers/v21/20-074.html', null, '1910.10683',
      'Journal of Machine Learning Research', 2020, 'journal', 'https://jmlr.org/papers/v21/20-074.html'),
    repositories: [expandedRepository('https://github.com/google-research/text-to-text-transfer-transformer', 'Google Research · T5 原始实现', 'author-official', 'T5 原论文的 TensorFlow / Mesh TensorFlow 实验代码。', '此代码已不再积极开发；仓库推荐的 T5X 是后续实现。')],
    citation: expandedCitation(),
  },
  swin: {
    primaryPaper: expandedPaper(
      'Swin Transformer: Hierarchical Vision Transformer using Shifted Windows',
      ['Ze Liu', 'Yutong Lin', 'Yue Cao', 'Han Hu', 'Yixuan Wei', 'Zheng Zhang', 'Stephen Lin', 'Baining Guo'], 2021,
      'https://openaccess.thecvf.com/content/ICCV2021/html/Liu_Swin_Transformer_Hierarchical_Vision_Transformer_Using_Shifted_Windows_ICCV_2021_paper.html', '10.1109/ICCV48922.2021.00986', '2103.14030',
      'IEEE/CVF International Conference on Computer Vision (ICCV)', 2021, 'conference', 'https://openaccess.thecvf.com/content/ICCV2021/html/Liu_Swin_Transformer_Hierarchical_Vision_Transformer_Using_Shifted_Windows_ICCV_2021_paper.html'),
    repositories: [expandedRepository('https://github.com/microsoft/Swin-Transformer', 'Microsoft · Swin Transformer', 'author-official', 'Swin v1 模型和图像分类训练代码。', '仓库也包含后续版本；本站图示以 Swin-T 的 v1 机制为例。')],
    citation: expandedCitation(),
  },
  performer: {
    primaryPaper: expandedPaper(
      'Rethinking Attention with Performers',
      ['Krzysztof Choromanski', 'Valerii Likhosherstov', 'David Dohan', 'Xingyou Song', 'Andreea Gane', 'Tamas Sarlos', 'Peter Hawkins', 'Jared Davis', 'Afroz Mohiuddin', 'Lukasz Kaiser', 'David Belanger', 'Lucy Colwell', 'Adrian Weller'], 2020,
      'https://arxiv.org/abs/2009.14794', null, '2009.14794',
      'International Conference on Learning Representations (ICLR)', 2021, 'conference', 'https://arxiv.org/abs/2009.14794'),
    repositories: [expandedRepository('https://github.com/google-research/google-research/tree/master/performer/fast_attention', 'Google Research · Performer fast attention', 'author-official', 'FAVOR+ / Performer 的快速注意力实现。', '这是注意力库，不等于包含论文所有模态实验与数据的单一可执行项目。')],
    citation: expandedCitation(),
  },
  retnet: {
    primaryPaper: expandedPaper(
      'Retentive Network: A Successor to Transformer for Large Language Models',
      ['Yutao Sun', 'Li Dong', 'Shaohan Huang', 'Shuming Ma', 'Yuqing Xia', 'Jilong Xue', 'Jianyong Wang', 'Furu Wei'], 2023,
      'https://arxiv.org/abs/2307.08621', null, '2307.08621',
      'arXiv preprint', 2023, 'preprint', 'https://arxiv.org/abs/2307.08621'),
    repositories: [expandedRepository('https://github.com/microsoft/torchscale', 'Microsoft TorchScale · RetNet', 'author-official', '包含 RetNet 的 retention 层、网络与配置。', 'README 记录过默认归一化与激活配置更新；当前默认值不能自动视为 2023 年论文原始实验。')],
    citation: expandedCitation('未将 OpenReview 上的投稿或评审记录当作正式会议接收证明。'),
  },
  rwkv: {
    primaryPaper: expandedPaper(
      'RWKV: Reinventing RNNs for the Transformer Era',
      ['Bo Peng', 'Eric Alcaide', 'Quentin Anthony', 'Alon Albalak', 'Samuel Arcadinho', 'Stella Biderman', 'Huanqi Cao', 'Xin Cheng', 'Michael Chung', 'Leon Derczynski', 'Xingjian Du', 'Matteo Grella', 'Kranthi Gv', 'Xuzheng He', 'Haowen Hou', 'Przemyslaw Kazienko', 'Jan Kocon', 'Jiaming Kong', 'Bartłomiej Koptyra', 'Hayden Lau', 'Jiaju Lin', 'Krishna Sri Ipsit Mantri', 'Ferdinand Mom', 'Atsushi Saito', 'Guangyu Song', 'Xiangru Tang', 'Johan Wind', 'Stanisław Woźniak', 'Zhenyuan Zhang', 'Qinghua Zhou', 'Jian Zhu', 'Rui-Jie Zhu'], 2023,
      'https://aclanthology.org/2023.findings-emnlp.936/', '10.18653/v1/2023.findings-emnlp.936', '2305.13048',
      'Findings of the Association for Computational Linguistics: EMNLP', 2023, 'conference', 'https://aclanthology.org/2023.findings-emnlp.936/'),
    repositories: [expandedRepository('https://github.com/BlinkDL/RWKV-LM/tree/main/RWKV-v4', '作者实现 · RWKV-v4', 'author-official', '2023 年论文所对应的 RWKV-v4 训练、推理与 CUDA 代码。', '主仓库还含 RWKV-5/6/7 等后续模型；本站并不把它们与此条合并。')],
    citation: expandedCitation('作者表以 ACL 正式发表版为准；后续 arXiv 版本作者表有变化。'),
  },
  s4: {
    primaryPaper: expandedPaper(
      'Efficiently Modeling Long Sequences with Structured State Spaces',
      ['Albert Gu', 'Karan Goel', 'Christopher Ré'], 2021,
      'https://arxiv.org/abs/2111.00396', null, '2111.00396',
      'International Conference on Learning Representations (ICLR)', 2022, 'conference', 'https://arxiv.org/abs/2111.00396'),
    repositories: [expandedRepository('https://github.com/state-spaces/s4', '作者官方实现 · S4', 'author-official', '结构化状态空间模型 S4 的实现与实验配置。', '仓库也覆盖后续 SSM 变体；具体实验需要固定版本与配置。')],
    citation: expandedCitation(),
  },
  mamba: {
    primaryPaper: expandedPaper(
      'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
      ['Albert Gu', 'Tri Dao'], 2023,
      'https://arxiv.org/abs/2312.00752', null, '2312.00752',
      'Conference on Language Modeling (COLM)', 2024, 'conference', 'https://tridao.me/publications/'),
    repositories: [expandedRepository('https://github.com/state-spaces/mamba', '作者官方实现 · Mamba', 'author-official', 'Mamba-1 的选择性扫描、块结构和语言模型。', '当前仓库还包含 Mamba-2/3；本站本条是原始 Mamba，复现需固定对应版本。')],
    citation: expandedCitation(),
  },
  gcn: {
    primaryPaper: expandedPaper(
      'Semi-Supervised Classification with Graph Convolutional Networks',
      ['Thomas N. Kipf', 'Max Welling'], 2016,
      'https://arxiv.org/abs/1609.02907', null, '1609.02907',
      'International Conference on Learning Representations (ICLR)', 2017, 'conference', 'https://arxiv.org/abs/1609.02907'),
    repositories: [expandedRepository('https://github.com/tkipf/gcn', '作者实现 · GCN', 'author-official', '论文的 TensorFlow 图节点半监督分类实现。', '仓库也有 Chebyshev 变体；本站教学对应一阶归一化 GCN。')],
    citation: expandedCitation(),
  },
  gat: {
    primaryPaper: expandedPaper(
      'Graph Attention Networks',
      ['Petar Veličković', 'Guillem Cucurull', 'Arantxa Casanova', 'Adriana Romero', 'Pietro Liò', 'Yoshua Bengio'], 2017,
      'https://arxiv.org/abs/1710.10903', null, '1710.10903',
      'International Conference on Learning Representations (ICLR)', 2018, 'conference', 'https://arxiv.org/abs/1710.10903'),
    repositories: [expandedRepository('https://github.com/PetarV-/GAT', '作者实现 · GAT', 'author-official', '原始 GAT 的 TensorFlow 注意力层与 Cora 示例。', '本条不是 GATv2；教学头数不等于原论文全部实验设置。')],
    citation: expandedCitation(),
  },
  graphsage: {
    primaryPaper: expandedPaper(
      'Inductive Representation Learning on Large Graphs',
      ['William L. Hamilton', 'Rex Ying', 'Jure Leskovec'], 2017,
      'https://arxiv.org/abs/1706.02216', null, '1706.02216',
      'Advances in Neural Information Processing Systems 30 (NIPS)', 2017, 'conference', 'https://proceedings.neurips.cc/paper_files/paper/2017/hash/5dd9db5e033da9c6fb5ba83c7a7ebea9-Abstract.html'),
    repositories: [expandedRepository('https://github.com/williamleif/GraphSAGE', '作者实现 · GraphSAGE', 'author-official', '采样、mean / pooling 等多种聚合器及图表示学习实验。', 'GraphSAGE 是框架，本站选择 mean 聚合器示例，不能代表所有变体。')],
    citation: expandedCitation(),
  },
  gin: {
    primaryPaper: expandedPaper(
      'How Powerful are Graph Neural Networks?',
      ['Keyulu Xu', 'Weihua Hu', 'Jure Leskovec', 'Stefanie Jegelka'], 2018,
      'https://arxiv.org/abs/1810.00826', null, '1810.00826',
      'International Conference on Learning Representations (ICLR)', 2019, 'conference', 'https://openreview.net/forum?id=ryGs6iA5Km'),
    repositories: [expandedRepository('https://github.com/weihua916/powerful-gnns', '作者官方实现 · GIN', 'author-official', 'GIN 与论文中的图分类比较实验。')],
    citation: expandedCitation(),
  },
  tcn: {
    primaryPaper: expandedPaper(
      'An Empirical Evaluation of Generic Convolutional and Recurrent Networks for Sequence Modeling',
      ['Shaojie Bai', 'J. Zico Kolter', 'Vladlen Koltun'], 2018,
      'https://arxiv.org/abs/1803.01271', null, '1803.01271',
      'arXiv preprint', 2018, 'preprint', 'https://arxiv.org/abs/1803.01271'),
    repositories: [expandedRepository('https://github.com/locuslab/TCN', '作者实现 · TCN', 'author-official', '通用因果膨胀时序卷积基线及序列建模比较。')],
    citation: expandedCitation('所选文献是 2018 年系统比较，不把 TCN 家族的全部历史归于这篇论文。'),
  },
  wavenet: {
    primaryPaper: expandedPaper(
      'WaveNet: A Generative Model for Raw Audio',
      ['Aaron van den Oord', 'Sander Dieleman', 'Heiga Zen', 'Karen Simonyan', 'Oriol Vinyals', 'Alex Graves', 'Nal Kalchbrenner', 'Andrew Senior', 'Koray Kavukcuoglu'], 2016,
      'https://arxiv.org/abs/1609.03499', null, '1609.03499',
      'arXiv preprint (full paper)', 2016, 'preprint', 'https://arxiv.org/abs/1609.03499'),
    repositories: [expandedRepository('https://github.com/ibab/tensorflow-wavenet', '社区实现 · tensorflow-wavenet', 'third-party', 'WaveNet 自回归音频生成的 TensorFlow 社区实现。', '不是 DeepMind 作者发布，也不保证复现原论文全部条件和成绩。')],
    citation: expandedCitation('主文献选择完整预印本；SSW 9 (2016) 的同名一页 demo 摘要另见 https://www.isca-archive.org/ssw_2016/vandenoord16_ssw.html，不将其冒充完整论文发表。'),
  },
  nbeats: {
    primaryPaper: expandedPaper(
      'N-BEATS: Neural basis expansion analysis for interpretable time series forecasting',
      ['Boris N. Oreshkin', 'Dmitri Carpov', 'Nicolas Chapados', 'Yoshua Bengio'], 2019,
      'https://arxiv.org/abs/1905.10437', null, '1905.10437',
      'International Conference on Learning Representations (ICLR)', 2020, 'conference', 'https://openreview.net/forum?id=r1ecqn4YwB'),
    repositories: [expandedRepository('https://github.com/ServiceNow/N-BEATS', '作者官方实现 · N-BEATS', 'author-official', 'N-BEATS 的 PyTorch 模型和预测实验。', 'README 明示提供较轻量的版本，默认运行行为与原始完整模型略有差异。')],
    citation: expandedCitation(),
  },
  tft: {
    primaryPaper: expandedPaper(
      'Temporal Fusion Transformers for Interpretable Multi-horizon Time Series Forecasting',
      ['Bryan Lim', 'Sercan Ö. Arık', 'Nicolas Loeff', 'Tomas Pfister'], 2019,
      'https://doi.org/10.1016/j.ijforecast.2021.03.012', '10.1016/j.ijforecast.2021.03.012', '1912.09363',
      'International Journal of Forecasting', 2021, 'journal', 'https://doi.org/10.1016/j.ijforecast.2021.03.012'),
    repositories: [expandedRepository('https://github.com/google-research/google-research/tree/master/tft', 'Google Research · TFT', 'author-official', 'Temporal Fusion Transformer 的多步时序预测研究代码。')],
    citation: expandedCitation(),
  },
  patchtst: {
    primaryPaper: expandedPaper(
      'A Time Series is Worth 64 Words: Long-term Forecasting with Transformers',
      ['Yuqi Nie', 'Nam H. Nguyen', 'Phanwadee Sinthong', 'Jayant Kalagnanam'], 2022,
      'https://arxiv.org/abs/2211.14730', null, '2211.14730',
      'International Conference on Learning Representations (ICLR)', 2023, 'conference', 'https://arxiv.org/abs/2211.14730'),
    repositories: [expandedRepository('https://github.com/yuqinie98/PatchTST', '作者官方实现 · PatchTST', 'author-official', 'PatchTST 的监督预测与自监督预训练配置。')],
    citation: expandedCitation(),
  },
  itransformer: {
    primaryPaper: expandedPaper(
      'iTransformer: Inverted Transformers Are Effective for Time Series Forecasting',
      ['Yong Liu', 'Tengge Hu', 'Haoran Zhang', 'Haixu Wu', 'Shiyu Wang', 'Lintao Ma', 'Mingsheng Long'], 2023,
      'https://arxiv.org/abs/2310.06625', null, '2310.06625',
      'International Conference on Learning Representations (ICLR)', 2024, 'conference', 'https://github.com/thuml/iTransformer'),
    repositories: [expandedRepository('https://github.com/thuml/iTransformer', '作者官方实现 · iTransformer', 'author-official', '以变量为 token 的 iTransformer 和时序预测实验。')],
    citation: expandedCitation(),
  },
  vqvae: {
    primaryPaper: expandedPaper(
      'Neural Discrete Representation Learning',
      ['Aaron van den Oord', 'Oriol Vinyals', 'Koray Kavukcuoglu'], 2017,
      'https://arxiv.org/abs/1711.00937', null, '1711.00937',
      'Advances in Neural Information Processing Systems 30 (NIPS)', 2017, 'conference', 'https://proceedings.neurips.cc/paper/2017/hash/7a98af17e63a0ac09ce2e96d03992fbc-Abstract.html'),
    repositories: [expandedRepository('https://github.com/google-deepmind/sonnet/blob/v2/examples/vqvae_example.ipynb', 'DeepMind Sonnet 2 · VQ-VAE 示例', 'reference-implementation', '官方 Sonnet 的 TF2 VQ-VAE 训练示例。', '后来的参考实现，不是 2017 年原始实验发布快照，也不覆盖论文全部先验建模实验。')],
    citation: expandedCitation(),
  },
  ddpm: {
    primaryPaper: expandedPaper(
      'Denoising Diffusion Probabilistic Models',
      ['Jonathan Ho', 'Ajay Jain', 'Pieter Abbeel'], 2020,
      'https://arxiv.org/abs/2006.11239', null, '2006.11239',
      'Advances in Neural Information Processing Systems 33 (NeurIPS)', 2020, 'conference', 'https://proceedings.neurips.cc/paper/2020/hash/4c5bcfec8584af0d967f1ab10179ca4b-Abstract.html'),
    repositories: [expandedRepository('https://github.com/hojonathanho/diffusion', '作者实现 · DDPM', 'author-official', 'Denoising Diffusion Probabilistic Models 的 TensorFlow 研究实现。')],
    citation: expandedCitation(),
  },
  'latent-diffusion': {
    primaryPaper: expandedPaper(
      'High-Resolution Image Synthesis with Latent Diffusion Models',
      ['Robin Rombach', 'Andreas Blattmann', 'Dominik Lorenz', 'Patrick Esser', 'Björn Ommer'], 2021,
      'https://openaccess.thecvf.com/content/CVPR2022/html/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.html', '10.1109/CVPR52688.2022.01042', '2112.10752',
      'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)', 2022, 'conference', 'https://openaccess.thecvf.com/content/CVPR2022/html/Rombach_High-Resolution_Image_Synthesis_With_Latent_Diffusion_Models_CVPR_2022_paper.html'),
    repositories: [expandedRepository('https://github.com/CompVis/latent-diffusion', '作者官方实现 · Latent Diffusion', 'author-official', '原论文的潜空间扩散、自动编码器、条件生成和采样实现。', '本条不是把所有 Stable Diffusion 后续版本视作同一模型。')],
    citation: expandedCitation(),
  },
  dit: {
    primaryPaper: expandedPaper(
      'Scalable Diffusion Models with Transformers',
      ['William Peebles', 'Saining Xie'], 2022,
      'https://openaccess.thecvf.com/content/ICCV2023/html/Peebles_Scalable_Diffusion_Models_with_Transformers_ICCV_2023_paper.html', '10.1109/ICCV51070.2023.00387', '2212.09748',
      'IEEE/CVF International Conference on Computer Vision (ICCV)', 2023, 'conference', 'https://openaccess.thecvf.com/content/ICCV2023/html/Peebles_Scalable_Diffusion_Models_with_Transformers_ICCV_2023_paper.html'),
    repositories: [expandedRepository('https://github.com/facebookresearch/DiT', '作者官方实现 · DiT', 'author-official', 'DiT 模型、预训练权重和 PyTorch 训练 / 采样代码。')],
    citation: expandedCitation(),
  },
  realnvp: {
    primaryPaper: expandedPaper(
      'Density estimation using Real NVP',
      ['Laurent Dinh', 'Jascha Sohl-Dickstein', 'Samy Bengio'], 2016,
      'https://arxiv.org/abs/1605.08803', null, '1605.08803',
      'International Conference on Learning Representations (ICLR)', 2017, 'conference', 'https://arxiv.org/abs/1605.08803'),
    repositories: [expandedRepository('https://github.com/tensorflow/models/tree/archive/research/real_nvp', '作者实现 · Real NVP（归档）', 'author-official', 'Laurent Dinh 编写的 Real NVP TensorFlow 1 训练实现。', '位于 archive 分支，已停止维护；master 中旧路径已不存在，不应据此承诺当前环境开箱可运行。')],
    citation: expandedCitation(),
  },
  memn2n: {
    primaryPaper: expandedPaper(
      'End-To-End Memory Networks',
      ['Sainbayar Sukhbaatar', 'Arthur Szlam', 'Jason Weston', 'Rob Fergus'], 2015,
      'https://arxiv.org/abs/1503.08895', null, '1503.08895',
      'Advances in Neural Information Processing Systems 28 (NIPS)', 2015, 'conference', 'https://proceedings.neurips.cc/paper/2015/hash/8fb21ee7a2207526da55a679f0332de2-Abstract.html'),
    repositories: [expandedRepository('https://github.com/facebookarchive/MemNN', '作者官方实现 · MemNN（归档）', 'author-official', 'MemN2N 的 bAbI MATLAB 实验与 Torch 语言建模实现。', '此仓库还含其他记忆网络论文，不能把全部目录归于所选主论文。')],
    citation: expandedCitation(),
  },
  'transformer-xl': {
    primaryPaper: expandedPaper(
      'Transformer-XL: Attentive Language Models beyond a Fixed-Length Context',
      ['Zihang Dai', 'Zhilin Yang', 'Yiming Yang', 'Jaime Carbonell', 'Quoc Le', 'Ruslan Salakhutdinov'], 2019,
      'https://aclanthology.org/P19-1285/', '10.18653/v1/P19-1285', '1901.02860',
      'Annual Meeting of the Association for Computational Linguistics (ACL)', 2019, 'conference', 'https://aclanthology.org/P19-1285/'),
    repositories: [expandedRepository('https://github.com/kimiyoung/transformer-xl', '作者实现 · Transformer-XL', 'author-official', '论文的 PyTorch / TensorFlow 语言模型与分段记忆实现。')],
    citation: expandedCitation(),
  },
};
