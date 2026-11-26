import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadLearned, saveLearned, toggleLearned,
  matchesLearningStatus, summarizeLearning,
} from '../src/learning-progress.js';

const key = 'neuralbank-learned';
const legacyIds = [
  'perceptron', 'mlp', 'cnn', 'resnet', 'unet', 'rnn', 'lstm', 'gru',
  'transformer', 'vit', 'autoencoder', 'vae', 'gan',
  'hopfield', 'modern-hopfield', 'ntm', 'dnc',
];
function memoryStorage(initialValue = null) {
  let value = initialValue;
  return {
    reads: 0, writes: 0,
    getItem(requestedKey) { assert.equal(requestedKey, key); this.reads += 1; return value; },
    setItem(requestedKey, nextValue) { assert.equal(requestedKey, key); this.writes += 1; value = nextValue; },
    raw() { return value; },
  };
}

await test('legacy learning records remain compatible as the catalog grows', () => {
  const storage = memoryStorage(JSON.stringify(legacyIds));
  const previous = loadLearned(storage, legacyIds);
  assert.deepEqual([...previous], legacyIds);
  const expandedIds = [...legacyIds, 'mamba', 'dit'];
  const grown = loadLearned(storage, new Set(expandedIds));
  assert.deepEqual([...grown], legacyIds);
  assert.equal(matchesLearningStatus('mamba', grown, 'unmastered'), true);
  const changed = toggleLearned(grown, 'mamba', expandedIds);
  assert.equal(grown.has('mamba'), false, 'toggle must not mutate the current UI state');
  assert.equal(changed.has('mamba'), true);
  assert.deepEqual(saveLearned(storage, changed), { saved: true });
  assert.deepEqual(loadLearned(storage, expandedIds), changed);
  const catalog = expandedIds.map(id => ({ id, category: 'example', prerequisites: [] }));
  assert.deepEqual(summarizeLearning(catalog, changed), {
    total: 19, mastered: 18, unmastered: 1,
    byCategory: [{ id: 'example', total: 19, mastered: 18, unmastered: 1 }],
    nextModelId: 'dit',
  });
});

await test('load tolerates malformed storage and ignores invalid IDs without rewriting records', () => {
  for (const raw of ['{broken', '{}', 'null', '17', '"mlp"']) {
    const storage = memoryStorage(raw);
    assert.deepEqual(loadLearned(storage, legacyIds), new Set());
    assert.equal(storage.writes, 0);
  }
  const raw = JSON.stringify(['mlp', 'mlp', '', null, 1, {}, 'future-model']);
  const storage = memoryStorage(raw);
  assert.deepEqual(loadLearned(storage, legacyIds), new Set(['mlp']));
  assert.equal(storage.raw(), raw);
  assert.equal(storage.writes, 0);
  // A newer catalog can recover an ID unknown to the older catalog on read.
  assert.deepEqual(loadLearned(storage, [...legacyIds, 'future-model']), new Set(['mlp', 'future-model']));
});

await test('storage failures leave in-memory learning usable and report an unsuccessful save', () => {
  const blocked = {
    getItem() { throw new Error('storage access blocked'); },
    setItem() { throw new Error('storage quota exceeded'); },
  };
  assert.deepEqual(loadLearned(blocked, legacyIds), new Set());
  const current = new Set(['mlp']);
  assert.deepEqual(saveLearned(blocked, current), { saved: false });
  assert.deepEqual(current, new Set(['mlp']));
  assert.deepEqual(toggleLearned(current, 'cnn', legacyIds), new Set(['mlp', 'cnn']));
  assert.deepEqual(saveLearned(undefined, current), { saved: false });
  assert.deepEqual(loadLearned(undefined, legacyIds), new Set());
});

await test('mastered and unmastered filters partition empty, partial, and complete catalogs', () => {
  for (const learned of [new Set(), new Set(['mlp']), new Set(legacyIds)]) {
    const all = legacyIds.filter(id => matchesLearningStatus(id, learned));
    const mastered = all.filter(id => matchesLearningStatus(id, learned, 'mastered'));
    const pending = all.filter(id => matchesLearningStatus(id, learned, 'unmastered'));
    assert.equal(mastered.length + pending.length, legacyIds.length);
    assert.equal(mastered.some(id => pending.includes(id)), false);
    assert.deepEqual(new Set([...mastered, ...pending]), new Set(all));
  }
  assert.equal(matchesLearningStatus('mlp', new Set(), 'invalid'), false);
  assert.deepEqual(summarizeLearning([], new Set(['unknown'])), {
    total: 0, mastered: 0, unmastered: 0, byCategory: [], nextModelId: null,
  });
});

await test('summary excludes unknown records, groups progress, and chooses an eligible next model', () => {
  const catalog = [
    { id: 'mlp', category: 'foundations', prerequisites: [] },
    { id: 'vit', category: 'attention', prerequisites: ['transformer'] },
    { id: 'transformer', category: 'attention', prerequisites: ['mlp'] },
  ];
  const current = new Set(['mlp', 'unknown']);
  assert.deepEqual(summarizeLearning(catalog, current), {
    total: 3, mastered: 1, unmastered: 2,
    byCategory: [
      { id: 'foundations', total: 1, mastered: 1, unmastered: 0 },
      { id: 'attention', total: 2, mastered: 0, unmastered: 2 },
    ],
    nextModelId: 'transformer',
  });
  const learnedAll = new Set(catalog.map(model => model.id));
  assert.equal(summarizeLearning(catalog, learnedAll).nextModelId, null);
  assert.equal(summarizeLearning(catalog, learnedAll).mastered, catalog.length);
  const toggledOff = toggleLearned(current, 'mlp', legacyIds);
  assert.deepEqual(toggledOff, new Set(['unknown']));
  assert.deepEqual(current, new Set(['mlp', 'unknown']));
  const rejected = toggleLearned(current, 'not-in-catalog', legacyIds);
  assert.notEqual(rejected, current);
  assert.deepEqual(rejected, current);
});
