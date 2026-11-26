# 书目与引用维护

NeuralBank 的 64 个条目各选择一篇代表主论文，保留模型原有的其他 `references`。代表论文用于说明本页机制与文献节点，不是整个架构家族的唯一来源，也不必是其最早文献。文本引用、BibTeX、模型页与 Agent 查询共用同一套数据。

## 数据位置

| 文件 | 维护内容 |
| --- | --- |
| `src/bibliography-foundation.js` | 最初 26 个条目的主论文与代码来源 |
| `src/bibliography-expanded.js` | 后增 38 个条目的主论文与代码来源 |
| `src/bibliography.js` | 合并、校验、`paperKey()`、`getBibliography()`、文本引用与 BibTeX |
| `src/citation-snapshots.js` | 自动刷新并经审查的 57 条 OpenAlex 快照 |
| `src/citation-supplements.js` | 4 条独立人工核对的 OpenAlex 补充快照 |
| `scripts/update-citations.mjs` | 显式刷新公开引用元数据，不执行模型或评估 |
| `src/benchmarks.js` | 独立的评估任务、指标、具体变体成绩与数值出处 |

`getBibliography(id)` 按当前主论文的 `paperKey` 选择快照：主快照优先，其次人工补充；不匹配当前论文键的旧快照不会挂到新论文上。`paperKey` 优先使用 DOI，其次无版本后缀的 arXiv ID，最后使用规范化标题。更换代表论文时必须重新检查引用关联。

## 年份、作者与出版记录

`primaryPaper` 保存 `title`、完整 `authors`、`year`、`url`、`doi`、`arxivId` 和 `venue`。未知 DOI / arXiv 标识使用 `null`，不编造标识。

- `primaryPaper.year` 与 `venue.year` 是所选出版记录的同一年份。`venue.type` 区分 `conference`、`journal`、`preprint`、`technical-report`、`book`；预印本和技术报告可以是正确的选定节点。
- `primaryPaper.preprintYear` 单独保留更早公开年份；模型内容的 `year` / `yearNote` 描述历史节点。三者可以不同。例如 ViT 为 2020 年预印本、ICLR 2021 正式发表；自编码器的 2006 年代表论文不代表起源年份。
- `venue.name` 使用统一会议系列名称，配合独立的 `venue.year` 筛选，避免 ICLR 等会议因名称写法不同而漏项；`venue.publicationTitle` 保留原始正式名称、卷号与历史名称，供完整引用和 BibTeX 使用。
- 核对标题、作者名单与所选版本。后续 arXiv 修订可能改变标题或作者，不能无说明地与正式版拼接。`venue.url` 保留可追溯的出版或接收记录；arXiv ID、投稿状态、作者单位都不单独证明会议接收。

原模型的教学缩略图不宣称复刻论文的完整训练网络。引用主论文也不表示本网站执行过该论文模型。

## GitHub 关系

`repositories` 每条包含 `url`、`label`、`relationship`、`scope`，必要时加 `note`。

| `relationship` | 含义 |
| --- | --- |
| `author-official` | 论文或作者项目页直接确认的作者发布；核对具体目录、版本与用途 |
| `reference-implementation` | 框架或维护方提供的参考实现，可能晚于原论文且实现细节不同 |
| `third-party` | 社区独立实现，明确说明不属于作者原始发布 |

`scope` 说明是模块、完整模型、训练代码、微调示例还是权重发布。同一仓库可能同时包含后续模型；不能把全部目录与当前主论文或成绩绑定。`repositories: []` 表示尚未核验相应 GitHub 来源，不表示世界上不存在实现。官方来源、格式通过与结果复现是不同结论。

## 引用快照与未知值

截至 **2026-11-26**，实际合并结果为 **61 / 64** 个条目有 OpenAlex 引用快照，均保留来源 URL 和获取日期；RBF、GPT、GIN 为未知。统计按条目计数，同一论文可能服务多个教学条目，不能把这些次数相加当作独立论文总量。

未知记录的 `count`、`source`、`url`、`retrievedAt` 均为 `null`；`scope` 为 `primary-paper`，`note` 解释范围。只有数据源实际返回零且论文匹配可靠时，才可记录 `count: 0`。

已知记录保留 `count`、`source`、`url`、`retrievedAt`、`paperKey`、`workId`、`matchedTitle`、`matchedDoi` 与范围说明。OpenAlex 可能聚合预印本和正式版本；快照是该数据库 work 的被引计数，不能描述成仅某会议版本的计数。不同数据库的覆盖、去重与时间不同，引用次数不构成模型性能、论文质量或跨领域统一排名。

当前人工补充的 GAN、RAE、FlowState、RePack then Refine 均核对了作者、精确 arXiv ID 和同一记录中的正式 proceedings location。GAN 的 `Nets` / `Networks`、RePack 的单复数标题是有证据的版本别名，不能将这种例外泛化为任意模糊匹配。GIN 的索引记录出现标题污染，即使标识相符也拒收；RBF 找到的技术报告不自动代替所选期刊版；GPT 未取得可靠匹配。

## 刷新与审核

```sh
node scripts/update-citations.mjs --help
# 推荐先生成独立文件，审查后再替换正式快照。
node scripts/update-citations.mjs --output /tmp/neuralbank-citation-snapshots.review.js
# 不传 --output 时，直接更新 src/citation-snapshots.js。
node scripts/update-citations.mjs
node --test server/bibliography.test.mjs
npm test
npm run build:static
```

脚本使用公开 OpenAlex API，按 DOI、arXiv DOI、标题搜索查找；要求规范化标题一致、年份合理，并检查标识或作者匹配。存在多个候选时不按次数挑选。可信标识与错误标题并存的污染记录也应拒绝。请求失败或限流时保留论文键仍匹配的既有快照及原日期；没有旧快照的条目继续未知。

自动刷新仅生成 `citation-snapshots.js`，不改主论文与仓库数据，也不自动刷新 `citation-supplements.js`。人工补充必须重新读取公开记录并核对版本证据后更新日期。审查变化时确认论文键、匹配标题、作者、年份、DOI / arXiv 标识、来源与次数；次数突变时查版本合并或索引污染，不为了填满覆盖率接受近似记录。

## Benchmark 出处独立维护

当前正式数据有 7 个 benchmark 定义、15 条具体结果。每条结果以 `reportedModel`、`configuration`、`protocol`、`conditions`、`comparisonKey` 说明确切变体与评估条件，`source.url` 和 `source.location` 定位实际报告数值的论文、章节或表格。

架构主论文、代码仓库和引用次数都不能代替成绩出处。主论文与报告某次评估的论文可以不同；教学图也不能自动继承某个完整训练模型的分数。缺失成绩保持缺失，跨协议不排名。自报成绩与虚构格式样例不直接进入正式结果，审核规则见 [CONTRIBUTING.md](../CONTRIBUTING.md)。
