// Families describe the mechanism being taught, rather than every possible task.
export const categories = [
  { id:'foundations',name:'基础与能量模型',description:'从线性神经元出发，比较全连接、径向基、能量建模与可学习的边函数。',question:'哪些计算单元能组成一个网络？',order:['perceptron','mlp','rbf','rbm','dbn','kan'] },
  { id:'vision',name:'卷积与视觉',description:'从 LeNet 到现代卷积网络，比较局部连接、多分支、残差、密集连接与高效卷积。视觉 Transformer 按注意力机制归类。',question:'模型如何利用图像的空间结构？',order:['cnn','lenet','alexnet','vgg','inception','resnet','densenet','mobilenet-v2','efficientnet','convnext','unet'] },
  { id:'sequence',name:'序列与时序',description:'比较循环门控、因果卷积、状态空间和预测网络，理解历史信息如何影响下一位置或未来数值。',question:'模型如何传递历史信息并预测未来？',order:['rnn','lstm','gru','tcn','wavenet','s4','mamba','rwkv','nbeats','tft','patchtst','itransformer','mamba3','canon-layer','flowstate'] },
  { id:'attention',name:'注意力与保留机制',description:'比较编码器、因果解码器、跨注意力、窗口注意力、随机特征近似和 retention；各机制的可见范围与计算方式不同。',question:'哪些信息应该彼此交流？',order:['transformer','bert','gpt','t5','vit','swin','performer','retnet','gated-attention','log-linear-attention'] },
  { id:'graph',name:'图神经网络',description:'沿边聚合邻居信息，比较归一化卷积、注意力、邻居采样与可区分的多重集聚合。',question:'模型如何利用节点之间的关系？',order:['gcn','graphsage','gat','gin'] },
  { id:'generative',name:'表征与生成',description:'比较重建、连续与离散潜变量、对抗学习、可逆变换和扩散生成。训练目标与图示网络拓扑分别说明。',question:'如何学到表示，又如何生成样本？',order:['autoencoder','gan','vae','vqvae','realnvp','ddpm','latent-diffusion','dit','rae','repack-refine'] },
  { id:'memory',name:'记忆网络',description:'比较联想检索、可读写外部记忆、多跳读取、片段缓存，以及参数或循环状态中的压缩记忆。',question:'模型如何存储、找回和使用记忆？',order:['hopfield','modern-hopfield','memn2n','ntm','dnc','transformer-xl','titans','ahn'] }
];

export const difficulties = [
  { id:'入门',description:'先懂基本前向运算：加权求和、激活、卷积与状态传递。' },
  { id:'进阶',description:'组合多个机制：门控、跳跃连接、注意力或不同训练目标。' },
  { id:'深入',description:'进一步理解概率推断、关联检索与可微外部记忆的读写。' }
];

const starterModels = ['perceptron','mlp','cnn','rnn'];
const recentModels = ['gated-attention','canon-layer','mamba3','log-linear-attention','titans','ahn','flowstate','rae','repack-refine'];
export const studyPaths = [
  {title:'先理解一次前向计算',description:'从线性边界到隐藏表示，把每层的输入与输出连起来。',models:starterModels},
  ...categories.map(category => ({title:`深入${category.name}`,description:category.description,models:category.order.filter(id => !starterModels.includes(id) && !recentModels.includes(id))})),
  {title:'读懂三会新架构',description:'沿着问题、方法、证据和局限，比较近期架构对效率、记忆与生成的改动。',models:recentModels}
];

export const memoryBranches = [
  { title:'联想记忆',description:'输入一个线索，让状态迭代或内容加权检索找回相关模式。',models:['hopfield','modern-hopfield'] },
  { title:'可读写的外部记忆',description:'控制器决定读什么、写到哪里，并把读出的向量用于下一步。',models:['ntm','dnc'] },
  { title:'多跳读取与片段缓存',description:'比较从外部事实反复读取，与缓存前一片段表示来扩展上下文；缓存不等于可训练的永久记忆。',models:['memn2n','transformer-xl'] },
  { title:'参数与状态中的压缩记忆',description:'将历史信息压缩到可更新参数或循环状态；这不同于显式读写一张外部记忆矩阵。',models:['titans','ahn'] }
];
