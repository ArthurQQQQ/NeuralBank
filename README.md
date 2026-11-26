# NeuralBank

把神经网络架构整理成可以探索的学习图谱：看结构与张量维度，理解模块作用、前置概念和局限，再用小测验复习。个人学习库记录待学习与已掌握状态；贡献入口用于提出模型编辑建议和自报 Benchmark 成绩。

公开源码仓库：[ArthurQQQQ/NeuralBank](https://github.com/ArthurQQQQ/NeuralBank)。项目提供 MIT 许可、贡献约定、严格 JSON 格式检查和 PR 工作流。

GitHub Pages 已配置，平台返回的静态版地址是 [arthurqqqq.github.io/NeuralBank](https://arthurqqqq.github.io/NeuralBank/)，部署由 Pages 工作流执行，状态见仓库 Actions。原 Sites 项目仍返回 `Sites project not found`，服务端登录与在线投稿 API 尚未恢复。静态版提供浏览器学习记录、格式检查、JSON 下载及 PR 贡献路径。

## 本地运行与验证

需要 Node.js 22 或以上，无第三方运行依赖。

```sh
npm run dev
```

打开终端显示的本地地址，默认是 `http://127.0.0.1:4173`。本地登录 API 始终返回访客状态；不会模拟托管账户，也不把请求头自报的身份当作用户。

```sh
npm run check:submission
npm test
npm run build
npm run build:static
```

格式检查器默认检查 `examples/submissions/` 的合法虚构样例，以及 `submissions/` 中存在的贡献 JSON。也可以指定文件或目录：

```sh
npm run check:submission -- path/to/submission.json
```

这些命令验证本地文件、测试和构建结果；不会向生产网站投稿，也不会执行 JSON 中记录的复现命令。`npm run build` 生成服务端版本 `dist/server/index.js`；`npm run build:static` 生成静态版本 `dist-static/`。两个目录都是生成结果，请修改源文件。

## 静态公开版与服务端版本

| 能力 | GitHub Pages 静态版 | 服务端版本 |
| --- | --- | --- |
| 架构图、学习路径、Benchmark 浏览 | 支持 | 支持 |
| 当前浏览器的学习进度 | 支持 | 支持 |
| 账户登录与跨设备同步 | 配置 Supabase 后支持 GitHub／高校邮箱 | 受信平台身份或独立配置的 Supabase |
| 浏览器内严格 JSON 格式检查 | 支持 | 支持 |
| 下载 JSON，向源码仓库提交 PR | 支持 | 支持 |
| HTTP 投稿与待审核队列 | 不提供 | 需要可用的投稿 API 与存储 |

静态版通过 PR 接收贡献。未配置身份服务时，学习进度保存在浏览器；配置 Supabase 后，账户进度由独立后端保存。服务端版本继续保留原平台账户与数据库 API。

## 架构与学习路径

图谱目前包含 **64 个架构与机制条目、7 个学习板块**。同一系列的尺寸变体不重复计数；DDPM 等训练框架会注明所用的示例网络，避免把训练目标误画成网络层。

| 模型家族 | 分类标识 | 收录范围 |
| --- | --- | --- |
| 基础与能量模型 | `foundations` | Perceptron、MLP、RBF、RBM、DBN、KAN |
| 卷积与视觉 | `vision` | CNN、LeNet、AlexNet、VGG、Inception、ResNet、DenseNet、MobileNetV2、EfficientNet、ConvNeXt、U-Net |
| 序列与时序 | `sequence` | RNN、LSTM、GRU、TCN、WaveNet、S4、Mamba、RWKV、N-BEATS、TFT、PatchTST、iTransformer，以及近期论文选读 |
| 注意力与保留机制 | `attention` | Transformer、BERT、GPT、T5、ViT、Swin、Performer、RetNet，以及近期论文选读 |
| 图神经网络 | `graph` | GCN、GraphSAGE、GAT、GIN |
| 表征与生成 | `generative` | Autoencoder、GAN、VAE、VQ-VAE、RealNVP、DDPM、Latent Diffusion、DiT，以及近期论文选读 |
| 记忆网络 | `memory` | Hopfield、Modern Hopfield、MemN2N、NTM、DNC、Transformer-XL、Titans、AHN |

每个架构使用一个代表性教学配置；图示节点可能缩略，实际维度见模块说明。图谱覆盖三个学习层级「入门／进阶／深入」，按概念门槛划分，不表示性能或论文质量排名。推荐下一关时优先选择前置条件已满足的待学习项，也可自由浏览。

新增条目均保留原始论文或作者资料链接，说明单个核心模块与完整模型的区别。架构库是人工整理的学习选集，并非全部神经网络的穷举；新增架构也不会自动产生 Benchmark 成绩，未收录的成绩仍明确显示为空缺。

近期论文选读包含 ICLR 2026 的 Log-Linear Attention、Mamba-3、RAE + DiT，ICML 2026 的 AHN、FlowState、RePack then Refine，以及 NeurIPS 2025 的 Titans、Gated Attention、Canon Layer。条目分别说明问题、方法改动、论文报告的证据和具体局限。这是人工选读，不是会议完整索引，也不承诺自动追踪最新录用论文。

界面使用系统字体和语义配色，支持浅色、深色与跟随系统；支持键盘、窄屏和减少动态效果等偏好。

## 论文、代码与引用

64 个条目均有代表主论文的完整作者、标题、出版年份、出版类型和来源；DOI、arXiv 标识按已核实情况提供，支持文本引用与 BibTeX。所选论文的发表年份与模型历史节点分开：例如 ViT 的预印本是 2020 年，正式会议是 ICLR 2021；自编码器选用的 2006 年代表论文也不表示它始于 2006 年。

代码仓库明确区分作者官方发布、参考实现与第三方实现，并说明覆盖的版本和用途；空列表表示尚未核验相关 GitHub 发布。链接不构成复现证明。

截至 **2026-11-26**，61 个条目有带来源与获取日期的 OpenAlex 被引次数快照；RBF、GPT、GIN 的次数仍未知，**未知不是零**。次数可能聚合预印本与正式版本，反映数据源覆盖和论文传播，不构成模型性能、论文质量或跨领域的统一排名。维护规则和刷新命令见 [书目与引用维护](docs/bibliography.md)。

## 个人学习库

掌握状态由用户手动标注，不因浏览或答对一道题自动完成。访客继续使用当前浏览器的 `neuralbank-learned` 模型 ID 数组，保留原有进度。

GitHub Pages 默认保留访客学习库。配置 Supabase Auth、数据库迁移、GitHub OAuth App 和邮件服务后，可以启用 GitHub 登录与高校邮箱验证码登录。学校邮箱资格由可信后端检查，域名库须带出处与审核记录；不以一个 `edu` 后缀作为全球高校认证。配置与验收见 [登录部署文档](docs/auth.md)。未配置的登录入口保持禁用状态。

服务端托管环境通过 `GET /api/session` 确认平台身份；`GET/PUT /api/learning` 仅访问当前账户的记录。客户端按稳定账户 ID 隔离缓存，保存每个模型的待同步意图，并基于服务器版本合并多设备冲突。访客记录只在明确选择“合并到我的学习库”后导入账户。

界面区分本地保存、加载、同步、成功和失败；浏览器存储不可用时说明记录仅在当前会话有效。真实登录和跨设备同步须在可用的托管环境验收。

## Agent 检索与 MCP

64 个条目另有适用任务、输入/输出类型、机制、因果/双向特性、条目类型、选型取舍与关联架构。属性描述当前教学配置；候选匹配不能替代真实实验，也不形成跨任务性能总排名。

[MCP 接入文档](docs/mcp.md) 包含 Claude、Codex 等客户端配置。使用官方 SDK 的独立 stdio 服务提供五个只读工具：列分类、搜索、看详情、比较和带硬约束的候选建议。原始来源、局限和分页会随结果返回。

静态站也提供 [catalog.json](https://arthurqqqq.github.io/NeuralBank/catalog.json)、[taxonomy.json](https://arthurqqqq.github.io/NeuralBank/taxonomy.json)、[agent-manifest.json](https://arthurqqqq.github.io/NeuralBank/agent-manifest.json) 与 [llms.txt](https://arthurqqqq.github.io/NeuralBank/llms.txt)。这些是公开数据资源；本地 MCP 通过 stdio 连接。个人进度、账号身份与投稿命令不进入这套工具。

```sh
npm --prefix mcp ci --ignore-scripts
npm --prefix mcp test
node mcp/server.mjs
```

## Benchmark 与贡献

Benchmark 成绩绑定具体模型变体、指标和评估协议，保留配置、条件、来源及数值精度；同一架构的教学图不会自动继承某个训练配置的成绩。只在相同条件和协议中并列，不生成跨任务的总体排名。未收录结果不会显示为零分。

贡献入口支持两类提案：

- **模型编辑建议**：修改现有模型允许编辑的教学文字，并提供原始来源与理由。提案不直接执行代码或替换 SVG。
- **Benchmark 自报**：说明准确模型版本、数据集划分、评估协议、配置、运行环境、复现命令和日志。完整提交格式见 [Schema](schemas/submission.schema.json)。

流程是：填写或编辑 JSON，运行格式检查，下载为文件，再由维护者核对并通过 PR 收录。把文件放入 `submissions/`，向 [NeuralBank 仓库](https://github.com/ArthurQQQQ/NeuralBank)提交 PR。GitHub Pages 版不会向服务器发送提案；服务端投稿服务恢复后，网站提案也仅进入待审核队列，不直接修改正式数据。

**格式合法、审核通过、结果可复现是不同状态。** 检查器只验证结构与字段约束，不运行实验、不抓取证据链接、不证明成绩真实。自报成绩初始为「待审核／复现未验证」；提交者不能在 JSON 中自行设置审核或验证结论。缺少权重文件可仍满足格式约束，但不能据此宣称完成复现。

`examples/submissions/` 下的样例是明确标注的虚构测试数据，只用于检查格式；不会导入正式成绩。贡献细节、来源要求和审核边界见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 源文件与托管

| 位置 | 内容 |
| --- | --- |
| `src/models.js`、`src/additional-models.js`、`src/venue-models.js`、`src/expanded-*-models.js` | 架构内容、教学配置、前置模型与原始来源 |
| `src/diagrams.js`、`src/expanded-diagrams.js`、`src/taxonomy.js` | 原创 SVG 图与家族、层级定义 |
| `src/benchmarks.js` | 正式收录的任务、指标与成绩 |
| `src/bibliography.js`、`src/bibliography-foundation.js`、`src/bibliography-expanded.js` | 64 条代表论文、作者、正式出版信息、仓库关系与引用导出 |
| `src/citation-snapshots.js`、`src/citation-supplements.js`、`scripts/update-citations.mjs` | 带来源和日期的引用快照、人工核对补充与显式刷新工具 |
| `src/learning-progress.js`、`src/learning-sync.js` | 访客记录、账户缓存与同步 |
| `src/architecture-metadata.js`、`src/architecture-catalog.js` | 多轴分类与共享只读查询 |
| `mcp/`、`docs/mcp.md` | 官方 SDK MCP 服务、协议测试与接入说明 |
| `src/cloud-auth.js`、`auth/`、`supabase/` | 身份适配、官方 SDK 生成工具、RLS／资格检查与迁移 |
| `schemas/submission.schema.json`、`scripts/check-submission.mjs` | 贡献格式与本地检查器 |
| `server/`、`drizzle/` | API、持久化与数据库迁移 |
| `.github/workflows/ci.yml` | PR 的格式、测试与构建检查 |
| `.github/workflows/pages.yml` | 默认分支的静态公开版构建与 Pages 部署 |

Pages 工作流只在本仓库默认分支的推送或手动触发时运行，先完成测试、投稿检查、真实 MCP 协议测试与静态构建，再上传 `dist-static/` 并部署；不在 PR 中部署。PR CI 继续使用只读权限，不调用生产投稿 API，也不注入生产凭据。身份服务的公开地址与 publishable key 通过明确的仓库变量注入，构建拒绝 service-role 或 secret key。

服务端构建将前端资源与 API 打包进 `dist/server/index.js`。Sites 配置位于 `.openai/hosting.json`，使用逻辑 D1 绑定 `DB`，不设置 `static`。已有迁移不可改写；自行托管服务端版本时配置自己的项目与数据库，不复用原站点身份。

## 许可与来源

本项目的原创代码、原创 SVG 和原创说明按 [MIT License](LICENSE) 提供。模型机制、论文书目信息和结果保留原始来源，以便核对。

第三方论文、图表、数据集、模型权重、软件及网站仍适用各自的许可和权利声明；本项目的 MIT 许可不对它们重新授权。外部链接只是引用，不表示论文 PDF、权重或数据已作为 MIT 材料分发。贡献时请保留来源，并仅提交自己有权公开的材料。
