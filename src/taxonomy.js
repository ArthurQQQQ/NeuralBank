// Families describe the mechanism being taught, rather than every possible task.
export const categories = [
  { id:'foundations',name:'基础前馈',description:'从一个神经元出发，理解线性分类、全连接与非线性表示。',question:'输入如何逐层变成预测？',order:['perceptron','mlp'] },
  { id:'vision',name:'卷积与视觉',description:'利用局部连接、共享权重与跳跃连接，处理图像中的空间结构。ViT 单独归入注意力架构。',question:'模型如何利用图像的空间结构？',order:['cnn','resnet','unet'] },
  { id:'sequence',name:'序列建模',description:'比较循环门控、状态空间和局部 token 混合，理解序列信息如何沿时间或位置传递。',question:'前一刻的信息如何影响现在？',order:['rnn','lstm','gru','mamba3','canon-layer','flowstate'] },
  { id:'attention',name:'注意力架构',description:'根据内容建立信息之间的联系；比较文本 token 与图像 patch 如何进入注意力模块。',question:'哪些信息应该彼此交流？',order:['transformer','vit','gated-attention','log-linear-attention'] },
  { id:'generative',name:'表征与生成',description:'比较重建、概率潜变量、对抗学习与扩散生成的表示空间。普通 Autoencoder 并不自带可采样的生成分布。',question:'如何学到表示，又如何生成样本？',order:['autoencoder','gan','vae','rae','repack-refine'] },
  { id:'memory',name:'记忆网络',description:'比较联想检索、可读写外部记忆，以及参数或循环状态中的压缩记忆。它们保存和找回信息的方式各不相同。',question:'模型如何存储、找回和使用记忆？',order:['hopfield','modern-hopfield','ntm','dnc','titans','ahn'] }
];

export const difficulties = [
  { id:'入门',description:'先懂基本前向运算：加权求和、激活、卷积与状态传递。' },
  { id:'进阶',description:'组合多个机制：门控、跳跃连接、注意力或不同训练目标。' },
  { id:'深入',description:'进一步理解概率推断、关联检索与可微外部记忆的读写。' }
];

export const studyPaths = [
  {title:'先理解一次前向计算',description:'从线性边界到隐藏表示，把每层的输入与输出连起来。',models:['perceptron','mlp','cnn','rnn']},
  {title:'比较结构带来的变化',description:'看清跳跃连接、门控、注意力、压缩与对抗学习各自解决的问题。',models:['resnet','unet','lstm','gru','transformer','autoencoder','gan','hopfield']},
  {title:'进入概率与记忆机制',description:'在前置模型的基础上，学习图像 token、潜变量和可读写记忆。',models:['vit','vae','modern-hopfield','ntm','dnc']},
  {title:'读懂三会新架构',description:'沿着问题、方法、证据和局限，比较近期架构对效率、记忆与生成的改动。',models:['gated-attention','canon-layer','mamba3','log-linear-attention','titans','ahn','flowstate','rae','repack-refine']}
];

export const memoryBranches = [
  { title:'联想记忆',description:'输入一个线索，让状态迭代或内容加权检索找回相关模式。',models:['hopfield','modern-hopfield'] },
  { title:'可读写的外部记忆',description:'控制器决定读什么、写到哪里，并把读出的向量用于下一步。',models:['ntm','dnc'] },
  { title:'参数与状态中的压缩记忆',description:'将历史信息压缩到可更新参数或循环状态；这不同于显式读写一张外部记忆矩阵。',models:['titans','ahn'] }
];
