import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicCatalogAssets } from '../scripts/public-catalog-assets.mjs';
import { models } from '../src/models.js';

test('public agent exports cover the catalog and never expose account or session fields', () => {
  const assets = createPublicCatalogAssets();
  assert.deepEqual(Object.keys(assets).sort(), ['agent-manifest.json', 'catalog.json', 'llms.txt', 'taxonomy.json']);
  const catalog = JSON.parse(assets['catalog.json'].body);
  assert.deepEqual(new Set(catalog.architectures.map(item => item.id)), new Set(models.map(model => model.id)));
  for (const item of catalog.architectures) {
    assert(item.references.length);
    assert(item.limitations.length);
  }
  const forbidden = new Set(['access_token', 'refresh_token', 'user_id', 'authorId', 'password', 'signInUrl', 'signOutUrl', 'guestLearned']);
  const inspect = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) { assert(!forbidden.has(key), `Private field ${key} entered public exports`); inspect(child); }
  };
  for (const [name, asset] of Object.entries(assets)) if (name.endsWith('.json')) inspect(JSON.parse(asset.body));
  const manifest = JSON.parse(assets['agent-manifest.json'].body);
  assert.equal(manifest.mcp.transport, 'stdio');
  assert(!('url' in manifest.mcp));
  for (const key of ['catalog', 'taxonomy', 'instructions']) assert(assets[manifest[key].slice(2)]);
  assert.match(assets['llms.txt'].body, /not an HTTP MCP endpoint/);
});
