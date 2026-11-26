import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { models } from '../src/models.js';
import { benchmarks } from '../src/benchmarks.js';
import { handleSubmissions, createD1SubmissionStore } from './submission-api.mjs';
import { createLocalSubmissionStore } from './submission-local-store.mjs';

const origin = 'https://neuralbank.example';
const context = { models, benchmarks };
const hosted = { trustedPlatform: true, context };
const local = { trustedPlatform: false, context };
function editPayload() {
  return {
    schemaVersion: 1, kind: 'model-edit', displayName: '自动测试用虚构署名', modelId: 'mlp',
    changes: { tagline: '自动测试用虚构说明：观察加权求和与非线性激活如何逐层组合。' },
    sources: ['https://example.org/fictional-test-source'],
    rationale: '这是一份自动测试专用的虚构编辑建议，仅检验投稿保存流程，不代表事实修正或已审核内容。',
  };
}
function request(route = '/api/submissions', { method = 'GET', body, userId, headers = {} } = {}) {
  return new Request(origin + route, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json', origin } : {}),
      ...(userId ? { 'oai-authenticated-user-id': userId, 'oai-authenticated-user-email': 'private-account@example.org' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
}
function d1Adapter(database) {
  return {
    prepare(sql) {
      const statement = database.prepare(sql);
      const query = values => ({
        async all() { return { results: statement.all(...values) }; },
        async run() { return statement.run(...values); },
      });
      return { ...query([]), bind(...values) { return query(values); } };
    },
  };
}
async function withStore(callback) {
  const database = new DatabaseSync(':memory:');
  try {
    for (const name of ['0000_community_contributions.sql', '0001_personal_learning.sql']) {
      database.exec(await readFile(new URL('../drizzle/' + name, import.meta.url), 'utf8'));
    }
    database.prepare('INSERT INTO learning_progress (user_id,learned_json,revision,updated_at) VALUES (?,?,?,?)').run('existing-user', '["mlp"]', 1, '2026-11-26T00:00:00Z');
    database.exec(await readFile(new URL('../drizzle/0002_community_submissions.sql', import.meta.url), 'utf8'));
    assert.equal(database.prepare('SELECT learned_json FROM learning_progress WHERE user_id = ?').get('existing-user').learned_json, '["mlp"]');
    await callback(createD1SubmissionStore(d1Adapter(database)), database);
  } finally { database.close(); }
}

await test('anonymous format validation does not persist, execute code, or claim reproduction', async () => {
  let written = false;
  const response = await handleSubmissions(request('/api/submissions/validate', { method: 'POST', body: editPayload() }), { create() { written = true; } }, hosted);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.checks, { format: 'passed', reproduction: 'not-run', execution: 'not-run' });
  assert.equal(result.value.modelId, 'mlp');
  assert.equal(written, false);
});

await test('submission revalidates content and rejects forged server review states', async () => {
  let written = false;
  const store = { create() { written = true; } };
  for (const forged of [
    { ...editPayload(), status: 'accepted' },
    { ...editPayload(), formatStatus: 'passed' },
    { ...editPayload(), reproductionStatus: 'verified' },
    { ...editPayload(), authorId: 'another-user' },
    { ...editPayload(), modelId: 'not-in-catalog' },
  ]) {
    const response = await handleSubmissions(request('/api/submissions', { method: 'POST', body: forged, userId: 'alice' }), store, hosted);
    assert.equal(response.status, 422);
    const result = await response.json();
    assert.equal(result.valid, false);
    assert(result.errors.length > 0);
  }
  assert.equal(written, false);
});

await test('self-run benchmark submissions retain exact protocol metadata and remain unverified', async () => {
  const fixture = JSON.parse(await readFile(new URL('../examples/submissions/benchmark-result.valid.json', import.meta.url), 'utf8'));
  await withStore(async (store, database) => {
    const response = await handleSubmissions(request('/api/submissions', { method: 'POST', body: fixture, userId: 'benchmark-author' }), store, hosted);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.submission.payload.kind, 'benchmark-result');
    assert.deepEqual(result.submission.payload.score, fixture.score);
    assert.deepEqual(result.submission.payload.evaluation, fixture.evaluation);
    assert.deepEqual(result.submission.payload.reproduction, fixture.reproduction);
    assert.equal(result.submission.reproductionStatus, 'unverified');
    assert.equal(result.submission.status, 'pending');
    assert.equal(database.prepare('SELECT count(*) AS total FROM submissions').get().total, 1);
    for (const altered of [
      { ...fixture, score: { ...fixture.score, metric: 'accuracy' } },
      { ...fixture, evaluation: { ...fixture.evaluation, conditions: { shots: 0 } } },
    ]) {
      const rejected = await handleSubmissions(request('/api/submissions', { method: 'POST', body: altered, userId: 'benchmark-author' }), store, hosted);
      assert.equal(rejected.status, 422);
    }
    assert.equal(database.prepare('SELECT count(*) AS total FROM submissions').get().total, 1);
  });
});

await test('hosted writes require platform identity while local guest posts ignore spoofed identities', async () => {
  const unauthorized = await handleSubmissions(request('/api/submissions', { method: 'POST', body: editPayload() }), {}, hosted);
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).code, 'AUTH_REQUIRED');
  const mismatch = await handleSubmissions(request('/api/submissions', { method: 'POST', body: editPayload(), userId: 'bob', headers: { 'X-NeuralBank-User': 'alice' } }), {}, hosted);
  assert.equal(mismatch.status, 401);
  assert.equal((await mismatch.json()).code, 'ACCOUNT_CHANGED');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'neuralbank-submissions-'));
  try {
    const file = path.join(directory, 'submissions.json');
    const response = await handleSubmissions(request('/api/submissions', { method: 'POST', body: editPayload(), userId: 'forged-platform-id' }), createLocalSubmissionStore(file), local);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.scope, 'local');
    assert.equal(result.submission.scope, 'local');
    assert.equal(result.submission.payload.displayName, editPayload().displayName);
    assert.equal('authorId' in result.submission, false);
    const raw = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(raw[0].authorId, 'local-preview');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

await test('D1 saves immutable pending records, hashes canonical content, deduplicates per author, and returns no private identity', async () => {
  await withStore(async (store, database) => {
    const response = await handleSubmissions(request('/api/submissions', { method: 'POST', body: editPayload(), userId: 'private-alice' }), store, hosted);
    assert.equal(response.status, 201);
    const first = await response.json();
    assert.equal(first.duplicate, false);
    assert.equal(first.submission.status, 'pending');
    assert.equal(first.submission.formatStatus, 'passed');
    assert.equal(first.submission.reproductionStatus, 'unverified');
    assert.match(first.submission.contentHash, /^[a-f0-9]{64}$/);
    assert.equal(database.prepare('SELECT author_id FROM submissions').get().author_id, 'private-alice');
    const reordered = Object.fromEntries(Object.entries(editPayload()).reverse());
    const duplicates = await Promise.all(Array.from({ length: 3 }, () => handleSubmissions(request('/api/submissions', { method: 'POST', body: reordered, userId: 'private-alice' }), store, hosted)));
    for (const duplicate of duplicates) {
      assert.equal(duplicate.status, 200);
      const result = await duplicate.json();
      assert.equal(result.duplicate, true);
      assert.deepEqual(result.submission, first.submission);
    }
    assert.equal(database.prepare('SELECT count(*) AS total FROM submissions').get().total, 1);
    const anotherAuthor = await handleSubmissions(request('/api/submissions', { method: 'POST', body: editPayload(), userId: 'private-bob' }), store, hosted);
    assert.equal(anotherAuthor.status, 201);
    const listing = await handleSubmissions(request(), store, hosted);
    assert.equal(listing.status, 200);
    const text = await listing.text();
    assert.doesNotMatch(text, /private-alice|private-bob|private-account@example.org|authorId/);
    const publicList = JSON.parse(text);
    assert.equal(publicList.scope, 'hosted');
    assert.equal(publicList.submissions.length, 2);
    const rejectedUpdate = await handleSubmissions(request('/api/submissions', { method: 'PUT', body: editPayload(), userId: 'private-alice' }), store, hosted);
    assert.equal(rejectedUpdate.status, 405);
  });
});

await test('local posts survive store reload and concurrent duplicates remain one immutable record', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'neuralbank-submissions-'));
  try {
    const file = path.join(directory, 'submissions.json');
    const store = createLocalSubmissionStore(file);
    const responses = await Promise.all(Array.from({ length: 4 }, () => handleSubmissions(request('/api/submissions', { method: 'POST', body: editPayload() }), store, local)));
    assert.equal(responses.filter(response => response.status === 201).length, 1);
    assert.equal(responses.filter(response => response.status === 200).length, 3);
    const listing = await handleSubmissions(request(), createLocalSubmissionStore(file), local);
    assert.equal((await listing.json()).submissions.length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

await test('submission transport enforces size, JSON, origin, and safe error responses', async () => {
  const cases = [
    { body: 'x'.repeat(33 * 1024), status: 413 },
    { body: '{broken', status: 400 },
    { body: editPayload(), headers: { 'content-type': 'text/plain' }, status: 415 },
    { body: editPayload(), headers: { origin: 'https://other.example' }, status: 403 },
    { body: editPayload(), headers: { 'sec-fetch-site': 'cross-site' }, status: 403 },
  ];
  for (const value of cases) {
    const response = await handleSubmissions(request('/api/submissions/validate', { method: 'POST', ...value }), {}, local);
    assert.equal(response.status, value.status);
  }
  const failure = await handleSubmissions(request(), { list() { throw new Error('secret database diagnostic'); } }, local);
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /secret/);
});
