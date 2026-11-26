import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudAuth } from '../src/cloud-auth.js';
import { createClient } from '../src/vendor/supabase.js';
import { createLearningLibrary } from '../src/learning-sync.js';

const config = { url: 'https://study.supabase.co', publicKey: 'sb_publishable_testpublickey', githubEnabled: true, emailEnabled: true };
const key = 'neuralbank-supabase:study.supabase.co';
const alice = '65a23e24-658c-40cf-956d-a6802e5e1e20';
const bob = 'e46f39ec-0123-4389-8767-656138c5a4ce';
const aliceSubject = `supabase:study.supabase.co:${alice}`;
const tokenFor = id => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', exp: 4102444800 })).toString('base64url')}.testsignature`;
const userFor = id => ({ id, aud: 'authenticated', role: 'authenticated', email: `${id === alice ? 'alice' : 'bob'}@university.ac.uk`, email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {} });
const sessionFor = id => ({ access_token: tokenFor(id), refresh_token: `refresh-${id}`, expires_in: 3600, expires_at: 4102444800, token_type: 'bearer', user: userFor(id) });
function memory() {
  const values = new Map();
  return { getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value), removeItem: name => values.delete(name), key: index => [...values.keys()][index] ?? null, get length() { return values.size; } };
}
function harness({ userId = alice, eligible = true, knownDomain = true, onRequest, location: suppliedLocation, config: suppliedConfig = config, storage: suppliedStorage } = {}) {
  const storage = suppliedStorage || memory();
  if (userId) storage.setItem(`neuralbank-supabase:${new URL(suppliedConfig.url).host}`, JSON.stringify(sessionFor(userId)));
  const requests = [];
  const rows = new Map();
  let options;
  let authCalls = 0;
  const location = suppliedLocation || { href: 'https://arthurqqqq.github.io/NeuralBank/?view=personal#learning', replaceState(_state, _title, url) { this.href = new URL(url, this.href).href; } };
  const fetcher = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    const body = init.body ? JSON.parse(init.body) : null;
    const request = { path: url.pathname, headers, body, method: init.method || 'GET' };
    requests.push(request);
    const overridden = await onRequest?.(request, { storage, rows });
    if (overridden) return overridden;
    const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
    const token = headers.get('authorization')?.replace(/^Bearer /, '');
    const id = token === tokenFor(alice) ? alice : token === tokenFor(bob) ? bob : null;
    if (url.pathname === '/auth/v1/user') { authCalls++; return id ? json(userFor(id)) : json({ msg: 'Invalid JWT', code: 'bad_jwt' }, 401); }
    if (url.pathname === '/auth/v1/token') return json(sessionFor(alice));
    if (url.pathname === '/auth/v1/otp') return json({});
    if (url.pathname === '/auth/v1/verify') return json(sessionFor(alice));
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (url.pathname === '/rest/v1/rpc/check_neuralbank_email_domain') return json(knownDomain);
    if (url.pathname === '/rest/v1/rpc/get_neuralbank_auth_status') return json({ eligible, reason: eligible ? null : 'ACADEMIC_EMAIL_REQUIRED' });
    if (!id) return json({ code: '42501', message: 'AUTH_REQUIRED' }, 403);
    const row = rows.get(id) || { learned: [], revision: 0, updatedAt: null };
    if (url.pathname === '/rest/v1/rpc/get_neuralbank_learning') return json(row);
    if (url.pathname === '/rest/v1/rpc/put_neuralbank_learning') {
      if (body.expected_revision !== row.revision) return json({ ok: false, code: 'REVISION_CONFLICT', ...row });
      const next = { learned: body.model_ids, revision: row.revision + 1, updatedAt: '2026-11-26T12:00:00Z' };
      rows.set(id, next);
      return json({ ok: true, ...next });
    }
    return json({ message: 'Unexpected path' }, 404);
  };
  const adapter = createCloudAuth({ config: suppliedConfig, storage, location, fetcher,
    clientFactory: (url, publicKey, opts) => { options = opts; return createClient(url, publicKey, { ...opts, auth: { ...opts.auth, autoRefreshToken: false } }); },
  });
  return { adapter, storage, requests, rows, location, options: () => options, authCalls: () => authCalls };
}

test('unconfigured and rejected secret config stay offline and never fake authentication', async () => {
  const secretJwt = `e30.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.sig`;
  for (const item of [undefined, {}, { ...config, url: 'http://study.supabase.co' }, { ...config, url: 'https://user:pass@study.supabase.co' }, { ...config, publicKey: 'sb_secret_neverpublic' }, { ...config, publicKey: secretJwt }]) {
    const adapter = createCloudAuth({ config: item, clientFactory() { assert.fail('A rejected config created an SDK client'); }, fetcher() { assert.fail('A rejected config used the network'); } });
    assert.equal(adapter.configured, false);
    const session = await adapter.getSession();
    assert.equal(session.authAvailable, false);
    assert.equal(session.authenticated, false);
    assert.equal(session.user, null);
    const response = await adapter.learningFetcher('/api/learning');
    assert.equal(response.status, 401);
    await assert.rejects(adapter.signInWithGitHub(), { code: 'AUTH_NOT_CONFIGURED' });
  }
});

test('PKCE callback captures the original query before the app router changes it', async () => {
  const location = { href: 'https://arthurqqqq.github.io/NeuralBank/?code=original-code&view=personal#learning', replaceState(_state, _title, url) { this.href = new URL(url, this.href).href; } };
  const h = harness({ userId: null, location });
  h.storage.setItem(`${key}-code-verifier`, JSON.stringify('a-saved-verifier'));
  location.href = 'https://arthurqqqq.github.io/NeuralBank/?view=personal#learning';
  const session = await h.adapter.getSession();
  assert.equal(session.user.id, aliceSubject);
  const exchange = h.requests.find(request => request.path === '/auth/v1/token');
  assert.equal(exchange.body.auth_code, 'original-code');
  assert.equal(exchange.body.code_verifier, 'a-saved-verifier');
  assert.equal(h.options().auth.flowType, 'pkce');
  assert.equal(h.options().auth.detectSessionInUrl, false);
  assert.match(location.href, /\?view=personal#learning$/);
});

test('OAuth errors clear only callback parameters and surface failure without treating it as a login', async () => {
  const h = harness({ userId: null, location: { href: 'https://arthurqqqq.github.io/NeuralBank/?error=access_denied&error_description=secret-like-value&view=personal#learning', replaceState(_s, _t, url) { this.href = new URL(url, this.href).href; } } });
  await assert.rejects(h.adapter.getSession(), { code: 'OAUTH_CALLBACK_ERROR' });
  assert.equal(h.adapter.status, 'error');
  assert.match(h.location.href, /\?view=personal#learning$/);
  assert.equal(h.requests.length, 0);
  assert.doesNotMatch(h.adapter.error, /secret-like-value/);
});

test('session identity is verified by Auth server and database eligibility', async () => {
  const allowed = harness();
  const session = await allowed.adapter.getSession();
  assert.equal(session.authenticated, true);
  assert.equal(session.user.id, aliceSubject);
  assert.equal(allowed.authCalls(), 1);
  const denied = harness({ eligible: false });
  const blocked = await denied.adapter.getSession();
  assert.equal(blocked.authenticated, false);
  assert.equal(blocked.user, null);
  assert.equal(blocked.code, 'ACADEMIC_EMAIL_REQUIRED');
  const response = await denied.adapter.learningFetcher('/api/learning');
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'ACADEMIC_EMAIL_REQUIRED');
});

test('an Auth server outage is an error, preserving account cache instead of claiming signed out', async () => {
  const h = harness({ onRequest: request => request.path === '/auth/v1/user' ? new Response(JSON.stringify({ message: 'Unavailable' }), { status: 503 }) : null });
  await assert.rejects(h.adapter.getSession(), { code: 'AUTH_UNAVAILABLE' });
  const response = await h.adapter.learningFetcher('/api/session');
  assert.equal(response.status, 503);
});

test('GitHub uses the official PKCE SDK and a same-page project-path return URL', async () => {
  const h = harness({ userId: null });
  const result = await h.adapter.signInWithGitHub();
  assert.equal(result.redirecting, true);
  const verifier = h.storage.getItem(`${key}-code-verifier`);
  assert.ok(verifier && verifier.length >= 43);
  assert.equal(h.options().auth.flowType, 'pkce');
  assert.equal(h.requests.length, 0);
});

test('email-code preflight rejects unknown domain and malformed addresses without sending mail', async () => {
  const h = harness({ userId: null, knownDomain: false });
  await assert.rejects(h.adapter.sendEmailCode('student@school.edu.attacker.com'), { code: 'ACADEMIC_EMAIL_REQUIRED' });
  await assert.rejects(h.adapter.sendEmailCode('not-an-email'), { code: 'INVALID_EMAIL' });
  assert.equal(h.requests.filter(request => request.path === '/auth/v1/otp').length, 0);
  assert.equal(h.requests.length, 1);
});

test('email OTP verifies six digits and only then exposes a verified, eligible learning account', async () => {
  const h = harness({ userId: null });
  assert.deepEqual(await h.adapter.sendEmailCode(' Student@University.ac.uk '), { sent: true });
  const preflight = h.requests.find(request => request.path.endsWith('/check_neuralbank_email_domain'));
  assert.equal(preflight.body.email_address, 'Student@university.ac.uk');
  const send = h.requests.find(request => request.path === '/auth/v1/otp');
  assert.equal(send.body.email, 'Student@university.ac.uk');
  await assert.rejects(h.adapter.verifyEmailCode('student@university.ac.uk', '12345'), { code: 'INVALID_CODE' });
  const verified = await h.adapter.verifyEmailCode('student@university.ac.uk', '123456');
  assert.equal(verified.authenticated, true);
  assert.equal(verified.user.id, aliceSubject);
  const verify = h.requests.find(request => request.path === '/auth/v1/verify');
  assert.deepEqual({ email: verify.body.email, token: verify.body.token, type: verify.body.type }, { email: 'student@university.ac.uk', token: '123456', type: 'email' });
});

test('learning CAS round trip preserves HTTP conflict shape for existing synchronization', async () => {
  const h = harness();
  const headers = { 'Content-Type': 'application/json', 'X-NeuralBank-User': aliceSubject };
  assert.deepEqual(await (await h.adapter.learningFetcher('/api/learning', { headers })).json(), { learned: [], revision: 0, updatedAt: null });
  const saved = await h.adapter.learningFetcher('/api/learning', { method: 'PUT', headers, body: JSON.stringify({ learned: ['mlp'], revision: 0 }) });
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).learned, ['mlp']);
  const conflict = await h.adapter.learningFetcher('/api/learning', { method: 'PUT', headers, body: JSON.stringify({ learned: ['cnn'], revision: 0 }) });
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { code: 'REVISION_CONFLICT', error: '学习记录已在其他页面或设备更新，请先合并最新记录。', learned: ['mlp'], revision: 1, updatedAt: '2026-11-26T12:00:00Z' });
});

test('an old account header cannot write to the newly signed-in account', async () => {
  const h = harness({ userId: bob });
  const response = await h.adapter.learningFetcher('/api/learning', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-NeuralBank-User': aliceSubject }, body: JSON.stringify({ learned: ['mlp'], revision: 0 }) });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'ACCOUNT_CHANGED');
  assert.equal(h.rows.size, 0);
});

test('an account switch after Auth verification keeps the in-flight RPC bound to the verified token', async () => {
  const h = harness({ onRequest(request, { storage }) { if (request.path === '/auth/v1/user') storage.setItem(key, JSON.stringify(sessionFor(bob))); } });
  const response = await h.adapter.learningFetcher('/api/learning', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-NeuralBank-User': aliceSubject }, body: JSON.stringify({ learned: ['mlp'], revision: 0 }) });
  assert.equal(response.status, 200);
  assert.deepEqual(h.rows.get(alice).learned, ['mlp']);
  assert.equal(h.rows.has(bob), false);
  for (const request of h.requests.filter(request => request.path.startsWith('/rest/v1/rpc/'))) assert.equal(request.headers.get('authorization'), `Bearer ${tokenFor(alice)}`);
});

test('invalid learning requests never reach the write RPC and unknown routes never proxy arbitrary URLs', async () => {
  const h = harness();
  for (const [body, expected] of [['{', 400], [JSON.stringify({ learned: ['mlp'], revision: 0, userId: bob }), 400], [JSON.stringify({ learned: ['<script>'], revision: 0 }), 400], ['x'.repeat(9000), 413]]) {
    const response = await h.adapter.learningFetcher('/api/learning', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(response.status, expected);
  }
  assert.equal((await h.adapter.learningFetcher('/api/learning', { method: 'DELETE' })).status, 405);
  assert.equal((await h.adapter.learningFetcher('/api/learning', { method: 'PUT', body: '{}' })).status, 415);
  assert.equal((await h.adapter.learningFetcher('https://evil.example/api/learning')).status, 404);
  assert.equal(h.requests.some(request => request.path.endsWith('/put_neuralbank_learning')), false);
});

test('a malformed RPC response is not reported as a saved learning library', async () => {
  const h = harness({ onRequest: request => request.path.endsWith('/put_neuralbank_learning') ? new Response(JSON.stringify({ ok: true, learned: ['mlp'], revision: '1' }), { headers: { 'content-type': 'application/json' } }) : null });
  const response = await h.adapter.learningFetcher('/api/learning', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learned: ['mlp'], revision: 0 }) });
  assert.equal(response.status, 503);
});

test('disabled providers and unavailable persistent storage fail before starting a redirect', async () => {
  const noProviders = createCloudAuth({ config: { ...config, githubEnabled: false, emailEnabled: false } });
  await assert.rejects(noProviders.signInWithGitHub(), { code: 'PROVIDER_DISABLED' });
  await assert.rejects(noProviders.sendEmailCode('student@university.ac.uk'), { code: 'PROVIDER_DISABLED' });
  const throwingStorage = { getItem() { throw new Error('private mode'); }, setItem() { throw new Error('private mode'); }, removeItem() { throw new Error('private mode'); } };
  const adapter = createCloudAuth({ config, storage: throwingStorage });
  await assert.rejects(adapter.signInWithGitHub(), { code: 'STORAGE_UNAVAILABLE' });
});

test('signing out clears the SDK session and notifies subscribers outside the Auth lock', async () => {
  const h = harness();
  await h.adapter.getSession();
  let notified = false;
  const stop = h.adapter.subscribe(async ({ event }) => { if (event === 'SIGNED_OUT') { assert.equal((await h.adapter.getSession()).authenticated, false); notified = true; } });
  await h.adapter.signOut();
  await new Promise(resolve => setTimeout(resolve, 30));
  stop();
  assert.equal(notified, true);
  assert.equal((await h.adapter.getSession()).authenticated, false);
});

test('a read-only browser store keeps an email session in memory and reports it as nonpersistent', async () => {
  const readOnly = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); }, removeItem() {} };
  const fetcher = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/verify') return Response.json(sessionFor(alice));
    if (url.pathname === '/auth/v1/user') return Response.json(userFor(alice));
    if (url.pathname.endsWith('/get_neuralbank_auth_status')) return Response.json({ eligible: true, reason: null });
    assert.fail(`Unexpected request ${url.pathname}`);
  };
  const adapter = createCloudAuth({ config, storage: readOnly, fetcher, clientFactory: (url, publicKey, options) => createClient(url, publicKey, { ...options, auth: { ...options.auth, autoRefreshToken: false } }) });
  assert.equal((await adapter.verifyEmailCode('student@university.ac.uk', '123456')).user.id, aliceSubject);
  assert.equal((await adapter.getSession()).authenticated, true);
  assert.equal(adapter.persistent, false);
});

test('database model validation errors remain actionable client errors, not claimed saved records', async () => {
  const h = harness({ onRequest: request => request.path.endsWith('/put_neuralbank_learning') ? Response.json({ code: '22023', message: 'INVALID_LEARNING_RECORD', details: null, hint: null }, { status: 400 }) : null });
  const response = await h.adapter.learningFetcher('/api/learning', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ learned: ['mlp'], revision: 0 }) });
  assert.equal(response.status, 400);
});

test('academic email normalization supports IDNA but never reinterprets URL syntax as a mailbox', async () => {
  const h = harness({ userId: null });
  assert.deepEqual(await h.adapter.sendEmailCode('student@bücher.example'), { sent: true });
  assert.equal(h.requests.find(request => request.path === '/auth/v1/otp').body.email, 'student@xn--bcher-kva.example');
  for (const value of ['student@uni.edu:443', 'student@uni.edu/path', 'student@%75ni.edu']) await assert.rejects(h.adapter.sendEmailCode(value), { code: 'INVALID_EMAIL' });
});

test('equal user UUIDs in different Supabase projects cannot share cached pending learning intents', async () => {
  const storage = memory();
  const first = harness({ storage, onRequest: request => request.path.endsWith('/put_neuralbank_learning') ? Response.json({ message: 'offline', code: 'TEMPORARY_FAILURE' }, { status: 503 }) : null });
  const libraryA = createLearningLibrary({ storage, validIds: ['mlp', 'cnn'], fetcher: first.adapter.learningFetcher });
  await libraryA.initialize();
  await libraryA.toggle('mlp');
  assert.equal(libraryA.getSnapshot().status, 'error');
  assert.equal(libraryA.getSnapshot().learned.has('mlp'), true);
  libraryA.destroy();
  const second = harness({ storage, config: { ...config, url: 'https://other-project.supabase.co' } });
  const sessionA = await first.adapter.getSession();
  const sessionB = await second.adapter.getSession();
  assert.equal(sessionA.user.id, aliceSubject);
  assert.equal(sessionB.user.id, `supabase:other-project.supabase.co:${alice}`);
  const libraryB = createLearningLibrary({ storage, validIds: ['mlp', 'cnn'], fetcher: second.adapter.learningFetcher });
  await libraryB.initialize();
  assert.equal(libraryB.getSnapshot().learned.size, 0);
  assert.equal(second.requests.some(request => request.path.endsWith('/put_neuralbank_learning')), false);
  libraryB.destroy();
});
