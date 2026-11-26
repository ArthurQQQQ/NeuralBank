# NeuralBank MCP

NeuralBank 提供本地 **stdio MCP server**，让支持 MCP 的 agent 读取公开架构目录、按机制检索、比较结构，并根据任务与约束寻找候选方案。无需 NeuralBank 账户、数据库或网站后端。数据直接来自同一份版本控制中的架构内容与查询模块；更新代码后重启 server 即可使用新内容。

这是本地进程接入方式。GitHub Pages 网站地址不是远程 MCP endpoint；本次也不会替你修改任何 agent 的全局配置。

## 安装与启动

需要 Node.js **22 或更新版本**，以及完整仓库。不要单独复制 `mcp/`：server 会读取相邻 `src/` 中的公开目录。

```sh
git clone https://github.com/ArthurQQQQ/NeuralBank.git
cd NeuralBank
npm --prefix mcp ci --ignore-scripts
npm --prefix mcp test
node mcp/server.mjs
```

最后一条命令由 MCP 客户端启动即可。直接在终端运行时，它会等待 stdin 中的协议消息，正常启动不会打印欢迎文字；stdout 仅承载 MCP，诊断信息写 stderr。无需先运行前端、登录或提供环境变量。

依赖完全隔离在 `mcp/`，根前端没有新增运行时依赖。`package-lock.json` 锁定官方 TypeScript SDK 的 ESM 包 `@modelcontextprotocol/server@2.4.0`、测试客户端 `@modelcontextprotocol/client@2.4.0` 与 `zod@4.6.7`。请使用 `npm ci` 保持锁定版本。

## 连接客户端

将下面两个绝对路径替换为本机真实路径。Node 路径可用 `command -v node` 查看；使用 nvm 等版本管理器时尤其建议填写绝对路径。服务端不依赖客户端的工作目录。

Claude Desktop 或采用 `mcpServers` 格式的客户端，可在客户端配置中加入：

```json
{
  "mcpServers": {
    "neuralbank": {
      "command": "/ABSOLUTE/PATH/TO/node",
      "args": ["/ABSOLUTE/PATH/TO/NeuralBank/mcp/server.mjs"]
    }
  }
}
```

Codex 可通过 CLI 添加：

```sh
codex mcp add neuralbank -- /ABSOLUTE/PATH/TO/node /ABSOLUTE/PATH/TO/NeuralBank/mcp/server.mjs
codex mcp list
```

也可在 Codex 的 `config.toml` 中配置同一 stdio 进程：

```toml
[mcp_servers.neuralbank]
command = "/ABSOLUTE/PATH/TO/node"
args = ["/ABSOLUTE/PATH/TO/NeuralBank/mcp/server.mjs"]
```

按客户端要求重载配置或重启，然后确认出现下表五个工具。NeuralBank 不需要 MCP OAuth 登录。客户端配置语法依据 [MCP 本地服务连接文档](https://modelcontextprotocol.io/docs/2026-07-28/develop/connect-local-servers) 与 [OpenAI Codex MCP 文档](https://learn.chatgpt.com/docs/extend/mcp)。

## 工具

| 工具 | 输入 | 输出与边界 |
| --- | --- | --- |
| `list_categories` | `{}` | 分类、分类内架构 ID、全部合法筛选轴 ID 与标签、目录说明。先调用它发现词表。 |
| `search_architectures` | 可选 `query`、`category`、`task`、`level`、`entityType`、`venue`、`venueYear`、`publicationType`、`hasRepository`、`mechanisms`、`inputModalities`、`outputTypes`、`traits`、`limit`、`offset` | 检索架构/机制/教学文本、论文标题/作者和仓库 URL，并按精确标签筛选；每条保留完整文献、benchmark 与局限。默认 12 条，最多 30 条。 |
| `get_architecture` | `{ "id": "cnn" }` | 完整教学实例、模块/尺寸/公式、机制元数据、局限、先修/相关架构，以及下述完整文献与 benchmark 字段。 |
| `compare_architectures` | `{ "ids": ["mamba", "transformer-xl"] }` | 2–6 个不同架构的共同机制、不同机制和取舍，每条保留完整文献与 benchmark 字段；不生成引用数或性能排名。 |
| `suggest_architectures` | 必填 `task`；可选 `constraints`、`limit`、`offset` | 返回约束匹配理由、局限、完整文献与 benchmark 字段。默认 6 条，最多 12 条。 |

`search_architectures` 的数组筛选项为 AND，不同轴之间也是 AND。结果按 canonical ID 稳定排序。所有合法轴值都来自 `list_categories`，未知 ID、未知字段、错误类型、越界页大小和重复比较 ID 会返回可读错误；不会忽略拼错的筛选项。

发表筛选使用 `venue` 的精确名称、1800–2100 范围内的整数 `venueYear` 和 `publicationType`；已收录的名称/年份/类型可从 `axes.venues`、`axes.venueYears`、`axes.publicationTypes` 查看。它们针对 `primaryPaper.venue` 的所选发表版本，不以架构的早期预印本年份替代。`hasRepository: true` 表示收录了任意带关系标签的仓库，包含参考实现和第三方实现；它不等于“有原作者代码”。`false` 对应 `repositories: []`。

`suggest_architectures.constraints` 支持：

```json
{
  "requireTraits": ["causal"],
  "excludeTraits": ["iterative-sampling"],
  "requireMechanisms": [],
  "excludeMechanisms": [],
  "inputModalities": ["numeric-sequence"],
  "outputTypes": [],
  "entityTypes": []
}
```

要求标签/机制、输入和输出类型必须全部满足（AND）；排除项中显式命中任一项即排除；`entityTypes` 表示允许的实体类型（OR）。空数组不增加筛选条件。未标注某属性不是该属性不存在的证据，因此排除筛选不保证候选完全没有该机制或成本。模型家族、具体模型、可插入模块、训练框架分别用 `family`、`model`、`block`、`framework` 表示，比较时应保留这一差别。

例如寻找有因果约束的时间序列候选：

```json
{
  "task": "time-series",
  "constraints": {
    "requireTraits": ["causal"],
    "inputModalities": ["numeric-sequence"]
  },
  "limit": 6
}
```

没有结果表示本目录的标签组合没有匹配项。它不证明相关方法不存在，也不应被放宽为未经说明的“近似匹配”。

分页响应包含 `total`、`offset`、`limit`、`nextOffset`。继续读取时保持原筛选条件，并将 `offset` 设为 `nextOffset`；`nextOffset: null` 表示结束。`offset` 上限 1,000,000，查询文本最多 300 字符，各数组最多 20 项（或该轴词表长度，取较小值）。单次序列化 JSON 结果上限 **256 KiB**；超限会明确报错并建议缩小查询，来源和局限不会被静默删去。

成功工具结果同时提供 `structuredContent` 和内容相同的 JSON 文本，方便不同客户端读取。schema/参数错误通过 SDK 的工具错误返回，目录查询错误带 `error.code`、`message` 和适用时的 `path`。

## 每条架构的文献与成绩

`get_architecture.item`、`search_architectures.items[]`、`compare_architectures.items[]`、`suggest_architectures.items[].architecture` 和模型资源都保留以下对象；摘要不会只给一个不可解释的 benchmark ID。

| 字段 | 含义与未知值 |
| --- | --- |
| `primaryPaper` | 选定主论文的 `title`、`authors`、`year`、`url`、可选 DOI/arXiv ID，以及 `venue`。标识缺失时为 `null`。 |
| `primaryPaper.venue` | 统一系列名称 `name`、所选版本的 `year`、`type`、`url`，以及保留原始卷/届名称的 `publicationTitle`。`type` 区分会议、期刊、预印本、技术报告和书籍；预印本不表示会议接收。 |
| `repositories` | 仓库的 `url`、`label`、`relationship`、`scope` 和适用时的 `note`。`author-official` 是已核实的作者发布；`reference-implementation` 是框架/机制参考实现；`third-party` 是第三方实现。空数组表示未收录可确认的仓库，不证明作者没有发布代码。 |
| `citation` | `count`、`source`、`url`、`retrievedAt`、`scope: "primary-paper"`、`note`。若未取得可靠快照，前四项均为 `null`；未知不是 0。若有计数，来源与检索日期必须一起保留。 |
| `benchmarkResults` | 精确关联到该架构 ID 的已收录论文记录；无记录为 `[]`，不代表成绩为 0。保留实际 `reportedModel`、原始 `value`、`configuration`、`conditions`、`protocol`、`comparisonKey`、`source`、`notes` 等；另补可读 `benchmarkName`、`metric: {name, unit, direction}` 和 `benchmarkProtocolNote`。 |

`primaryPaper.year` 与 `primaryPaper.venue.year` 一致，描述所选发表版本；如记录早期预印本年份，可另见 `preprintYear`。同一会议系列的不同写法统一到 `venue.name`，避免精确筛选遗漏；完整引用与 BibTeX 保留 `publicationTitle` 中的原始正式名称、历史名称和卷号。架构原有的 `year` 与 `yearNote` 仍保留，可能描述更早节点或其他历史范围，两种年份不能互换。代码仓库的 `scope` 也需要保留：论文整套代码、机制参考实现和本页缩略教学实例可能不同，仓库链接不自动保证相同权重、许可或复现条件。

引用快照只对应选定的单篇论文，不汇总整个架构家族，server 启动时也不会在线刷新。提供者的覆盖与匹配会影响计数，例如 [OpenAlex 的引用说明](https://help.openalex.org/data/works/citations/) 描述了按已匹配文献构建的计数。不要把不同来源/日期的快照当成统一质量量表；此接口不提供全局引用数排序。

Benchmark 的指标名称、单位和方向必须一起解释，`lower` 与 `higher` 不可互换。成绩属于记录中的训练模型与评估协议，例如完整 ResNet-50 的 ImageNet 错误率不能归给网站画出的单个残差块。`source` 保留论文 URL 与表格/章节定位；只在相同 `benchmarkId` 与 `comparisonKey` 下进行协议内数值对照，仍需检查训练预算和配置差异。`benchmarkIds` 保留为导航字段，完整证据以 `benchmarkResults` 为准。

## 资源

| URI | 内容 |
| --- | --- |
| `neuralbank://catalog` | 全部公开架构的索引、每条完整文献/仓库/引用快照/benchmark 记录、原始来源/局限及模型资源 URI。教学模块内容按模型读取。 |
| `neuralbank://taxonomy` | 分类、成员 ID、多轴词表、标签及目录说明。 |
| `neuralbank://model/{id}` | 与 `get_architecture` 相同的单个架构完整公开内容，例如 `neuralbank://model/transformer`。 |

资源使用 `application/json`。server 通过标准 `resources/list`、`resources/templates/list` 暴露目录和模型模板，并支持架构 ID 补全。未知或非规范模型 URI 返回资源错误。

## 适合怎样使用

可向 agent 提出：“先列出分类；找出有固定状态的因果序列架构；比较 Mamba、RetNet 与 Transformer-XL 的记忆机制和局限；基于我的数据形态给出需要进一步验证的候选。”建议先说明任务、输入、需要的输出与约束，再读取候选的完整条目及论文。

目录中的 `references`、`limitations`、`primaryPaper`、`repositories`、`citation`、`benchmarkResults` 与顶层 `caveats` 是结果的一部分。转述时应保留它们；结构标签与教学尺寸不等于同条件实验，推荐顺序不等于质量顺序。Benchmark 关联只连接已收录的真实记录，不会替同任务架构生成成绩；没有成绩不表示性能较差。架构类比可帮助提出可检验的问题，但不构成新颖性、可行性或性能证明。

服务端只读取固定的公开目录模块，不接触个人学习进度、登录身份、数据库或凭据，不抓取来源 URL，不接收投稿，不执行投稿中的命令，也不启动训练。论文链接是供客户端核实的引用；本地 server 不代表已阅读全文或复现实验。

## 验证与协议

```sh
npm --prefix mcp ci --ignore-scripts
npm --prefix mcp test
```

测试用官方 MCP Client 启动真实子进程，覆盖 legacy `initialize`、工具发现、搜索分页、完整条目、比较、候选建议、全部模型资源读取、非法输入，以及当前 `2026-07-28` discovery 协议；核对每条的文献、未知引用数语义、仓库关系、实际 benchmark 模型/指标/协议/来源及结果大小。子进程在其他工作目录运行，验证绝对路径接入。

实现使用官方 SDK `McpServer`、`ResourceTemplate` 与 `serveStdio`，由 SDK 处理协议与 legacy 兼容，没有自写 JSON-RPC 握手。参考 [官方 TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)、[SDK stdio 指南](https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio.html)、[stdio 规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio) 与 [资源规范](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)。依赖版本可通过 [server registry](https://registry.npmjs.org/@modelcontextprotocol/server/latest)、[client registry](https://registry.npmjs.org/@modelcontextprotocol/client/latest)、[Zod registry](https://registry.npmjs.org/zod/latest) 核对；本项目实际使用锁文件中的精确版本，不在运行时追踪 latest。
