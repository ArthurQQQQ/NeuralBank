import { getCatalogDocument, listCatalogCategories } from '../src/architecture-catalog.js';

// Explicit public assets only: no account/session storage is read here.
export function createPublicCatalogAssets() {
  const catalog = getCatalogDocument();
  const taxonomy = listCatalogCategories();
  const manifest = {
    schemaVersion: 1,
    name: 'NeuralBank',
    description: 'An architecture catalog with cited papers, publication venues, dated citation snapshots, source-qualified code, and benchmark evidence.',
    catalog: './catalog.json',
    taxonomy: './taxonomy.json',
    instructions: './llms.txt',
    repository: 'https://github.com/ArthurQQQQ/NeuralBank',
    mcp: {
      transport: 'stdio',
      setup: 'https://github.com/ArthurQQQQ/NeuralBank/blob/main/docs/mcp.md',
      tools: ['list_categories', 'search_architectures', 'get_architecture', 'compare_architectures', 'suggest_architectures'],
    },
    scope: 'Public architecture content only. Citation counts identify their provider, selected paper version and retrieval date; unknown counts remain null. Task suitability is guidance; reported scores retain their original model and evaluation conditions.',
  };
  const llms = `# NeuralBank\n\n> A public, referenced catalog of neural network architectures, modules, and training frameworks.\n\n## Public data\n\n- [Architecture catalog](./catalog.json): full records, multi-axis metadata, prerequisites, complete paper citations and BibTeX, venues, dated citation counts, source-qualified code repositories, and published benchmark evidence.\n- [Taxonomy](./taxonomy.json): families, tasks, mechanisms, modalities, output types, traits, entry types, publication venues, years, and publication types.\n- [Agent manifest](./agent-manifest.json): machine-readable discovery and MCP setup.\n- [MCP setup](https://github.com/ArthurQQQQ/NeuralBank/blob/main/docs/mcp.md): official-SDK stdio tools for search, inspection, comparison, and constrained suggestions. The static website is a data source; it is not an HTTP MCP endpoint.\n\n## Selection\n\nStart with a task and input/output requirements. Filter by mechanism, causal or bidirectional traits, difficulty, entry type, venue, publication year, and repository availability. Distinguish a complete model, a block, a family, and a training framework. Inspect prerequisites, teaching scope, use cases, tradeoffs, and original references before selecting. Suggestions give matching reasons and limitations, not a universal performance ranking. Empty constrained results must remain empty rather than silently relaxing requirements.\n\nA primary paper is an explicitly selected representative publication. Keep its publication year, preprint year and the model historical year distinct. Repository relationships identify author-official, reference-implementation or third-party code and its scope. Citation counts are provider-specific, dated snapshots for the selected paper; null means unknown, not zero. Never sum duplicate versions or use citation counts as a model-performance ranking.\n\nBenchmark results belong to specific reported configurations and protocols; an architecture has no inherited score. Public tools and data expose no personal mastery records or identity, and do not run training or submission commands.\n`;
  return {
    'catalog.json': { body: JSON.stringify(catalog, null, 2) + '\n', type: 'application/json; charset=utf-8' },
    'taxonomy.json': { body: JSON.stringify(taxonomy, null, 2) + '\n', type: 'application/json; charset=utf-8' },
    'agent-manifest.json': { body: JSON.stringify(manifest, null, 2) + '\n', type: 'application/json; charset=utf-8' },
    'llms.txt': { body: llms, type: 'text/plain; charset=utf-8' },
  };
}
