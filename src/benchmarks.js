// Curated, author-reported results. These are trained configurations, not scores
// of the small educational diagrams. Missing model results are deliberately absent.
// Compare numerically only within a benchmarkId + comparisonKey group; this
// groups evaluation protocols, not identical model sizes or training budgets.
export const tasks = [
  { id: 'language', name: '语言', description: '常识续写与长上下文理解，保留零样本、上下文长度及评分协议。' },
  { id: 'vision', name: '视觉', description: '图像分类与生成；分类准确率、错误率和 FID 分别解释。' },
  { id: 'timeseries', name: '时序', description: '零样本时间序列预测；点预测与概率预测使用不同指标。' }
];

export const benchmarks = [
  {
    id: 'hellaswag-acc-norm', taskId: 'language', name: 'HellaSwag', subtask: '常识续写',
    metric: 'Length-normalized accuracy', unit: '%', direction: 'higher',
    description: '从四个续写中选择合理结尾。acc_norm 用候选长度归一化的语言模型分数选择答案，再计算正确率；不同于未归一化的 acc。',
    officialUrl: 'https://rowanzellers.com/hellaswag/',
    protocolNote: '本页收录论文的零样本 lm-eval 结果，不是官方测试集排行榜。官方 harness 默认使用 validation；论文未披露具体任务版本及 split。',
    references: [{ title: 'LM Evaluation Harness · 官方任务定义', url: 'https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/tasks/hellaswag/hellaswag.yaml' }]
  },
  {
    id: 'lv-eval-128k-avg', taskId: 'language', name: 'LV-Eval · 128K', subtask: '长上下文理解',
    metric: 'Avg. score（论文报告）', unit: '分', direction: 'higher',
    description: '长文本中的问答与跨段信息理解。这里是 AHN 论文所报告的任务平均分，各任务评分不相同，不能统一称为 accuracy。',
    officialUrl: 'https://github.com/infinigence/LVEval',
    protocolNote: '只比较同一 AHN 论文中的 Qwen2.5-3B-Instruct、128K 配置；保留 full attention 与窗口压缩的区别。'
  },
  {
    id: 'imagenet-1k-top1', taskId: 'vision', name: 'ImageNet-1K · Top-1', subtask: '图像分类',
    metric: 'Top-1 accuracy', unit: '%', direction: 'higher',
    description: '1000 类图像分类，衡量最高分预测与标签一致的比例。预训练数据、输入分辨率和测试裁剪会显著影响结果。',
    officialUrl: 'https://www.image-net.org/challenges/LSVRC/2012/',
    protocolNote: 'ViT 记录对应完整 ViT-H/14 与指定预训练、微调配置，不能归给网站中的 32 × 32 教学网络。'
  },
  {
    id: 'imagenet-1k-top1-error', taskId: 'vision', name: 'ImageNet-1K · Top-1 error', subtask: '图像分类',
    metric: 'Top-1 error', unit: '%', direction: 'lower',
    description: '最高分分类预测错误的比例。本条保留 ResNet 原论文的错误率口径，不把它误标为准确率。',
    officialUrl: 'https://www.image-net.org/challenges/LSVRC/2012/',
    protocolNote: '采用原论文 Table 3 的单模型 10-crop 验证结果；与多尺度测试、集成结果和单裁剪结果分开。'
  },
  {
    id: 'imagenet-256-fid', taskId: 'vision', name: 'ImageNet-1K · FID', subtask: '类条件图像生成',
    metric: 'FID-50K', unit: '', direction: 'lower',
    description: '比较生成样本与参考图像在特征空间中的分布差异。只在分辨率、参考统计量、样本量和采样协议一致时比较。',
    officialUrl: 'https://github.com/openai/guided-diffusion/tree/main/evaluations',
    protocolNote: '本页为 RePack then Refine 的 256 × 256 类条件生成，50,000 个样本，使用 ADM / guided-diffusion 的训练集参考统计量。'
  },
  {
    id: 'gift-eval-normalized-mase', taskId: 'timeseries', name: 'GIFT-Eval · MASE', subtask: '点预测',
    metric: 'Normalized MASE', unit: '', direction: 'lower',
    description: '先将每个任务的 MASE 相对 Seasonal Naive 基线归一化，再对任务结果取几何平均；为无量纲值，不是误差百分比。',
    officialUrl: 'https://github.com/SalesforceAIResearch/gift-eval',
    protocolNote: '采用 FlowState 主表的 97 个零样本任务、4096 上下文；预测长度按各任务设置，不统一设为某个固定长度。'
  },
  {
    id: 'gift-eval-normalized-crps', taskId: 'timeseries', name: 'GIFT-Eval · CRPS', subtask: '概率预测',
    metric: 'Normalized quantile CRPS', unit: '', direction: 'lower',
    description: '评价预测分布的 quantile CRPS；每个任务相对 Seasonal Naive 归一化，再跨任务取几何平均。不能与 MASE 数值直接横比。',
    officialUrl: 'https://github.com/SalesforceAIResearch/gift-eval',
    protocolNote: '与 MASE 相同的 FlowState 97 任务、4096 上下文协议；数值为论文主表结果，而非 2K 上下文消融。'
  }
];

const mambaSource = {
  title: 'Mamba-3: Improved Sequence Modeling using State Space Principles · ICLR 2026',
  url: 'https://proceedings.iclr.cc/paper_files/paper/2026/file/8abd2043b71a074278d5f687947bff9c-Paper-Conference.pdf',
  location: 'Table 1（PDF p.8）；§4.1；Appendix E（PDF p.27）'
};
const ahnSource = {
  title: 'Artificial Hippocampus Networks for Efficient Long-Context Modeling · ICML 2026',
  url: 'https://proceedings.mlr.press/v306/fang26w.html',
  location: 'Table 2；Appendix A.2 / Table 6'
};
const repackSource = {
  title: 'RePack then Refine: Efficient Diffusion Transformers with Vision Foundation Models · ICML 2026',
  url: 'https://proceedings.mlr.press/v306/dong26l.html',
  location: 'Table 1；Appendix Table 13；官方 stage2 README'
};
const flowstateSource = {
  title: 'FlowState: Sampling-Rate-Equivariant Time-Series Forecasting · ICML 2026',
  url: 'https://proceedings.mlr.press/v306/graf26a.html',
  location: 'Table 1；§6.1'
};

const mambaProtocol = 'HellaSwag，0-shot，Table 1 的 acc_norm；LM Evaluation Harness。论文未单列 split 或代码 commit，官方任务默认 validation。';
const mambaConditions = {
  split: '论文未单列；官方 lm-eval HellaSwag 默认 validation，非官方 test leaderboard',
  shots: '0-shot', metricVariant: 'acc_norm',
  pretraining: '100B FineWeb-Edu tokens；Llama-3.1 tokenizer',
  trainingContext: '2048 tokens'
};
const mambaNotes = ['这是约 1.5B 参数的完整因果语言模型，不是网站的单头教学示意。', '只与同一论文、同预算的 Table 1 配置并列；不与不同 few-shot 或评分版本的 HellaSwag 结果排名。'];

const flowstateProtocol = 'GIFT-Eval，97 个任务，zero-shot，4096 上下文；每任务相对 Seasonal Naive 归一化，再取跨任务几何平均。';
const flowstateConditions = {
  split: 'GIFT-Eval 官方各任务的测试 / 滚动评估设置',
  evaluation: '97 tasks；zero-shot', contextLength: '4096 observations',
  forecastHorizon: '依每个任务的官方短 / 中 / 长期设置',
  aggregation: '先对各任务除 Seasonal Naive，再取几何平均'
};

export const benchmarkResults = [
  {
    id: 'resnet50-imagenet-top1-error', modelId: 'resnet', benchmarkId: 'imagenet-1k-top1-error',
    reportedModel: 'ResNet-50 · option B', value: 22.85, reportedYear: 2016,
    configuration: '完整 50 层瓶颈 ResNet；仅尺寸增加处使用投影捷径；ImageNet 从头训练。',
    protocol: 'ImageNet 2012，1000 类，50,000 张 validation 图像；单模型、标准 10-crop 测试；保留原报告 Top-1 error。',
    conditions: { split: 'ILSVRC2012 validation（50,000 张）', resolution: '训练裁剪 224 × 224；评估为原论文标准 10-crop', evaluation: '单模型，非多尺度全卷积测试，非集成', pretraining: '无外部预训练；ImageNet 从头训练' },
    comparisonKey: 'resnet-original-imagenet2012-val-10crop-optionb',
    source: { title: 'Deep Residual Learning for Image Recognition · CVPR 2016', url: 'https://arxiv.org/html/1512.03385v1', location: 'Table 3；§3.4；§4.1' },
    notes: ['22.85 是错误率，越低越好；未改写成未经注明的派生准确率。', '不是网站所画的单个 BasicBlock 的成绩，也不是 Table 4 的多尺度结果。'],
    verifiedAt: '2026-11-26'
  },
  {
    id: 'vit-h14-imagenet-top1', modelId: 'vit', benchmarkId: 'imagenet-1k-top1',
    reportedModel: 'ViT-H/14 · JFT-300M', value: 88.55, reportedYear: 2021,
    uncertainty: { kind: 'standard-deviation', value: 0.04, runs: 3 },
    configuration: 'ViT-Huge/14，32 层、632M 参数；JFT-300M 预训练，再在 ImageNet-1K 上微调。',
    protocol: '原论文 Table 2 的 ImageNet 分类结果；518 × 518 微调分辨率，使用 Polyak averaging；三次微调的均值 ± 标准差为 88.55 ± 0.04。',
    conditions: { split: '原文 ImageNet 原标签评估；Table 2 未单列 split 名称，Appendix B.1.1 称 test data；不混 ImageNet-ReaL', resolution: '518 × 518', pretraining: 'JFT-300M，14 epochs', fineTuning: 'ImageNet-1K，20,000 steps；Polyak averaging', aggregation: '3 次微调均值；std 0.04 个百分点' },
    comparisonKey: 'vit-paper-imagenet1k-originallabels-jft300m-ft518-polyak',
    source: { title: 'An Image is Worth 16x16 Words · ICLR 2021', url: 'https://arxiv.org/html/2010.11929v2', location: 'Table 2；§4.1；Appendix B.1 / B.1.1' },
    notes: ['外部预训练数据与分辨率属于成绩条件，不能只把数值归因于 ViT 结构。', '不是 32 × 32、32 维教学 ViT 的运行结果；也不是 ImageNet-ReaL 的 90.72。'],
    verifiedAt: '2026-11-26'
  },
  {
    id: 'mamba3-siso-1p5b-hellaswag', modelId: 'mamba3', benchmarkId: 'hellaswag-acc-norm',
    reportedModel: 'Mamba-3-SISO-1.5B', value: 61.9, reportedYear: 2026,
    configuration: '论文 SISO 1.5B 模型；与 Table 1 各基线使用相同预训练程序。',
    protocol: mambaProtocol, conditions: { ...mambaConditions },
    comparisonKey: 'mamba3-table1-1p5b-fineweb100b-hellaswag-0shot-accnorm',
    source: { ...mambaSource }, notes: [...mambaNotes], verifiedAt: '2026-11-26'
  },
  {
    id: 'mamba3-mimo-1p5b-hellaswag', modelId: 'mamba3', benchmarkId: 'hellaswag-acc-norm',
    reportedModel: 'Mamba-3-MIMO-1.5B · R=4', value: 62.3, reportedYear: 2026,
    configuration: 'MIMO rank R=4；缩减 MLP 宽度以匹配 SISO 的总参数量；不能把全部收益理解为不增加训练运算。',
    protocol: mambaProtocol, conditions: { ...mambaConditions },
    comparisonKey: 'mamba3-table1-1p5b-fineweb100b-hellaswag-0shot-accnorm',
    source: { ...mambaSource }, notes: [...mambaNotes, 'MIMO 的参数匹配细节见 Appendix D。'], verifiedAt: '2026-11-26'
  },
  {
    id: 'transformer-1p5b-hellaswag-mamba-baseline', modelId: 'transformer', benchmarkId: 'hellaswag-acc-norm',
    reportedModel: 'Transformer-1.5B · Mamba-3 paper baseline', value: 60.6, reportedYear: 2026,
    configuration: 'Mamba-3 论文中训练的完整因果 Transformer 语言模型基线；不是网站所画的双向编码器块。',
    protocol: mambaProtocol, conditions: { ...mambaConditions },
    comparisonKey: 'mamba3-table1-1p5b-fineweb100b-hellaswag-0shot-accnorm',
    source: { ...mambaSource }, notes: [...mambaNotes, '关联到 Transformer 家族只为导航；具体成绩属于本记录中的因果模型配置。'], verifiedAt: '2026-11-26'
  },
  {
    id: 'qwen25-3b-full-lveval128k', modelId: null, benchmarkId: 'lv-eval-128k-avg',
    reportedModel: 'Qwen2.5-3B-Instruct · full attention', value: 4.41, reportedYear: 2026,
    configuration: 'AHN 论文使用的原始 3B 指令模型基线，保留完整上下文 KV。',
    protocol: 'LV-Eval 128K 子集；AHN 原文 Table 2 的 Avg.；各数据集使用相应长文本问答评分。',
    conditions: { split: 'LV-Eval 128K 评估子集', baseModel: 'Qwen2.5-3B-Instruct', memory: 'Full attention，完整 KV', metricVariant: '论文 Avg.；可由 Table 6 中 11 项分数均值复核' },
    comparisonKey: 'ahn-table2-qwen25-3b-instruct-lveval128k',
    source: { ...ahnSource },
    notes: ['各任务并非同一种 accuracy；分数维持论文口径。', '附录表标题的任务数有笔误，实际列出 11 项；本页未伪称 12 项或 21 项宏平均。', '这是比较用的外部基线，未强行归入网站的某个教学模型。'],
    verifiedAt: '2026-11-26'
  },
  {
    id: 'ahn-gdn-qwen25-3b-lveval128k', modelId: 'ahn', benchmarkId: 'lv-eval-128k-avg',
    reportedModel: 'Qwen2.5-3B-Instruct + AHN-GDN', value: 5.88, reportedYear: 2026,
    configuration: '冻结 Qwen2.5-3B-Instruct 基座并训练新增 AHN；保留 128 个 sink token 与 32,640 个滑窗 token，其余由 Gated DeltaNet 长记忆压缩。',
    protocol: 'LV-Eval 128K 子集；与同论文 full-attention 基线使用对应评估；记录原文 Table 2 Avg.。',
    conditions: { split: 'LV-Eval 128K 评估子集', baseModel: 'Qwen2.5-3B-Instruct', memory: '128 sinks + 32,640 窗口 token + AHN-GDN', metricVariant: '论文 Avg.；可由 Table 6 中 11 项分数均值复核' },
    comparisonKey: 'ahn-table2-qwen25-3b-instruct-lveval128k',
    source: { ...ahnSource },
    notes: ['仅此任务平均分改善不代表压缩无损；论文的 RULER 精确召回另有明显劣于 full attention 的结果。', '资源节省和质量需联合解读，不能据此给所有长上下文任务作排名。'],
    verifiedAt: '2026-11-26'
  },
  {
    id: 'repack-xl1-64ep-fid', modelId: 'repack-refine', benchmarkId: 'imagenet-256-fid',
    reportedModel: 'RePack-DiT-XL/1 · 64 DiT epochs', value: 1.82, reportedYear: 2026,
    configuration: 'DINOv3-B/16 特征，32 通道 RePack latent，DiT-XL/1；不使用最终 Refiner。',
    protocol: 'ImageNet-1K 256 × 256 类条件生成；50,000 样本；250 步 Euler，CFG=15.0，guidance interval=[0.11,1.0]，timestep shift=0。',
    conditions: { split: '生成样本与 ADM ImageNet-256 全训练集参考统计量比较', resolution: '256 × 256', samples: '50,000', sampler: '250-step Euler', guidance: 'CFG 15.0；interval [0.11,1.0]；shift 0', budget: 'DiT 64 epochs；RePack 阶段另训 20 epochs' },
    comparisonKey: 'repack-paper-imagenet256-fid50k-admtrain-euler250-cfg15-interval011',
    source: { ...repackSource },
    supportingSources: [{ title: '作者实现 · Stage 2 评估协议', url: 'https://github.com/guanfangdong/RePack-then-Refine/tree/main/stage2' }, { title: 'ADM 评估协议 · Sample Quality Metrics', url: 'https://arxiv.org/abs/2105.05233' }],
    notes: ['64 epochs 仅指 DiT 阶段，不是表示学习与生成的总训练预算。', 'FID 为分布指标，不是准确率；不得与别的分辨率、无指导采样或其他参考 split 的 FID 直接排名。'],
    verifiedAt: '2026-11-26'
  },
  {
    id: 'repack-xl1-refiner-64ep-fid', modelId: 'repack-refine', benchmarkId: 'imagenet-256-fid',
    reportedModel: 'RePack-DiT-XL/1 + Refiner · 64 DiT epochs', value: 1.65, reportedYear: 2026,
    configuration: '同一类 32 通道 RePack-DiT 配置，生成后增加单独训练的 latent 引导 U-Net Refiner。',
    protocol: 'ImageNet-1K 256 × 256 类条件生成；50,000 样本；250 步 Euler，CFG=15.0，guidance interval=[0.11,1.0]，timestep shift=0。',
    conditions: { split: '生成样本与 ADM ImageNet-256 全训练集参考统计量比较', resolution: '256 × 256', samples: '50,000', sampler: '250-step Euler', guidance: 'CFG 15.0；interval [0.11,1.0]；shift 0', budget: 'DiT 64 epochs；RePack 与 Refiner 各另训 20 epochs' },
    comparisonKey: 'repack-paper-imagenet256-fid50k-admtrain-euler250-cfg15-interval011',
    source: { ...repackSource },
    supportingSources: [{ title: '作者实现 · Stage 2 评估协议', url: 'https://github.com/guanfangdong/RePack-then-Refine/tree/main/stage2' }, { title: 'ADM 评估协议 · Sample Quality Metrics', url: 'https://arxiv.org/abs/2105.05233' }],
    notes: ['加入 Refiner 有额外训练和推理成本，不是免费提升。', '该指标仅对应列出的采样与参考统计量协议。'],
    verifiedAt: '2026-11-26'
  },
  ...[
    { label: '3M', mase: 0.712, crps: 0.496 },
    { label: '10.6M', mase: 0.704, crps: 0.490 },
    { label: '18.6M', mase: 0.701, crps: 0.487 }
  ].flatMap(({ label, mase, crps }) => [
    {
      id: `flowstate-${label.replace('.', '-')}-gift-mase`.toLowerCase(), modelId: 'flowstate', benchmarkId: 'gift-eval-normalized-mase',
      reportedModel: `FlowState-${label} · 4K context`, value: mase, reportedYear: 2026,
      configuration: `${label} 参数模型；按变量独立处理序列；主表的 4096 上下文配置。`,
      protocol: flowstateProtocol, conditions: { ...flowstateConditions, metricVariant: 'Normalized MASE' },
      comparisonKey: 'flowstate-table1-gift97-zeroshot-context4096-normalized-mase',
      source: { ...flowstateSource },
      notes: ['是相对 Seasonal Naive 的跨任务几何平均，不是绝对 MASE 或百分比。', '未混入 Table 2 的 2K 上下文消融；不同任务预测长度保持官方设置。'], verifiedAt: '2026-11-26'
    },
    {
      id: `flowstate-${label.replace('.', '-')}-gift-crps`.toLowerCase(), modelId: 'flowstate', benchmarkId: 'gift-eval-normalized-crps',
      reportedModel: `FlowState-${label} · 4K context`, value: crps, reportedYear: 2026,
      configuration: `${label} 参数模型；按变量独立处理序列；主表的 4096 上下文配置。`,
      protocol: flowstateProtocol, conditions: { ...flowstateConditions, metricVariant: 'Normalized quantile CRPS' },
      comparisonKey: 'flowstate-table1-gift97-zeroshot-context4096-normalized-crps',
      source: { ...flowstateSource },
      notes: ['probabilistic / quantile CRPS 结果，不是点预测 MASE。', '该结果相对基线归一化，不能把 0.487 写作 48.7% 的预测准确率。'], verifiedAt: '2026-11-26'
    }
  ])
].map(result => ({
  ...result,
  displayValue: result.uncertainty
    ? `${result.value.toFixed(2)} ± ${result.uncertainty.value.toFixed(2)}`
    : result.value.toFixed(result.benchmarkId.startsWith('gift-eval-') ? 3 : result.benchmarkId === 'hellaswag-acc-norm' ? 1 : 2)
}));
