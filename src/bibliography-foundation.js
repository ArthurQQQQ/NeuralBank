// One representative paper per teaching entry, not a claim of architectural origin.
// Conference years describe the selected publication; model.year may describe its preprint.
// Verified against publisher/proceedings records and author-linked repositories, 2026-11-26.
const unknownCitation = (note = '') => ({
  count: null,
  source: null,
  url: null,
  retrievedAt: null,
  scope: 'primary-paper',
  note: `尚未核验可追溯的引用次数；null 表示未知，不是 0。统计对象为此处选定的主论文，不是整个架构家族。${note}`
});

const paper = (title, authors, year, url, doi, arxivId, venueName, venueType, venueUrl = url) => ({
  title, authors, year, url, doi, arxivId,
  venue: { name: venueName, year, type: venueType, url: venueUrl }
});
const officialRepo = (url, label, scope, note) => ({
  url, label, relationship: 'author-official', scope, ...(note ? { note } : {})
});
const record = (primaryPaper, repositories = [], note = '') => ({
  primaryPaper, repositories, citation: unknownCitation(note)
});
const iclr = (year, hash) => `https://proceedings.iclr.cc/paper_files/paper/${year}/hash/${hash}-Abstract-Conference.html`;
const neurips = (year, hash) => `https://proceedings.neurips.cc/paper_files/paper/${year}/hash/${hash}-Abstract-Conference.html`;

export const foundationBibliography = {
  perceptron: record(paper(
    'The perceptron: A probabilistic model for information storage and organization in the brain.',
    ['Frank Rosenblatt'], 1958,
    'https://doi.org/10.1037/h0042519', '10.1037/h0042519', null,
    'Psychological Review', 'journal'
  )),
  mlp: record(paper(
    'Learning representations by back-propagating errors',
    ['David E. Rumelhart', 'Geoffrey E. Hinton', 'Ronald J. Williams'], 1986,
    'https://www.nature.com/articles/323533a0', '10.1038/323533a0', null,
    'Nature', 'journal'
  ), [], '本条选用反向传播训练多层网络的代表论文，不把它称为所有 MLP 的唯一发明论文。'),
  cnn: record(paper(
    'Gradient-Based Learning Applied to Document Recognition',
    ['Yann LeCun', 'Léon Bottou', 'Yoshua Bengio', 'Patrick Haffner'], 1998,
    'https://bottou.org/papers/lecun-98h', '10.1109/5.726791', null,
    'Proceedings of the IEEE', 'journal'
  ), [], '这是文档识别卷积网络的代表论文；Proceedings of the IEEE 是期刊。本页缩略 CNN 不是论文中的完整 LeNet-5。'),
  rnn: record(paper(
    'Finding Structure in Time', ['Jeffrey L. Elman'], 1990,
    'https://doi.org/10.1207/s15516709cog1402_1', '10.1207/s15516709cog1402_1', null,
    'Cognitive Science', 'journal'
  )),
  lstm: record(paper(
    'Long Short-Term Memory', ['Sepp Hochreiter', 'Jürgen Schmidhuber'], 1997,
    'https://doi.org/10.1162/neco.1997.9.8.1735', '10.1162/neco.1997.9.8.1735', null,
    'Neural Computation', 'journal'
  ), [], '主论文是 1997 年原始 LSTM；本页教学使用后来加入遗忘门的常见变体，不能把两者的完整单元结构视为相同。'),
  transformer: record(paper(
    'Attention Is All You Need',
    ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Łukasz Kaiser', 'Illia Polosukhin'], 2017,
    'https://proceedings.neurips.cc/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html',
    null, '1706.03762', 'Advances in Neural Information Processing Systems 30 (NIPS 2017)', 'conference'
  ), [officialRepo(
    'https://github.com/tensorflow/tensor2tensor', 'Tensor2Tensor · 原论文作者发布的实现',
    '含原始 Transformer 编解码器、WMT 数据处理与训练配置；本页仅讲解编码器缩略结构。',
    '仓库已归档；代码版本与评测条件需另行核对，链接本身不证明复现。'
  )]),
  autoencoder: record(paper(
    'Reducing the Dimensionality of Data with Neural Networks',
    ['Geoffrey E. Hinton', 'Ruslan R. Salakhutdinov'], 2006,
    'https://doi.org/10.1126/science.1127647', '10.1126/science.1127647', null,
    'Science', 'journal'
  ), [], '选用 2006 年深层自编码器的代表性研究；这不是自编码器起源年份。本页简单重建网络没有复刻该论文的逐层预训练流程。'),
  resnet: record(paper(
    'Deep Residual Learning for Image Recognition',
    ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'], 2016,
    'https://openaccess.thecvf.com/content_cvpr_2016/html/He_Deep_Residual_Learning_CVPR_2016_paper.html',
    '10.1109/CVPR.2016.90', '1512.03385', 'IEEE Conference on Computer Vision and Pattern Recognition (CVPR 2016)', 'conference'
  ), [officialRepo(
    'https://github.com/KaimingHe/deep-residual-networks', 'ResNet · 作者原始模型发布',
    '论文作者发布的 ResNet-50/101/152 Caffe 模型，供测试与微调。',
    'README 明确说明这些权重转换自作者自己的实现，并非使用此 Caffe 版本训练；不能据此宣称原训练流程已复现。'
  )]),
  gru: record(paper(
    'Learning Phrase Representations using RNN Encoder–Decoder for Statistical Machine Translation',
    ['Kyunghyun Cho', 'Bart van Merriënboer', 'Caglar Gulcehre', 'Dzmitry Bahdanau', 'Fethi Bougares', 'Holger Schwenk', 'Yoshua Bengio'], 2014,
    'https://aclanthology.org/D14-1179/', '10.3115/v1/D14-1179', '1406.1078',
    'Conference on Empirical Methods in Natural Language Processing (EMNLP 2014)', 'conference'
  )),
  unet: record(paper(
    'U-Net: Convolutional Networks for Biomedical Image Segmentation',
    ['Olaf Ronneberger', 'Philipp Fischer', 'Thomas Brox'], 2015,
    'https://link.springer.com/chapter/10.1007/978-3-319-24574-4_28', '10.1007/978-3-319-24574-4_28', '1505.04597',
    'Medical Image Computing and Computer-Assisted Intervention (MICCAI 2015)', 'conference'
  ), [], '作者原始发布位于 Freiburg 项目页，不把常见第三方 PyTorch U-Net 仓库称为作者原始实现。'),
  vit: record(paper(
    'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
    ['Alexey Dosovitskiy', 'Lucas Beyer', 'Alexander Kolesnikov', 'Dirk Weissenborn', 'Xiaohua Zhai', 'Thomas Unterthiner', 'Mostafa Dehghani', 'Matthias Minderer', 'Georg Heigold', 'Sylvain Gelly', 'Jakob Uszkoreit', 'Neil Houlsby'], 2021,
    'https://openreview.net/forum?id=YicbFdNTTy', null, '2010.11929',
    'International Conference on Learning Representations (ICLR 2021)', 'conference',
    'https://iclr.cc/virtual/2021/poster/3013'
  ), [officialRepo(
    'https://github.com/google-research/vision_transformer', 'ViT · 作者官方 JAX/Flax 发布',
    '发布 ViT 模型、微调代码与 checkpoint；当前仓库还包括 MLP-Mixer 等后续研究。',
    'README 区分本仓库的微调发布与 big_vision 中的原始预训练代码，不能把所有版本视为相同训练协议。'
  )]),
  vae: record(paper(
    'Auto-Encoding Variational Bayes', ['Diederik P. Kingma', 'Max Welling'], 2014,
    'https://arxiv.org/abs/1312.6114', null, '1312.6114',
    'International Conference on Learning Representations (ICLR 2014)', 'conference',
    'https://dare.uva.nl/id/cf65ba0f-d88f-4a49-8ebd-3a7fce86edd7'
  ), [], '2013 是预印本首次公开年份；所选正式会议记录为 ICLR 2014，作者所在大学的出版记录已确认收录。'),
  gan: record(paper(
    'Generative Adversarial Nets',
    ['Ian J. Goodfellow', 'Jean Pouget-Abadie', 'Mehdi Mirza', 'Bing Xu', 'David Warde-Farley', 'Sherjil Ozair', 'Aaron Courville', 'Yoshua Bengio'], 2014,
    'https://proceedings.neurips.cc/paper/2014/hash/f033ed80deb0234979a61f95710dbe25-Abstract.html',
    null, '1406.2661', 'Advances in Neural Information Processing Systems 27 (NIPS 2014)', 'conference'
  ), [officialRepo(
    'https://github.com/goodfeli/adversarial', 'GAN · Goodfellow 原论文代码',
    '原论文的代码与超参数；依赖当时的 Theano/Pylearn2 环境。'
  )]),
  hopfield: record(paper(
    'Neural networks and physical systems with emergent collective computational abilities',
    ['John J. Hopfield'], 1982,
    'https://authors.library.caltech.edu/records/w41x7-8bn13', '10.1073/pnas.79.8.2554', null,
    'Proceedings of the National Academy of Sciences of the United States of America (PNAS)', 'journal'
  )),
  'modern-hopfield': record(paper(
    'Hopfield Networks is All You Need',
    ['Hubert Ramsauer', 'Bernhard Schäfl', 'Johannes Lehner', 'Philipp Seidl', 'Michael Widrich', 'Lukas Gruber', 'Markus Holzleitner', 'Thomas Adler', 'David Kreil', 'Michael K. Kopp', 'Günter Klambauer', 'Johannes Brandstetter', 'Sepp Hochreiter'], 2021,
    'https://openreview.net/forum?id=tL89RnzIiCd', null, '2008.02217',
    'International Conference on Learning Representations (ICLR 2021)', 'conference',
    'https://iclr.cc/virtual/2021/poster/2657'
  ), [officialRepo(
    'https://github.com/ml-jku/hopfield-layers', 'Hopfield Layers · 作者实现',
    '连续 Hopfield 关联层及相关示例；不是 1982 年二值异步 Hopfield 网络的原始代码。'
  )], '作者列表采用 ICLR 2021 官方会议记录；arXiv 后续版本的作者列表有扩展，不应把不同版本的列表无声合并。'),
  ntm: record(paper(
    'Neural Turing Machines', ['Alex Graves', 'Greg Wayne', 'Ivo Danihelka'], 2014,
    'https://arxiv.org/abs/1410.5401', '10.48550/arXiv.1410.5401', '1410.5401',
    'arXiv', 'preprint'
  ), [], '所核验来源为预印本，不额外赋予未经核实的会议接收身份。'),
  dnc: record(paper(
    'Hybrid computing using a neural network with dynamic external memory',
    ['Alex Graves', 'Greg Wayne', 'Malcolm Reynolds', 'Tim Harley', 'Ivo Danihelka', 'Agnieszka Grabska-Barwińska', 'Sergio Gómez Colmenarejo', 'Edward Grefenstette', 'Tiago Ramalho', 'John Agapiou', 'Adrià Puigdomènech Badia', 'Karl Moritz Hermann', 'Yori Zwols', 'Georg Ostrovski', 'Adam Cain', 'Helen King', 'Christopher Summerfield', 'Phil Blunsom', 'Koray Kavukcuoglu', 'Demis Hassabis'], 2016,
    'https://www.nature.com/articles/nature20101', '10.1038/nature20101', null,
    'Nature', 'journal'
  ), [officialRepo(
    'https://github.com/google-deepmind/dnc', 'DNC · DeepMind 实现',
    'DeepMind 发布的 TensorFlow/Sonnet DNC 实现和示例训练脚本。',
    '代码链接说明来源，不表示当前环境能够直接复现论文的全部实验。'
  )]),
  'log-linear-attention': record(paper(
    'Log-Linear Attention', ['Han Guo', 'Songlin Yang', 'Tarushii Goel', 'Eric P. Xing', 'Tri Dao', 'Yoon Kim'], 2026,
    iclr(2026, '939a9a2604f13729a4ec36ad25d10c60'), null, '2506.04761',
    'International Conference on Learning Representations (ICLR 2026)', 'conference'
  ), [officialRepo(
    'https://github.com/HanGuo97/log-linear-attention', 'Log-Linear Attention · 作者实现',
    '作者论文直接链接的分层注意力实现、内核和训练配置。'
  )], '会议网页将第一作者简写为 Guo；完整姓名 Han Guo 由正式论文 PDF 与作者 arXiv 版本交叉确认。'),
  mamba3: record(paper(
    'Mamba-3: Improved Sequence Modeling using State Space Principles',
    ['Aakash Sunil Lahoti', 'Kevin Li', 'Berlin Chen', 'Caitlin Wang', 'Aviv Bick', 'Zico Kolter', 'Tri Dao', 'Albert Gu'], 2026,
    iclr(2026, '8abd2043b71a074278d5f687947bff9c'), null, '2603.15569',
    'International Conference on Learning Representations (ICLR 2026)', 'conference'
  ), [officialRepo(
    'https://github.com/state-spaces/mamba', 'Mamba · 作者官方代码库',
    '包含 Mamba-3 模块与 SISO/MIMO 用法；仓库同时维护 Mamba 与 Mamba-2。',
    '需明确选择 Mamba-3 及具体版本，不能把整个仓库的所有模型当作本论文配置。'
  )], '作者姓名按 ICLR 正式记录；arXiv 使用 Aakash Lahoti、Kevin Y. Li、J. Zico Kolter 等展示名。'),
  rae: record(paper(
    'Diffusion Transformers with Representation Autoencoders',
    ['Boyang Zheng', 'Nanye Ma', 'Shengbang Tong', 'Saining Xie'], 2026,
    iclr(2026, '3c4141c12660ad3625eb4ae845e0a6f9'), null, '2510.11690',
    'International Conference on Learning Representations (ICLR 2026)', 'conference'
  ), [officialRepo(
    'https://github.com/bytetriper/RAE', 'RAE · 作者官方 PyTorch 实现',
    'RAE、DiT/DDT 生成流程及发布权重；项目页与论文作者共同确认该仓库。',
    '仓库持续更新，README 说明部分新配置与原报告有差异；具体成绩仍需对应论文与配置。'
  )]),
  titans: record(paper(
    'Titans: Learning to Memorize at Test Time', ['Ali Behrouz', 'Peilin Zhong', 'Vahab Mirrokni'], 2025,
    neurips(2025, 'a4ca07aa108036f80cbb5b82285fd4b1'), '10.52202/085713-3786', '2501.00663',
    'Advances in Neural Information Processing Systems 38 (NeurIPS 2025)', 'conference'
  )),
  'gated-attention': record(paper(
    'Gated Attention for Large Language Models: Non-linearity, Sparsity, and Attention-Sink-Free',
    ['Zihan Qiu', 'Zekun Wang', 'Bo Zheng', 'Zeyu Huang', 'Kaiyue Wen', 'Songlin Yang', 'Rui Men', 'Le Yu', 'Fei Huang', 'Suozhi Huang', 'Dayiheng Liu', 'Jingren Zhou', 'Junyang Lin'], 2025,
    neurips(2025, '904e89bb4e632e75fb47f093b620b257'), '10.52202/085713-3345', '2505.06708',
    'Advances in Neural Information Processing Systems 38 (NeurIPS 2025)', 'conference'
  ), [officialRepo(
    'https://github.com/qiuzh20/gated_attention', 'Gated Attention · 作者官方实现',
    '基于 Qwen3 的门控变体、模型配置与注意力可视化；不把所有 Qwen 系列都视为同一门控配置。',
    '采用实际可访问的 gated_attention 仓库；会议摘要中不带下划线的旧地址无法访问。'
  )]),
  'canon-layer': record(paper(
    'Physics of Language Models: Part 4.1, Architecture Design and the Magic of Canon Layers',
    ['Zeyuan Allen-Zhu'], 2025,
    neurips(2025, '3c4141c12660ad3625eb4ae845e0a6f9'), '10.52202/085713-1410', '2512.17351',
    'Advances in Neural Information Processing Systems 38 (NeurIPS 2025)', 'conference'
  ), [officialRepo(
    'https://github.com/zhuzeyuan/PhysicsLM4', 'PhysicsLM4 · 作者维护的迁移仓库',
    '包括 Part 4.1 的合成预训练任务和 Canon 层，也包含后续 Part 4.2 代码与结果。',
    '原 facebookresearch/PhysicsLM4 README 指向此作者仓库；后续版本结果不应冒充 NeurIPS 2025 原始 Part 4.1 证据。'
  )]),
  ahn: record(paper(
    'Artificial Hippocampus Networks for Efficient Long-Context Modeling',
    ['Yunhao Fang', 'Weihao Yu', 'Shu Zhong', 'Qinghao Ye', 'Xuehan Xiong', 'Lai Wei'], 2026,
    'https://proceedings.mlr.press/v306/fang26w.html', null, '2510.07318',
    'International Conference on Machine Learning (ICML 2026), PMLR 306', 'conference'
  ), [officialRepo(
    'https://github.com/ByteDance-Seed/AHN', 'AHN · 作者官方实现',
    'PMLR Software 与作者论文均指向此仓库，包含训练、推理与长上下文评测说明。'
  )]),
  flowstate: record(paper(
    'FlowState: Sampling-Rate-Equivariant Time-Series Forecasting',
    ['Lars Graf', 'Thomas Ortner', 'Stanisław Woźniak', 'Angeliki Pantazi'], 2026,
    'https://proceedings.mlr.press/v306/graf26a.html', null, '2508.05287',
    'International Conference on Machine Learning (ICML 2026), PMLR 306', 'conference'
  ), [officialRepo(
    'https://github.com/ibm-granite/granite-tsfm/tree/gift-flowstate/tsfm_public/models/flowstate',
    'FlowState · IBM 作者发布的模型代码',
    'PMLR Software 链接的 IBM Research 模型卡进一步指定此 GitHub 分支中的 FlowState 实现。',
    '模型卡区分 r1.0 与 r1.1；使用时需固定具体版本，不能自动视为同一 benchmark 协议。'
  )]),
  'repack-refine': record(paper(
    'RePack then Refine: Efficient Diffusion Transformers with Vision Foundation Models',
    ['Guanfang Dong', 'Luke Schultz', 'Negar Hassanpour', 'Chao Gao'], 2026,
    'https://proceedings.mlr.press/v306/dong26l.html', null, '2512.12083',
    'International Conference on Machine Learning (ICML 2026), PMLR 306', 'conference'
  ), [officialRepo(
    'https://github.com/guanfangdong/RePack-then-Refine', 'RePack then Refine · 作者官方实现',
    'PMLR 正文直接链接的三阶段训练、采样及评测代码；各阶段配置应分别核对。'
  )])
};
