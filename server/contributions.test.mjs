import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { handleContributions, createD1Store } from './contributions.mjs';
import { createLocalStore } from './local-store.mjs';

const origin = 'https://neuralbank.example';
const proposal = {
  name: 'GRU', category: 'sequence',
  summary: '使用更新门和重置门控制隐藏状态，减少普通循环神经网络的长期依赖学习困难。',
  source: 'https://arxiv.org/abs/1406.1078', contributor: 'A learner',
};
function request(method = 'GET', body, extraHeaders = {}) {
  return new Request(origin + '/api/contributions', {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json', origin } : {}), ...extraHeaders },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
}
function d1Adapter(database) {
  return {
    prepare(sql) {
      return { bind(...values) {
        const statement = database.prepare(sql);
        return {
          async all() { return { results: statement.all(...values) }; },
          async run() { return statement.run(...values); },
        };
      } };
    },
  };
}

await test('production migration and parameterized D1 queries preserve old and new-family proposals', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec(await readFile(new URL('../drizzle/0000_community_contributions.sql', import.meta.url), 'utf8'));
    const store = createD1Store(d1Adapter(database));
    let response = await handleContributions(request(), store);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { contributions: [] });
    const content = { ...proposal, name: "<script>alert('x')</script>", summary: proposal.summary + " '); DROP TABLE contributions; --" };
    response = await handleContributions(request('POST', content), store);
    assert.equal(response.status, 201);
    const created = (await response.json()).contribution;
    assert.match(created.id, /^[\da-f-]{36}$/);
    assert.equal(created.name, content.name);
    assert.equal(created.summary, content.summary);
    assert.equal(database.prepare('SELECT count(*) AS count FROM contributions').get().count, 1);
    response = await handleContributions(request(), store);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual((await response.json()).contributions[0], created);
    const newFamilyProposals = [
      { ...proposal, name: 'Vision Transformer', category: 'attention',
        summary: '将图像切分为 patch，映射为 token 后使用自注意力建立不同图像区域间的联系。',
        source: 'https://arxiv.org/abs/2010.11929' },
      { ...proposal, name: 'Neural Turing Machine', category: 'memory',
        summary: '控制器通过可微读写头访问外部记忆矩阵，用内容和位置寻址保存任务所需的信息。',
        source: 'https://arxiv.org/abs/1410.5401' },
      { ...proposal, name: 'Graph Convolutional Network', category: 'graph',
        summary: '通过含自环的归一化邻接关系聚合邻居节点表示，用图结构约束每层的信息传播。',
        source: 'https://arxiv.org/abs/1609.02907' },
    ];
    for (const value of newFamilyProposals) {
      response = await handleContributions(request('POST', value), store);
      assert.equal(response.status, 201);
      const saved = (await response.json()).contribution;
      assert.equal(saved.category, value.category);
      assert.equal(database.prepare('SELECT category FROM contributions WHERE id = ?').get(saved.id).category, value.category);
    }
    response = await handleContributions(request(), store);
    const persisted = (await response.json()).contributions;
    assert.equal(persisted.length, 4);
    assert.deepEqual(new Set(persisted.map(value => value.category)), new Set(['sequence', 'attention', 'memory', 'graph']));
    assert.deepEqual(persisted.find(value => value.id === created.id), created);
    database.prepare("UPDATE contributions SET status = 'approved'").run();
    response = await handleContributions(request(), store);
    assert.deepEqual(await response.json(), { contributions: [] });
  } finally { database.close(); }
});

await test('local proposals survive a fresh store instance, including concurrent submissions', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'neuralbank-api-'));
  try {
    const file = path.join(directory, 'contributions.json');
    const store = createLocalStore(file);
    assert.deepEqual(await store.list(), []);
    await Promise.all(Array.from({ length: 4 }, (_, n) => handleContributions(request('POST', { ...proposal, name: 'GRU ' + n }), store)));
    const reloaded = createLocalStore(file);
    const values = await reloaded.list();
    assert.equal(values.length, 4);
    assert.equal(new Set(values.map(value => value.id)).size, 4);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

await test('invalid data, source schemes, categories, and malformed JSON do not save', async () => {
  let saved = false;
  const store = { create: async () => { saved = true; } };
  const cases = [
    { ...proposal, name: 'x' },
    { ...proposal, summary: 'too short' },
    { ...proposal, summary: 'x'.repeat(1601) },
    { ...proposal, category: 'other' },
    { ...proposal, source: 'javascript:alert(1)' },
    { ...proposal, source: 'http://example.org' },
    { ...proposal, source: 'https://user:password@example.org' },
    { ...proposal, contributor: 123 },
    [], null, '{ broken',
  ];
  for (const value of cases) {
    const response = await handleContributions(request('POST', value), store);
    assert.equal(response.status, 400, JSON.stringify(value));
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal(saved, false);
});

await test('oversized content is rejected even without a declared length', async () => {
  let saved = false;
  const store = { create: async () => { saved = true; } };
  const response = await handleContributions(request('POST', { ...proposal, summary: 'x'.repeat(9000) }), store);
  assert.equal(response.status, 413);
  assert.equal(saved, false);
});

await test('cross-origin submissions and non-JSON requests are rejected', async () => {
  const response = await handleContributions(request('POST', proposal, { origin: 'https://other.example' }), {});
  assert.equal(response.status, 403);
  const textResponse = await handleContributions(request('POST', proposal, { 'content-type': 'text/plain' }), {});
  assert.equal(textResponse.status, 415);
});

await test('unsupported routes and methods have explicit responses', async () => {
  const response = await handleContributions(request('DELETE'), {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, POST');
  const missing = await handleContributions(new Request(origin + '/api/missing'), {});
  assert.equal(missing.status, 404);
});

await test('storage failure returns actionable errors without leaking database internals', async () => {
  const store = {
    create: async () => { throw new Error('secret database stack'); },
    list: async () => { throw new Error('secret database stack'); },
  };
  for (const req of [request(), request('POST', proposal)]) {
    const response = await handleContributions(req, store);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /secret/);
  }
});
