import test from 'node:test';
import assert from 'node:assert/strict';
import { models } from '../src/models.js';
import * as taxonomy from '../src/taxonomy.js';
import { benchmarks, benchmarkResults } from '../src/benchmarks.js';
import { architectureMetadata, architectureAxes } from '../src/architecture-metadata.js';
import {
  CatalogQueryError, createArchitectureCatalog, listCatalogCategories, listCategories,
  searchArchitectures, getArchitecture, compareArchitectures, suggestArchitectures, getCatalogDocument
} from '../src/architecture-catalog.js';

const copied = value => JSON.parse(JSON.stringify(value));
const context = () => ({ models: copied(models), taxonomy: copied(taxonomy), benchmarks: copied(benchmarks), benchmarkResults: copied(benchmarkResults), metadata: copied(architectureMetadata) });
const fails = (fn, code, path) => assert.throws(fn, error => error instanceof CatalogQueryError && error.code === code && (!path || error.path === path));

test('64 model IDs and metadata IDs match exactly and expose controlled multi-axis labels', () => {
  assert.equal(models.length, 64);
  assert.deepEqual(Object.keys(architectureMetadata).sort(), models.map(model => model.id).sort());
  const document = getCatalogDocument();
  assert.equal(document.schemaVersion, 1);
  assert.equal(document.architectures.length, 64);
  for (const model of document.architectures) {
    const data = model.metadata;
    for (const key of ['supportedTasks', 'mechanisms', 'inputModalities', 'outputTypes', 'traits']) {
      assert.ok(data[key].length, `${model.id} missing ${key}`);
      assert.ok(data[key].every(value => document.axes[key].includes(value)), `${model.id} invalid ${key}`);
    }
    assert.ok(data.scopeNote && data.teachingScope);
    assert.ok(data.representativeUseCases.length && data.tradeoffs.length);
    assert.ok(model.references.length && model.references.every(reference => reference.url.startsWith('https://')));
    assert.ok(model.limitations.length);
    assert.equal(model.venue?.name || null, models.find(source => source.id === model.id).venue?.name || null);
  }
  assert.ok(architectureAxes.tasks.some(task => task.id === 'time-series' && task.label));
});

test('category listing is complete, correctly assigned and has no duplicates', () => {
  const result = listCatalogCategories();
  assert.deepEqual(listCategories(), result);
  assert.equal(result.categories.length, 7);
  const allIds = result.categories.flatMap(category => {
    assert.equal(category.count, category.architectureIds.length);
    for (const id of category.architectureIds) assert.equal(getArchitecture(id).item.category, category.id);
    return category.architectureIds;
  });
  assert.equal(allIds.length, 64);
  assert.equal(new Set(allIds).size, 64);
  assert.ok(result.caveats.some(note => note.includes('不是性能') || note.includes('不表示')));
});

test('model, family, block and framework are distinguished from the teaching scope', () => {
  assert.equal(getArchitecture('gan').item.metadata.entityType, 'framework');
  assert.equal(getArchitecture('ddpm').item.metadata.entityType, 'framework');
  assert.equal(getArchitecture('graphsage').item.metadata.entityType, 'framework');
  assert.equal(getArchitecture('inception').item.metadata.entityType, 'block');
  assert.equal(getArchitecture('lenet').item.metadata.entityType, 'model');
  assert.equal(getArchitecture('resnet').item.metadata.teachingScope, 'core-block');
  const transformer = getArchitecture('transformer').item.metadata;
  assert.ok(transformer.traits.includes('bidirectional'));
  assert.ok(!transformer.traits.includes('causal'));
  assert.ok(getArchitecture('gpt').item.metadata.traits.includes('causal'));
  assert.ok(!getArchitecture('performer').item.metadata.traits.includes('causal'));
  assert.ok(getArchitecture('t5').item.metadata.scopeNote.includes('源encoder'));
  assert.ok(!getArchitecture('vae').item.metadata.traits.includes('exact-continuous-density'));
  assert.ok(getArchitecture('realnvp').item.metadata.traits.includes('exact-continuous-density'));
});

test('search uses explicit axes, AND matching and stable ID order', () => {
  const result = searchArchitectures({ task: 'language', traits: ['causal', 'fixed-size-state'], limit: 100 });
  assert.ok(result.total > 0 && result.total < 64);
  assert.deepEqual(result.items.map(model => model.id), result.items.map(model => model.id).sort());
  for (const model of result.items) {
    assert.ok(model.metadata.supportedTasks.includes('language'));
    assert.ok(model.metadata.traits.includes('causal') && model.metadata.traits.includes('fixed-size-state'));
  }
  assert.equal(searchArchitectures({ category: 'graph', mechanisms: ['graph-message-passing', 'neighbor-sampling'] }).items[0].id, 'graphsage');
  assert.ok(searchArchitectures({ query: 'ＧＰＴ', task: 'language' }).items.some(model => model.id === 'gpt'));
  assert.equal(searchArchitectures({ task: 'audio', category: 'graph' }).total, 0);
  assert.equal(searchArchitectures({ task: 'language', mechanisms: ['affine-coupling'] }).total, 0);
});

test('pagination is bounded and exhaustive without duplicate or missing IDs', () => {
  const ids = [];
  let offset = 0;
  do {
    const page = searchArchitectures({ limit: 7, offset });
    assert.equal(page.total, 64);
    assert.equal(page.offset, offset);
    assert.ok(page.items.length <= 7);
    ids.push(...page.items.map(model => model.id));
    offset = page.nextOffset;
  } while (offset !== null);
  assert.equal(ids.length, 64);
  assert.equal(new Set(ids).size, 64);
  assert.deepEqual(ids, models.map(model => model.id).sort());
  assert.equal(searchArchitectures({ offset: 1000 }).items.length, 0);
  assert.equal(searchArchitectures({ offset: 1000 }).nextOffset, null);
});

test('strict filters reject unknown keys, unknown enums and incorrect types', () => {
  fails(() => searchArchitectures({ best: true }), 'UNKNOWN_FILTER', '/filters/best');
  fails(() => searchArchitectures({ task: 'everything' }), 'UNKNOWN_VALUE', '/filters/task');
  fails(() => searchArchitectures({ category: 'not-a-category' }), 'UNKNOWN_VALUE');
  fails(() => searchArchitectures({ level: 'easy' }), 'UNKNOWN_VALUE');
  fails(() => searchArchitectures({ entityType: 'all-models' }), 'UNKNOWN_VALUE');
  fails(() => searchArchitectures({ mechanisms: 'self-attention' }), 'INVALID_ARGUMENT');
  fails(() => searchArchitectures({ traits: ['causal', 'causal'] }), 'INVALID_ARGUMENT');
  fails(() => searchArchitectures({ inputModalities: ['not-a-modality'] }), 'UNKNOWN_VALUE');
  for (const limit of [0, 101, '10', NaN, Infinity, 2.5, null]) fails(() => searchArchitectures({ limit }), 'INVALID_ARGUMENT');
  for (const offset of [-1, '0', 0.5, Infinity]) fails(() => searchArchitectures({ offset }), 'INVALID_ARGUMENT');
  for (const filters of [null, [], new Date()]) fails(() => searchArchitectures(filters), 'INVALID_ARGUMENT');
});

test('unknown architecture IDs and invalid comparison lists fail rather than returning partial results', () => {
  fails(() => getArchitecture('does-not-exist'), 'NOT_FOUND', '/id');
  assert.throws(() => getArchitecture('does-not-exist'), error => error.status === 404);
  fails(() => getArchitecture(''), 'INVALID_ARGUMENT');
  fails(() => compareArchitectures(['mlp']), 'INVALID_ARGUMENT');
  fails(() => compareArchitectures(['mlp', 'mlp']), 'INVALID_ARGUMENT');
  fails(() => compareArchitectures(['mlp', 'does-not-exist']), 'NOT_FOUND');
  fails(() => compareArchitectures(models.slice(0, 7).map(model => model.id)), 'INVALID_ARGUMENT');
});

test('details include real prerequisite links, related links, original sources and limitations', () => {
  for (const source of models) {
    const detail = getArchitecture(source.id).item;
    assert.deepEqual(detail.prerequisites, source.prerequisites);
    assert.deepEqual(detail.prerequisiteModels.map(model => model.id), source.prerequisites);
    assert.deepEqual(detail.references, source.references);
    for (const model of [...detail.prerequisiteModels, ...detail.relatedModels]) assert.ok(models.some(source => source.id === model.id));
    assert.ok(detail.limitations.includes(source.pitfall));
  }
  assert.deepEqual(getArchitecture('mamba3').item.benchmarkIds, ['hellaswag-acc-norm']);
  assert.deepEqual(getArchitecture('gpt').item.benchmarkIds, []);
  assert.deepEqual(getArchitecture('autoencoder').item.benchmarkIds, []);
});

test('compare returns shared axes and differences with sources, without a global winner', () => {
  const result = compareArchitectures(['resnet', 'densenet']);
  assert.deepEqual(result.items.map(model => model.id), ['resnet', 'densenet']);
  assert.ok(result.sharedAxes.supportedTasks.includes('vision'));
  assert.ok(result.differences.find(item => item.id === 'resnet').distinctMechanisms.includes('residual-addition'));
  assert.ok(result.differences.find(item => item.id === 'densenet').distinctMechanisms.includes('dense-concatenation'));
  for (const item of result.items) assert.ok(item.references.length && item.limitations.length);
  assert.equal(result.best, undefined);
  assert.equal(result.ranking, undefined);
});

test('suggestions honor hard constraints, include reasons/limits and never relax a no-match request', () => {
  const result = suggestArchitectures({ task: 'language', constraints: { requireTraits: ['causal'], excludeMechanisms: ['causal-attention'], entityTypes: ['family', 'block'] }, limit: 20 });
  assert.ok(result.items.length);
  for (const item of result.items) {
    assert.ok(item.architecture.metadata.traits.includes('causal'));
    assert.ok(!item.architecture.metadata.mechanisms.includes('causal-attention'));
    assert.ok(item.matchReasons.length >= 2 && item.limitations.length > 0);
    assert.ok(item.architecture.references.length);
    assert.equal(item.score, undefined);
  }
  assert.equal(suggestArchitectures({ task: 'vision', constraints: { requireMechanisms: ['neighbor-sampling'] } }).total, 0);
  fails(() => suggestArchitectures({ task: 'language', constraints: { requireTraits: ['causal'], excludeTraits: ['causal'] } }), 'INVALID_ARGUMENT');
  fails(() => suggestArchitectures({ task: 'language', constraints: { maximumLatencyMs: 1 } }), 'UNKNOWN_FILTER');
  fails(() => suggestArchitectures({ task: 'language', limit: 21 }), 'INVALID_ARGUMENT');
  fails(() => suggestArchitectures({}), 'INVALID_ARGUMENT');
});

test('all responses are detached JSON data without modifying the source catalog', () => {
  const result = getArchitecture('mlp');
  result.item.name = 'mutated';
  result.item.metadata.traits.push('made-up-trait');
  result.item.references.length = 0;
  result.caveats.length = 0;
  const next = getArchitecture('mlp');
  assert.equal(next.item.name, 'MLP');
  assert.ok(next.item.references.length && next.caveats.length);
  assert.ok(!next.item.metadata.traits.includes('made-up-trait'));
  assert.equal(models.find(model => model.id === 'mlp').name, 'MLP');
});

test('catalog construction rejects missing/unknown metadata IDs, unknown links and prerequisite cycles', () => {
  let data = context(); delete data.metadata.mlp;
  fails(() => createArchitectureCatalog(data), 'CATALOG_INCOMPLETE');
  data = context(); data.metadata.unknown = data.metadata.mlp;
  fails(() => createArchitectureCatalog(data), 'CATALOG_INCOMPLETE');
  data = context(); data.metadata.mlp.relatedModelIds.push('unknown');
  fails(() => createArchitectureCatalog(data), 'CATALOG_INVALID');
  data = context(); data.models.find(model => model.id === 'perceptron').prerequisites = ['mlp'];
  fails(() => createArchitectureCatalog(data), 'CATALOG_INVALID');
});

test('catalog document contains public educational data and benchmark definitions, not personal submissions', () => {
  const result = getCatalogDocument();
  assert.equal(result.benchmarks.length, benchmarks.length);
  assert.equal(result.learningPaths.length, taxonomy.studyPaths.length);
  assert.equal(result.submissions, undefined);
  assert.equal(result.progress, undefined);
  assert.equal(result.users, undefined);
  assert.ok(result.scope.supportedTasks.includes('选型线索'));
  assert.ok(result.scope.configuration.includes('教学配置'));
});
