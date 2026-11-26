import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningLibrary } from '../src/learning-sync.js';

const ids = ['mlp', 'cnn', 'transformer', 'mamba3'];
const guestKey = 'neuralbank-learned';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function until(predicate) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setImmediate(resolve)); }
  assert.fail('Expected asynchronous operation was not reached');
}
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    entries() { return [...values.entries()]; },
  };
}
function service() {
  const state = {
    user: 'alice', authAvailable: true, offline: false, sessionOffline: false,
    accounts: new Map(), calls: [], getHook: null, putHook: null,
  };
  const account = id => {
    if (!state.accounts.has(id)) state.accounts.set(id, { learned: [], revision: 0, updatedAt: null });
    return state.accounts.get(id);
  };
  const copy = row => ({ ...row, learned: [...row.learned] });
  state.set = (id, learned) => { const previous = account(id); const next = { learned: [...learned], revision: previous.revision + 1, updatedAt: new Date().toISOString() }; state.accounts.set(id, next); return copy(next); };
  state.snapshot = id => copy(account(id));
  state.fetcher = async (path, options = {}) => {
    const method = options.method || 'GET';
    const headers = new Headers(options.headers);
    const body = options.body ? JSON.parse(options.body) : undefined;
    state.calls.push({ path, method, headers, body, credentials: options.credentials });
    if (path === '/api/session') {
      if (state.sessionOffline) throw new Error('offline');
      return json({ authAvailable: state.authAvailable, authenticated: Boolean(state.user), user: state.user ? { id: state.user, displayName: state.user } : null, signInUrl: '/signin-with-chatgpt?return_to=%2F%23learning', signOutUrl: '/signout' });
    }
    if (state.offline) throw new Error('offline');
    if (!state.user) return json({ code: 'AUTH_REQUIRED', error: '请登录' }, 401);
    if (headers.get('X-NeuralBank-User') !== state.user) return json({ code: 'ACCOUNT_CHANGED', error: '账户已变化' }, 401);
    const owner = state.user;
    if (method === 'GET') return state.getHook ? state.getHook({ owner, snapshot: state.snapshot(owner) }) : json(state.snapshot(owner));
    if (state.putHook) {
      const response = await state.putHook({ owner, body });
      if (response) return response;
    }
    const row = account(owner);
    if (body.revision !== row.revision) return json({ code: 'REVISION_CONFLICT', error: '请合并最新记录', ...copy(row) }, 409);
    return json(state.set(owner, body.learned));
  };
  return state;
}
const client = (storage, remote, onChange) => createLearningLibrary({ storage, validIds: ids, fetcher: remote.fetcher, onChange });
const learned = library => [...library.getSnapshot().learned].sort();

test('guest records retain their original key and never require authentication', async () => {
  const storage = memoryStorage({ [guestKey]: JSON.stringify(['mlp', 'future-model']) });
  const remote = service(); remote.user = null; remote.authAvailable = false;
  const library = client(storage, remote);
  await library.initialize();
  assert.deepEqual(learned(library), ['mlp']);
  assert.equal(library.getSnapshot().status, 'local');
  assert.equal(library.getSnapshot().session.authAvailable, false);
  await library.toggle('cnn');
  assert.deepEqual(JSON.parse(storage.getItem(guestKey)), ['mlp', 'future-model', 'cnn']);
  assert.equal(remote.calls.filter(call => call.path === '/api/learning').length, 0);
  const snapshot = library.getSnapshot(); snapshot.learned.clear();
  assert.deepEqual(learned(library), ['cnn', 'mlp']);
  library.destroy();
});

test('account loading uses an empty account view, never the guest library', async () => {
  const storage = memoryStorage({ [guestKey]: '["mlp"]' });
  const remote = service(); remote.set('alice', ['cnn']);
  const gate = deferred(); remote.getHook = async ({ snapshot }) => { await gate.promise; return json(snapshot); };
  const library = client(storage, remote);
  const loading = library.initialize();
  await until(() => remote.calls.some(call => call.path === '/api/learning'));
  assert.equal(library.getSnapshot().session.user.id, 'alice');
  assert.equal(library.getSnapshot().status, 'loading');
  assert.deepEqual(learned(library), []);
  gate.resolve(); await loading;
  assert.deepEqual(learned(library), ['cnn']);
  assert.equal(library.getSnapshot().guestCount, 1);
  assert.equal(remote.calls.some(call => call.method === 'PUT'), false);
  assert.equal(storage.getItem(guestKey), '["mlp"]');
  library.destroy();
});

test('guest import is explicit, additive, and preserves the guest library', async () => {
  const storage = memoryStorage({ [guestKey]: '["mlp"]' });
  const remote = service(); remote.set('alice', ['cnn']);
  const library = client(storage, remote);
  await library.initialize();
  assert.deepEqual(remote.snapshot('alice').learned, ['cnn']);
  await library.importGuest();
  assert.deepEqual(new Set(remote.snapshot('alice').learned), new Set(['mlp', 'cnn']));
  assert.equal(storage.getItem(guestKey), '["mlp"]');
  assert.equal(library.getSnapshot().status, 'synced');
  assert.equal(library.getSnapshot().pendingCount, 0);
  for (const call of remote.calls.filter(call => call.path === '/api/learning')) {
    assert.equal(call.headers.get('X-NeuralBank-User'), 'alice');
    assert.equal(call.credentials, 'same-origin');
  }
  library.destroy();
});

test('rapid toggles during an in-flight save retain the final per-ID intent', async () => {
  const storage = memoryStorage(); const remote = service();
  const gate = deferred(); let saves = 0;
  remote.putHook = async () => { if (++saves === 1) await gate.promise; };
  const library = client(storage, remote); await library.initialize();
  const first = library.toggle('mlp');
  await until(() => saves === 1);
  const second = library.toggle('mlp');
  const third = library.toggle('cnn');
  assert.deepEqual(learned(library), ['cnn']);
  assert.equal(library.getSnapshot().status, 'syncing');
  gate.resolve(); await Promise.all([first, second, third]);
  assert.deepEqual(remote.snapshot('alice').learned, ['cnn']);
  assert.deepEqual(learned(library), ['cnn']);
  assert.equal(library.getSnapshot().pendingCount, 0);
  assert.equal(library.getSnapshot().status, 'synced');
  library.destroy();
});

test('revision conflict rebases only local intents and preserves unrelated remote changes', async () => {
  const storage = memoryStorage(); const remote = service(); remote.set('alice', ['mlp']);
  let conflict = true;
  remote.putHook = () => { if (conflict) { conflict = false; remote.set('alice', ['mlp', 'transformer']); } };
  const library = client(storage, remote); await library.initialize();
  await library.toggle('mlp');
  assert.deepEqual(remote.snapshot('alice').learned, ['transformer']);
  assert.deepEqual(learned(library), ['transformer']);
  const puts = remote.calls.filter(call => call.method === 'PUT');
  assert.equal(puts.length, 2);
  assert.deepEqual(puts[0].body.learned, []);
  assert.deepEqual(puts[1].body.learned, ['transformer']);
  library.destroy();
});

test('failed saves survive reload and replay on top of a fresh server snapshot', async () => {
  const storage = memoryStorage(); const remote = service();
  const first = client(storage, remote); await first.initialize();
  remote.offline = true; await first.toggle('mlp');
  assert.equal(first.getSnapshot().status, 'error');
  assert.equal(first.getSnapshot().pendingCount, 1);
  assert.equal(first.getSnapshot().saved, true);
  first.destroy();
  remote.offline = false; remote.set('alice', ['transformer']); remote.calls.length = 0;
  const reloaded = client(storage, remote); await reloaded.initialize();
  assert.deepEqual(new Set(remote.snapshot('alice').learned), new Set(['mlp', 'transformer']));
  assert.equal(reloaded.getSnapshot().status, 'synced');
  assert.equal(storage.entries().filter(([key]) => key.includes(':intent:')).length, 0);
  assert.deepEqual(remote.calls.map(call => `${call.method} ${call.path}`), ['GET /api/session', 'GET /api/learning', 'PUT /api/learning']);
  reloaded.destroy();
});

test('stable account IDs isolate caches and late responses cannot replace a new account', async () => {
  const storage = memoryStorage({ [guestKey]: '["mamba3"]' }); const remote = service();
  remote.set('alice', ['mlp']); remote.set('bob', ['cnn']);
  const gate = deferred();
  remote.getHook = async ({ owner, snapshot }) => { if (owner === 'alice') await gate.promise; return json(snapshot); };
  const library = client(storage, remote); const aliceLoad = library.initialize();
  await until(() => remote.calls.some(call => call.path === '/api/learning'));
  remote.user = 'bob'; await library.refresh();
  assert.equal(library.getSnapshot().session.user.id, 'bob');
  assert.deepEqual(learned(library), ['cnn']);
  gate.resolve(); await aliceLoad;
  assert.deepEqual(learned(library), ['cnn']);
  await library.toggle('transformer');
  assert.deepEqual(remote.snapshot('alice').learned, ['mlp']);
  assert.deepEqual(new Set(remote.snapshot('bob').learned), new Set(['cnn', 'transformer']));
  assert.equal(storage.getItem(guestKey), '["mamba3"]');
  library.destroy();
});

test('an account switch before PUT is rejected and old-account intents stay isolated', async () => {
  const storage = memoryStorage(); const remote = service();
  const library = client(storage, remote); await library.initialize();
  remote.user = 'bob';
  await library.toggle('mlp');
  assert.equal(library.getSnapshot().session.user.id, 'bob');
  assert.deepEqual(remote.snapshot('bob').learned, []);
  assert.deepEqual(learned(library), []);
  remote.user = 'alice'; await library.refresh();
  assert.deepEqual(remote.snapshot('alice').learned, ['mlp']);
  assert.deepEqual(remote.snapshot('bob').learned, []);
  library.destroy();
});

test('separate tab journals retain unrelated offline intents through cache replacement and reload', async () => {
  const storage = memoryStorage(); const remote = service();
  const left = client(storage, remote); const right = client(storage, remote);
  await Promise.all([left.initialize(), right.initialize()]);
  remote.offline = true;
  await left.toggle('mlp'); await right.toggle('cnn');
  assert.equal(storage.entries().filter(([key]) => key.includes(':intent:')).length, 2);
  // Simulate a stale tab replacing the shared display cache. Immutable intent
  // keys, unlike one shared pending array, are unaffected by that replacement.
  const cacheKey = storage.entries().find(([key]) => key.startsWith('neuralbank-learning-v1:') && !key.includes(':intent:'))[0];
  const stale = JSON.parse(storage.getItem(cacheKey)); stale.pending = {}; storage.setItem(cacheKey, JSON.stringify(stale));
  left.destroy(); right.destroy(); remote.offline = false;
  const reloaded = client(storage, remote); await reloaded.initialize();
  assert.deepEqual(new Set(remote.snapshot('alice').learned), new Set(['mlp', 'cnn']));
  assert.equal(reloaded.getSnapshot().pendingCount, 0);
  reloaded.destroy();
});

test('refresh during an in-flight save preserves newer local and remote progress', async () => {
  const storage = memoryStorage(); const remote = service();
  const gate = deferred(); let started = false;
  remote.putHook = async () => { if (!started) { started = true; await gate.promise; } };
  const library = client(storage, remote); await library.initialize();
  const saving = library.toggle('mlp'); await until(() => started);
  remote.set('alice', ['transformer']);
  const refreshed = library.refresh();
  const toggled = library.toggle('cnn');
  gate.resolve(); await Promise.all([saving, refreshed, toggled]);
  assert.deepEqual(new Set(remote.snapshot('alice').learned), new Set(['mlp', 'cnn', 'transformer']));
  assert.equal(library.getSnapshot().status, 'synced');
  library.destroy();
});

test('blocked storage and offline authentication preserve in-memory guest progress honestly', async () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const remote = service(); remote.sessionOffline = true;
  const library = client(blocked, remote);
  await library.toggle('mlp'); await library.initialize();
  assert.deepEqual(learned(library), ['mlp']);
  assert.equal(library.getSnapshot().session.authenticated, false);
  assert.equal(library.getSnapshot().status, 'local');
  assert.equal(library.getSnapshot().saved, false);
  assert.match(library.getSnapshot().error, /此浏览器/);
  await library.toggle('cnn');
  assert.deepEqual(learned(library), ['cnn', 'mlp']);
  library.destroy();
});

test('persistent conflicts stop after a bounded retry while retaining the pending intent', async () => {
  const storage = memoryStorage(); const remote = service();
  remote.putHook = () => { remote.set('alice', ['transformer']); };
  const library = client(storage, remote); await library.initialize();
  await library.toggle('mlp');
  assert.equal(library.getSnapshot().status, 'error');
  assert.equal(library.getSnapshot().pendingCount, 1);
  assert.deepEqual(learned(library), ['mlp', 'transformer']);
  assert.equal(remote.calls.filter(call => call.method === 'PUT').length, 6);
  library.destroy();
});

test('an authenticated offline edit with blocked storage never claims durable saving', async () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const remote = service(); remote.set('alice', ['cnn']);
  const library = client(blocked, remote); await library.initialize();
  assert.equal(library.getSnapshot().saved, true, 'the confirmed remote snapshot is durable');
  remote.offline = true; await library.toggle('mlp');
  assert.deepEqual(learned(library), ['cnn', 'mlp']);
  assert.equal(library.getSnapshot().status, 'error');
  assert.equal(library.getSnapshot().saved, false, 'the new edit exists only in this live session');
  assert.equal(library.getSnapshot().pendingCount, 1);
  library.destroy();
});

test('browser storage events merge another tab and trigger a revision-safe refresh', async () => {
  const listeners = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = {
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
  };
  let library;
  try {
    const storage = memoryStorage(); const remote = service();
    library = client(storage, remote); await library.initialize();
    remote.set('alice', ['transformer']);
    const cacheKey = storage.entries().find(([key]) => key.startsWith('neuralbank-learning-v1:'))[0];
    listeners.get('storage')({ key: cacheKey });
    await until(() => library.getSnapshot().status === 'synced' && library.getSnapshot().learned.has('transformer'));
    assert.deepEqual(learned(library), ['transformer']);
    assert.equal(remote.calls.filter(call => call.method === 'PUT').length, 0);
    library.destroy();
    assert.equal(listeners.has('storage'), false);
  } finally { library?.destroy(); if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});
