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
  assert.ok(item.primaryPaper && typeof item.primaryPaper === 'object', `${item.id} retains its primaryPaper object`);
  assert.ok(item.primaryPaper.title.length > 0, `${item.id} identifies its primary paper`);
  assert.ok(item.primaryPaper.authors.length > 0);
  assert.equal(new URL(item.primaryPaper.url).protocol, 'https:');
  assert.ok(Number.isInteger(item.primaryPaper.year));
  assert.ok(item.primaryPaper.venue, `${item.id} retains the paper's publication venue`);
  assert.ok(item.primaryPaper.venue.name.length > 0);
  assert.ok(Number.isInteger(item.primaryPaper.venue.year));
  assert.equal(item.primaryPaper.year, item.primaryPaper.venue.year, 'paper year refers to the selected publication version');
  assert.ok(typeof item.yearNote === 'string' && item.yearNote.length > 0, `${item.id} retains its original year explanation`);
  assert.ok(['conference', 'journal', 'preprint', 'technical-report', 'book'].includes(item.primaryPaper.venue.type));
  assert.equal(new URL(item.primaryPaper.venue.url).protocol, 'https:');
  assert.ok(item.citation && typeof item.citation === 'object', `${item.id} retains its citation snapshot and unknown-value semantics`);
  assert.equal(item.citation.scope, 'primary-paper');
  assert.ok(item.citation.note.length > 0);
  if (item.citation.count === null) {
    assert.equal(item.citation.source, null, 'unknown is not a fabricated zero/provider snapshot');
    assert.equal(item.citation.url, null);
    assert.equal(item.citation.retrievedAt, null);
  } else {
    assert.ok(Number.isInteger(item.citation.count) && item.citation.count >= 0);
    assert.ok(['OpenAlex', 'Semantic Scholar', 'Crossref'].includes(item.citation.source));
    assert.equal(new URL(item.citation.url).protocol, 'https:');
    assert.ok(Number.isFinite(Date.parse(item.citation.retrievedAt)));
  }
  assert.ok(Array.isArray(item.repositories));
  for (const repository of item.repositories) {
    assert.equal(new URL(repository.url).protocol, 'https:');
    assert.ok(['author-official', 'reference-implementation', 'third-party'].includes(repository.relationship));
    assert.ok(repository.label.length > 0 && repository.scope.length > 0);
  }
  assert.ok(Array.isArray(item.benchmarkResults), `${item.id} exposes records, not opaque benchmark IDs alone`);
  assert.equal(new Set(item.benchmarkResults.map(result => result.id)).size, item.benchmarkResults.length);
  if (Array.isArray(item.benchmarkIds)) {
    assert.deepEqual([...new Set(item.benchmarkResults.map(result => result.benchmarkId))].sort(), [...item.benchmarkIds].sort());
  }
  for (const result of item.benchmarkResults) {
    assert.ok(typeof result.id === 'string' && result.id.length > 0);
    assert.equal(result.modelId, item.id, 'benchmark records attach only by exact architecture ID');
    assert.ok(result.reportedModel.length > 0 && result.benchmarkName.length > 0);
    assert.ok(Number.isFinite(result.value));
    assert.ok(result.metric.name.length > 0);
    assert.equal(typeof result.metric.unit, 'string');
    assert.ok(['higher', 'lower'].includes(result.metric.direction));
    assert.ok(result.protocol.length > 0 && result.benchmarkProtocolNote.length > 0);
    assert.ok(result.comparisonKey.length > 0);
    assert.equal(new URL(result.source.url).protocol, 'https:');
    assert.ok(result.source.title.length > 0 && result.source.location.length > 0);
  }
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
  assert.ok(categories.axes.venues.length > 0);
  assert.ok(categories.axes.venueYears.every(Number.isInteger));
  assert.ok(categories.axes.publicationTypes.includes('preprint'));
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
  const paperMatches = await call('search_architectures', { query: detail.item.primaryPaper.title, limit: 3 });
  assert.ok(paperMatches.items.some(item => item.id === detail.item.id));
  const publicationFilter = {
    venue: detail.item.primaryPaper.venue.name,
    venueYear: detail.item.primaryPaper.venue.year,
    publicationType: detail.item.primaryPaper.venue.type,
    hasRepository: detail.item.repositories.length > 0,
    limit: 30,
  };
  const publicationMatches = await call('search_architectures', publicationFilter);
  assert.ok(publicationMatches.items.some(item => item.id === detail.item.id));
  assert.ok(publicationMatches.items.every(item =>
    item.primaryPaper.venue.name === publicationFilter.venue &&
    item.primaryPaper.venue.year === publicationFilter.venueYear &&
    item.primaryPaper.venue.type === publicationFilter.publicationType &&
    (item.repositories.length > 0) === publicationFilter.hasRepository));
  const noRepository = await call('search_architectures', { hasRepository: false, limit: 30 });
  assert.ok(noRepository.items.every(item => item.repositories.length === 0));
  const comparison = await call('compare_architectures', { ids: ['resnet', 'vit'] });
  assert.deepEqual(new Set(comparison.items.map(item => item.id)), new Set(['resnet', 'vit']));
  comparison.items.forEach(hasEvidence);
  assert.ok(comparison.differences.length > 0);
  const residual = comparison.items.find(item => item.id === 'resnet');
  const resnet50 = residual.benchmarkResults.find(result => result.reportedModel.includes('ResNet-50'));
  assert.ok(resnet50, 'the actual trained ResNet-50 configuration stays distinct from the teaching BasicBlock');
  assert.equal(resnet50.metric.name, 'Top-1 error');
  assert.equal(resnet50.metric.direction, 'lower');
  assert.match(resnet50.source.location, /Table 3/);
  const maximumComparison = await call('compare_architectures', {
    ids: ['flowstate', 'repack-refine', 'mamba3', 'resnet', 'vit', 'transformer'],
  });
  assert.equal(maximumComparison.items.length, 6);
  maximumComparison.items.forEach(hasEvidence);
  const searchResnet = await call('search_architectures', { query: 'resnet', limit: 3 });
  assert.deepEqual(searchResnet.items.find(item => item.id === 'resnet').benchmarkResults, residual.benchmarkResults);
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
    ['search_architectures', { venue: 'not-a-venue' }, /venue|invalid/i],
    ['search_architectures', { venueYear: '2026' }, /venueYear|number|invalid/i],
    ['search_architectures', { venueYear: 1799 }, /1800|venueYear|invalid/i],
    ['search_architectures', { publicationType: 'not-a-publication-type' }, /publicationType|invalid/i],
    ['search_architectures', { hasRepository: 'true' }, /hasRepository|boolean|invalid/i],
    ['get_architecture', { id: 'not-a-real-architecture' }, /not.found|unknown|不存在|未知/i],
    ['compare_architectures', { ids: ['cnn', 'cnn'] }, /unique|duplicate|重复/i],
    ['suggest_architectures', { task: 'not-a-task' }, /task|invalid/i],
    ['suggest_architectures', { task: 'vision', limit: 13 }, /12|limit|invalid/i],
  ]) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, true, `${name} rejects ${JSON.stringify(args)}`);
    assert.match(JSON.stringify(result.content), expected);
  }
  const vocabulary = payload(await client.callTool({ name: 'list_categories', arguments: {} }));
  const tooManyMechanisms = await client.callTool({
    name: 'search_architectures', arguments: { mechanisms: vocabulary.axes.mechanisms.slice(0, 21) },
  });
  assert.equal(tooManyMechanisms.isError, true);
  assert.match(JSON.stringify(tooManyMechanisms.content), /20/);
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
