// Original, mechanism-specific teaching diagrams for the expanded catalog.
// The five selectable modules are explanatory units, not always a serial path.
const specifications = {
  rbf: ['RBF Network', ['输入', '中心距离', '径向基响应', '线性读出', '回归输出']],
  rbm: ['Restricted Boltzmann Machine', ['可见状态', '共享二部权重', '隐藏状态', '可见重构', '能量与对比学习']],
  dbn: ['Deep Belief Network', ['可见层', '第一隐藏层', '第二隐藏层', '顶层 RBM', '向下生成']],
  kan: ['Kolmogorov–Arnold Network', ['输入', '第一层边函数', '隐藏求和', '第二层边函数', '输出求和']],
  lenet: ['LeNet-5', ['输入图像', 'C1 与 S2', 'C3 与 S4', 'C5 与 F6', '十类输出']],
  alexnet: ['AlexNet', ['输入图像', '早期卷积与池化', '深层卷积与池化', '全连接与 Dropout', '分类输出']],
  vgg: ['VGG-16', ['输入图像', '卷积块 1–2', '卷积块 3–5', '全连接层', '分类输出']],
  inception: ['Inception v1 Module', ['输入特征', '并行分支', '分支特征', '通道拼接', '模块输出']],
  densenet: ['DenseNet Block', ['输入特征', '密集组合层', '累积拼接', '压缩与下采样', '输出特征']],
  'mobilenet-v2': ['MobileNetV2 Block', ['输入', '通道扩张', '逐通道卷积', '线性瓶颈', '残差输出']],
  efficientnet: ['EfficientNet-B0', ['输入', '卷积 Stem', 'MBConv 阶段', 'Head 与池化', '分类输出']],
  convnext: ['ConvNeXt Block', ['输入', '7×7 逐通道卷积', '归一化与扩张', '激活与投影', '残差输出']],
  bert: ['BERT MLM', ['含 Mask 的 Token', '三种嵌入相加', '双向 Encoder', 'Mask 位置 MLM 头', '预测 Token']],
  gpt: ['GPT Causal Decoder', ['输入 Token', 'Token 与位置嵌入', '因果 Decoder', '语言模型头', '下一 Token']],
  t5: ['T5 Encoder–Decoder', ['Source 与右移 Target', 'Source Encoder', 'Masked Self-Attention', 'Cross-Attention 与 FFN', '语言模型头']],
  swin: ['Swin Transformer', ['Patch Stem', '窗口注意力', '移位窗口注意力', 'Patch Merging', '后续阶段与 Head']],
  performer: ['Performer', ['Q/K/V 投影', '正随机特征', 'KV 摘要与分母', '线性归一化读取', '拼接与输出投影']],
  retnet: ['RetNet', ['QKV 与相位衰减', '各头递归状态', '多尺度读出', '归一化与 Swish 门', '投影与残差']],
  rwkv: ['RWKV v4', ['输入嵌入', 'Token Shift', 'WKV 与门控', 'Channel Mixing', '语言模型头']],
  s4: ['Structured State Space', ['输入序列', '结构化状态空间', '离散化', '长卷积核', '输出序列']],
  mamba: ['Mamba', ['输入投影', '因果卷积与激活', '输入依赖参数', '选择性扫描', '门控与输出投影']],
  gcn: ['Graph Convolutional Network', ['节点特征', '自环与归一化', '邻居聚合', '线性变换与激活', '节点预测']],
  gat: ['Graph Attention Network', ['节点特征投影', '边注意力打分', '邻域 Softmax', '多头聚合', '节点输出']],
  graphsage: ['GraphSAGE', ['采样邻居', '收集邻居特征', '邻居均值', '拼接自身与更新', '节点输出']],
  gin: ['Graph Isomorphism Network', ['节点特征', '邻域求和', '自身加权相加', 'MLP 更新', '图级读出']],
  tcn: ['Temporal Convolutional Network', ['输入序列', '因果膨胀卷积', '更大感受野', '残差相加', '逐时输出']],
  wavenet: ['WaveNet', ['历史波形', '膨胀因果卷积', '门控激活', '残差与 Skip', '下一采样分布']],
  nbeats: ['N-BEATS', ['历史窗口', '全连接块', 'Backcast', '残差输入更新', 'Forecast 累加']],
  tft: ['Temporal Fusion Transformer', ['多种时序输入', '变量选择', '局部 LSTM', '可解释注意力', '分位数预测']],
  patchtst: ['PatchTST', ['逐变量序列', '时间分 Patch', 'Patch 嵌入', '共享 Transformer', '预测头']],
  itransformer: ['iTransformer', ['多变量历史', '逐变量 Token', '变量间注意力', '逐 Token 前馈', '各变量预测']],
  vqvae: ['Vector-Quantized VAE', ['输入', '编码器', '最近码字量化', '解码器', '重建']],
  ddpm: ['Denoising Diffusion Model', ['干净样本', '前向加噪', '噪声预测网络', '反向一步', '迭代生成']],
  'latent-diffusion': ['Latent Diffusion', ['图像编码', 'Latent 加噪', '条件 U-Net', '反向 Latent 去噪', '图像解码']],
  dit: ['Diffusion Transformer', ['带噪 Latent', 'Patch 与位置', '时间与类别条件', 'adaLN DiT 块', '噪声与协方差']],
  realnvp: ['Real NVP', ['输入向量', '二分 Mask', '尺度与平移', '仿射耦合', 'Latent 与密度']],
  memn2n: ['End-to-End Memory Network', ['事实与问题嵌入', '记忆寻址', '加权读出', '多跳 Query 更新', '答案分布']],
  'transformer-xl': ['Transformer-XL', ['当前 Segment', '前段缓存', '相对位置注意力', '前馈与残差', '缓存与预测']],
};
export const expandedDiagramIds = Object.freeze(Object.keys(specifications));
let serial = 0;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paint = {
  accent: 'var(--diagram-cyan, #087f8c)', violet: 'var(--diagram-violet, #7762c8)',
  edge: 'var(--diagram-edge, #a9b7c4)', muted: 'var(--diagram-muted, #6e7785)',
  text: 'var(--diagram-text, #42566a)', ink: 'var(--diagram-ink, #fff)',
  panel: 'var(--diagram-panel, #f3f6f9)', grid: 'var(--diagram-grid, #d4dee7)',
  active: 'var(--diagram-active-fill, #e1f2f4)', strong: 'var(--diagram-active-strong, #c8e9ed)',
  selection: 'var(--diagram-selection-fill, #e8f5f7)', soft: 'var(--diagram-cyan-soft, #a9d9df)',
  purple: 'var(--diagram-violet-soft, #d5c9f0)',
};

function renderer(id, { compact = false, activeLayer = -1, signalStep = -1 } = {}) {
  const uid = `nb-expanded-${++serial}`;
  const [name, labels] = specifications[id];
  const pieces = [], modules = [];
  const active = index => index === activeLayer || index === signalStep;
  const stroke = index => active(index) ? paint.accent : paint.text;
  const text = (x, y, value, size = 14, color = paint.text, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}">${escape(value)}</text>`;
  const note = (...args) => compact ? '' : text(...args);
  const rect = (x, y, w, h, fill = paint.panel, outline = paint.edge, radius = 5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${outline}" stroke-width="1.3"/>`;
  const dot = (x, y, index, value = '', radius = 11) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${active(index) ? paint.strong : paint.ink}" stroke="${stroke(index)}" stroke-width="1.6"/>${value ? text(x, y + 5, value, 14, stroke(index)) : ''}`;
  const box = (x, y, w, h, index, title, subtitle = '') => rect(x, y, w, h, active(index) ? paint.active : paint.panel, stroke(index)) + text(x + w / 2, y + h / 2 + (subtitle && !compact ? -2 : 5), title, compact ? 17 : 15, stroke(index)) + (subtitle ? note(x + w / 2, y + h / 2 + 18, subtitle, 12) : '');
  const curve = (d, target = -1, arrow = true, violet = false, dashed = false) => `<path d="${d}" fill="none" stroke="${violet ? paint.violet : active(target) || (signalStep >= 0 && target >= 0 && target <= signalStep) ? paint.accent : paint.edge}" stroke-width="1.5"${arrow ? ` marker-end="url(#${uid}-arrow)"` : ''}${dashed ? ' stroke-dasharray="4 4"' : ''}/>`;
  const line = (x1, y1, x2, y2, target = -1, arrow = true, violet = false, dashed = false) => curve(`M ${x1} ${y1} L ${x2} ${y2}`, target, arrow, violet, dashed);
  const layer = (index, bounds, body, labelPosition) => { modules[index] = { bounds, body, labelPosition }; };
  const add = (...values) => { pieces.push(...values); };
  const caption = value => add(note(340, 28, value, 13, paint.muted));
  const matrix = (x, y, rows, columns, cell = 12, index = -1, offset = 0) => Array.from({ length: rows * columns }, (_, k) => rect(x + (k % columns) * cell, y + Math.floor(k / columns) * cell, cell - 3, cell - 3, (k + Math.floor(k / columns) + offset) % 3 ? paint.soft : paint.purple, active(index) ? paint.accent : paint.edge, 1)).join('');
  const feature = (x, y, w, h, index, title = '', depth = 3) => Array.from({ length: depth }, (_, k) => depth - k - 1).map(k => rect(x + k * 6, y - k * 5, w, h, active(index) ? paint.active : paint.panel, k ? paint.edge : stroke(index), 2)).join('') + (title ? text(x + w / 2, y + h / 2 + 5, title, 14, stroke(index)) : '');
  const wave = (x, y, w, h, index = -1) => curve(`M ${x} ${y + h / 2} C ${x + w / 8} ${y - h / 2} ${x + w / 4} ${y + h * 1.5} ${x + w / 2} ${y + h / 2} S ${x + w * .8} ${y - h / 2} ${x + w} ${y + h / 2}`, index, false);
  const ladder = (xs, y, target = -1, values = []) => xs.map((x, k) => (k ? line(xs[k - 1] + 10, y, x - 10, y, target) : '') + dot(x, y, target, values[k] || '', 9)).join('');
  function finish() {
    if (modules.length !== 5 || Array.from({ length: 5 }, (_, index) => modules[index]).some(module => !module)) throw new Error(`${id}: define exactly five explanatory modules`);
    const content = modules.map(({ bounds: [x, y, w, h], body, labelPosition }, index) => {
      const [lx, ly] = labelPosition || [x + w / 2, 329];
      return `<g class="nb-layer${active(index) ? ' is-active' : ''}"${compact ? '' : ` data-layer="${index}" tabindex="0" role="button" aria-pressed="${index === activeLayer}" aria-label="查看${escape(labels[index])}的说明"`}><rect class="nb-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${active(index) ? paint.selection : 'transparent'}" fill-opacity=".18" stroke="${active(index) ? paint.accent : 'transparent'}" stroke-opacity=".4"/>${body}${note(lx, ly, labels[index], 13, stroke(index))}</g>`;
    }).join('');
    return `<svg class="network-svg${compact ? ' network-svg--compact' : ''}" viewBox="0 0 680 350" xmlns="http://www.w3.org/2000/svg" role="${compact ? 'img' : 'group'}" aria-label="${escape(name)}结构示意图" preserveAspectRatio="xMidYMid meet"><defs><marker id="${uid}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1 L8 5 L0 9" fill="none" stroke="context-stroke" stroke-width="1.6"/></marker></defs><style>.nb-layer{outline:none}.nb-layer[role=button]{cursor:pointer}.nb-layer[role=button]:hover .nb-hit,.nb-layer[role=button]:focus-visible .nb-hit{fill:${paint.selection};stroke:${paint.accent};stroke-opacity:.9}.network-svg text{font-family:var(--font-system,-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif);pointer-events:none}</style>${pieces.join('')}${content}</svg>`;
  }
  return { id, compact, active, stroke, text, note, rect, dot, box, curve, line, layer, add, caption, matrix, feature, wave, ladder, finish, C: paint };
}

export function expandedDiagram(id, options = {}) {
  if (!Object.hasOwn(specifications, id)) return null;
  const p = renderer(id, options);
  draw[id](p);
  return p.finish();
}

const draw = {};

draw.rbf = p => {
  const { add, line, curve, layer, dot, box, note, text, caption, C } = p;
  const ys = [105, 175, 245];
  [130, 220].forEach(y => ys.forEach(target => add(line(73, y, 175, target, 1))));
  ys.forEach(y => add(line(237, y, 287, y, 2)));
  layer(0, [24, 98, 78, 157], dot(60, 130, 0, 'x₁', 16) + dot(60, 220, 0, 'x₂', 16));
  layer(1, [157, 67, 91, 214], ys.map((y, i) => box(175, y - 21, 62, 42, 1, `d${i + 1}²`)).join('') + note(202, 56, '‖x − cⱼ‖²', 14));
  layer(2, [276, 69, 103, 213], ys.map((y, i) => curve(`M290 ${y + 12} C310 ${y + 12} 311 ${y - 25} 326 ${y - 25} S342 ${y + 12} 363 ${y + 12}`, 2, false) + note(326, y + 34, `φ${i + 1}(x)`, 13)).join('') + note(326, 302, 'Gaussian 宽度 σⱼ', 12, C.muted));
  let weights = '';
  ys.forEach(y => [140, 210].forEach(out => { weights += line(375, y, 594, out, 3, false); }));
  layer(3, [412, 95, 119, 162], weights + note(470, 80, 'W ∈ ℝ²ˣ³', 14) + note(470, 279, '线性权重与偏置', 12, C.muted));
  layer(4, [569, 104, 87, 141], dot(610, 140, 4, 'y₁', 16) + dot(610, 210, 4, 'y₂', 16));
  caption('局部径向基响应经线性组合，输出连续数值');
};

draw.rbm = p => {
  const { add, line, curve, layer, dot, note, box, caption, C } = p;
  const vy = [67, 106, 145, 184, 223, 262], hy = [106, 165, 224];
  let weights = '';
  vy.forEach(y => hy.forEach(h => { weights += line(90, y, 337, h, 1, false); }));
  layer(0, [42, 43, 87, 239], vy.map((y, i) => dot(80, y, 0, i % 2 ? '1' : '0', 11)).join(''));
  layer(1, [160, 73, 119, 186], weights + note(219, 57, 'W: 6 × 3', 14));
  layer(2, [315, 77, 81, 178], hy.map((y, i) => dot(351, y, 2, i % 2 ? '0' : '1', 13)).join(''));
  add(curve('M 365 165 L 425 165 L 425 119 L 466 119', 3));
  layer(3, [454, 70, 91, 211], box(466, 85, 67, 69, 3, 'σ(Wh+b)', '可见重构概率') + note(500, 205, 'v → h → v̂', 14));
  layer(4, [559, 104, 109, 132], box(571, 120, 84, 96, 4, 'E(v,h)', '正相 − 负相') + note(611, 263, '训练概念', 13, C.muted));
  add(curve('M 500 220 L 500 292 L 82 292 L 82 276', 4, true, true, true));
  caption('可见层与隐藏层共享双向二部连接；同层之间没有边');
};

draw.dbn = p => {
  const { add, line, curve, layer, dot, note, box, caption, C } = p;
  const vx = [105, 145, 185, 225, 265, 305], hx = [141, 190, 239, 288], tx = [165, 215, 265];
  hx.forEach(x => vx.forEach(v => add(line(x, 189, v, 268, 4))));
  hx.forEach(x => tx.forEach(t => add(line(x, 161, t, 89, 3, false))));
  layer(0, [79, 253, 251, 46], vx.map((x, i) => dot(x, 279, 0, i % 2 ? '1' : '0', 10)).join(''), [204, 324]);
  layer(1, [109, 150, 211, 49], hx.map(x => dot(x, 176, 1, '', 12)).join(''), [210, 226]);
  layer(2, [136, 51, 163, 48], tx.map(x => dot(x, 77, 2, '', 12)).join(''), [214, 126]);
  layer(3, [413, 55, 226, 100], box(427, 68, 198, 73, 3, 'p(h¹, h²)', '顶层 RBM · 无向连接') + curve('M 411 105 L 324 105 L 293 135', 3), [525, 178]);
  layer(4, [413, 209, 226, 88], box(427, 222, 198, 60, 4, 'p(v | h¹)', '下层条件生成 · 有向连接') + curve('M 411 253 L 336 253 L 298 238', 4), [525, 324]);
  caption('顶层是联合能量模型；向下条件生成，不是五个串行网络层');
};

draw.kan = p => {
  const { add, line, curve, layer, dot, box, note, caption, C } = p;
  const iy = [112, 237], hy = [86, 174, 262];
  let first = '', second = '';
  iy.forEach((y, input) => hy.forEach((h, hidden) => {
    first += line(84, y, 285, h, 1, false);
    const x = 169 + input * 21, center = y * .48 + h * .52;
    first += curve(`M ${x - 17} ${center + 3} Q ${x - 7} ${center - 20} ${x} ${center} T ${x + 18} ${center - 4}`, 1, false, (input + hidden) % 2 === 0);
  }));
  hy.forEach((y, i) => { second += line(310, y, 582, 174, 3, false) + curve(`M 414 ${y * .5 + 82} Q 431 ${y * .5 + 52} 447 ${y * .5 + 82} T 473 ${y * .5 + 85}`, 3, false, i === 1); });
  layer(0, [31, 83, 74, 184], iy.map((y, i) => dot(69, y, 0, `x${i + 1}`, 14)).join(''));
  layer(1, [137, 72, 100, 202], first + note(184, 57, 'φⱼᵢ(xᵢ)', 14));
  layer(2, [267, 58, 68, 232], hy.map(y => dot(298, y, 2, 'Σ', 15)).join(''));
  layer(3, [388, 76, 121, 196], second + note(448, 57, 'ψⱼ(hⱼ)', 14));
  layer(4, [564, 135, 87, 80], dot(605, 174, 4, 'Σ', 20) + note(605, 250, '标量输出', 13));
  caption('可学习的一元函数在边上，节点只负责求和');
};

function classicalVision(p, variant) {
  const { add, line, layer, dot, box, note, feature, matrix, caption, C } = p;
  const settings = {
    lenet: { input: '32² × 1', first: 'C1 / S2', firstShape: '14² × 6', second: 'C3 / S4', secondShape: '5² × 16', widths: [63, 57, 40], depths: [1, 2, 3], dense: '120 → 84', output: '10 个 RBF 距离', caption: '1998 原型：可训练平均子采样；C3 稀疏通道连接；输出距离越小越匹配' },
    alexnet: { input: '227² × 3', first: 'Conv 1–2', firstShape: '13² × 256', second: 'Conv 3–5', secondShape: '6² × 256', widths: [73, 66, 48], depths: [3, 2, 3], dense: '4096 → 4096', output: '1000 类', caption: '227 输入几何的 AlexNet：大核起步，深层小核；全连接层使用 Dropout' },
    vgg: { input: '224² × 3', first: 'Blocks 1–2', firstShape: '56² × 128', second: 'Blocks 3–5', secondShape: '7² × 512', widths: [73, 64, 43], depths: [3, 4, 6], dense: '4096 → 4096', output: '1000 类', caption: 'VGG-16：重复 3×3 卷积；池化减小空间尺寸，通道逐阶段增加' },
  }[variant];
  [118, 253, 390, 532].forEach((x, i) => add(line(x, 165, [157, 296, 435, 578][i], 165, i + 1)));
  layer(0, [18, 94, 106, 155], feature(32, 115, settings.widths[0], 98, 0, '', settings.depths[0]) + matrix(39, 130, 5, 4, 13, 0) + note(71, 255, settings.input, 13));
  layer(1, [145, 90, 119, 161], feature(160, 111, settings.widths[1], 91, 1, settings.first, settings.depths[1]) + box(169, 220, 69, 25, 1, variant === 'lenet' ? 'Avg / Sub' : 'Max Pool') + note(205, 276, settings.firstShape, 13));
  layer(2, [284, 103, 118, 143], feature(302, 127, settings.widths[2], 67, 2, settings.second, settings.depths[2]) + box(307, 216, 69, 25, 2, variant === 'lenet' ? 'Avg / Sub' : 'Max Pool') + note(343, 276, settings.secondShape, 13));
  let dense = '';
  [456, 510].forEach((x, column) => [118, 147, 176, 205].forEach((y, row) => { dense += dot(x, y, 3, variant !== 'lenet' && (row + column) % 3 === 0 ? '×' : '', 8); }));
  [118, 147, 176, 205].forEach(y => [118, 147, 176, 205].forEach(z => { dense = line(465, y, 502, z, 3, false) + dense; }));
  layer(3, [423, 95, 120, 150], dense + note(484, 269, settings.dense, 13));
  layer(4, [566, 111, 102, 130], [129, 165, 201].map(y => dot(607, y, 4, '', 12)).join('') + note(613, 271, settings.output, 13));
  caption(settings.caption);
}
draw.lenet = p => classicalVision(p, 'lenet');
draw.alexnet = p => classicalVision(p, 'alexnet');
draw.vgg = p => classicalVision(p, 'vgg');

draw.inception = p => {
  const { add, line, curve, layer, box, feature, rect, note, caption, C } = p;
  const ys = [73, 136, 199, 262];
  ys.forEach(y => { add(curve(`M 105 170 L 129 170 L 129 ${y} L 155 ${y}`, 1), line(306, y, 345, y, 2), line(422, y, 491, y, 3)); });
  layer(0, [17, 117, 99, 121], feature(31, 135, 64, 77, 0, 'x', 3) + note(64, 265, '28² × 192', 13));
  layer(1, [145, 43, 172, 249], ys.map((y, i) => box(157, y - 21, 148, 42, 1, ['1×1', '1×1 → 3×3', '1×1 → 5×5', '3×3 Pool → 1×1'][i])).join(''));
  layer(2, [336, 43, 96, 249], ys.map((y, i) => feature(349, y - 19, 60, 38, 2, `${[64,128,32,32][i]} ch`, 2)).join(''));
  layer(3, [479, 43, 58, 249], ys.map((y, i) => rect(493, y - 25, 28, 50, i % 2 ? C.purple : C.soft, p.stroke(3), 1)).join('') + note(508, 307, 'Concat', 13));
  add(line(534, 170, 575, 170, 4));
  layer(4, [562, 111, 107, 127], feature(577, 132, 65, 79, 4, '256 ch', 3) + note(616, 270, '28² × 256', 13));
  caption('Inception v1 单模块：多尺度并行处理，沿通道拼接而非相加');
};

draw.densenet = p => {
  const { add, line, curve, layer, box, feature, note, rect, caption, C } = p;
  add(line(108, 170, 152, 170, 1), line(305, 170, 352, 170, 2), line(416, 170, 459, 170, 3), line(548, 170, 586, 170, 4));
  [78, 110, 238].forEach((y, i) => add(curve(`M 124 170 L 124 ${y} L ${190 + i * 44} ${y} L ${190 + i * 44} 148`, 1, true, i === 2)));
  let dense = [164, 210, 256].map((x, i) => box(x, 148, 40, 49, 1, 'H', '+16')).join('');
  dense += curve('M 185 145 L 185 119 L 277 119 L 277 145', 1, true, true);
  layer(0, [18, 111, 101, 125], feature(31, 132, 62, 77, 0, '32 ch') + note(65, 268, '16² × 32', 13));
  layer(1, [151, 136, 156, 75], dense + note(231, 263, '所有既有特征送入后续层', 12));
  layer(2, [337, 107, 92, 132], Array.from({ length: 5 }, (_, i) => rect(351 + i * 11, 129, 8, 78, i % 2 ? C.purple : C.soft, p.stroke(2), 1)).join('') + note(386, 265, '32 + 3×16 = 80', 12));
  layer(3, [447, 109, 113, 128], box(460, 128, 86, 79, 3, 'Transition', '1×1 → AvgPool') + note(504, 268, '80 → 40 ch', 13));
  layer(4, [572, 114, 96, 118], feature(589, 134, 47, 65, 4, '40 ch') + note(621, 267, '8² × 40', 13));
  caption('Dense Block 累积拼接已有特征；Transition 再压缩和下采样');
};

draw['mobilenet-v2'] = p => {
  const { add, line, curve, layer, feature, box, dot, note, caption } = p;
  add(line(107, 173, 152, 173, 1), line(257, 173, 302, 173, 2), line(411, 173, 450, 173, 3), line(552, 173, 598, 173, 4));
  add(curve('M 119 173 L 119 63 L 620 63 L 620 151', 4, true, true));
  layer(0, [18, 111, 101, 132], feature(34, 134, 55, 74, 0, '16 ch', 2) + note(67, 275, '16² × 16', 13));
  layer(1, [141, 95, 128, 153], feature(158, 126, 72, 95, 1, '1×1 ↑', 5) + note(205, 275, '96 ch · ReLU6', 13));
  layer(2, [289, 103, 131, 139], [0,1,2].map(i => box(305 + i * 30, 137, 24, 65, 2, '3×3')).join('') + note(355, 275, 'Depthwise · stride 1', 12));
  layer(3, [439, 114, 123, 124], feature(459, 141, 65, 62, 3, '1×1 ↓', 2) + note(501, 275, '16 ch · 无激活', 13));
  layer(4, [581, 135, 84, 80], dot(620, 173, 4, '+', 19) + note(617, 260, '16² × 16', 13));
  caption('扩张后做廉价逐通道卷积，再线性压缩；同尺寸块保留捷径');
};

draw.efficientnet = p => {
  const { add, line, curve, layer, feature, box, dot, note, caption } = p;
  add(line(103, 169, 142, 169, 1), line(243, 169, 283, 169, 2), line(426, 169, 460, 169, 3), line(554, 169, 598, 169, 4));
  layer(0, [18, 109, 96, 129], feature(32, 131, 58, 77, 0, 'RGB') + note(64, 269, '224² × 3', 13));
  layer(1, [130, 108, 122, 132], feature(148, 133, 69, 75, 1, '3×3 s2') + note(191, 269, '112² × 32', 13));
  const mb = box(286, 136, 136, 68, 2, 'MBConv stages', 'Expand · DW · Project');
  const se = box(312, 72, 82, 37, 2, 'SE gate') + curve('M 354 133 L 354 110', 2) + curve('M 396 90 L 438 90 L 438 220 L 381 220 L 381 206', 2, true, true);
  layer(2, [273, 60, 165, 178], mb + se + note(355, 269, '7² × 320', 13));
  layer(3, [447, 111, 119, 126], box(461, 132, 91, 75, 3, '1×1 + GAP', '1280 ch') + note(508, 269, 'B0 的 Head', 13));
  layer(4, [582, 126, 86, 94], dot(623, 169, 4, 'y', 20) + note(623, 268, '1000 类', 13));
  caption('B0 主干含 MBConv 与 SE；复合缩放同时调深度、宽度与分辨率');
};

draw.convnext = p => {
  const { add, line, curve, layer, feature, box, dot, note, caption } = p;
  add(line(106, 171, 145, 171, 1), line(250, 171, 289, 171, 2), line(407, 171, 446, 171, 3), line(557, 171, 600, 171, 4), curve('M 119 171 L 119 65 L 620 65 L 620 149', 4, true, true));
  layer(0, [17, 110, 103, 130], feature(34, 134, 58, 73, 0, '96 ch') + note(67, 275, '14² × 96', 13));
  layer(1, [134, 109, 127, 133], box(148, 133, 100, 75, 1, '7×7 DW', 'same padding'));
  layer(2, [278, 98, 142, 151], box(292, 127, 113, 85, 2, 'LN · Linear', '96 → 384') + note(350, 275, '通道扩张 ×4', 13));
  layer(3, [434, 109, 135, 132], box(448, 132, 107, 77, 3, 'GELU · Linear', '384 → 96'));
  layer(4, [580, 132, 88, 85], dot(620, 171, 4, '+', 20) + note(621, 270, '14² × 96', 13));
  caption('ConvNeXt 单块：大核逐通道混合，通道 MLP，最后残差相加');
};

function attentionGrid(p, x, y, cell, causal = false) {
  let output = '';
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) output += p.rect(x + col * cell, y + row * cell, cell - 2, cell - 2, !causal || col <= row ? (row === col ? p.C.purple : p.C.soft) : p.C.ink, p.C.edge, 1);
  return output;
}
draw.bert = p => {
  const { add, line, curve, layer, box, dot, note, rect, caption, C } = p;
  add(line(105, 170, 151, 170, 1), line(248, 170, 289, 170, 2), line(399, 170, 443, 170, 3), line(557, 170, 595, 170, 4));
  layer(0, [20, 59, 98, 234], Array.from({ length: 8 }, (_, i) => box(34, 73 + i * 26, 69, 20, 0, [1,5].includes(i) ? '[MASK]' : `t${i + 1}`)).join(''));
  layer(1, [138, 88, 122, 169], ['Token','Segment','Position'].map((value, i) => box(154, 99 + i * 35, 91, 26, 1, value)).join('') + dot(201, 231, 1, '+', 14) + note(200, 280, '8 × 768', 13));
  layer(2, [278, 100, 133, 143], attentionGrid(p, 299, 112, 11) + note(345, 224, 'Encoder ×12', 13) + note(346, 277, '双向可见', 13));
  layer(3, [431, 115, 137, 112], box(446, 135, 108, 72, 3, 'MLM head', '取两个 Mask 位置') + note(502, 277, '2 × 30522', 13));
  layer(4, [583, 112, 85, 125], box(595, 127, 60, 34, 4, '词 A') + box(595, 182, 60, 34, 4, '词 B'));
  caption('BERT-base 的 MLM 路径：双向编码后只预测被选中的 Mask 位置');
};

draw.gpt = p => {
  const { add, line, curve, layer, box, dot, note, caption, C } = p;
  add(line(105, 176, 153, 176, 1), line(249, 176, 290, 176, 2), line(400, 176, 443, 176, 3), line(558, 176, 594, 176, 4));
  add(curve('M 623 209 L 623 290 L 65 290 L 65 263', 4, true, true));
  layer(0, [20, 75, 97, 197], Array.from({ length: 8 }, (_, i) => box(34, 85 + i * 22, 69, 17, 0, `t${i + 1}`)).join(''));
  layer(1, [141, 116, 120, 114], box(155, 139, 92, 70, 1, 'Token + Pos', '8 × 32'));
  layer(2, [279, 93, 133, 159], attentionGrid(p, 300, 113, 11, true) + note(345, 226, 'Decoder ×2', 13) + note(346, 270, '看不到未来位置', 12));
  layer(3, [431, 117, 139, 111], box(446, 140, 110, 69, 3, 'LM head', '8 × 1000') + note(501, 272, '取最后位置 logits', 12));
  layer(4, [582, 136, 85, 87], dot(624, 176, 4, 't₉', 20) + note(621, 258, '采样一个 Token', 12));
  caption('缩略 GPT 教学配置：三角因果掩码，下一 Token 再接回输入续写');
};

draw.t5 = p => {
  const { add, line, curve, layer, box, note, caption, C } = p;
  add(line(145, 100, 213, 100, 1), line(145, 244, 213, 244, 2));
  add(curve('M 336 100 L 380 100 L 380 149 L 414 149', 3, true, true), curve('M 336 244 L 380 244 L 380 192 L 414 192', 3));
  add(line(545, 171, 594, 171, 4));
  layer(0, [16, 54, 143, 235], box(30, 69, 113, 62, 0, 'Source', '6 Token') + box(30, 212, 113, 62, 0, 'Target shifted', '4 Token · 右移'));
  layer(1, [200, 52, 151, 95], box(215, 69, 121, 63, 1, 'Encoder', '6 × 32'), [276, 165]);
  layer(2, [200, 193, 151, 99], box(215, 212, 121, 62, 2, 'Masked Self', '4 × 32'), [276, 324]);
  layer(3, [401, 116, 158, 117], box(416, 135, 128, 78, 3, 'Cross + FFN', 'Q:4 / K,V:6') + note(387, 87, 'Encoder 的 K/V', 12, C.violet) + note(383, 265, 'Decoder 的 Q', 12));
  layer(4, [580, 123, 88, 104], box(595, 142, 59, 66, 4, 'LM head', '4 × 1000'));
  caption('Encoder 处理 Source；Decoder 的因果 Self-Attention 再查询 Source');
};

draw.swin = p => {
  const { add, line, curve, layer, rect, box, matrix, note, caption, C } = p;
  add(line(104, 171, 145, 171, 1), line(254, 171, 292, 171, 2), line(405, 171, 450, 171, 3), line(547, 171, 591, 171, 4));
  layer(0, [18, 107, 100, 133], matrix(37, 131, 6, 5, 12, 0) + note(69, 275, '56² × 96', 13));
  let windows = '', shifted = '';
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    windows += rect(154 + col * 15, 121 + row * 15, 12, 12, (Math.floor(row / 3) + Math.floor(col / 3)) % 2 ? C.purple : C.soft, C.edge, 1);
    shifted += rect(301 + col * 15, 121 + row * 15, 12, 12, (Math.floor((row + 1) / 3) + Math.floor((col + 1) / 3)) % 2 ? C.purple : C.soft, C.edge, 1);
  }
  layer(1, [139, 104, 122, 135], windows + note(200, 258, '7×7 窗口 · W-MSA', 12));
  layer(2, [286, 104, 127, 135], shifted + note(349, 258, 'Shift + Mask + Restore', 12) + curve('M 299 102 L 321 82 L 392 82', 2, true, true));
  layer(3, [438, 118, 120, 111], matrix(461, 135, 4, 4, 14, 3) + note(497, 275, '28² × 192', 13));
  layer(4, [579, 115, 89, 119], box(592, 135, 62, 78, 4, 'Stages', 'GAP / 1000') + note(626, 274, '7² × 768', 13));
  caption('普通窗口与移位窗口交替交换信息；Patch Merging 建立层级');
};

draw.performer = p => {
  const { add, line, curve, layer, box, matrix, dot, note, caption, C } = p;
  add(line(105, 173, 151, 173, 1), line(251, 173, 294, 173, 2), line(413, 173, 451, 173, 3), line(554, 173, 596, 173, 4));
  add(curve('M 205 131 L 205 72 L 502 72 L 502 132', 3, true, true));
  layer(0, [17, 107, 100, 130], ['Q','K','V'].map((value, i) => box(31, 120 + i * 34, 72, 26, 0, value)).join('') + note(68, 273, '8 × 4 头 × 8', 12));
  layer(1, [139, 111, 124, 124], box(154, 132, 96, 77, 1, 'φ(Q), φ(K)', '正随机特征') + note(204, 273, '每头 feature = 16', 12));
  layer(2, [283, 99, 142, 146], matrix(300, 124, 5, 4, 13, 2) + box(363, 130, 46, 68, 2, 'z', 'Σ φ(K)') + note(355, 269, 'Σ φ(k) vᵀ / 16×8', 12));
  layer(3, [439, 120, 127, 113], box(454, 137, 98, 76, 3, 'φ(q)ᵀS / Z', '线性归一化读取') + note(418, 60, 'φ(Q) 独立查询', 12, C.violet) + note(503, 270, 'Z = φ(q)ᵀΣφ(k)', 12));
  layer(4, [583, 124, 85, 105], box(597, 143, 57, 66, 4, 'Wᴏ', '8 × 32'));
  caption('先构造每头 KV 摘要，再读取；不显式形成 T×T 注意力矩阵');
};

draw.retnet = p => {
  const { add, line, curve, layer, box, matrix, dot, note, caption, C } = p;
  add(line(105, 174, 150, 174, 1), line(251, 174, 294, 174, 2), line(409, 174, 450, 174, 3), line(555, 174, 599, 174, 4));
  add(curve('M 225 125 C 269 66 141 67 174 125', 1), curve('M 119 174 L 119 285 L 620 285 L 620 198', 4, true, true), curve('M 119 174 L 119 77 L 503 77 L 503 133', 3, true, true));
  layer(0, [17, 116, 100, 119], box(31, 137, 73, 72, 0, 'Q K V', '相位 / γₕ') + note(68, 265, '4 头 × 8 维', 12));
  layer(1, [138, 112, 126, 131], matrix(157, 132, 5, 5, 16, 1) + note(201, 105, 'Sₜ₋₁ → Sₜ', 13) + note(202, 266, '每头 8 × 8 状态', 12));
  layer(2, [282, 112, 139, 137], [121, 151, 181, 211].map((y, i) => box(298, y, 106, 27, 2, `h${i + 1}: qₜ Sₜ`)).join('') + note(351, 267, '多尺度衰减读出', 12));
  layer(3, [438, 112, 129, 128], box(453, 136, 100, 75, 3, 'GN · Swish', '输入依赖门控'));
  layer(4, [581, 128, 87, 98], box(594, 146, 46, 57, 4, 'Wᴏ') + dot(653, 174, 4, '+', 10) + note(625, 267, '8 × 32', 13));
  caption('Sₜ = γSₜ₋₁ + kₜᵀvₜ；Retention 不需要 Softmax 分母');
};

draw.rwkv = p => {
  const { add, line, curve, layer, box, matrix, note, caption, C } = p;
  add(line(104, 175, 147, 175, 1), line(254, 175, 293, 175, 2), line(411, 175, 451, 175, 3), line(553, 175, 594, 175, 4));
  add(curve('M 359 127 C 410 72 279 73 314 127', 2), curve('M 119 175 L 119 275 L 430 275 L 430 224', 3, true, true));
  layer(0, [17, 112, 99, 126], box(30, 136, 73, 75, 0, 'Embedding', '8 × 32'));
  layer(1, [135, 109, 132, 134], box(150, 128, 102, 35, 1, 'xₜ') + box(150, 188, 102, 35, 1, 'xₜ₋₁') + note(202, 269, '逐通道插值混合', 12));
  layer(2, [282, 111, 141, 133], box(297, 134, 112, 80, 2, 'WKV · σ(r)', '递归 aₜ,bₜ 各 32') + note(353, 107, '带衰减的历史统计', 12));
  layer(3, [438, 116, 129, 123], box(453, 138, 99, 74, 3, 'Channel Mix', '32 → 128 → 32'));
  layer(4, [581, 120, 87, 111], box(595, 140, 58, 70, 4, 'LM head', '8 × 1000'));
  caption('2023 RWKV-v4：Token Shift、时间混合递归与通道 FFN 交替');
};

draw.s4 = p => {
  const { add, line, curve, layer, box, wave, matrix, note, caption, C } = p;
  add(line(107, 170, 146, 170, 1), line(259, 170, 300, 170, 2), line(410, 170, 451, 170, 3), line(554, 170, 596, 170, 4));
  add(curve('M 210 215 L 210 285 L 620 285 L 620 220', 4, true, true, true));
  layer(0, [17, 111, 101, 125], wave(31, 143, 72, 54, 0) + note(67, 262, 'u₀, u₁, …', 13));
  layer(1, [134, 102, 137, 139], box(149, 125, 109, 88, 1, 'A, B, C', '结构化连续 SSM') + note(204, 261, 'h′ = Ah + Bu', 13));
  layer(2, [288, 112, 134, 126], box(303, 134, 106, 78, 2, 'Ā, B̄', '步长 Δ 离散化') + line(356, 74, 356, 130, 2) + note(356, 60, 'Δ', 16));
  layer(3, [439, 100, 127, 145], Array.from({ length: 7 }, (_, i) => p.rect(456 + i * 13, 205 - 68 * Math.exp(-i / 3), 9, 68 * Math.exp(-i / 3), i % 2 ? C.purple : C.soft, p.stroke(3), 1)).join('') + note(503, 118, 'Kℓ = CĀℓB̄', 13));
  layer(4, [583, 108, 85, 129], box(596, 122, 58, 41, 4, 'K * u') + wave(596, 177, 60, 41, 4) + note(620, 242, '+ D u', 13) + note(620, 263, '等价递归读出', 12, C.violet));
  caption('由连续状态模型构造离散长卷积；卷积与递归是同一线性系统的两种计算');
};

draw.mamba = p => {
  const { add, line, curve, layer, box, dot, note, caption, C } = p;
  add(line(107, 165, 146, 165, 1), curve('M 257 165 L 294 165 L 294 235 L 327 235', 2), line(257, 165, 442, 165, 3), curve('M 396 235 L 464 235 L 464 209', 3), line(550, 165, 595, 165, 4));
  add(curve('M 119 165 L 119 291 L 621 291 L 621 209', 4, true, true), curve('M 517 123 C 559 70 437 70 468 123', 3));
  layer(0, [17, 108, 102, 128], box(31, 132, 76, 74, 0, 'Input Proj', 'x 与 gate 分支'));
  layer(1, [134, 105, 135, 135], box(149, 130, 108, 76, 1, 'Causal Conv', 'SiLU') + note(205, 265, '局部因果混合', 12));
  layer(2, [308, 196, 104, 82], box(323, 211, 74, 53, 2, 'Δₜ, Bₜ, Cₜ') + note(359, 288, '参数依赖当前输入', 12), [359, 333]);
  layer(3, [430, 109, 132, 130], box(445, 133, 105, 75, 3, 'Selective SSM', '扫描更新 hₜ') + note(496, 99, 'hₜ₋₁ → hₜ', 13), [497, 270]);
  layer(4, [582, 114, 86, 121], box(596, 137, 58, 71, 4, 'Gate / Wᴏ', '输出投影'));
  caption('局部卷积产生输入依赖的状态参数；选择性扫描与门控分支汇合');
};

function neighborhood(p, x, y, index, loop = false) {
  const points = [[x - 29, y - 43], [x + 35, y - 39], [x - 40, y + 28], [x + 34, y + 38]];
  let output = points.map(([nx, ny]) => p.line(nx, ny, x, y, index, false)).join('');
  output += points.map(([nx, ny], i) => p.dot(nx, ny, index, String.fromCharCode(97 + i), 9)).join('') + p.dot(x, y, index, 'i', 13);
  if (loop) output += p.curve(`M ${x - 8} ${y - 11} C ${x - 40} ${y - 48} ${x + 38} ${y - 49} ${x + 8} ${y - 12}`, index);
  return output;
}
draw.gcn = p => {
  const { add, line, curve, layer, box, dot, matrix, note, caption } = p;
  add(line(111, 171, 151, 171, 1), line(251, 171, 296, 171, 2), line(407, 171, 450, 171, 3), line(553, 171, 597, 171, 4));
  layer(0, [15, 104, 110, 132], neighborhood(p, 69, 169, 0));
  layer(1, [137, 107, 128, 128], matrix(157, 129, 5, 5, 16, 1) + note(202, 265, 'D̃⁻½(A+I)D̃⁻½', 13));
  layer(2, [281, 108, 140, 127], [126, 171, 216].map(y => dot(305, y, 2, '', 8) + line(315, y, 378, 171, 2)).join('') + dot(392, 171, 2, 'Σ', 15));
  layer(3, [437, 114, 129, 118], box(451, 136, 101, 72, 3, 'W · σ', '共享线性 / 激活'));
  layer(4, [583, 123, 85, 103], box(597, 145, 58, 58, 4, 'Head', '4 → 2') + note(625, 263, 'Softmax', 13));
  caption('自环保留自身特征；归一化邻接权重控制邻居消息汇总');
};

draw.gat = p => {
  const { add, line, curve, layer, box, dot, rect, note, caption, C } = p;
  add(line(112, 172, 150, 172, 1), line(255, 172, 295, 172, 2), line(409, 172, 451, 172, 3), line(554, 172, 597, 172, 4));
  layer(0, [14, 105, 113, 132], neighborhood(p, 68, 171, 0) + note(70, 266, 'Whᵢ / Whⱼ', 13));
  layer(1, [136, 105, 133, 134], [125,171,217].map((y, i) => box(151, y - 16, 103, 32, 1, `eᵢ${i + 1}`)).join('') + note(202, 265, 'aᵀ[Whᵢ ∥ Whⱼ]', 12));
  layer(2, [281, 110, 142, 127], [28,65,41].map((h, i) => rect(303 + i * 31, 216 - h, 19, h, i === 1 ? C.purple : C.soft, p.stroke(2), 2)).join('') + note(351, 265, '仅邻域内：Σ αᵢⱼ = 1', 12));
  layer(3, [438, 108, 129, 131], box(453, 125, 99, 34, 3, 'Head A · 2') + box(453, 188, 99, 34, 3, 'Head B · 2') + note(502, 266, 'Concat → 4 维', 13));
  layer(4, [583, 125, 85, 99], box(597, 142, 58, 64, 4, 'Linear', '4 → 2') + note(625, 263, 'Softmax', 13));
  caption('GAT 在现有图边上学习权重；多头汇总不等于全局 Token 自注意力');
};

draw.graphsage = p => {
  const { add, line, curve, layer, box, dot, rect, note, caption, C } = p;
  add(line(111, 172, 151, 172, 1), line(252, 172, 294, 172, 2), line(408, 172, 451, 172, 3), line(554, 172, 597, 172, 4), curve('M 119 172 L 119 70 L 503 70 L 503 132', 3, true, true));
  const sampled = line(39, 128, 68, 171, 0, false) + line(103, 132, 68, 171, 0, false) + dot(39, 128, 0, 'a', 9) + dot(103, 132, 0, 'b', 9) + dot(68, 171, 0, 'i', 13) + p.rect(33, 218, 11, 11, C.ink, C.edge, 5) + p.rect(96, 218, 11, 11, C.ink, C.edge, 5);
  layer(0, [15, 103, 112, 135], sampled + note(71, 265, '本例采样 ≤2 个邻居', 12));
  layer(1, [138, 109, 128, 126], [123,164,205].map((y, i) => rect(153, y, 97, 26, i % 2 ? C.purple : C.soft, p.stroke(1), 3)).join('') + note(202, 266, '只收集，不提前 MLP', 12));
  layer(2, [281, 119, 140, 109], box(296, 140, 110, 69, 2, 'Mean(N(i))', '3 维邻域均值'));
  layer(3, [438, 112, 129, 127], box(452, 136, 101, 76, 3, '[hᵢ ∥ mean]', '6 → W → 4') + note(502, 267, '自身从旁路加入', 12));
  layer(4, [583, 126, 85, 97], box(598, 145, 57, 58, 4, 'Head', '4 → 2') + note(625, 263, 'Softmax', 13));
  caption('GraphSAGE Mean 版：采样、汇总，再拼接自身特征并共享更新');
};

draw.gin = p => {
  const { add, line, curve, layer, box, dot, note, caption, C } = p;
  add(line(112, 173, 151, 173, 1), line(252, 173, 295, 173, 2), line(409, 173, 451, 173, 3), line(554, 173, 597, 173, 4), curve('M 119 173 L 119 73 L 352 73 L 352 136', 2, true, true));
  layer(0, [15, 104, 112, 133], neighborhood(p, 68, 171, 0));
  layer(1, [138, 112, 128, 124], [126,172,218].map(y => dot(160, y, 1, '', 8) + line(170, y, 225, 172, 1)).join('') + dot(239, 172, 1, 'Σ', 15) + note(202, 269, '邻居求和，不取均值', 12));
  layer(2, [282, 115, 140, 118], box(296, 139, 111, 70, 2, '(1+ε)hᵢ + Σ', '保留多重集计数信息'));
  layer(3, [439, 119, 127, 110], box(453, 140, 99, 68, 3, 'MLP', '共享节点更新'));
  layer(4, [583, 122, 85, 103], box(598, 141, 57, 67, 4, 'SUM', 'Head 4→2') + note(625, 263, 'Softmax', 13));
  caption('邻居求和、自身加权与 MLP 更新；节点表示最后汇总为图表示');
};

draw.tcn = p => {
  const { add, line, curve, layer, dot, box, note, caption, C } = p;
  const xs = Array.from({ length: 8 }, (_, i) => 39 + i * 36);
  xs.forEach((x, j) => [0,1,2].filter(offset => j >= offset).forEach(offset => add(line(xs[j - offset], 258, x, 202, 1))));
  xs.forEach((x, j) => [0,2,4].filter(offset => j >= offset).forEach(offset => add(line(xs[j - offset], 178, x, 122, 2))));
  add(curve('M 302 110 L 505 110 L 505 151', 3), curve('M 302 270 L 505 270 L 505 188', 3, true, true), line(525, 170, 596, 170, 4));
  layer(0, [19, 248, 294, 46], xs.map(x => dot(x, 270, 0, '', 9)).join(''), [165, 328]);
  layer(1, [19, 167, 294, 46], xs.map(x => dot(x, 190, 1, '', 9)).join('') + note(168, 229, 'kernel 3 · dilation 1', 13), [166, 155]);
  layer(2, [19, 87, 294, 46], xs.map(x => dot(x, 110, 2, '', 9)).join('') + note(166, 71, 'kernel 3 · dilation 2', 13), [167, 51]);
  layer(3, [465, 133, 80, 78], dot(505, 170, 3, '+', 19) + box(359, 250, 97, 38, 3, '1×1', '2 → 4'), [505, 263]);
  layer(4, [582, 123, 85, 100], box(596, 143, 59, 64, 4, 'yₜ', '4 → 1'));
  caption('所有卷积连接仅指向过去与当前；膨胀增大感受野，残差保留输入');
};

draw.wavenet = p => {
  const { add, line, curve, layer, box, dot, wave, note, caption, C } = p;
  add(line(104, 174, 147, 174, 1), line(271, 174, 307, 129, 2), line(271, 174, 307, 217, 2));
  add(curve('M 119 174 L 119 261 L 498 261 L 498 210', 3, true, true), curve('M 432 174 L 498 174 L 498 187', 3), curve('M 432 174 L 467 174 L 467 74 L 623 74 L 623 131', 3, true, true), line(518, 199, 553, 199, 3));
  layer(0, [17, 112, 99, 125], wave(31, 143, 70, 53, 0) + note(67, 275, '历史 x<ₜ', 13));
  let causal = [118,174,230].map((y, row) => [168,211,254].map(x => dot(x, y, 1, '', 7)).join('')).join('');
  causal += line(168, 223, 211, 181, 1) + line(211, 223, 254, 181, 1) + line(211, 167, 254, 125, 1);
  layer(1, [137, 93, 144, 160], causal + note(209, 275, '膨胀的因果感受野', 12));
  layer(2, [296, 95, 145, 157], box(309, 111, 100, 36, 2, 'tanh') + box(309, 199, 100, 36, 2, 'sigmoid') + line(409, 129, 421, 163, 2) + line(409, 217, 421, 185, 2) + dot(421, 174, 2, '×', 12));
  layer(3, [469, 171, 91, 64], dot(498, 199, 3, '+', 12) + note(507, 276, '残差到下一块', 12) + note(508, 60, 'Skip 累加', 13, C.violet));
  layer(4, [580, 118, 88, 118], box(595, 134, 59, 80, 4, 'Softmax', '下一采样分布'));
  caption('每个残差块重复卷积与门控；Skip 特征汇总后预测一个未来采样');
};

draw.nbeats = p => {
  const { add, line, curve, layer, box, dot, wave, note, caption, C } = p;
  add(line(108, 169, 172, 169, 1), curve('M 307 151 L 352 151 L 352 89 L 416 89', 2), curve('M 307 184 L 352 184 L 352 263 L 578 263', 4), line(464, 119, 464, 154, 3), curve('M 119 169 L 146 169 L 146 69 L 389 69 L 389 171 L 449 171', 3, true, true));
  layer(0, [17, 111, 103, 129], wave(32, 140, 73, 55, 0) + note(67, 267, '历史窗口 x', 13));
  layer(1, [158, 106, 163, 136], box(174, 130, 131, 79, 1, 'FC block', 'θᵇ 与 θᶠ 两个头') + note(238, 271, '不同块可以用不同参数', 12));
  layer(2, [403, 46, 128, 90], box(418, 64, 99, 53, 2, 'Backcast b', '回溯输入窗口'), [468, 35]);
  layer(3, [403, 142, 128, 91], dot(464, 171, 3, '−', 17) + line(464, 190, 464, 208, 3) + box(418, 210, 99, 37, 3, '下一残差块') + note(464, 282, 'x_next = x − b', 13), [467, 328]);
  layer(4, [563, 218, 105, 86], dot(606, 263, 4, 'Σ', 18) + line(606, 207, 606, 243, 4, true, true) + note(603, 188, '其他块的 f', 13, C.violet), [606, 328]);
  caption('每块解释输入的一部分，并贡献预测；残差向后传，Forecast 相加');
};

draw.tft = p => {
  const { add, line, curve, layer, box, dot, note, caption, C } = p;
  [99,172,245].forEach(y => add(line(129, y, 173, y, 1)));
  add(line(277, 172, 316, 172, 2), line(421, 172, 460, 172, 3), line(559, 172, 596, 172, 4), curve('M 276 99 L 285 99 L 285 63 L 510 63 L 510 132', 3, true, true));
  layer(0, [14, 58, 129, 229], box(28, 75, 100, 49, 0, '静态属性') + box(28, 148, 100, 49, 0, '过去观测') + box(28, 221, 100, 49, 0, '已知未来输入'));
  layer(1, [161, 58, 129, 229], [99,172,245].map(y => box(176, y - 25, 99, 50, 1, 'VSN', '变量选择权重')).join(''));
  layer(2, [304, 112, 129, 123], box(319, 134, 100, 77, 2, 'LSTM', '局部时序编码'));
  layer(3, [447, 112, 124, 123], box(462, 135, 96, 77, 3, 'Attention', '因果时间权重'));
  layer(4, [582, 93, 86, 160], [105,157,209].map((y, i) => box(596, y, 59, 32, 4, ['q₀.₁','q₀.₅','q₀.₉'][i])).join(''));
  caption('静态上下文、变量选择、局部时序与注意力融合；已知未来输入不是未来标签');
};

draw.patchtst = p => {
  const { add, line, curve, layer, box, rect, wave, note, caption, C } = p;
  const ys = [106,173,240];
  ys.forEach(y => { add(line(106, y, 151, y, 1), line(251, y, 295, y, 2), line(411, y, 450, y, 3), line(554, y, 596, y, 4)); });
  layer(0, [17, 67, 102, 211], ys.map(y => wave(32, y - 18, 72, 35, 0)).join('') + note(67, 294, '每个变量独立', 12));
  layer(1, [138, 67, 128, 211], ys.map(y => [0,1,2,3].map(i => rect(154 + i * 24, y - 15, 19, 31, i % 2 ? C.purple : C.soft, p.stroke(1), 2)).join('')).join(''));
  layer(2, [282, 67, 142, 211], ys.map(y => box(297, y - 22, 111, 44, 2, 'Patch Embed')).join('') + note(352, 294, '+ 位置编码', 13));
  layer(3, [437, 67, 130, 211], ys.map(y => box(452, y - 23, 100, 46, 3, 'Transformer')).join('') + note(501, 294, '三路共享同一组权重', 12));
  layer(4, [582, 67, 86, 211], ys.map(y => box(597, y - 20, 57, 40, 4, 'Head')).join(''));
  caption('Channel-independent PatchTST：同一编码器逐变量运行，不混成变量间注意力');
};

draw.itransformer = p => {
  const { add, line, curve, layer, box, dot, matrix, note, caption, C } = p;
  add(line(109, 173, 151, 173, 1), line(252, 173, 295, 173, 2), line(411, 173, 450, 173, 3), line(554, 173, 596, 173, 4));
  layer(0, [17, 94, 107, 162], matrix(38, 117, 8, 3, 17, 0) + note(71, 280, '16 步 × 3 变量', 13));
  layer(1, [138, 94, 128, 162], [112,167,222].map((y, i) => box(153, y, 98, 31, 1, `变量 ${i + 1} Token`)).join('') + note(204, 280, '整段历史 → 一个 Token', 12));
  let attention = '';
  const positions = [[315,125],[392,173],[315,220]];
  positions.forEach(([x,y], i) => positions.slice(i + 1).forEach(([a,b]) => { attention += line(x, y, a, b, 2, false); }));
  attention += positions.map(([x,y], i) => dot(x, y, 2, `v${i + 1}`, 13)).join('');
  layer(2, [280, 94, 144, 162], attention + note(353, 280, '变量之间交换信息', 12));
  layer(3, [438, 94, 129, 162], [112,167,222].map(y => box(453, y, 100, 31, 3, 'Shared FFN')).join(''));
  layer(4, [582, 94, 86, 162], [112,167,222].map(y => box(597, y, 57, 31, 4, 'Forecast')).join(''));
  caption('反转 Token 轴：Token 表示变量的历史，注意力建模变量间相关性');
};

draw.vqvae = p => {
  const { add, line, curve, layer, box, feature, matrix, dot, note, caption, C } = p;
  add(line(103, 172, 143, 172, 1), line(249, 172, 293, 172, 2), line(414, 172, 453, 172, 3), line(554, 172, 596, 172, 4));
  add(curve('M 622 217 L 622 285 L 356 285 L 356 249', 4, true, true, true));
  layer(0, [17, 112, 100, 127], feature(32, 134, 59, 74, 0, 'x', 1) + note(68, 269, '16² × 1', 13));
  layer(1, [131, 113, 130, 124], feature(150, 140, 71, 62, 1, 'zₑ', 3) + note(201, 267, '4² × 4', 13));
  layer(2, [280, 58, 145, 199], matrix(300, 76, 8, 4, 12, 2) + dot(392, 172, 2, 'eₖ', 14) + line(348, 125, 378, 165, 2, true, true) + note(353, 230, 'argminₖ ‖zₑ − eₖ‖²', 12));
  layer(3, [440, 109, 126, 131], feature(458, 136, 72, 73, 3, 'D(zq)', 2) + note(502, 268, '量化网格 → 图像', 12));
  layer(4, [583, 109, 85, 130], feature(598, 137, 56, 72, 4, 'x̂', 1) + note(566, 300, '重建 / 码本 / commitment', 12, C.violet));
  caption('每个潜位置替换为最近码字；量化本身不等于已经学会离散生成先验');
};

draw.ddpm = p => {
  const { add, line, curve, layer, box, matrix, note, caption, C } = p;
  add(line(109, 93, 163, 93, 1, true, true), curve('M 274 93 L 301 93 L 301 166 L 328 166', 2, true, true), line(440, 176, 475, 176, 3), line(557, 176, 599, 176, 4));
  add(curve('M 130 254 L 301 254 L 301 194 L 328 194', 2), curve('M 557 194 L 574 194 L 574 287 L 385 287 L 385 222', 3), line(385, 104, 385, 132, 2));
  layer(0, [17, 48, 104, 91], box(32, 63, 76, 61, 0, 'x₀', '干净训练图像'), [68, 157]);
  layer(1, [150, 47, 136, 94], box(165, 63, 108, 61, 1, 'q(xₜ | x₀)', '日程 ᾱₜ + ε'), [218, 157]);
  layer(2, [315, 123, 137, 110], box(330, 142, 109, 78, 2, 'εθ(xₜ,t)', '共享 U-Net') + note(385, 87, '时间条件 t', 13));
  layer(3, [462, 124, 107, 110], box(477, 144, 79, 75, 3, 'μθ + σₜz', '得到 xₜ₋₁') + note(480, 306, '重复 t=T…1', 13));
  layer(4, [585, 125, 83, 110], box(599, 143, 55, 76, 4, 'x̂₀', '新样本') + matrix(67, 225, 5, 5, 11, 4) + note(92, 296, '生成起点 xT ∼ N(0,I)', 12));
  caption('上方仅是训练配对；无条件生成从独立高斯噪声开始，不需要真实图像');
};

draw['latent-diffusion'] = p => {
  const { add, line, curve, layer, box, feature, matrix, note, caption, C } = p;
  add(line(110, 88, 158, 88, 1, true, true), curve('M 268 88 L 288 88 L 288 171 L 312 171', 2, true, true), line(427, 176, 468, 176, 3), line(556, 176, 595, 176, 4));
  add(curve('M 132 254 L 289 254 L 289 198 L 313 198', 2), curve('M 550 215 L 550 284 L 367 284 L 367 222', 3), line(369, 93, 369, 133, 2, true, true));
  layer(0, [17, 43, 105, 97], box(31, 58, 78, 66, 0, 'Encoder E', '图像 → z₀'), [69, 157]);
  layer(1, [145, 42, 137, 99], box(160, 58, 107, 66, 1, 'Latent noise', 'zₜ: 8² × 4'), [214, 157]);
  layer(2, [300, 122, 139, 111], box(315, 140, 111, 81, 2, 'Cond. U-Net', '时间 / Cross-Attn') + note(369, 75, '条件 c · 5×8 Token', 12, C.violet));
  layer(3, [455, 124, 113, 110], box(470, 143, 85, 77, 3, 'zₜ → zₜ₋₁', '迭代到 ẑ₀') + note(481, 303, '在压缩 Latent 中迭代', 12));
  layer(4, [582, 123, 86, 111], box(596, 142, 58, 77, 4, 'Decoder', '32² × 3'));
  add(matrix(65, 224, 5, 5, 12) + note(91, 301, '生成起点 zT ∼ N(0,I)', 12));
  caption('训练在图像编码后加噪；生成直接采样 Latent 噪声，再解码为 RGB');
};

draw.dit = p => {
  const { add, line, curve, layer, box, feature, matrix, note, caption, C } = p;
  add(line(107, 165, 150, 165, 1), line(254, 165, 437, 165, 3), line(556, 165, 598, 165, 4), curve('M 366 261 L 497 261 L 497 221', 3, true, true));
  layer(0, [17, 107, 103, 125], feature(32, 132, 63, 71, 0, 'zₜ') + note(69, 269, '8² × 4', 13));
  layer(1, [137, 96, 130, 147], matrix(159, 119, 4, 4, 21, 1) + note(204, 270, '16 Patch × 32', 13));
  layer(2, [279, 221, 101, 79], box(292, 238, 74, 47, 2, 't + class', '条件向量 32'), [331, 331]);
  layer(3, [423, 100, 147, 137], box(438, 119, 118, 41, 3, 'adaLN · MSA') + box(438, 180, 118, 40, 3, 'adaLN · FFN') + note(496, 270, '残差门控 · 4 头', 12));
  layer(4, [585, 111, 83, 128], feature(600, 132, 49, 77, 4, 'ε / var', 2) + note(626, 267, '各 8² × 4', 12));
  caption('Latent Patch 经过条件 adaLN 调制；去 Patch 后同时预测噪声与方差参数');
};

draw.realnvp = p => {
  const { add, line, curve, layer, box, rect, note, caption, C } = p;
  add(curve('M 105 173 L 129 173 L 129 108 L 158 108', 1), curve('M 129 173 L 129 236 L 158 236', 1), line(244, 108, 297, 108, 2), curve('M 244 236 L 463 236 L 463 219', 3), curve('M 408 108 L 508 108 L 508 142', 3), line(553, 177, 597, 177, 4), curve('M 244 88 L 244 62 L 624 62 L 624 135', 4, true, true));
  layer(0, [17, 97, 102, 157], [115,154,193,232].map((y,i) => box(32, y, 72, 25, 0, `x${i + 1}`)).join(''));
  layer(1, [145, 68, 112, 212], box(160, 84, 84, 49, 1, 'xₐ', '保留的两个坐标') + box(160, 212, 84, 49, 1, 'xᵦ', '待变换的两个坐标'));
  layer(2, [284, 67, 137, 89], box(299, 83, 109, 51, 2, 's(xₐ), t(xₐ)', '2 → 8 → 4'), [352, 178]);
  layer(3, [440, 129, 127, 105], box(454, 146, 99, 72, 3, 'Affine', 'exp(s)⊙xᵦ + t') + note(503, 268, 'log-det = Σ s', 13));
  layer(4, [583, 119, 85, 115], box(598, 137, 57, 80, 4, 'zₐ ∥ zᵦ', '密度 / 采样'));
  add(curve('M 625 235 L 625 298 L 65 298 L 65 269', 4, true, true, true));
  caption('只有 xₐ 决定缩放和平移；仿射耦合可解析求逆并精确计算 Jacobian');
};

draw.memn2n = p => {
  const { add, line, curve, layer, box, matrix, dot, note, caption, C } = p;
  add(line(105, 147, 151, 147, 1), line(251, 147, 295, 147, 2), line(409, 147, 450, 147, 3), line(553, 147, 597, 147, 4), curve('M 104 222 L 130 222 L 130 274 L 354 274 L 354 216', 2, true, true), curve('M 104 237 L 142 237 L 142 291 L 503 291 L 503 188', 3), curve('M 503 110 L 503 64 L 201 64 L 201 111', 3, true, true));
  layer(0, [17, 95, 103, 162], matrix(33, 110, 3, 4, 17, 0) + matrix(33, 181, 3, 4, 17, 0, 1) + note(68, 272, 'M / C；问题 u', 12));
  layer(1, [138, 105, 127, 122], box(153, 122, 98, 76, 1, 'Softmax(Mu)', '三个事实的权重'));
  layer(2, [281, 107, 141, 125], box(297, 124, 110, 89, 2, 'o = Σ pᵢcᵢ', '8 维读出'));
  layer(3, [437, 107, 130, 125], box(452, 125, 100, 87, 3, 'u ← u + o', '两跳查询更新'));
  layer(4, [583, 107, 85, 125], box(598, 125, 56, 87, 4, 'Answer', '8 → 5'));
  caption('问题用于寻址，权重读取事实值；更新后的 Query 再执行下一跳');
};

draw['transformer-xl'] = p => {
  const { add, line, curve, layer, box, matrix, rect, note, caption, C } = p;
  add(curve('M 139 93 L 211 93 L 211 147 L 269 147', 2), curve('M 139 239 L 211 239 L 211 194 L 269 194', 2, true, true), line(407, 172, 451, 172, 3), line(554, 172, 596, 172, 4));
  add(curve('M 159 92 L 159 305 L 625 305 L 625 268', 4, true, true, true));
  layer(0, [17, 48, 136, 91], box(32, 65, 107, 60, 0, 'Current Segment', '4 Token × 8'), [84, 157]);
  layer(1, [17, 184, 136, 100], box(32, 201, 107, 66, 1, 'Memory SG', '每层 4 × 8'), [85, 328]);
  let attention = '';
  for (let row=0;row<4;row++) for (let col=0;col<8;col++) attention += rect(282+col*14,132+row*18,11,14,col<=4+row?C.soft:C.ink,C.edge,1);
  layer(2, [255, 106, 164, 127], attention + note(337, 92, '相对位置 + 因果掩码', 12) + note(338, 269, '当前 Q:4；缓存+当前 KV:8', 12));
  layer(3, [438, 111, 129, 124], box(453, 132, 99, 80, 3, 'FFN / Add', '每层 8 → 16 → 8'));
  layer(4, [582, 104, 86, 173], box(597, 122, 57, 79, 4, 'LM head', '4 × 10') + box(591, 222, 70, 45, 4, '层输入缓存') + note(432, 300, '保存 h⁰,h¹，供下一段使用', 12, C.violet));
  caption('旧段表示 Stop-gradient；两层缓存按深度对齐，不是同层输出反馈同层输入');
};
