import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));
const toolNames = ['compare_architectures', 'get_architecture', 'list_categories', 'search_architectures', 'suggest_architectures'];

async function connect(t, mode = 'legacy') {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: tmpdir(),
    stderr: 'pipe',
  });
  const methods = [];
  const send = transport.send.bind(transport);
  transport.send = async message => {
    if (message.method) methods.push(message.method);
    return send(message);
  };
  let stderr = '';
  transport.stderr.on('data', chunk => { stderr += chunk.toString(); });
  const client = new Client({ name: 'neuralbank-protocol-test', version: '1.0.0' }, {
    versionNegotiation: { mode },
  });
  t.after(async () => { await client.close(); });
  await client.connect(transport, { timeout: 10_000 });
  return { client, methods, getStderr: () => stderr };
}

function payload(result) {
  assert.notEqual(result.isError, true, JSON.stringify(result.content));
  const text = result.content.find(item => item.type === 'text')?.text;
  assert.ok(text, 'a portable JSON text result is provided');
  const value = JSON.parse(text);
  assert.deepEqual(value, result.structuredContent);
  assert.ok(Buffer.byteLength(text) <= 262_144, 'results stay within the documented byte limit');
  assert.ok(Array.isArray(value.caveats) && value.caveats.length > 0);
  return value;
}

function hasEvidence(item) {
  assert.ok(item.references.length > 0, `${item.id} retains source citations`);
  assert.ok(item.limitations.length > 0, `${item.id} retains limitations`);
}

test('legacy initialize client discovers only the five public read-only tools', { timeout: 20_000 }, async t => {
  const { client, methods, getStderr } = await connect(t);
  assert.ok(methods.includes('initialize'), 'the official client really used initialize');
  assert.equal(client.getServerVersion().name, 'neuralbank');
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), toolNames);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
  const categories = payload(await client.callTool({ name: 'list_categories', arguments: {} }));
  assert.equal(categories.categories.length, 7);
  assert.ok(categories.axes.supportedTasks.length > 0);
  assert.ok(categories.categories.some(category => category.id === 'graph'));
  assert.equal(getStderr(), '', 'successful startup does not write diagnostics');
});

test('stdio search, details, comparison and suggestions preserve evidence and pagination', { timeout: 20_000 }, async t => {
  const { client } = await connect(t);
  const call = async (name, args = {}) => payload(await client.callTool({ name, arguments: args }));
  const first = await call('search_architectures', { limit: 2 });
  const second = await call('search_architectures', { limit: 2, offset: first.nextOffset });
  assert.equal(first.items.length, 2);
  assert.equal(second.items.length, 2);
  assert.ok(first.total >= 64);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 4);
  first.items.forEach(hasEvidence);
  const maximumPage = await call('search_architectures', { limit: 30 });
  assert.equal(maximumPage.items.length, 30);
  maximumPage.items.forEach(hasEvidence);
  const filtered = await call('search_architectures', { query: 'CNN', category: 'vision', limit: 3 });
  assert.ok(filtered.items.some(item => item.id === 'cnn'));
  assert.ok(filtered.items.every(item => item.category === 'vision'));
  const detail = await call('get_architecture', { id: 'cnn' });
  assert.equal(detail.item.id, 'cnn');
  assert.ok(detail.item.layers.length > 0);
  hasEvidence(detail.item);
  const comparison = await call('compare_architectures', { ids: ['cnn', 'mlp'] });
  assert.deepEqual(new Set(comparison.items.map(item => item.id)), new Set(['cnn', 'mlp']));
  comparison.items.forEach(hasEvidence);
  assert.ok(comparison.differences.length > 0);
  const suggestions = await call('suggest_architectures', {
    task: detail.item.metadata.supportedTasks[0], limit: 3,
  });
  assert.ok(suggestions.items.length > 0 && suggestions.items.length <= 3);
  for (const item of suggestions.items) {
    hasEvidence(item.architecture);
    assert.ok(item.matchReasons.length > 0);
    assert.ok(item.limitations.length > 0);
  }
  assert.ok(!JSON.stringify(detail).includes('neuralbank-learned'));
});

test('resources enumerate the catalog and read a canonical model URI; misses are errors', { timeout: 20_000 }, async t => {
  const { client } = await connect(t);
  const { resources } = await client.listResources();
  assert.ok(resources.some(resource => resource.uri === 'neuralbank://catalog'));
  assert.ok(resources.some(resource => resource.uri === 'neuralbank://taxonomy'));
  assert.ok(resources.some(resource => resource.uri === 'neuralbank://model/cnn'));
  const { resourceTemplates } = await client.listResourceTemplates();
  assert.ok(resourceTemplates.some(template => template.uriTemplate === 'neuralbank://model/{id}'));
  const read = async uri => {
    const result = await client.readResource({ uri });
    assert.equal(result.contents[0].mimeType, 'application/json');
    assert.ok(Buffer.byteLength(result.contents[0].text) <= 262_144);
    const value = JSON.parse(result.contents[0].text);
    assert.ok(value.caveats.length > 0);
    return value;
  };
  const catalog = await read('neuralbank://catalog');
  assert.ok(catalog.items.length >= 64);
  assert.ok(catalog.items.every(item => item.resourceUri.startsWith('neuralbank://model/')));
  catalog.items.forEach(hasEvidence);
  assert.equal((await read('neuralbank://taxonomy')).categories.length, 7);
  for (const entry of catalog.items) {
    const detail = await read(entry.resourceUri);
    assert.equal(detail.item.id, entry.id);
    hasEvidence(detail.item);
  }
  await assert.rejects(client.readResource({ uri: 'neuralbank://model/not-a-real-architecture' }), /not found|unknown|不存在/i);
});

test('invalid filters, unknown IDs, excess outputs and private operations fail readably', { timeout: 20_000 }, async t => {
  const { client } = await connect(t);
  for (const [name, args, expected] of [
    ['search_architectures', { category: 'not-a-category' }, /category|invalid/i],
    ['search_architectures', { limit: 31 }, /30|limit|invalid/i],
    ['search_architectures', { learned: true }, /learned|unrecognized|unknown/i],
    ['search_architectures', { mechanisms: 'attention' }, /mechanisms|array|invalid/i],
    ['get_architecture', { id: 'not-a-real-architecture' }, /not.found|unknown|不存在|未知/i],
    ['compare_architectures', { ids: ['cnn', 'cnn'] }, /unique|duplicate|重复/i],
    ['suggest_architectures', { task: 'not-a-task' }, /task|invalid/i],
    ['suggest_architectures', { task: 'vision', limit: 13 }, /12|limit|invalid/i],
  ]) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, true, `${name} rejects ${JSON.stringify(args)}`);
    assert.match(JSON.stringify(result.content), expected);
  }
  await assert.rejects(
    client.callTool({ name: 'submit_benchmark', arguments: { command: 'do-not-run' } }),
    /not found|unknown|未找到/i,
    'a private or mutating operation is not registered at all',
  );
});

test('the same stdio factory serves the current discovery protocol', { timeout: 20_000 }, async t => {
  const { client, methods } = await connect(t, { pin: '2026-07-28' });
  // The official transport probes on a disposable sibling process, then
  // opens the session pipe; its discovery verdict is the public evidence.
  assert.ok(client.getDiscoverResult());
  assert.equal(client.getProtocolEra(), 'modern');
  assert.equal(client.getNegotiatedProtocolVersion(), '2026-07-28');
  assert.ok(!methods.includes('initialize'));
  const result = payload(await client.callTool({ name: 'get_architecture', arguments: { id: 'transformer' } }));
  assert.equal(result.item.id, 'transformer');
  hasEvidence(result.item);
});
