# 为 NeuralBank 贡献

可以纠正模型教学内容，也可以提交带版本与证据的 Benchmark 自报。提案先通过格式检查，再进入人工审核；网站表单不会直接改写正式模型或成绩。

公开源码仓库是 [ArthurQQQQ/NeuralBank](https://github.com/ArthurQQQQ/NeuralBank)，可通过 PR 提交贡献。GitHub Pages 静态版提供浏览器格式检查和 JSON 下载，不提供服务端投稿或云登录；平台返回的地址是 [arthurqqqq.github.io/NeuralBank](https://arthurqqqq.github.io/NeuralBank/)，部署由 Pages 工作流执行，状态见仓库 Actions。服务端 API 版本保留在仓库中，原 Sites 项目仍不可用。

## 从网站或 JSON 开始

1. 在静态版或本地预览的模型详情提出编辑建议，或在 Benchmark 入口填写自报成绩。
2. 运行浏览器中的格式检查，按字段错误修改，再下载 JSON。
3. 也可从 `examples/submissions/model-edit.valid.json` 或 `examples/submissions/benchmark-result.valid.json` 开始填写。这两个文件是虚构测试样例；请用真实内容替换，不把样例当作成绩投稿。
4. 在本地运行同一检查器：

   ```sh
   npm run check:submission -- path/to/submission.json
   ```

5. 将 JSON 放到 `submissions/` 下，使用独立文件名，向 [NeuralBank 仓库](https://github.com/ArthurQQQQ/NeuralBank)提交 PR。静态版不会发送 HTTP 投稿；服务端 API 恢复后，在线提案也只进入待审核队列。讨论 Issue 本身不运行格式检查。
6. PR 运行下面的检查，由维护者核对来源、协议和内容后决定是否收录：

   ```sh
   npm run check:submission
   npm test
   npm run build
   npm run build:static
   ```

检查器支持多个文件或递归目录；不传参数时检查 `examples/submissions/` 与存在的 `submissions/`。任何 JSON 不合法都会使检查失败。Schema 的确切字段与枚举以 [submission.schema.json](schemas/submission.schema.json) 为准；未知字段和未知嵌套字段会被拒绝，不能靠增加一个字段绕过必填要求。

## 模型编辑建议

使用 `kind: "model-edit"`，并填写 `schemaVersion: 1`、`displayName`、现有 `modelId`、`changes`、`sources` 和 `rationale`。允许修改的教学文字字段由 Schema 明确列出；每个修改应能对照当前内容和原始来源审查。

模型编辑提案不能改变模型 ID、执行 JS、提交 SVG 或自行设置审核状态。若需要新增架构、修改图形拓扑、更新公式实现或调整数据模型，请提出源代码 PR，并按照后面的源代码维护约定验证。

来源尽量指向原论文、官方实现或官方文档。说明具体章节、图表、方程与适用变体；不要只写“网上都这么说”。教学配置与原论文实际配置需要分开，不能把一个实现说成整个架构的唯一定义。

## Benchmark 自报

使用 `kind: "benchmark-result"`。除公共字段外，填写准确的 `reportedModel`、`modelRevision`、`benchmarkId`、`score`、`dataset`、`evaluation`、`configuration`、`reproduction`、`environment` 和 `notes`。合法虚构样例展示完整结构；请按 Schema 的字段类型填写，不增加 `verified`、`approved` 或其他自授状态。

审核需要能够分清以下信息：

- **哪个模型**：仓库地址、完整提交版本，以及确切变体和配置。若提供权重 `artifactUrl`，必须同时提供 `sha256`；两者要么同时提供，要么同时省略。省略权重证据不等于已经能够复现。
- **怎样评估**：数据集名称与划分、指标定义、评估实现和协议、输入分辨率或上下文长度、样本数、推理或采样设置等适用条件。
- **怎样追溯**：配置与日志的公开证据、可检查的命令记录、运行环境，以及与正式协议存在的差异。

自报结果的初始状态是「待审核／复现未验证」。**格式检查通过只说明提交符合约定，不证明日志、权重、数值或结论真实。** checker 不执行 `command`，不打开远程证据，不运行训练或评估；CI 也不运行投稿中的命令。维护者需要先审查材料与命令，再自行决定如何验证，不能因为 CI 通过就改成“复现成功”。

报告缺项、失败和差异。没有可靠成绩时，不填写零分、估计值或从别的模型借来的成绩。只修改随机种子不构成研究改进；对比应围绕具体科学问题、真实弱点和适用协议展开。

## 审核与收录

格式检查、人工审核和独立复现是分开的步骤：

| 状态 | 含义 |
| --- | --- |
| 格式通过 | JSON 结构、字段与可检查约束符合规范 |
| 待审核 | 等待维护者核对来源、变体和评估协议 |
| 复现未验证 | 维护者尚未独立验证该结果；自报的默认状态 |
| 正式收录 | 维护者通过 PR 将经过核对的内容加入正式数据，并保留相应证据说明 |

正式收录也不能自动推导为独立复现。维护者应清楚标注结果是论文报告、自行实验还是独立验证，以及验证的实际范围。不同协议、不同分辨率、不同训练数据或推理条件的结果不能合成一个总排行榜。

JSON 是公开贡献材料，请勿放入账户 ID、浏览器学习缓存、访问令牌、密码、私人日志或不能公开的数据。贡献者名称使用愿意公开的显示名；不得上传无权再分发的论文 PDF、数据集或权重。

## 直接维护源代码

### 架构与图示

1. 在模型内容模块中使用唯一而稳定的 `id`。主要学习家族是 `foundations`、`vision`、`sequence`、`attention`、`graph`、`generative` 或 `memory`；定义见 `src/taxonomy.js`。图邻域聚合放入 `graph`，不要因为也有加权求和就归入普通 CNN。
2. 提供名称、描述、历史年份说明、层级、学习目标、前置模型、输入输出、公式说明、关键点、易错点、测验、结构模块和来源。层级只能是「入门」「进阶」「深入」，按概念门槛划分。
3. `prerequisites` 引用已有模型 ID，避免循环；`layers` 的 `id`、`label`、`detail`、`shape` 必须与 SVG 的 `data-layer` 索引对齐，维度前后一致。
4. 在 `src/diagrams.js` 或 `src/expanded-diagrams.js` 添加对应 ID 的紧凑图和可点击结构图，保留 `diagramIds`、语义配色、系统字体及键盘操作。循环、分支、训练目标与推理路径需要按模型机制区分。将新 ID 加入对应家族的 `order`；学习路径必须完整且无重复。
5. 测验提供四个选项和从零开始的正确答案索引；解释应说明原因。
6. 近期论文还需正式的 `venue`、`problemSolved`、`methodChange`、`limitations` 和 `evidence`，并说明结果适用的模型、数据和实验范围。
7. 新增模型 ID 后，用 `node scripts/check-submission.mjs --schema > schemas/submission.schema.json` 更新下载规范，确保运行时与 CI 接受同样的模型。运行检查与构建；界面变更要在桌面和窄屏查看图示、焦点和键盘操作。

### 多轴分类与 Agent 接入

在 `src/architecture-metadata.js` 为每个模型提供受控的任务、机制、输入/输出、特性、条目类型、教学范围、用途、取舍和关联条目。将完整模型、构建模块、架构家族与训练框架分清；给定教学配置的因果性不能直接推广到整个家族，未标注某特性也不是该特性不存在的证明。任务标签表示选型线索，不能当作测得的成绩或硬件保证。

`src/architecture-catalog.js` 是 MCP 与公开 JSON 的共享查询层。来源和局限必须随结果保留，硬约束不可静默放宽。新增 ID 后补齐元数据与测试；如已启用云端学习，还须以新的数据库迁移扩充允许的模型 ID，保留既有迁移。公开数据由构建生成，不能加入个人进度、登录 token 或用户投稿中的执行命令。

```sh
node --test server/catalog.test.mjs server/public-catalog.test.mjs
npm --prefix mcp ci --ignore-scripts
npm --prefix mcp test
```

### 正式 Benchmark 数据

在 `src/benchmarks.js` 维护任务、指标定义与具体模型成绩，保留 `reportedModel`、`configuration`、`protocol`、`conditions`、`comparisonKey`、`source` 和 `notes`。原论文表格需能定位；指标明确单位和高低方向。模型家族不能自动继承某个配置的成绩；外部对照模型可使用 `modelId: null`。

每条成绩的 `source` 独立指向实际报告该数值的论文与表格，不自动套用架构的代表主论文。主论文的出版信息、代码仓库或被引次数都不能替代具体评估协议；不同变体和条件不得仅凭模型 ID 合并比较。

```sh
node scripts/validate-benchmarks.mjs
```

不要把 `examples/submissions/` 的虚构 fixture 或待审核自报直接导入 `benchmarkResults`。正式成绩的数据结构与投稿 JSON 是两种用途不同的记录，维护者应在审查后明确转换。

### 论文书目、仓库与被引次数

每个模型 ID 都须在 `src/bibliography-foundation.js` 或 `src/bibliography-expanded.js` 中提供代表主论文。核对全部作者、标题、所选版本的出版年份、DOI / arXiv 标识及正式 venue；模型的历史年份与预印本年份另行保留。arXiv、投稿页面或作者单位不自动证明会议接收。文献格式由 `src/bibliography.js` 统一导出，不在界面或 MCP 中维护另一份作者与年份。

GitHub 链接填写 `relationship` 与 `scope`：`author-official` 需要论文或作者发布的归属证据，`reference-implementation` 和 `third-party` 不得冒称原论文代码。注明后续版本、归档和示例范围；未核验时可留空数组。

被引次数只接收有准确 work、来源 URL 和 `retrievedAt` 的快照。没有可靠匹配时保持 `null`，不补零、不取搜索结果中最高次数；即使 DOI / arXiv 标识匹配，标题污染或版本不明也须拒绝。当前 61 条 OpenAlex 快照与 3 条未知的具体范围、人工补充及更新方式见 [书目维护文档](docs/bibliography.md)。

```sh
node scripts/update-citations.mjs --help
node scripts/update-citations.mjs --output /tmp/neuralbank-citation-snapshots.review.js
node --test server/bibliography.test.mjs
```

刷新会访问公开 OpenAlex API；先审查生成差异再更新正式快照，并运行测试与构建。不要改写获取日期来伪装刷新成功，也不要把引用次数转成架构推荐的总排名。

### 学习进度与持久化

保留已有模型 ID 和访客存储键 `neuralbank-learned`，新增架构不能清空旧进度。家族调整只改变归类，不改变掌握状态。未配置 Supabase 的静态版使用访客本地进度；已配置的账户通过可信身份、资格检查与 RLS 同步。访客本地保存不能描述为账户同步。静态投稿继续使用 PR，不因增加个人登录而自动获得生产投稿 API。

账户同步由 `src/learning-sync.js` 与 `/api/learning` 负责：身份来自受信平台；浏览器缓存按稳定用户 ID 隔离；待同步操作、版本冲突和账户切换都需要保留保护。请求中的账户头只作为一致性前提，不能用来授予身份。访客数据只在明确操作后导入账户。

已应用的 `drizzle/` 迁移不可改写，结构变化请追加迁移。不要提交 `.local/`、`dist/`、访问凭据或个人进度记录。

## CI 与许可

PR CI 使用普通 `pull_request` 事件和只读 `contents` 权限。它只运行本地格式检查、测试和构建，不部署、不访问生产投稿 API、不注入生产凭据，也不执行 JSON 内的命令。不要改为使用 `pull_request_target` 运行外部贡献代码。

静态发布由独立的 `.github/workflows/pages.yml` 负责，仅允许本仓库默认分支部署。构建任务保留只读权限；`pages: write` 与 `id-token: write` 只授予部署任务。`npm run build:static` 的产物是 `dist-static/`，不能混入服务端 API、个人记录或数据库文件。维护界面时同时检查项目路径下的相对资源链接。

本项目原创代码、图示和说明使用 [MIT License](LICENSE)。新增第三方材料必须保留其来源和相应许可；论文、数据集、模型权重及链接内容不会因出现在本项目中而改成 MIT。
