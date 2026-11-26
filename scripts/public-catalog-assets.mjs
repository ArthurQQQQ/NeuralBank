import { getCatalogDocument, listCatalogCategories } from '../src/architecture-catalog.js';

// Explicit public assets only: no account/session storage is read here.
export function createPublicCatalogAssets() {
  const catalog = getCatalogDocument();
  const taxonomy = listCatalogCategories();
  const manifest = {
    schemaVersion: 1,
    name: 'NeuralBank',
    description: 'A referenced architecture catalog for learning, constrained discovery, and comparison.',
    catalog: './catalog.json',
    taxonomy: './taxonomy.json',
    instructions: './llms.txt',
    repository: 'https://github.com/ArthurQQQQ/NeuralBank',
    mcp: {
      transport: 'stdio',
      setup: 'https://github.com/ArthurQQQQ/NeuralBank/blob/main/docs/mcp.md',
      tools: ['list_categories', 'search_architectures', 'get_architecture', 'compare_architectures', 'suggest_architectures'],
    },
    scope: 'Public architecture content only. Task suitability is guidance; reported scores retain their original model and evaluation conditions.',
  };
  const llms = `# NeuralBank\n\n> A public, referenced catalog of neural network architectures, modules, and training frameworks.\n\n## Public data\n\n- [Architecture catalog](./catalog.json): full records, multi-axis metadata, prerequisites, original references, and published benchmark evidence.\n- [Taxonomy](./taxonomy.json): families, tasks, mechanisms, modalities, output types, traits, and entry types.\n- [Agent manifest](./agent-manifest.json): machine-readable discovery and MCP setup.\n- [MCP setup](https://github.com/ArthurQQQQ/NeuralBank/blob/main/docs/mcp.md): official-SDK stdio tools for search, inspection, comparison, and constrained suggestions. The static website is a data source; it is not an HTTP MCP endpoint.\n\n## Selection\n\nStart with a task and input/output requirements. Filter by mechanism, causal or bidirectional traits, difficulty, and entry type. Distinguish a complete model, a block, a family, and a training framework. Inspect prerequisites, teaching scope, use cases, tradeoffs, and original references before selecting. Suggestions give matching reasons and limitations, not a universal performance ranking. Empty constrained results must remain empty rather than silently relaxing requirements.\n\nBenchmark results belong to specific reported configurations and protocols; an architecture has no inherited score. Public tools and data expose no personal mastery records or identity, and do not run training or submission commands.\n`;
  return {
    'catalog.json': { body: JSON.stringify(catalog, null, 2) + '\n', type: 'application/json; charset=utf-8' },
    'taxonomy.json': { body: JSON.stringify(taxonomy, null, 2) + '\n', type: 'application/json; charset=utf-8' },
    'agent-manifest.json': { body: JSON.stringify(manifest, null, 2) + '\n', type: 'application/json; charset=utf-8' },
    'llms.txt': { body: llms, type: 'text/plain; charset=utf-8' },
  };
}
