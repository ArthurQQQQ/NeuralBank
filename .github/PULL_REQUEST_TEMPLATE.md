## 改动

说明要修正的问题，以及修改后的内容。向 [NeuralBank](https://github.com/ArthurQQQQ/NeuralBank) 提交模型或 Benchmark 投稿时，请列出 `submissions/` 下的 JSON 路径。

## 来源与证据

填写论文或实现的原始出处，定位表格、章节、配置与评估日志。说明哪些是作者报告，哪些是自己的实验；不能把格式通过写成复现已验证。

## 验证

- [ ] `npm run check:submission` 通过；JSON 中没有审核状态或验证结论。
- [ ] `npm test` 通过。
- [ ] `npm run build` 通过。
- [ ] 涉及图示或界面时，已查看桌面、窄屏和键盘操作。

Benchmark 自报默认进入「待审核／复现未验证」。本 PR 中的复现命令仅供人工检查，CI 不执行它。
