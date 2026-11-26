import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { handleSession, handleLearning, createD1LearningStore } from './learning-api.mjs';

const origin = 'https://neuralbank.example';
const validModelIds = new Set(['mlp', 'cnn', 'transformer', 'mamba']);
const hosted = { trustedPlatform: true, validModelIds };
function request(path, { method = 'GET', userId, email, body, headers = {} } = {}) {
  return new Request(origin + path, {
    method,
    headers: {
      ...(userId ? { 'oai-authenticated-user-id': userId, 'oai-authenticated-user-email': email || 'learner@example.org' } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json', origin } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
}
function d1Adapter(database) {
  return {
    prepare(sql) {
      return { bind(...values) {
        return { async all() { return { results: database.prepare(sql).all(...values) }; } };
      } };
    },
  };
}
async function withStore(callback) {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec(await readFile(new URL('../drizzle/0000_community_contributions.sql', import.meta.url), 'utf8'));
    database.prepare('INSERT INTO contributions (id,name,category,summary,source,contributor,created_at) VALUES (?,?,?,?,?,?,?)')
      .run('existing-proposal', 'GRU', 'sequence', 'Existing community proposal remains intact.', 'https://arxiv.org/abs/1406.1078', 'Learner', '2026-11-26T00:00:00Z');
    database.exec(await readFile(new URL('../drizzle/0001_personal_learning.sql', import.meta.url), 'utf8'));
    assert.equal(database.prepare('SELECT id FROM contributions').get().id, 'existing-proposal');
    await callback(createD1LearningStore(d1Adapter(database)), database);
  } finally { database.close(); }
}

await test('hosted session uses platform identity and safe dispatch-owned sign-in paths', async () => {
  const guest = await handleSession(request('/api/session'), hosted).json();
  assert.deepEqual(guest, {
    authAvailable: true, authenticated: false, user: null,
    signInUrl: '/signin-with-chatgpt?return_to=%2F%23learning',
    signOutUrl: '/signout-with-chatgpt?return_to=%2F%23learning',
  });
  const response = handleSession(request('/api/session?return_to=%2F%2Fevil.example', {
    userId: 'stable-site-user',
    headers: {
      'oai-authenticated-user-full-name': encodeURIComponent('学习者'),
      'oai-authenticated-user-full-name-encoding': 'percent-encoded-utf-8',
    },
  }), hosted);
  const session = await response.json();
  assert.equal(session.authenticated, true);
  assert.deepEqual(session.user, { id: 'stable-site-user', email: 'learner@example.org', displayName: '学习者' });
  assert.equal(session.signInUrl, guest.signInUrl);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const incomplete = await handleSession(request('/api/session', { headers: { 'oai-authenticated-user-id': 'id-only' } }), hosted).json();
  assert.equal(incomplete.authenticated, false);
});

await test('local preview ignores spoofed platform headers and leaves visitor learning local', async () => {
  const forged = request('/api/session', { userId: 'forged-user' });
  const session = await handleSession(forged, { trustedPlatform: false }).json();
  assert.deepEqual(session, { authAvailable: false, authenticated: false, user: null, signInUrl: null, signOutUrl: null });
  let accessed = false;
  const store = { get() { accessed = true; }, put() { accessed = true; } };
  for (const method of ['GET', 'PUT']) {
    const response = await handleLearning(request('/api/learning', {
      method, userId: 'forged-user', ...(method === 'PUT' ? { body: { learned: ['mlp'], revision: 0 } } : {}),
    }), store, { trustedPlatform: false, validModelIds });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'AUTH_REQUIRED');
  }
  assert.equal(accessed, false);
});

await test('D1 learning records are isolated by stable platform user ID and preserve existing tables', async () => {
  await withStore(async store => {
    let response = await handleLearning(request('/api/learning', { userId: 'alice' }), store, hosted);
    assert.deepEqual(await response.json(), { learned: [], revision: 0, updatedAt: null });
    response = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: { learned: ['mlp', 'cnn', 'mlp'], revision: 0 } }), store, hosted);
    assert.equal(response.status, 200);
    const alice = await response.json();
    assert.deepEqual(alice.learned, ['mlp', 'cnn']);
    assert.equal(alice.revision, 1);
    assert.match(alice.updatedAt, /^\d{4}-\d\d-\d\dT/);
    response = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'bob', body: { learned: ['transformer'], revision: 0 } }), store, hosted);
    assert.equal(response.status, 200);
    // Same email does not confer access to another stable ID; query IDs never select the owner.
    response = await handleLearning(request('/api/learning?userId=bob', { userId: 'alice', email: 'changed-address@example.org' }), store, hosted);
    assert.deepEqual(await response.json(), alice);
    response = await handleLearning(request('/api/learning', { userId: 'bob' }), store, hosted);
    assert.deepEqual((await response.json()).learned, ['transformer']);
    response = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: { learned: [], revision: 1 } }), store, hosted);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).learned, []);
    assert.deepEqual((await store.get('bob')).learned, ['transformer']);
  });
});

await test('expected-account preconditions reject stale tabs without accessing another account', async () => {
  let accessed = false;
  const store = {
    get() { accessed = true; },
    put() { accessed = true; },
  };
  for (const method of ['GET', 'PUT']) {
    const response = await handleLearning(request('/api/learning', {
      method, userId: 'bob', headers: { 'X-NeuralBank-User': 'alice' },
      ...(method === 'PUT' ? { body: { learned: ['mlp'], revision: 0 } } : {}),
    }), store, hosted);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'ACCOUNT_CHANGED');
  }
  assert.equal(accessed, false);
  await withStore(async realStore => {
    const response = await handleLearning(request('/api/learning', {
      method: 'PUT', userId: 'alice', headers: { 'X-NeuralBank-User': 'alice' },
      body: { learned: ['mlp'], revision: 0 },
    }), realStore, hosted);
    assert.equal(response.status, 200);
    assert.deepEqual((await realStore.get('alice')).learned, ['mlp']);
    assert.deepEqual((await realStore.get('bob')).learned, []);
  });
});

await test('atomic revision checks prevent stale first saves and concurrent overwrites', async () => {
  await withStore(async store => {
    const first = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: { learned: ['mlp'], revision: 0 } }), store, hosted);
    assert.equal(first.status, 200);
    const staleFirst = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: { learned: ['cnn'], revision: 0 } }), store, hosted);
    assert.equal(staleFirst.status, 409);
    const conflict = await staleFirst.json();
    assert.equal(conflict.code, 'REVISION_CONFLICT');
    assert.equal(conflict.revision, 1);
    assert.deepEqual(conflict.learned, ['mlp']);
    const simultaneous = await Promise.all([
      handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: { learned: ['mlp', 'cnn'], revision: 1 } }), store, hosted),
      handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: { learned: ['mlp', 'transformer'], revision: 1 } }), store, hosted),
    ]);
    assert.deepEqual(simultaneous.map(response => response.status).sort(), [200, 409]);
    const current = await store.get('alice');
    assert.equal(current.revision, 2);
    assert.equal(current.learned.length, 2);
    // A made-up version cannot create a new user's row.
    const fakeRevision = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'new-user', body: { learned: ['mamba'], revision: 9 } }), store, hosted);
    assert.equal(fakeRevision.status, 409);
    assert.deepEqual(await store.get('new-user'), { learned: [], revision: 0, updatedAt: null });
  });
});

await test('learning saves reject client owner IDs, unknown models, invalid revisions, and cross-origin requests', async () => {
  await withStore(async store => {
    const invalidBodies = [
      { learned: ['mlp'], revision: 0, userId: 'bob' },
      { learned: ['not-a-model'], revision: 0 },
      { learned: [1], revision: 0 },
      { learned: 'mlp', revision: 0 },
      { learned: ['mlp'], revision: -1 },
      { learned: ['mlp'], revision: 0.5 },
      { learned: ['mlp'] },
      '{ malformed',
    ];
    for (const body of invalidBodies) {
      const response = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body }), store, hosted);
      assert.equal(response.status, 400);
    }
    const oversized = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: 'x'.repeat(9000) }), store, hosted);
    assert.equal(oversized.status, 413);
    const wrongType = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: {}, headers: { 'content-type': 'text/plain' } }), store, hosted);
    assert.equal(wrongType.status, 415);
    const crossOrigin = await handleLearning(request('/api/learning', { method: 'PUT', userId: 'alice', body: { learned: [], revision: 0 }, headers: { origin: 'https://other.example' } }), store, hosted);
    assert.equal(crossOrigin.status, 403);
    assert.deepEqual(await store.get('alice'), { learned: [], revision: 0, updatedAt: null });
  });
});

await test('guest, unsupported methods, and storage failures return explicit safe responses', async () => {
  const guest = await handleLearning(request('/api/learning'), null, hosted);
  assert.equal(guest.status, 401);
  const unsupported = await handleLearning(request('/api/learning', { method: 'DELETE', userId: 'alice' }), {}, hosted);
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get('allow'), 'GET, PUT');
  const noDatabase = await handleLearning(request('/api/learning', { userId: 'alice' }), null, hosted);
  assert.equal(noDatabase.status, 503);
  const failedStore = { get() { throw new Error('secret database diagnostics'); } };
  const failure = await handleLearning(request('/api/learning', { userId: 'alice' }), failedStore, hosted);
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /secret/);
});
