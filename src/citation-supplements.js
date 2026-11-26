// Independently checked OpenAlex snapshots, retrieved 2026-11-26.
// Exact arXiv identifiers AND the selected formal proceedings locations were checked.
// A work-level count can aggregate versions; it is not a conference-version-only count.
export const citationSupplements = {
  gan: {
    paperKey: 'arxiv:1406.2661',
    count: 9661,
    source: 'OpenAlex',
    url: 'https://openalex.org/W4298289240',
    retrievedAt: '2026-11-26',
    scope: 'primary-paper',
    note: '通过 arXiv:1406.2661 精确查询；作者、2014 年份一致。OpenAlex 标题使用预印本别名 Generative Adversarial Networks，但同一记录的 publishedVersion location 精确指向所选 NIPS 2014 Generative Adversarial Nets 正式论文，另含该 arXiv location。此数为 OpenAlex 对该 work 的版本聚合快照，不是仅正式版的引用数。',
    workId: 'W4298289240',
    matchedTitle: 'Generative Adversarial Networks',
    matchedDoi: '10.48550/arxiv.1406.2661'
  },
  rae: {
    paperKey: 'arxiv:2510.11690',
    count: 429,
    source: 'OpenAlex',
    url: 'https://openalex.org/W7090942304',
    retrievedAt: '2026-11-26',
    scope: 'primary-paper',
    note: '通过 arXiv:2510.11690 精确查询；标题、四位作者和 2026 年份一致。记录同时包含该 arXiv location 与本站所选 ICLR 2026 正式 proceedings URL，后者标为 publishedVersion。此数为同一 work 的版本聚合快照，不是仅正式版的引用数。',
    workId: 'W7090942304',
    matchedTitle: 'Diffusion Transformers with Representation Autoencoders',
    matchedDoi: '10.48550/arxiv.2510.11690'
  },
  flowstate: {
    paperKey: 'arxiv:2508.05287',
    count: 41,
    source: 'OpenAlex',
    url: 'https://openalex.org/W6967112558',
    retrievedAt: '2026-11-26',
    scope: 'primary-paper',
    note: '通过 arXiv:2508.05287 精确查询；标题、四位作者和 2026 年份一致。记录同时包含该 arXiv location 与本站所选 ICML 2026 PMLR graf26a 正式 URL，后者标为 publishedVersion。此数为同一 work 的版本聚合快照，不是仅正式版的引用数。',
    workId: 'W6967112558',
    matchedTitle: 'FlowState: Sampling-Rate-Equivariant Time-Series Forecasting',
    matchedDoi: '10.48550/arxiv.2508.05287'
  },
  'repack-refine': {
    paperKey: 'arxiv:2512.12083',
    count: 4,
    source: 'OpenAlex',
    url: 'https://openalex.org/W4417447631',
    retrievedAt: '2026-11-26',
    scope: 'primary-paper',
    note: '通过 arXiv:2512.12083 精确查询；四位作者和 2026 年份一致。记录标题使用预印本的 Transformer / Model 单数别名，但同一记录包含该 arXiv location 与本站所选 ICML 2026 PMLR dong26l 正式 URL，后者标为 publishedVersion。此数为同一 work 的版本聚合快照，不是仅正式版的引用数。',
    workId: 'W4417447631',
    matchedTitle: 'RePack then Refine: Efficient Diffusion Transformer with Vision Foundation Model',
    matchedDoi: '10.48550/arxiv.2512.12083'
  }
};
