# NeuralBank

把神经网络架构整理成可以探索的学习图谱：看结构与张量维度，理解模块作用、前置概念和局限，再用小测验复习。个人学习库记录待学习与已掌握状态；贡献入口用于提出模型编辑建议和自报 Benchmark 成绩。

公开源码仓库：[ArthurQQQQ/NeuralBank](https://github.com/ArthurQQQQ/NeuralBank)。项目提供 MIT 许可、贡献约定、严格 JSON 格式检查和 PR 工作流，源码随本次提交推送。

托管网站尚未发布本轮功能：已有 Sites 项目接口返回 `Sites project not found`，在线投稿服务尚未上线；目前可在本地预览、验证格式并通过源码仓库提交 PR。

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
```

格式检查器默认检查 `examples/submissions/` 的合法虚构样例，以及 `submissions/` 中存在的贡献 JSON。也可以指定文件或目录：

```sh
npm run check:submission -- path/to/submission.json
```

这些命令验证本地文件、测试和构建结果；不会向生产网站投稿，也不会执行 JSON 中记录的复现命令。`dist/` 是生成结果，请修改源文件。

## 架构与学习路径

| 模型家族 | 分类标识 | 基础模型 |
| --- | --- | --- |
| 基础前馈 | `foundations` | Perceptron、MLP |
| 卷积与视觉 | `vision` | CNN、ResNet、U-Net |
| 序列建模 | `sequence` | RNN、LSTM、GRU |
| 注意力架构 | `attention` | Transformer、ViT |
| 表征与生成 | `generative` | Autoencoder、VAE、GAN |
| 记忆网络 | `memory` | Hopfield、Modern Hopfield、NTM、DNC |

每个架构使用一个代表性教学配置；图示节点可能缩略，实际维度见模块说明。图谱覆盖三个学习层级「入门／进阶／深入」，按概念门槛划分，不表示性能或论文质量排名。推荐下一关时优先选择前置条件已满足的待学习项，也可自由浏览。

近期论文选读包含 ICLR 2026 的 Log-Linear Attention、Mamba-3、RAE + DiT，ICML 2026 的 AHN、FlowState、RePack then Refine，以及 NeurIPS 2025 的 Titans、Gated Attention、Canon Layer。条目分别说明问题、方法改动、论文报告的证据和具体局限。这是人工选读，不是会议完整索引，也不承诺自动追踪最新录用论文。

界面使用系统字体和语义配色，支持浅色、深色与跟随系统；支持键盘、窄屏和减少动态效果等偏好。

## 个人学习库

掌握状态由用户手动标注，不因浏览或答对一道题自动完成。访客继续使用当前浏览器的 `neuralbank-learned` 模型 ID 数组，保留原有进度。

托管环境通过 `GET /api/session` 确认平台身份；`GET/PUT /api/learning` 仅访问当前账户的记录。客户端按稳定账户 ID 隔离缓存，保存每个模型的待同步意图，并基于服务器版本合并多设备冲突。访客记录只在明确选择“合并到我的学习库”后导入账户。

界面区分本地保存、加载、同步、成功和失败；浏览器存储不可用时说明记录仅在当前会话有效。真实登录和跨设备同步须在可用的托管环境验收。

## Benchmark 与贡献

Benchmark 成绩绑定具体模型变体、指标和评估协议，保留配置、条件、来源及数值精度；同一架构的教学图不会自动继承某个训练配置的成绩。只在相同条件和协议中并列，不生成跨任务的总体排名。未收录结果不会显示为零分。

贡献入口支持两类提案：

- **模型编辑建议**：修改现有模型允许编辑的教学文字，并提供原始来源与理由。提案不直接执行代码或替换 SVG。
- **Benchmark 自报**：说明准确模型版本、数据集划分、评估协议、配置、运行环境、复现命令和日志。完整提交格式见 [Schema](schemas/submission.schema.json)。

流程是：填写或编辑 JSON，运行格式检查，提交为待审核提案，再由维护者核对并通过 PR 收录。浏览器可下载 JSON；把文件放入 `submissions/`，向 [NeuralBank 仓库](https://github.com/ArthurQQQQ/NeuralBank)提交 PR。在线提交服务发布后，网站提案也仅进入待审核队列，不直接修改正式数据。

**格式合法、审核通过、结果可复现是不同状态。** 检查器只验证结构与字段约束，不运行实验、不抓取证据链接、不证明成绩真实。自报成绩初始为「待审核／复现未验证」；提交者不能在 JSON 中自行设置审核或验证结论。缺少权重文件可仍满足格式约束，但不能据此宣称完成复现。

`examples/submissions/` 下的样例是明确标注的虚构测试数据，只用于检查格式；不会导入正式成绩。贡献细节、来源要求和审核边界见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 源文件与托管

| 位置 | 内容 |
| --- | --- |
| `src/models.js`、`src/additional-models.js`、`src/venue-models.js` | 架构内容、教学配置、前置模型与原始来源 |
| `src/diagrams.js`、`src/taxonomy.js` | 原创 SVG 图与家族、层级定义 |
| `src/benchmarks.js` | 正式收录的任务、指标与成绩 |
| `src/learning-progress.js`、`src/learning-sync.js` | 访客记录、账户缓存与同步 |
| `schemas/submission.schema.json`、`scripts/check-submission.mjs` | 贡献格式与本地检查器 |
| `server/`、`drizzle/` | API、持久化与数据库迁移 |
| `.github/workflows/ci.yml` | PR 的格式、测试与构建检查 |

构建将前端资源与 API 打包进 `dist/server/index.js`。Sites 托管配置位于 `.openai/hosting.json`，使用逻辑 D1 绑定 `DB`，不设置 `static`。已有迁移不可改写。Fork 的 CI 不部署、不调用生产投稿 API、不注入生产凭据；自行托管时由维护者配置自己的项目与数据库，不复用原站点身份。

## 许可与来源

本项目的原创代码、原创 SVG 和原创说明按 [MIT License](LICENSE) 提供。模型机制、论文书目信息和结果保留原始来源，以便核对。

第三方论文、图表、数据集、模型权重、软件及网站仍适用各自的许可和权利声明；本项目的 MIT 许可不对它们重新授权。外部链接只是引用，不表示论文 PDF、权重或数据已作为 MIT 材料分发。贡献时请保留来源，并仅提交自己有权公开的材料。
