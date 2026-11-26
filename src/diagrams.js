// Hand-drawn, dependency-free architecture diagrams. Each interactive layer
// corresponds, in order, to the layer explanation in models.js.
let serial = 0;

const C = {
  cyan: 'var(--diagram-cyan, #087f8c)',
  violet: 'var(--diagram-violet, #7762c8)',
  edge: 'var(--diagram-edge, #a9b7c4)',
  muted: 'var(--diagram-muted, #6e7785)',
  text: 'var(--diagram-text, #42566a)',
  ink: 'var(--diagram-ink, #ffffff)',
  panel: 'var(--diagram-panel, #f3f6f9)',
  grid: 'var(--diagram-grid, #d4dee7)',
  white: 'var(--diagram-white, #172534)',
  activeFill: 'var(--diagram-active-fill, #e1f2f4)',
  activeStrong: 'var(--diagram-active-strong, #c8e9ed)',
  selectionFill: 'var(--diagram-selection-fill, #e8f5f7)',
  cyanSoft: 'var(--diagram-cyan-soft, #a9d9df)',
  violetSoft: 'var(--diagram-violet-soft, #d5c9f0)',
};
const names = {
  perceptron: ['感知机', ['输入', '加权求和', '阶跃输出']],
  mlp: ['多层感知机', ['输入层', '隐藏层 1', '隐藏层 2', '输出层']],
  cnn: ['卷积神经网络', ['输入图像', '卷积', '池化', '展平', '全连接']],
  rnn: ['循环神经网络', ['输入序列', '前一隐藏状态', '当前隐藏状态', '输出']],
  lstm: ['长短期记忆网络', ['输入与前态', '遗忘门', '输入门与候选', '细胞状态', '输出门']],
  transformer: ['Transformer 编码器', ['词嵌入', '位置编码', '多头注意力', '残差与前馈', '输出表示']],
  autoencoder: ['自编码器', ['输入', '编码器', '潜变量', '解码器', '重建']],
  resnet: ['残差网络', ['输入', '卷积', 'ReLU', '卷积', '残差相加']],
  gru: ['门控循环单元', ['输入与前态', '重置与更新门', '候选隐藏态', '隐藏态混合', '逐步输出']],
  unet: ['U-Net', ['输入图像', '编码', '池化', '瓶颈', '上采样与拼接', '解码', '逐像素分类']],
  vit: ['Vision Transformer', ['输入图像', 'Patch 投影', 'CLS 与位置', '编码器', 'CLS 分类头', '分类输出']],
  vae: ['变分自编码器', ['输入与编码', '均值与方差', '重参数化', '解码', '重建与目标']],
  gan: ['生成对抗网络', ['随机噪声', '生成器', '真实样本', '共享判别器', '对抗目标']],
  hopfield: ['经典 Hopfield 网络', ['输入线索', '循环记忆状态', '异步更新与能量', '检索结果']],
  'modern-hopfield': ['现代 Hopfield 网络', ['存储模式', '查询', '相似度', 'Softmax 权重', '联想结果']],
  ntm: ['神经图灵机', ['输入与控制器', '内容与位置寻址', '读写头', '外部记忆', '输出与反馈']],
  dnc: ['可微神经计算机', ['输入与控制器', '内容与分配寻址', '时序链接', '记忆与读写', '输出与反馈']],
  'gated-attention': ['Gated Attention', ['归一化输入', 'Q/K/V 投影', '各头 SDPA', '独立 Sigmoid 门', '各头逐元素门控', '拼接与输出投影']],
  'canon-layer': ['Canon Layer', ['序列表示', '因果局部窗口', '可学习邻居加权', '横向残差', '后续 Attention']],
  'log-linear-attention': ['Log-Linear Attention', ['Q/K/V 投影', 'Fenwick 前缀分桶', '各桶独立状态', '查询读取各桶', '加权合并']],
  mamba3: ['Mamba-3 SISO', ['输入投影', '数据依赖旋转', '指数梯形更新', '状态读出', '门控与输出投影']],
  rae: ['Representation Autoencoder', ['输入图像', '冻结表征编码器', '高维 Latent', 'DiT 与宽 DDT 头', '图像解码器', '重建或生成图像']],
  titans: ['Titans MAG', ['输入序列', '持久记忆前缀', '滑窗注意力', '神经长时记忆', '非线性门控融合', '输出表示']],
  ahn: ['AHN', ['输入与投影', '短期滑窗 KV', 'AHN 长记忆更新', '双路检索', '相加输出']],
  flowstate: ['FlowState', ['因果归一化', '线性嵌入', 'S5 与 MLP 编码', '末态基系数', '连续函数解码', '采样与逆归一化']],
  'repack-refine': ['RePack then Refine', ['冻结表征编码器', 'RePack 投影', 'DiT 速度场采样', 'RePack 解码器', 'Latent 引导 Refiner', '最终图像']],
};
export const diagramIds = Object.freeze(Object.keys(names));

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// An explicit attribute replaces its default rather than producing duplicate
// attributes, so the SVG remains valid both inline and when exported.
const withDefaults = (options, defaults) => Object.entries(defaults)
  .filter(([name]) => !new RegExp(`(?:^|\\s)${name}\\s*=`).test(options))
  .map(([name, value]) => `${name}="${value}"`).concat(options).join(' ');
const t = (x, y, value, options = '') => `<text x="${x}" y="${y}" text-anchor="middle" ${withDefaults(options, { fill: C.text, 'font-size': 14 })}>${esc(value)}</text>`;
const r = (x, y, w, h, options = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${withDefaults(options, { rx: 5 })}/>`;
const circ = (x, y, radius, options = '') => `<circle cx="${x}" cy="${y}" r="${radius}" ${options}/>`;

export function diagram(modelId, { compact = false, activeLayer = -1, signalStep = -1 } = {}) {
  const id = Object.hasOwn(names, modelId) ? modelId : 'mlp';
  const uid = `nb-net-${++serial}`;
  const [name, labels] = names[id];
  const lit = i => i === activeLayer || i === signalStep;
  const color = i => lit(i) ? C.cyan : i === 2 && id === 'autoencoder' ? C.violet : C.text;
  const edgeColor = target => (signalStep >= 0 && target <= signalStep) || activeLayer === target ? C.cyan : C.edge;
  const line = (x1, y1, x2, y2, target = -1, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${withDefaults(extra, { stroke: edgeColor(target), 'stroke-width': 1.3 })}/>`;
  const path = (d, target = -1, extra = '') => `<path d="${d}" ${withDefaults(extra, { fill: 'none', stroke: edgeColor(target), 'stroke-width': 1.5 })}/>`;
  const arrow = (x1, y1, x2, y2, target = -1, extra = '') => line(x1, y1, x2, y2, target, `marker-end="url(#${uid}-arrow)" ${extra}`);
  const aPath = (d, target = -1, extra = '') => path(d, target, `marker-end="url(#${uid}-arrow)" ${extra}`);
  const note = (x, y, value, options = '') => compact ? '' : t(x, y, value, options);
  const label = (x, i, y = 308) => note(x, y, labels[i], `fill="${color(i)}" font-size="13"`);
  const neuron = (x, y, i, radius = 9, accent = false) => circ(x, y, radius, `fill="${lit(i) ? C.activeStrong : C.ink}" stroke="${accent ? C.violet : lit(i) ? C.cyan : C.muted}" stroke-width="${lit(i) ? 2.2 : 1.7}"${lit(i) ? ` filter="url(#${uid}-glow)"` : ''}`);
  const layer = (i, bounds, body) => {
    const [x, y, w, h] = bounds;
    const attrs = compact ? '' : `data-layer="${i}" tabindex="0" role="button" aria-label="查看${esc(labels[i])}的说明" aria-pressed="${activeLayer === i}"`;
    return `<g class="nb-layer${lit(i) ? ' is-active' : ''}" ${attrs}>${r(x, y, w, h, `class="nb-hit" fill="${lit(i) ? C.selectionFill : 'transparent'}" fill-opacity="${lit(i) ? '.18' : '0'}" stroke="${lit(i) ? C.cyan : 'transparent'}" stroke-opacity=".3"`)}${body}</g>`;
  };
  const nodes = (x, ys, i, radius = 9, accent = false) => ys.map(y => neuron(x, y, i, radius, accent)).join('');
  const denseEdges = (x1, ys1, x2, ys2, i) => ys1.map(y1 => ys2.map(y2 => line(x1, y1, x2, y2, i, 'opacity=".65"')).join('')).join('');
  const block = (x, y, w, h, i, title, subtitle = '') => r(x, y, w, h, `fill="${lit(i) ? C.activeFill : C.panel}" stroke="${color(i)}" stroke-opacity="${lit(i) ? 1 : .6}" stroke-width="1.4"`) + t(x + w / 2, y + h / 2 + (subtitle ? -2 : 5), title, `fill="${color(i)}" font-size="${compact ? 17 : 16}"`) + (subtitle ? note(x + w / 2, y + h / 2 + 19, subtitle, 'font-size="12"') : '');
  const operator = (x, y, symbol, i, radius = 14) => circ(x, y, radius, `fill="${lit(i) ? C.activeStrong : C.panel}" stroke="${color(i)}" stroke-width="1.4"`) + t(x, y + 5, symbol, `fill="${color(i)}" font-size="17"`);
  let body = '';

  if (id === 'mlp') {
    const xs = [76, 248, 420, 601];
    const ys = [[101, 165, 229], [55, 99, 143, 187, 231, 275], [81, 137, 193, 249], [133, 197]];
    body += denseEdges(xs[0], ys[0], xs[1], ys[1], 1);
    body += denseEdges(xs[1], ys[1], xs[2], ys[2], 2);
    body += denseEdges(xs[2], ys[2], xs[3], ys[3], 3);
    xs.forEach((x, i) => {
      body += layer(i, [x - 40, 34, 80, 254], nodes(x, ys[i], i, i === 3 ? 11 : 9) + label(x, i));
    });
    body += note(162, 27, 'W₁', `font-size="13" fill="${C.muted}"`) + note(334, 27, 'W₂', `font-size="13" fill="${C.muted}"`) + note(510, 27, 'W₃', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'perceptron') {
    const ys = [94, 165, 236];
    ys.forEach((y, i) => {
      body += line(113, y, 310, 165, 1);
      body += note(196, 118 + i * 37, `w${['₁', '₂', '₃'][i]}`, `fill="${C.muted}"`);
    });
    body += arrow(371, 165, 507, 165, 2);
    body += arrow(340, 75, 340, 132, 1) + note(340, 59, '偏置 b', 'font-size="13"');
    body += layer(0, [42, 63, 102, 204], ys.map((y, i) => neuron(96, y, 0, 15) + t(58, y + 5, `x${['₁', '₂', '₃'][i]}`, `fill="${C.muted}"`)).join('') + label(96, 0));
    body += layer(1, [290, 114, 100, 103], circ(340, 165, 30, `fill="${C.panel}" stroke="${color(1)}" stroke-width="1.6"`) + t(340, 175, 'Σ', `fill="${color(1)}" font-size="30"`) + label(340, 1));
    body += layer(2, [500, 113, 122, 105], r(512, 125, 100, 80, `fill="${C.panel}" stroke="${color(2)}" stroke-width="1.5"`) + path('M 529 185 L 554 185 L 554 146 L 593 146', 2, 'stroke-width="2.5"') + line(529, 191, 595, 191) + line(529, 191, 529, 140) + label(562, 2));
    body += arrow(613, 165, 652, 165, 2) + note(643, 144, 'ŷ', 'font-size="17"');
  }

  if (id === 'cnn') {
    const px = 31, py = 113, cell = 11;
    let image = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const on = (row > 0 && row < 7 && (col === 2 || col === 5)) || ((row === 1 || row === 6) && col >= 2 && col <= 5);
      image += r(px + col * cell, py + row * cell, cell - 1, cell - 1, `fill="${on ? C.muted : C.grid}" rx="1"`);
    }
    image += r(px + 11, py + 22, 33, 33, `fill="${C.cyanSoft}" fill-opacity=".3" stroke="${C.cyan}" stroke-width="1.5" rx="1"`);
    body += arrow(130, 157, 164, 157, 1) + arrow(251, 157, 286, 157, 2) + arrow(364, 157, 416, 157, 3);
    body += layer(0, [18, 94, 114, 126], image + label(74, 0));
    let conv = '';
    for (let depth = 2; depth >= 0; depth--) {
      const x = 174 + depth * 10, y = 112 - depth * 8;
      conv += r(x, y, 56, 90, `fill="${C.panel}" stroke="${depth === 0 ? color(1) : C.edge}" stroke-width="1.2" rx="2"`);
      if (depth === 0) for (let row = 0; row < 6; row++) for (let col = 0; col < 4; col++) conv += r(x + 5 + col * 12, y + 5 + row * 13, 9, 10, `fill="${(row + col) % 3 === 0 ? C.cyan : C.grid}" fill-opacity="${(row + col) % 3 === 0 ? .65 : .6}" rx="1"`);
    }
    body += layer(1, [162, 79, 96, 139], conv + label(211, 1));
    let pool = '';
    for (let depth = 2; depth >= 0; depth--) {
      const x = 296 + depth * 9, y = 129 - depth * 8;
      pool += r(x, y, 41, 57, `fill="${C.panel}" stroke="${depth === 0 ? color(2) : C.edge}" stroke-width="1.2" rx="2"`);
      if (depth === 0) for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) pool += r(x + 5 + col * 17, y + 5 + row * 16, 13, 12, `fill="${(row + col) % 2 ? C.cyanSoft : C.cyan}" fill-opacity=".55" rx="1"`);
    }
    body += layer(2, [284, 99, 83, 111], pool + label(326, 2));
    const flattenYs = Array.from({ length: 10 }, (_, i) => 89 + i * 15);
    const outYs = [108, 157, 206];
    flattenYs.forEach(y => outYs.forEach(oy => { body += line(443, y, 573, oy, 4, 'opacity=".43"'); }));
    body += layer(3, [413, 74, 44, 173], flattenYs.map(y => r(428, y, 14, 11, `fill="${C.cyan}" fill-opacity="${lit(3) ? .85 : .4}" stroke="${color(3)}" stroke-opacity=".4" rx="1"`)).join('') + label(435, 3));
    body += layer(4, [556, 84, 80, 150], nodes(589, outYs, 4, 12) + label(589, 4));
    body += note(211, 252, '局部连接 · 权重共享', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'rnn') {
    const inputs = [125, 165, 205];
    body += aPath('M 127 165 L 156 165 Q 171 165 171 187 L 171 242 L 421 242 L 421 207', 2);
    body += arrow(298, 158, 359, 158, 2) + arrow(483, 158, 560, 158, 3);
    body += note(327, 139, 'Wₕ', 'font-size="13"') + note(292, 264, 'xₜ', 'font-size="15"');
    body += layer(0, [38, 97, 102, 137], inputs.map((y, i) => block(58, y - 15, 68, 29, 0, ['xₜ₋₁', 'xₜ', 'xₜ₊₁'][i])).join('') + label(90, 0));
    body += layer(1, [199, 105, 109, 113], block(209, 119, 89, 78, 1, 'hₜ₋₁', '上一时刻') + label(254, 1));
    body += layer(2, [348, 105, 146, 113], block(361, 119, 121, 78, 2, 'hₜ', 'tanh(·)') + label(421, 2));
    body += layer(3, [548, 105, 93, 113], neuron(591, 158, 3, 26) + t(591, 164, 'yₜ', `fill="${color(3)}" font-size="18"`) + label(591, 3));
    body += note(340, 48, '同一组权重，沿时间重复使用', `font-size="14" fill="${C.muted}"`);
  }

  if (id === 'lstm') {
    body += arrow(101, 76, 193, 76, 1) + arrow(222, 76, 333, 76, 2) + arrow(362, 76, 491, 76, 3);
    body += line(208, 174, 208, 91, 1) + arrow(348, 112, 348, 91, 2);
    body += line(310, 175, 310, 126, 2) + line(310, 126, 334, 126, 2) + line(386, 175, 386, 126, 2) + line(386, 126, 362, 126, 2);
    body += aPath('M 461 76 L 461 142 L 553 142', 4);
    body += arrow(568, 203, 568, 157, 4) + arrow(583, 142, 646, 142, 4);
    body += line(126, 248, 569, 248, 0);
    [208, 310, 386, 568].forEach((x, i) => { body += arrow(x, 248, x, i === 3 ? 232 : 207, i === 0 ? 1 : i === 3 ? 4 : 2); });
    body += layer(0, [20, 49, 105, 224], t(65, 82, 'cₜ₋₁', `fill="${color(0)}" font-size="17"`) + block(26, 215, 100, 65, 0, '[hₜ₋₁, xₜ]') + label(77, 0));
    body += layer(1, [166, 48, 83, 177], operator(208, 76, '×', 1) + block(179, 174, 58, 32, 1, 'σ') + note(231, 155, 'fₜ', 'font-size="15"') + label(208, 1));
    body += layer(2, [275, 48, 146, 177], operator(348, 76, '+', 2) + operator(348, 126, '×', 2, 13) + block(283, 175, 54, 32, 2, 'σ') + block(351, 175, 71, 32, 2, 'tanh') + note(286, 163, 'iₜ', 'font-size="15"') + note(414, 163, 'gₜ', 'font-size="15"') + label(348, 2));
    body += layer(3, [433, 47, 80, 128], note(465, 55, 'cₜ', `fill="${color(3)}" font-size="17"`) + block(432, 119, 60, 40, 3, 'tanh') + label(471, 3));
    body += layer(4, [529, 113, 91, 124], operator(568, 142, '×', 4) + block(539, 201, 58, 32, 4, 'σ') + note(603, 220, 'oₜ', 'font-size="15"') + label(569, 4));
    body += note(647, 125, 'hₜ', `fill="${C.cyan}" font-size="17"`);
    body += note(371, 24, '细胞状态：遗忘旧信息，写入新信息', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'transformer') {
    body += arrow(97, 164, 148, 164, 1) + arrow(214, 164, 264, 164, 2);
    body += aPath('M 389 164 L 400 164 L 400 126 L 412 126', 3);
    body += aPath('M 525 210 L 562 210 L 562 164 L 580 164', 4);
    const vector = (x, y, i) => [0, 1, 2, 3].map(k => r(x + k * 9, y, 7, 27, `fill="${k % 2 ? C.violet : C.cyan}" fill-opacity="${lit(i) ? .9 : .45}" rx="1"`)).join('');
    body += layer(0, [35, 94, 73, 144], [104, 150, 196].map(y => vector(55, y, 0)).join('') + label(72, 0));
    body += layer(1, [142, 95, 78, 144], [117, 163, 209].map(y => operator(181, y, '+', 1, 13)).join('') + path('M 153 61 Q 160 42 169 61 T 185 61 T 201 61', 1, 'stroke-width="2"') + arrow(181, 69, 181, 101, 1) + label(181, 1));
    let attention = '';
    for (let head = 3; head >= 0; head--) {
      const x = 277 + head * 12, y = 111 - head * 12;
      attention += r(x, y, 74, 104, `fill="${C.panel}" stroke="${head === 0 ? color(2) : C.edge}" stroke-width="1.3"`);
      if (head === 0) {
        for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) attention += r(x + 10 + col * 18, y + 17 + row * 19, 14, 15, `fill="${row === col ? C.cyan : C.violet}" fill-opacity="${row === col ? .7 : .2 + ((row + col) % 2) * .2}" rx="1"`);
        attention += note(x + 37, y + 90, 'Q · Kᵀ', 'font-size="12"');
      }
    }
    body += layer(2, [264, 63, 130, 166], attention + label(321, 2));
    let ff = block(417, 110, 107, 32, 3, 'Add & Norm') + block(417, 148, 107, 40, 3, 'FFN', '16 → 32 → 16') + block(417, 194, 107, 32, 3, 'Add & Norm');
    ff += line(470, 142, 470, 148, 3) + line(470, 188, 470, 194, 3);
    ff += aPath('M 240 164 L 240 54 L 470 54 L 470 104', 3, 'stroke-dasharray="4 4"');
    ff += aPath('M 470 145 L 548 145 L 548 209 L 531 209', 3, 'stroke-dasharray="4 4"');
    body += layer(3, [406, 99, 129, 139], ff + label(471, 3));
    body += layer(4, [579, 94, 75, 144], [104, 150, 196].map(y => vector(594, y, 4)).join('') + label(617, 4));
    body += note(340, 272, '一个编码器块的示意；不使用因果掩码', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'autoencoder') {
    const xs = [61, 205, 340, 475, 619];
    const ys = [[65, 115, 165, 215, 265], [103, 165, 227], [141, 189], [103, 165, 227], [65, 115, 165, 215, 265]];
    body += `<path d="M 68 40 L 334 119 L 334 210 L 68 289 Z" fill="${C.cyanSoft}" fill-opacity=".25"/><path d="M 346 119 L 612 40 L 612 289 L 346 210 Z" fill="${C.violetSoft}" fill-opacity=".25"/>`;
    for (let i = 1; i < xs.length; i++) body += denseEdges(xs[i - 1], ys[i - 1], xs[i], ys[i], i);
    xs.forEach((x, i) => { body += layer(i, [x - 35, 35, 70, 253], nodes(x, ys[i], i, i === 2 ? 12 : 9, i === 2) + label(x, i)); });
    body += note(340, 76, 'z', `fill="${C.violet}" font-size="21"`) + note(61, 24, 'x', 'font-size="17"') + note(619, 24, 'x̂', 'font-size="17"');
  }

  if (id === 'resnet') {
    body += arrow(101, 165, 160, 165, 1) + arrow(253, 165, 306, 165, 2) + arrow(373, 165, 420, 165, 3) + arrow(513, 165, 576, 165, 4);
    body += aPath('M 118 165 L 118 62 Q 118 50 131 50 L 582 50 Q 594 50 594 62 L 594 145', 4, 'stroke-width="2"');
    body += circ(118, 165, 3, `fill="${C.cyan}"`) + note(350, 35, '恒等捷径 x', `font-size="13" fill="${C.muted}"`);
    body += layer(0, [30, 105, 83, 125], r(44, 122, 51, 85, `fill="${C.panel}" stroke="${color(0)}" stroke-width="1.4" rx="2"`) + r(53, 113, 51, 85, `fill="${C.panel}" stroke="${color(0)}" stroke-width="1.4" rx="2"`) + t(78, 169, 'x', `fill="${color(0)}" font-size="21"`) + label(76, 0));
    body += layer(1, [151, 116, 111, 100], block(162, 124, 91, 82, 1, 'Conv + BN') + label(208, 1));
    body += layer(2, [301, 118, 78, 97], r(307, 126, 66, 78, `fill="${C.panel}" stroke="${color(2)}" stroke-width="1.3"`) + path('M 318 182 L 340 182 L 361 147', 2, 'stroke-width="2.6"') + label(340, 2));
    body += layer(3, [409, 116, 115, 100], block(421, 124, 92, 82, 3, 'Conv + BN') + label(467, 3));
    body += arrow(614, 165, 631, 165, 4);
    body += layer(4, [560, 130, 118, 86], operator(594, 165, '+', 4, 19) + r(635, 147, 40, 36, `fill="${C.panel}" stroke="${color(4)}" stroke-width="1.3"`) + t(655, 169, 'ReLU', 'font-size="10"') + note(607, 250, 'ReLU(F(x) + x)', `fill="${color(4)}" font-size="14"`) + label(604, 4));
    body += note(340, 250, '残差分支 F(x)', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'gru') {
    // Both gates see the same time step. The two hidden-state branches mix
    // in parallel; the gate boxes are not successive recurrent time steps.
    body += aPath('M 102 101 L 133 101 L 133 50 L 477 50 L 477 105', 3);
    body += aPath('M 116 229 L 146 229 L 146 134 L 181 134', 1);
    body += aPath('M 146 185 L 181 185', 1);
    body += arrow(114, 101, 181, 117, 1) + aPath('M 156 111 L 156 177 L 181 177', 1);
    body += aPath('M 146 229 L 285 229 L 285 199 L 309 199', 2);
    body += aPath('M 133 101 L 277 101 L 277 142', 2);
    body += arrow(235, 134, 264, 152, 2) + arrow(277, 165, 325, 179, 2);
    body += aPath('M 235 185 L 256 185 L 256 267 L 442 267 L 442 118 L 463 118', 3);
    body += aPath('M 442 245 L 481 245 L 481 213', 3);
    body += arrow(399, 199, 467, 199, 3) + arrow(527, 145, 588, 145, 4);
    body += layer(0, [22, 69, 105, 204], block(31, 79, 83, 44, 0, 'hₜ₋₁') + block(31, 207, 83, 44, 0, 'xₜ') + label(73, 0));
    body += layer(1, [172, 106, 71, 108], block(181, 117, 54, 34, 1, 'σ · rₜ') + block(181, 168, 54, 34, 1, 'σ · zₜ') + label(207, 1));
    body += layer(2, [261, 138, 151, 87], operator(277, 153, '×', 2, 12) + block(309, 177, 90, 44, 2, 'h̃ₜ', 'tanh(·)') + label(351, 2));
    body += layer(3, [451, 94, 88, 119], operator(477, 118, '×', 3, 13) + operator(481, 199, '×', 3, 13) + operator(513, 145, '+', 3, 14) + line(489, 124, 503, 136, 3) + line(492, 192, 508, 159, 3) + note(477, 89, 'zₜ', 'font-size="13"') + note(513, 241, '1 − zₜ', 'font-size="13"') + label(495, 3));
    body += layer(4, [577, 107, 88, 105], block(589, 122, 64, 47, 4, 'hₜ') + arrow(621, 170, 621, 207, 4) + note(621, 230, 'yₜ = head(hₜ)', 'font-size="13"') + label(621, 4));
    body += note(341, 29, '同一时刻的门控；hₜ 传向下一个时刻', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'unet') {
    // A one-level, same-padding teaching U-Net: skip features are concatenated.
    const feature = (x, y, w, h, i, caption) => r(x + 7, y - 6, w, h, `fill="${C.panel}" stroke="${C.edge}"`) + r(x, y, w, h, `fill="${lit(i) ? C.activeFill : C.panel}" stroke="${color(i)}" stroke-width="1.4"`) + t(x + w / 2, y + h / 2 + 5, caption, 'font-size="14"');
    body += arrow(91, 104, 129, 104, 1) + arrow(169, 140, 169, 186, 2);
    body += aPath('M 211 215 L 256 215 L 256 245 L 291 245', 3);
    body += arrow(386, 245, 438, 245, 4) + arrow(480, 221, 480, 182, 4);
    body += arrow(480, 150, 480, 136, 5) + arrow(526, 104, 580, 104, 6);
    body += aPath('M 211 104 L 300 104 L 300 166 L 462 166', 4, `stroke="${C.violet}" stroke-width="1.8"`);
    body += layer(0, [17, 69, 82, 87], feature(28, 76, 62, 58, 0, 'x') + note(59, 164, '32 × 32 × 1', 'font-size="12"') + label(59, 0));
    body += layer(1, [121, 61, 98, 94], feature(132, 69, 78, 71, 1, 'Conv × 2') + note(171, 165, '32 × 32 × 8', 'font-size="12"') + label(171, 1));
    body += layer(2, [121, 180, 98, 68], block(132, 188, 78, 48, 2, 'Pool 2×2') + note(171, 263, '16 × 16 × 8', 'font-size="12"') + label(171, 2, 287));
    body += layer(3, [283, 207, 111, 74], feature(293, 216, 93, 55, 3, 'Conv × 2') + note(339, 291, '16 × 16 × 16', 'font-size="12"') + label(339, 3, 315));
    body += layer(4, [432, 145, 98, 136], operator(480, 166, '∥', 4, 15) + block(442, 222, 76, 48, 4, 'Up 2×') + note(382, 151, '跳跃连接：拼接', `font-size="13" fill="${C.violet}"`) + note(553, 170, '16 通道', 'font-size="12"') + label(480, 4, 296));
    body += layer(5, [431, 61, 103, 83], feature(442, 69, 76, 67, 5, 'Conv × 2') + note(481, 50, '32 × 32 × 8', 'font-size="12"') + label(480, 5, 27));
    body += layer(6, [571, 61, 92, 92], feature(583, 69, 69, 68, 6, '1×1 Conv') + note(617, 167, '32 × 32 × 2', 'font-size="12"') + label(617, 6));
  }

  if (id === 'vit') {
    let image = '';
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) image += r(22 + col * 16, 114 + row * 16, 14, 14, `fill="${(row + col) % 3 ? C.cyanSoft : C.violetSoft}" stroke="${C.edge}" stroke-width=".5" rx="1"`);
    body += arrow(88, 146, 119, 146, 1) + arrow(195, 146, 220, 146, 2) + arrow(305, 146, 331, 146, 3) + arrow(442, 146, 475, 146, 4) + arrow(554, 146, 593, 146, 5);
    body += layer(0, [13, 99, 84, 97], image + note(53, 228, '8 × 8 像素 / patch', 'font-size="12"') + label(55, 0));
    const tokenRow = (x, y, i, cls = false) => r(x, y, 64, 14, `fill="${cls ? C.violetSoft : C.cyanSoft}" stroke="${color(i)}" stroke-opacity=".5" rx="2"`);
    body += layer(1, [111, 82, 92, 137], [99, 124, 149, 174].map(y => tokenRow(126, y, 1)).join('') + note(157, 214, '⋮', 'font-size="21"') + note(158, 241, '16 × 32', 'font-size="13"') + label(157, 1));
    body += layer(2, [211, 63, 103, 156], tokenRow(231, 76, 2, true) + note(263, 66, 'CLS', `font-size="12" fill="${C.violet}"`) + [103, 128, 153, 178].map(y => tokenRow(231, y, 2)).join('') + note(262, 222, '+ 位置编码', 'font-size="13"') + note(263, 244, '17 × 32', 'font-size="13"') + label(263, 2));
    body += layer(3, [321, 74, 132, 150], block(334, 88, 105, 117, 3, 'Encoder', 'Attention + MLP') + note(386, 240, 'Pre-LN blocks', 'font-size="13"') + label(386, 3));
    body += layer(4, [466, 108, 99, 80], block(478, 119, 76, 54, 4, 'Head', 'CLS → 2') + note(516, 228, '仅取 CLS 表示', 'font-size="12"') + label(516, 4));
    body += layer(5, [580, 111, 88, 85], nodes(625, [132, 168], 5, 11) + note(625, 107, 'Softmax', 'font-size="13"') + note(624, 233, '2 类概率', 'font-size="13"') + label(624, 5));
    body += note(340, 29, '图像切块后，按 token 序列进行全局交互', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'vae') {
    body += arrow(135, 160, 175, 160, 1);
    body += aPath('M 175 160 L 175 114 L 194 114', 1) + aPath('M 175 160 L 175 204 L 194 204', 1);
    body += aPath('M 275 114 L 305 114 L 305 158 L 324 158', 2) + aPath('M 275 204 L 305 204 L 305 174 L 324 174', 2);
    body += arrow(414, 165, 450, 165, 3) + arrow(532, 165, 573, 165, 4);
    body += arrow(371, 78, 371, 132, 2);
    body += aPath('M 237 225 L 237 269 L 571 269', 4, `stroke="${C.violet}" stroke-dasharray="4 4"`);
    body += path('M 275 114 L 291 114 L 291 269', 4, `stroke="${C.violet}" stroke-dasharray="4 4"`);
    body += arrow(618, 204, 618, 243, 4);
    body += layer(0, [17, 114, 129, 106], block(29, 129, 106, 75, 0, 'Encoder', 'x: 784 → 64') + label(81, 0));
    body += layer(1, [185, 85, 100, 147], block(194, 93, 82, 42, 1, 'μ') + block(194, 183, 82, 42, 1, 'log σ²') + note(235, 163, '各 8 维', 'font-size="13"') + label(236, 1));
    body += layer(2, [317, 118, 105, 105], block(326, 134, 88, 62, 2, 'z', 'μ + σ ⊙ ε') + note(371, 59, 'ε ∼ N(0,I)', `font-size="14" fill="${C.violet}"`) + note(371, 227, 'σ = exp(½ log σ²)', 'font-size="12"') + label(370, 2));
    body += layer(3, [441, 119, 99, 101], block(452, 131, 80, 71, 3, 'Decoder', '8 → 64') + label(491, 3));
    body += layer(4, [562, 115, 111, 179], block(575, 129, 86, 74, 4, 'x̂', '784 维重建') + block(573, 245, 89, 47, 4, 'Loss', '重建 + KL') + label(618, 4));
    body += note(406, 257, 'KL(q(z|x) ∥ N(0,I))', `font-size="13" fill="${C.violet}"`);
    body += note(340, 29, '重参数化让梯度经过采样表达式', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'gan') {
    // Real and generated samples enter the SAME discriminator. Dashed paths
    // indicate optimization feedback, not another feed-forward inference stage.
    body += arrow(103, 91, 171, 91, 1) + arrow(294, 91, 409, 130, 3);
    body += aPath('M 145 216 L 319 216 L 409 170', 3);
    body += arrow(525, 149, 570, 149, 4);
    body += aPath('M 603 191 L 603 253 L 251 253 L 251 129', 4, `stroke="${C.violet}" stroke-dasharray="4 4"`);
    body += aPath('M 572 203 L 543 203 L 495 181', 4, `stroke="${C.violet}" stroke-dasharray="4 4"`);
    body += layer(0, [27, 58, 84, 74], block(38, 68, 64, 47, 0, 'z', '8 维噪声') + label(69, 0, 148));
    body += layer(1, [159, 47, 146, 96], block(172, 60, 122, 69, 1, 'Generator G', '8 → 64 → 784') + label(232, 1, 161));
    body += layer(2, [26, 178, 131, 75], block(39, 189, 106, 52, 2, 'Real x', '784 维数据') + label(92, 2, 280));
    body += layer(3, [399, 99, 137, 96], block(411, 112, 113, 69, 3, 'Discriminator D', '784 → 64 → 1') + label(467, 3));
    body += layer(4, [561, 106, 112, 115], block(572, 120, 89, 71, 4, 'Lᴅ / Lɢ', '真假判别 / 欺骗') + note(615, 218, '交替优化', 'font-size="13"') + label(616, 4));
    body += note(345, 77, 'G(z)', 'font-size="14"') + note(338, 210, 'x', 'font-size="14"');
    body += note(359, 277, '虚线：训练梯度；生成样本只需 z → G(z)', `font-size="13" fill="${C.violet}"`);
    body += note(340, 29, '对抗训练图：真实与生成两条支路', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'hopfield') {
    const positions = Array.from({ length: 8 }, (_, i) => {
      const angle = i * Math.PI / 4 - Math.PI / 2;
      return [325 + 88 * Math.cos(angle), 142 + 80 * Math.sin(angle)];
    });
    let recurrent = '';
    positions.forEach(([x1, y1], i) => positions.slice(i + 1).forEach(([x2, y2]) => { recurrent += line(x1, y1, x2, y2, 1, 'opacity=".55"'); }));
    recurrent += positions.map(([x, y], i) => neuron(x, y, 1, 13) + t(x, y + 5, i % 3 ? '+' : '−', `font-size="16" fill="${color(1)}"`)).join('');
    body += arrow(114, 142, 211, 142, 1) + arrow(439, 142, 550, 142, 3);
    body += aPath('M 238 63 C 266 17 370 15 410 65', 2);
    body += note(159, 123, '初始化', 'font-size="13"') + note(496, 123, '稳定后读取', 'font-size="13"');
    const pattern = (x, y, i, clean = false) => Array.from({ length: 8 }, (_, k) => {
      const sign = clean ? (k % 3 ? '+' : '−') : (k % 4 ? '+' : '−');
      return r(x + (k % 2) * 29, y + Math.floor(k / 2) * 29, 24, 24, `fill="${sign === '+' ? C.cyanSoft : C.violetSoft}" stroke="${color(i)}" stroke-opacity=".4" rx="3"`) + t(x + 12 + (k % 2) * 29, y + 18 + Math.floor(k / 2) * 29, sign, 'font-size="16"');
    }).join('');
    body += layer(0, [34, 75, 80, 133], pattern(47, 87, 0) + label(74, 0));
    body += layer(1, [217, 46, 217, 186], recurrent + note(326, 141, 'W = Wᵀ', `font-size="13" fill="${C.muted}"`) + note(326, 162, 'Wᵢᵢ = 0', `font-size="13" fill="${C.muted}"`) + label(325, 1));
    let energy = line(199, 278, 436, 278, 2) + line(199, 278, 199, 246, 2);
    energy += path('M 208 249 L 244 249 L 244 256 L 289 256 L 289 265 L 337 265 L 337 272 L 428 272', 2, `stroke="${C.violet}" stroke-width="2"`);
    body += layer(2, [184, 235, 266, 55], energy + note(325, 231, '异步更新一个单元；E(s) 不增', 'font-size="13"') + label(325, 2, 325));
    body += layer(3, [548, 75, 81, 133], pattern(561, 87, 3, true) + label(589, 3));
    body += note(336, 26, '循环联想记忆，不是逐层前馈网络', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'modern-hopfield') {
    body += aPath('M 140 120 L 176 120 L 176 174 L 207 174', 2);
    body += aPath('M 134 244 L 176 244 L 176 198 L 207 198', 2);
    body += arrow(310, 185, 350, 185, 3) + arrow(449, 185, 511, 185, 4);
    body += aPath('M 140 84 L 560 84 L 560 139', 4);
    body += aPath('M 607 217 L 607 272 L 92 272 L 92 265', 4, `stroke="${C.violet}" stroke-dasharray="4 4"`);
    let memory = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) memory += r(51 + col * 20, 63 + row * 15, 17, 11, `fill="${(row + col) % 4 ? C.cyanSoft : C.violetSoft}" stroke="${C.edge}" stroke-opacity=".4" rx="1"`);
    body += layer(0, [37, 48, 108, 150], memory + note(90, 215, 'X: 8 × 16', 'font-size="13"') + label(90, 0, 30));
    body += layer(1, [38, 219, 105, 53], block(49, 226, 85, 39, 1, 'q ∈ ℝ¹⁶') + label(90, 1));
    body += layer(2, [198, 139, 122, 91], block(208, 151, 102, 67, 2, 'βXq', '8 个相似度') + label(258, 2));
    let weights = block(352, 138, 97, 37, 3, 'Softmax');
    const heights = [6, 9, 30, 8, 13, 36, 9, 7];
    heights.forEach((height, index) => { weights += r(361 + index * 10, 227 - height, 6, height, `fill="${height > 25 ? C.cyan : C.cyanSoft}" rx="1"`); });
    body += layer(3, [342, 127, 116, 110], weights + note(402, 249, 'pᵢ ≥ 0，Σpᵢ = 1', 'font-size="12"') + label(400, 3));
    body += layer(4, [500, 130, 137, 100], block(513, 143, 111, 73, 4, 'q′ = Xᵀp', '16 维联想结果') + label(568, 4));
    body += note(361, 72, '同一组 X 同时提供匹配模式与读出模式', 'font-size="13"');
    body += note(348, 291, '虚线：可将更新后的 q′ 用于下一次联想', `font-size="13" fill="${C.violet}"`);
  }

  if (id === 'ntm') {
    // Read and write are two parallel heads over a single external matrix.
    // The lower loop returns the current read vector to the next controller step.
    body += arrow(16, 168, 47, 168, 0) + note(28, 149, 'xₜ', 'font-size="14"');
    body += aPath('M 187 156 L 216 156 L 216 91 L 245 91', 1);
    body += aPath('M 401 91 L 428 91 L 428 155 L 396 155', 2);
    body += aPath('M 428 155 L 428 229 L 396 229', 2);
    body += arrow(511, 162, 396, 162, 2) + arrow(396, 237, 511, 237, 3);
    body += aPath('M 306 161 L 267 161 L 267 280 L 118 280 L 118 208', 4, `stroke="${C.violet}" stroke-dasharray="4 4"`);
    body += aPath('M 287 161 L 227 161 L 227 64 L 190 64', 4);
    body += arrow(117, 132, 117, 86, 4);
    body += aPath('M 557 102 L 557 42 L 350 42 L 350 59', 1, `stroke-dasharray="4 4"`);
    body += layer(0, [35, 120, 164, 97], block(48, 133, 139, 74, 0, 'Controller', 'xₜ + rₜ₋₁ → hₜ') + note(115, 236, '3 + 8 → 32', 'font-size="13"') + label(116, 0));
    body += layer(1, [235, 50, 176, 78], block(246, 61, 155, 56, 1, 'Content + location', '插值 · 位移 · 锐化') + label(324, 1, 28));
    body += layer(2, [296, 133, 109, 131], block(307, 144, 88, 40, 2, 'Read', 'rₜ ∈ ℝ⁸') + block(307, 216, 88, 40, 2, 'Write', 'erase + add') + label(351, 2));
    let memory = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 5; col++) memory += r(522 + col * 21, 114 + row * 17, 17, 13, `fill="${row === 2 ? C.cyanSoft : row === 6 ? C.violetSoft : C.panel}" stroke="${C.edge}" stroke-width=".7" rx="1"`);
    body += layer(3, [502, 92, 142, 177], r(512, 103, 121, 153, `fill="${C.ink}" stroke="${color(3)}" stroke-width="1.4"`) + memory + note(574, 283, 'Mₜ: 16 × 8', 'font-size="13"') + label(574, 3));
    body += layer(4, [39, 31, 159, 63], block(51, 41, 134, 45, 4, 'Output yₜ', '[hₜ, rₜ] → 2') + note(213, 51, 'rₜ', 'font-size="13"') + note(179, 270, 'rₜ → 下一时刻', `font-size="13" fill="${C.violet}"`) + label(117, 4, 111));
    body += note(470, 150, '读', 'font-size="13"') + note(470, 226, '写', 'font-size="13"');
    body += note(549, 29, '软寻址：对所有位置加权', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'dnc') {
    body += arrow(15, 160, 47, 160, 0) + note(28, 141, 'xₜ', 'font-size="14"');
    body += aPath('M 187 148 L 215 148 L 215 89 L 241 89', 1);
    body += aPath('M 408 84 L 440 84 L 440 127 L 474 127', 3);
    body += aPath('M 409 112 L 427 112 L 427 179 L 475 179', 3);
    body += aPath('M 399 243 L 450 243 L 450 194 L 475 194', 3);
    body += aPath('M 532 128 L 648 128 L 648 270 L 321 270 L 321 263', 2, `stroke-dasharray="4 4"`);
    body += aPath('M 476 193 L 446 193 L 446 290 L 119 290 L 119 207', 4, `stroke="${C.violet}" stroke-dasharray="4 4"`);
    body += aPath('M 446 193 L 220 193 L 220 62 L 190 62', 4);
    body += arrow(117, 130, 117, 83, 4);
    body += aPath('M 594 98 L 594 41 L 337 41 L 337 58', 1, `stroke-dasharray="4 4"`);
    body += layer(0, [35, 119, 164, 96], block(48, 132, 139, 74, 0, 'Controller', 'xₜ + rₜ₋₁ → hₜ') + note(117, 236, '3 + 2×8 → 32', 'font-size="13"') + label(116, 0));
    body += layer(1, [231, 49, 187, 91], block(243, 61, 164, 66, 1, 'Content + allocation', 'usage / free gates') + label(325, 1, 27));
    let links = r(244, 207, 155, 55, `fill="${lit(2) ? C.activeFill : C.panel}" stroke="${color(2)}" stroke-width="1.4"`);
    links += [266, 321, 376].map((x, index) => operator(x, 230, ['a', 'c', 'b'][index], 2, 11)).join('');
    links += arrow(278, 230, 309, 230, 2) + arrow(333, 230, 364, 230, 2);
    body += layer(2, [233, 195, 177, 78], links + note(324, 185, 'Lₜ: 16 × 16', 'font-size="13"') + label(322, 2, 325));
    let matrix = '';
    for (let row = 0; row < 7; row++) for (let col = 0; col < 4; col++) matrix += r(550 + col * 21, 108 + row * 19, 16, 14, `fill="${row === 1 ? C.cyanSoft : row === 5 ? C.violetSoft : C.panel}" stroke="${C.edge}" stroke-width=".7" rx="1"`);
    let heads = block(476, 111, 57, 34, 3, 'W') + block(476, 165, 57, 53, 3, 'R₁ R₂');
    heads += arrow(534, 127, 544, 127, 3) + arrow(545, 183, 535, 183, 3) + arrow(545, 203, 535, 203, 3);
    body += layer(3, [465, 91, 178, 163], heads + r(544, 98, 94, 151, `fill="${C.ink}" stroke="${color(3)}" stroke-width="1.4"`) + matrix + note(563, 268, 'Mₜ: 16 × 8', 'font-size="13"') + label(555, 3));
    body += layer(4, [40, 29, 158, 63], block(51, 40, 134, 43, 4, 'Output yₜ', '[hₜ, rₜ] → 2') + note(210, 49, 'rₜ', 'font-size="13"') + label(118, 4, 111));
    body += note(272, 279, '按写入先后连接，非地址相邻', `font-size="12" fill="${C.muted}"`);
    body += note(267, 311, '2 个读向量返回下一时刻', `font-size="13" fill="${C.violet}"`);
    body += note(554, 27, '分配空闲槽位 + 按写入顺序读', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'gated-attention') {
    // Recommended G1 variant: the gate has its own X projection and acts
    // elementwise on each SDPA head, BEFORE concatenation and output projection.
    body += arrow(94, 155, 132, 155, 1);
    [106, 156, 206].forEach(y => { body += arrow(206, y, 271, y, 2); });
    body += arrow(383, 155, 453, 155, 4) + arrow(486, 155, 548, 155, 5);
    body += aPath('M 106 155 L 106 268 L 272 268', 3, `stroke="${C.violet}"`);
    body += aPath('M 388 268 L 470 268 L 470 173', 4, `stroke="${C.violet}"`);
    body += layer(0, [18, 106, 86, 99], block(29, 121, 65, 69, 0, 'X', 'T × 16') + label(61, 0));
    body += layer(1, [122, 77, 95, 159], ['Q', 'K', 'V'].map((value, i) => block(134, 90 + i * 50, 72, 32, 1, value)).join('') + note(170, 257, '4 头 × 4 维', 'font-size="13"') + label(170, 1));
    let heads = '';
    for (let head = 3; head >= 0; head--) heads += r(278 + head * 9, 119 - head * 10, 78, 88, `fill="${lit(2) ? C.activeFill : C.panel}" stroke="${head ? C.edge : color(2)}" stroke-width="1.3"`);
    heads += t(317, 158, 'SDPA', `font-size="16" fill="${color(2)}"`);
    body += layer(2, [266, 78, 124, 139], heads + note(327, 56, 'Softmax(QKᵀ/√d) V', 'font-size="13"') + label(328, 2, 28));
    body += layer(3, [263, 231, 134, 62], block(274, 242, 113, 49, 3, 'σ(XWɢ)', 'T × 4 × 4') + label(330, 3));
    body += layer(4, [432, 120, 77, 83], operator(470, 155, '⊙', 4, 17) + note(471, 222, 'Y ⊙ g', 'font-size="15"') + label(470, 4));
    body += layer(5, [538, 105, 130, 102], block(550, 119, 105, 72, 5, 'Concat · Wᴏ', 'T × 16') + label(602, 5));
    body += note(207, 290, '从同一 X 计算门', `font-size="13" fill="${C.violet}"`);
  }

  if (id === 'canon-layer') {
    // Canon-A teaching instance: a causal width-four neighbor mixer followed
    // by a horizontal residual. Other Canon insertion points are not shown.
    const strip = (x, y, i, text, accent = false) => r(x, y, 64, 25, `fill="${accent ? C.violetSoft : C.cyanSoft}" stroke="${color(i)}" stroke-opacity=".6" rx="3"`) + t(x + 32, y + 17, text, 'font-size="13"');
    body += arrow(94, 165, 139, 165, 1);
    [95, 137, 179, 221].forEach(y => { body += arrow(219, y, 297, 160, 2, 'opacity=".7"'); });
    body += arrow(381, 160, 457, 160, 3) + arrow(489, 160, 548, 160, 4);
    body += aPath('M 106 165 L 106 58 L 474 58 L 474 143', 3, `stroke="${C.violet}"`);
    body += layer(0, [17, 92, 86, 150], [111, 150, 189].map((y, i) => strip(29, y, 0, ['…', 'xₜ₋₁', 'xₜ'][i], i === 2)).join('') + label(61, 0));
    let window = r(140, 71, 89, 176, `fill="${C.panel}" stroke="${color(1)}" stroke-dasharray="4 4"`);
    window += [82, 124, 166, 208].map((y, i) => strip(152, y, 1, ['xₜ₋₃', 'xₜ₋₂', 'xₜ₋₁', 'xₜ'][i], i === 3)).join('');
    body += layer(1, [131, 62, 106, 194], window + note(184, 274, 'kernel = 4', 'font-size="13"') + label(184, 1));
    body += layer(2, [286, 117, 105, 88], block(298, 131, 82, 59, 2, 'Conv1D', 'causal, k = 4') + note(340, 225, '因果；不读取未来', 'font-size="13"') + label(340, 2));
    body += layer(3, [439, 122, 71, 83], operator(474, 160, '+', 3, 16) + note(474, 91, '保留 xₜ', `font-size="13" fill="${C.violet}"`) + label(474, 3));
    body += layer(4, [537, 111, 130, 100], block(550, 126, 104, 69, 4, 'Attention', 'T × 16 → T × 16') + label(602, 4));
    body += note(342, 28, 'Canon-A 示例：先局部横向混合，再进入注意力', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'log-linear-attention') {
    const ys = [86, 158, 230];
    body += aPath('M 105 160 L 137 160 L 137 86 L 163 86', 1);
    body += aPath('M 137 160 L 163 158', 1) + aPath('M 137 160 L 137 230 L 163 230', 1);
    ys.forEach(y => { body += arrow(234, y, 308, y, 2) + arrow(365, y, 432, y, 3) + arrow(503, y, 588, 158, 4); });
    body += aPath('M 105 191 L 119 191 L 119 282 L 416 282 L 416 86 L 432 86', 3, `stroke="${C.violet}"`);
    body += arrow(416, 158, 432, 158, 3, `stroke="${C.violet}"`) + arrow(416, 230, 432, 230, 3, `stroke="${C.violet}"`);
    body += layer(0, [17, 116, 99, 96], block(29, 129, 76, 71, 0, 'Q / K / V', '各 4 维') + label(67, 0));
    body += layer(1, [152, 52, 93, 209], ys.map((y, i) => block(164, y - 19, 69, 38, 1, ['远：4', '中：2', '近：1'][i])).join('') + note(199, 279, '近细远粗', 'font-size="13"') + label(199, 1));
    let states = '';
    ys.forEach((y, level) => {
      states += r(311, y - 25, 51, 51, `fill="${C.panel}" stroke="${color(2)}"`);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) states += r(315 + col * 12, y - 21 + row * 12, 8, 8, `fill="${(row + col + level) % 3 ? C.cyanSoft : C.violetSoft}" rx="1"`);
    });
    body += layer(2, [301, 50, 72, 215], states + note(337, 281, '每桶 4 × 4', 'font-size="12"') + label(337, 2));
    body += layer(3, [421, 56, 92, 207], ys.map((y, i) => block(433, y - 19, 69, 38, 3, `S${['²', '¹', '⁰'][i]}q`)).join('') + note(463, 279, 'q 读取所有桶', `font-size="12" fill="${C.violet}"`) + label(467, 3));
    body += layer(4, [568, 111, 98, 95], operator(605, 158, 'Σ', 4, 19) + note(610, 224, 'Σ λℓ rℓ', 'font-size="16"') + note(610, 248, 'λℓ 依输入变化', 'font-size="12"') + label(612, 4));
    body += note(342, 28, 'Fenwick 层级保留多个压缩状态，桶数 O(log T)', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'mamba3') {
    // SISO core only. B and C are rotated before the trapezoidal write/read;
    // the recurrence keeps a fixed-size state rather than a growing KV cache.
    body += arrow(116, 166, 159, 166, 1) + arrow(252, 166, 297, 166, 2) + arrow(426, 166, 462, 166, 3) + arrow(543, 166, 575, 166, 4);
    body += aPath('M 205 130 L 205 70 L 502 70 L 502 131', 3, `stroke="${C.violet}"`);
    body += aPath('M 116 186 L 137 186 L 137 246 L 357 246 L 357 216', 2);
    body += aPath('M 116 147 L 137 147 L 137 98 L 332 98 L 332 120', 2);
    body += aPath('M 116 198 L 125 198 L 125 280 L 620 280 L 620 209', 4, `stroke="${C.violet}"`);
    body += aPath('M 391 120 C 429 72 293 73 322 120', 2);
    body += layer(0, [15, 111, 111, 108], block(28, 126, 88, 78, 0, 'Proj(uₜ)', '16 → x,B,C,…') + label(70, 0));
    let rotate = block(161, 132, 91, 69, 1, 'Rotation', 'B̃ₜ / C̃ₜ');
    rotate += path('M 189 146 A 13 13 0 0 1 216 146', 1, 'opacity=".45"') + note(207, 236, '8 维 = 4 对实数', 'font-size="12"');
    body += layer(1, [151, 119, 111, 97], rotate + label(207, 1));
    body += layer(2, [286, 110, 151, 117], block(299, 124, 127, 91, 2, 'Hₜ ∈ ℝ⁸ˣ⁴', '指数梯形状态更新') + note(357, 58, 'Hₜ₋₁ → Hₜ', 'font-size="13"') + label(361, 2));
    body += layer(3, [451, 120, 103, 99], block(464, 133, 79, 71, 3, 'HₜᵀC̃ₜ', 'yₜ ∈ ℝ⁴') + note(460, 59, 'C̃ₜ', `font-size="13" fill="${C.violet}"`) + label(503, 3));
    body += layer(4, [565, 119, 104, 101], block(577, 133, 79, 75, 4, 'Gate · Wᴏ', '4 → 16') + label(617, 4));
    body += note(341, 264, 'Hₜ = αHₜ₋₁ + βB̃ₜ₋₁xₜ₋₁ᵀ + γB̃ₜxₜᵀ', 'font-size="13"');
    body += note(341, 28, 'SISO 核心；MIMO 为可选的多输入输出扩展', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'rae') {
    // Reconstruction uses frozen representation features and the learned decoder.
    // Sampling starts from noise; an image/encoder is NOT a sampling prerequisite.
    body += arrow(92, 102, 124, 102, 1) + arrow(215, 102, 251, 102, 2);
    body += arrow(327, 102, 477, 102, 4) + arrow(566, 102, 599, 102, 5);
    body += arrow(258, 236, 316, 236, 3);
    body += aPath('M 447 236 L 520 236 L 520 145', 4, `stroke="${C.violet}"`);
    body += aPath('M 427 266 C 427 291 337 291 337 266', 3, `stroke="${C.violet}"`);
    body += layer(0, [16, 62, 86, 86], block(29, 75, 63, 63, 0, 'Image x', '32 × 32 × 3') + label(59, 0, 174));
    body += layer(1, [113, 54, 113, 97], block(126, 67, 89, 77, 1, 'Frozen E', '表征编码器') + label(169, 1, 185));
    let latent = '';
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) latent += r(263 + col * 14, 77 + row * 14, 11, 11, `fill="${(row + col) % 3 ? C.cyanSoft : C.violetSoft}" stroke="${C.edge}" stroke-width=".6" rx="1"`);
    body += layer(2, [241, 61, 94, 88], latent + note(290, 166, 'z: 16 × 64', 'font-size="13"') + label(289, 2, 190));
    body += layer(3, [306, 191, 151, 86], block(318, 204, 128, 62, 3, 'DiT + DDT', '宽头；时间条件 t') + label(382, 3));
    body += layer(4, [466, 57, 112, 97], block(479, 71, 87, 73, 4, 'Decoder D', '训练过的解码器') + label(522, 4, 187));
    body += layer(5, [589, 61, 80, 88], block(601, 75, 56, 63, 5, 'x̂', 'RGB') + label(628, 5, 176));
    body += note(211, 221, '噪声 zₜ + t', `font-size="14" fill="${C.violet}"`) + note(211, 259, '16 × 64', 'font-size="13"');
    body += note(393, 86, '直接重建', 'font-size="13"') + note(524, 263, '生成 latent', `font-size="13" fill="${C.violet}"`);
    body += note(340, 29, '两条路径：编码重建；从噪声迭代生成', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'titans') {
    // MAG variant. Persistent prefix P and local attention do not adapt at
    // inference; the long-term MLP has its own causal fast-weight update loop.
    body += arrow(97, 166, 131, 166, 1);
    body += aPath('M 221 166 L 244 166 L 244 103 L 269 103', 2);
    body += aPath('M 244 166 L 244 235 L 269 235', 3);
    body += arrow(397, 103, 468, 153, 4) + arrow(397, 235, 468, 186, 4) + arrow(570, 168, 599, 168, 5);
    body += aPath('M 374 269 C 423 301 247 301 290 269', 3, `stroke="${C.violet}" stroke-dasharray="4 4"`);
    body += layer(0, [17, 117, 91, 100], block(30, 131, 67, 72, 0, 'x', 'T × 16') + label(63, 0));
    const prefix = r(136, 68, 32, 28, `fill="${C.violetSoft}" stroke="${color(1)}"`) + r(177, 68, 32, 28, `fill="${C.violetSoft}" stroke="${color(1)}"`) + t(152, 87, 'P₁', 'font-size="13"') + t(193, 87, 'P₂', 'font-size="13"');
    body += layer(1, [121, 55, 110, 169], prefix + arrow(173, 98, 173, 135, 1) + block(133, 137, 88, 65, 1, '[P ; x]', '(T+2) × 16') + note(177, 249, '训练后固定的 P', `font-size="12" fill="${C.violet}"`) + label(177, 1));
    body += layer(2, [258, 54, 151, 98], block(271, 69, 126, 70, 2, 'Window Attn', '带持久前缀的滑窗') + label(334, 2, 176));
    body += layer(3, [258, 185, 151, 97], block(271, 202, 126, 66, 3, 'M(ωₜ)', 'MLP: 16 → 32 → 16') + note(333, 292, '梯度 / 动量 Sₜ', `font-size="12" fill="${C.violet}"`) + label(334, 3, 323));
    body += layer(4, [456, 122, 125, 100], block(469, 137, 101, 70, 4, 'Gate', '非线性门控融合') + label(519, 4));
    body += layer(5, [589, 118, 80, 99], block(601, 132, 56, 71, 5, 'o', 'T × 16') + note(626, 248, '仅取真实 token', 'font-size="12"') + label(627, 5));
    body += note(340, 28, 'MAG：注意力与长时记忆并行；M 的快权重可因果适应', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'ahn') {
    // Only KV pairs EVICTED from the short window update long-term memory.
    // The current query independently retrieves from both branches.
    body += aPath('M 109 144 L 135 144 L 135 104 L 158 104', 1);
    body += arrow(283, 104, 394, 104, 3);
    body += aPath('M 218 150 L 218 208', 2, `stroke="${C.violet}"`);
    body += arrow(291, 242, 394, 242, 3);
    body += aPath('M 109 185 L 125 185 L 125 281 L 378 281 L 378 122 L 394 122', 3);
    body += arrow(378, 259, 394, 259, 3);
    body += arrow(522, 108, 597, 167, 4) + arrow(522, 240, 597, 190, 4);
    body += layer(0, [15, 111, 107, 104], block(28, 125, 81, 77, 0, 'Proj(x)', 'x₁₆ → q,k,v₄') + label(69, 0));
    let cache = r(159, 70, 124, 79, `fill="${C.panel}" stroke="${color(1)}" stroke-width="1.4"`);
    for (let slot = 0; slot < 4; slot++) cache += r(170 + slot * 27, 82, 20, 23, `fill="${C.cyanSoft}" stroke="${C.edge}" rx="2"`) + r(170 + slot * 27, 113, 20, 23, `fill="${C.violetSoft}" stroke="${C.edge}" rx="2"`);
    body += layer(1, [148, 56, 146, 105], cache + note(219, 52, 'K / V，W = 4', 'font-size="13"') + label(220, 1, 30));
    body += layer(2, [146, 197, 156, 90], block(160, 210, 130, 65, 2, 'AHN → H', '移出 KV 后更新 4×4') + note(240, 186, '仅被淘汰的 KV', `font-size="12" fill="${C.violet}"`) + label(223, 2));
    body += layer(3, [384, 63, 149, 216], block(397, 77, 124, 61, 3, 'Window Attn', 'q 查询短期 KV') + block(397, 211, 124, 62, 3, 'γ(x) · qHWᴏ', 'q 查询长记忆') + label(458, 3));
    body += layer(4, [574, 137, 95, 80], operator(615, 178, '+', 4, 18) + note(617, 244, '4 维输出', 'font-size="13"') + label(617, 4));
    body += note(340, 325, 'T ≤ W 时只使用滑窗分支；长记忆保存更早上下文', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'flowstate') {
    body += arrow(95, 158, 120, 158, 1) + arrow(202, 158, 232, 158, 2) + arrow(334, 158, 370, 158, 3) + arrow(422, 158, 451, 158, 4) + arrow(554, 158, 584, 158, 5);
    body += arrow(283, 79, 283, 117, 2) + arrow(622, 79, 622, 117, 5);
    body += layer(0, [15, 110, 91, 97], block(28, 124, 67, 70, 0, 'Norm', '8 × 1') + note(62, 229, '因果统计量', 'font-size="12"') + label(61, 0));
    body += layer(1, [110, 111, 103, 96], block(123, 125, 79, 68, 1, 'Embed', '8 × 4') + label(161, 1));
    body += layer(2, [222, 106, 123, 106], block(235, 120, 99, 77, 2, 'S5 + MLP', '序列编码器') + note(283, 61, '编码步长 Δᴇ', 'font-size="13"') + label(284, 2));
    body += layer(3, [359, 117, 72, 85], [128, 145, 162, 179].map((y, i) => r(374, y, 43, 11, `fill="${i % 2 ? C.violetSoft : C.cyanSoft}" stroke="${color(3)}" stroke-opacity=".6" rx="2"`)).join('') + note(397, 105, '取末时刻', 'font-size="12"') + note(396, 224, 'c ∈ ℝ⁴', 'font-size="14"') + label(396, 3));
    let functionDecoder = block(454, 121, 99, 75, 4, 'FBD', 'Σ cᵢ pᵢ(τ)');
    functionDecoder += path('M 458 245 C 471 211 483 264 496 236 S 524 213 548 241', 4, `stroke="${C.cyan}" stroke-width="2"`) + line(454, 255, 553, 255, 4);
    body += layer(4, [443, 108, 120, 155], functionDecoder + label(503, 4));
    body += layer(5, [573, 106, 96, 109], block(586, 120, 70, 78, 5, 'Sample', '6 × 1') + note(622, 61, '输出步长 Δꜰ', 'font-size="13"') + note(622, 228, '逆归一化', 'font-size="13"') + label(622, 5));
    body += note(341, 28, '先预测连续函数，再按独立的输出时间网格采样', `font-size="13" fill="${C.muted}"`);
  }

  if (id === 'repack-refine') {
    // Representation training: image -> frozen VFM -> projection -> decoder.
    // Generation: noise -> DiT -> decoder -> latent-guided U-Net -> image.
    body += arrow(122, 88, 155, 88, 1) + arrow(256, 88, 292, 88, 3);
    body += arrow(386, 88, 442, 145, 4) + arrow(565, 145, 600, 145, 5);
    body += arrow(166, 237, 207, 237, 2);
    body += aPath('M 349 237 L 339 237 L 339 130', 3, `stroke="${C.violet}"`);
    body += aPath('M 349 249 L 503 249 L 503 185', 4, `stroke="${C.violet}"`);
    body += aPath('M 317 268 C 317 294 239 294 239 268', 2, `stroke="${C.violet}"`);
    body += layer(0, [14, 41, 120, 105], block(27, 54, 95, 78, 0, 'Frozen VFM', '图像 → 16×16×768') + label(74, 0, 171));
    body += layer(1, [145, 41, 123, 104], block(158, 54, 98, 78, 1, 'RePack Proj', '16×16×32') + label(207, 1, 171));
    body += layer(2, [196, 189, 164, 90], block(209, 203, 140, 64, 2, 'DiT velocity', '噪声 → 生成 latent') + label(278, 2));
    body += layer(3, [280, 41, 118, 105], block(294, 55, 92, 75, 3, 'Decoder', '256×256×3') + label(340, 3, 171));
    body += layer(4, [431, 97, 147, 99], block(444, 111, 121, 73, 4, 'U-Net Refiner', '粗图 3 + latent 32') + note(504, 226, '双线性上采样 z', `font-size="12" fill="${C.violet}"`) + label(504, 4));
    body += layer(5, [589, 99, 80, 96], block(602, 113, 55, 70, 5, 'Image', 'RGB') + label(628, 5));
    body += note(102, 221, '噪声 zₜ + t', `font-size="13" fill="${C.violet}"`) + note(102, 259, '16 × 16 × 32', 'font-size="12"');
    body += note(207, 27, '上方：表示训练 / 重建', 'font-size="13"') + note(339, 325, '下方：从噪声生成；Refiner 是单独网络，不是额外扩散链', `font-size="13" fill="${C.muted}"`);
  }

  return `<svg class="network-svg${compact ? ' network-svg--compact' : ''}" viewBox="0 0 680 330" xmlns="http://www.w3.org/2000/svg" ${compact ? 'role="img"' : 'role="group"'} aria-label="${esc(name)}结构示意图${compact ? '' : '，点击各层查看说明'}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <marker id="${uid}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 8 5 L 0 9" fill="none" stroke="context-stroke" stroke-width="1.6" stroke-linejoin="round"/></marker>
      <filter id="${uid}-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <style>.nb-layer{outline:none}.nb-layer[role=button]{cursor:pointer}.nb-layer .nb-hit{transition:fill-opacity .15s,stroke-opacity .15s}.nb-layer[role=button]:hover .nb-hit,.nb-layer[role=button]:focus-visible .nb-hit{fill:${C.selectionFill};fill-opacity:.18;stroke:${C.cyan};stroke-opacity:.9}.network-svg text{font-family:var(--font-system,-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif);pointer-events:none}.network-svg .nb-hit{rx:8}@media(prefers-reduced-motion:reduce){.nb-layer .nb-hit{transition:none}}</style>
    ${body}
  </svg>`;
}
