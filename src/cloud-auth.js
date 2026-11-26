import { createClient } from './vendor/supabase.js';

const CALLBACK_PARAMETERS = ['code', 'error', 'error_code', 'error_description', 'error_uri'];
const MODEL_ID = /^[a-z][a-z0-9-]{0,79}$/;

function authError(code, message) {
  return Object.assign(new Error(message), { code });
}

function publicConfiguration(value) {
  if (!value?.url && !value?.publicKey) return { configured: false, error: '' };
  try {
    const url = new URL(value.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
    const key = value.publicKey;
    if (typeof key !== 'string' || key.length > 4096) throw new Error();
    if (!/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(key)) {
      const parts = key.split('.');
      if (parts.length !== 3) throw new Error();
      const claims = JSON.parse(atob(parts[1].replaceAll('-', '+').replaceAll('_', '/')));
      if (claims.role !== 'anon') throw new Error();
    }
    return { configured: true, url: url.origin, publicKey: key, githubEnabled: value.githubEnabled === true, emailEnabled: value.emailEnabled === true };
  } catch {
    return { configured: false, error: '云端登录配置无效：只允许 HTTPS 项目地址和公开 publishable / anon key。' };
  }
}

function normalizeEmail(value) {
  if (typeof value !== 'string') throw authError('INVALID_EMAIL', '请输入有效的高校邮箱。');
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw authError('INVALID_EMAIL', '请输入有效的高校邮箱。');
  const at = email.lastIndexOf('@');
  let domain;
  try {
    const suppliedDomain = email.slice(at + 1);
    if (/[/:?#%\[\]\\]/.test(suppliedDomain)) throw new Error();
    const parsed = new URL(`https://${suppliedDomain}`);
    if (parsed.username || parsed.password || parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash || !/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)+$/.test(parsed.hostname)) throw new Error();
    domain = parsed.hostname;
  } catch { throw authError('INVALID_EMAIL', '请输入有效的高校邮箱。'); }
  return email.slice(0, at + 1) + domain;
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', ...extraHeaders } });
}

function learningSnapshot(value) {
  if (!value || !Array.isArray(value.learned) || value.learned.length > 256 || value.learned.some(id => typeof id !== 'string' || !MODEL_ID.test(id)) || !Number.isSafeInteger(value.revision) || value.revision < 0 || !(value.updatedAt === null || typeof value.updatedAt === 'string')) {
    throw authError('INVALID_SERVER_RESPONSE', '云端返回了无效的学习记录，请稍后重试。');
  }
  return { learned: [...new Set(value.learned)], revision: value.revision, updatedAt: value.updatedAt };
}

/** Official Supabase Auth + RLS transport for the existing learning library.
 * Public configuration contains no OAuth/SMTP/service-role credentials.
 * Every owner is selected by the JWT verified by Auth and auth.uid() in SQL.
 */
export function createCloudAuth({ config, storage, fetcher = globalThis.fetch?.bind(globalThis), location = globalThis.location, clientFactory = createClient } = {}) {
  const settings = publicConfiguration(config);
  // Capture synchronously: the application's hash router may immediately
  // replace the address before the asynchronous library initialization starts.
  let callbackUrl;
  try { callbackUrl = new URL(location?.href); } catch {}
  const capturedCode = callbackUrl?.searchParams.get('code');
  const capturedError = callbackUrl?.searchParams.get('error') || callbackUrl?.searchParams.get('error_code');
  const listeners = new Set();
  let state = settings.configured ? 'ready' : settings.error ? 'error' : 'unconfigured';
  let lastError = settings.error || '';
  let client;
  let initialization;
  let persistent = true;
  const memory = new Map();
  let suppliedStorage = storage;
  if (suppliedStorage === undefined && settings.configured) {
    try { suppliedStorage = globalThis.localStorage; } catch { persistent = false; }
  }
  if (!suppliedStorage) persistent = false;
  const authStorage = {
    getItem(name) {
      if (!persistent && memory.has(name)) return memory.get(name);
      try {
        if (suppliedStorage) {
          const value = suppliedStorage.getItem(name);
          memory.set(name, value);
          return value;
        }
      } catch { persistent = false; }
      return memory.get(name) ?? null;
    },
    setItem(name, value) {
      memory.set(name, value);
      try { if (suppliedStorage) suppliedStorage.setItem(name, value); } catch { persistent = false; }
    },
    removeItem(name) {
      memory.set(name, null);
      try { suppliedStorage?.removeItem(name); } catch { persistent = false; }
    },
  };
  const guest = extra => ({ configured: settings.configured, authAvailable: Boolean(settings.configured && (settings.githubEnabled || settings.emailEnabled)), authenticated: false, user: null, signInUrl: null, signOutUrl: null, ...extra });
  function notify(event) {
    // Auth callbacks run while the SDK holds a session lock. Calling another
    // auth method from a subscriber in that callback would deadlock the SDK.
    setTimeout(() => {
      for (const listener of listeners) {
        try { Promise.resolve(listener({ event, status: state, error: lastError })).catch(() => {}); } catch {}
      }
    }, 0);
  }
  function clearCallback() {
    if (!callbackUrl || (!capturedCode && !capturedError)) return;
    let current;
    try { current = new URL(location?.href || callbackUrl.href); } catch { current = new URL(callbackUrl); }
    for (const name of CALLBACK_PARAMETERS) current.searchParams.delete(name);
    try {
      // The injected location can implement the same history operation in tests.
      if (typeof location?.replaceState === 'function') location.replaceState(null, '', current.href);
      else globalThis.history?.replaceState(null, '', current.href);
    } catch { /* A restricted History API cannot invalidate the captured code. */ }
  }
  function requireConfigured() {
    if (!settings.configured) throw authError('AUTH_NOT_CONFIGURED', settings.error || '云端登录尚未配置，当前仍可使用浏览器本地学习记录。');
  }
  function sdk() {
    requireConfigured();
    if (!client) {
      client = clientFactory(settings.url, settings.publicKey, {
        auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true, storage: authStorage, storageKey: `neuralbank-supabase:${new URL(settings.url).host}` },
        ...(typeof fetcher === 'function' ? { global: { fetch: fetcher } } : {}),
      });
      client.auth.onAuthStateChange(event => notify(event));
    }
    return client;
  }
  async function initialize() {
    if (!settings.configured) return;
    if (!initialization) initialization = (async () => {
      state = 'loading';
      try {
        clearCallback();
        if (capturedError) throw authError('OAUTH_CALLBACK_ERROR', 'GitHub 登录未完成，请重试。');
        const instance = sdk();
        if (capturedCode) {
          const { error } = await instance.auth.exchangeCodeForSession(capturedCode);
          if (error) throw authError('PKCE_CALLBACK_FAILED', '登录回调未能验证。请在发起登录的同一浏览器中重试。');
        }
        state = 'ready';
        lastError = '';
      } catch (error) {
        state = 'error';
        lastError = error.message;
        throw error;
      }
    })();
    return initialization;
  }
  function databaseError(error) {
    if (error?.message?.includes('ACADEMIC_EMAIL_REQUIRED')) return authError('ACADEMIC_EMAIL_REQUIRED', '请使用 GitHub，或已确认且被收录的高校邮箱登录。');
    if (error?.message?.includes('AUTH_REQUIRED') || error?.code === 'PGRST301' || error?.code === 'PGRST303') return authError('AUTH_REQUIRED', '登录已失效，请重新登录。');
    if (error?.message?.includes('UNKNOWN_MODEL_ID')) return authError('UNKNOWN_MODEL_ID', '学习记录包含本站图谱中不存在的模型 ID。');
    if (error?.message?.includes('INVALID_LEARNING_INPUT') || error?.message?.includes('INVALID_LEARNING_RECORD') || error?.message?.includes('REVISION_LIMIT_REACHED')) return authError('INVALID_LEARNING_INPUT', '学习记录格式无效，请刷新后重试。');
    return authError('CLOUD_UNAVAILABLE', '云端学习库暂时无法连接，请确认数据库迁移已应用后重试。');
  }
  async function rpc(name, args, token) {
    let operation = sdk().rpc(name, args);
    // Capturing and verifying A, then silently using the latest SDK token B,
    // would save A's pending intent into B after a cross-tab account switch.
    if (token) operation = operation.setHeader('Authorization', `Bearer ${token}`);
    const { data, error } = await operation;
    if (error) throw databaseError(error);
    return data;
  }
  async function identity() {
    requireConfigured();
    await initialize();
    const instance = sdk();
    const sessionResult = await instance.auth.getSession();
    if (sessionResult.error) throw authError('AUTH_UNAVAILABLE', '暂时无法确认登录状态，请稍后重试。');
    const token = sessionResult.data?.session?.access_token;
    if (!token) return { session: guest(), token: null };
    const { data, error } = await instance.auth.getUser(token);
    if (error) {
      if (error.status === 401 || error.status === 403 || error.name === 'AuthSessionMissingError') return { session: guest(), token: null };
      throw authError('AUTH_UNAVAILABLE', '暂时无法向登录服务确认账户身份，请稍后重试。');
    }
    const user = data?.user;
    if (!user || typeof user.id !== 'string' || !user.id) throw authError('AUTH_UNAVAILABLE', '登录服务返回了无效的账户，请重新登录。');
    const eligibility = await rpc('get_neuralbank_auth_status', undefined, token);
    if (!eligibility || typeof eligibility.eligible !== 'boolean') throw authError('CLOUD_UNAVAILABLE', '账户资格检查暂时不可用，请确认数据库已配置。');
    if (!eligibility.eligible) {
      const code = eligibility.reason === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED' : 'ACADEMIC_EMAIL_REQUIRED';
      lastError = code === 'AUTH_REQUIRED' ? '登录已失效，请重新登录。' : '该邮箱尚未获准使用云端学习库；可使用 GitHub，或申请收录高校域名。';
      return { session: guest({ code, error: lastError }), token: null };
    }
    lastError = '';
    state = 'ready';
    return {
      token,
      session: { ...guest(), authenticated: true, user: { id: `supabase:${new URL(settings.url).host}:${user.id}`, email: typeof user.email === 'string' ? user.email : '', displayName: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.slice(0, 200) : typeof user.user_metadata?.user_name === 'string' ? user.user_metadata.user_name.slice(0, 200) : user.email || '学习者' } },
    };
  }
  async function getSession() {
    if (!settings.configured) return guest();
    try { return (await identity()).session; }
    catch (error) { state = 'error'; lastError = error.message; throw error; }
  }
  async function prepare(provider) {
    requireConfigured();
    if (!settings[provider]) throw authError('PROVIDER_DISABLED', '此登录方式尚未配置完成。');
    try { await initialize(); }
    catch (error) {
      if (!['OAUTH_CALLBACK_ERROR', 'PKCE_CALLBACK_FAILED'].includes(error.code)) throw error;
      // A cancelled or expired callback must not prevent a fresh sign-in.
      initialization = Promise.resolve();
      state = 'ready';
      lastError = '';
    }
    return sdk();
  }
  function returnUrl() {
    let url;
    try { url = new URL(location?.href); } catch { throw authError('INVALID_RETURN_URL', '当前页面地址无法用于登录回调。'); }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw authError('INVALID_RETURN_URL', '请通过 HTTPS 页面登录。');
    for (const name of CALLBACK_PARAMETERS) url.searchParams.delete(name);
    url.hash = 'learning';
    return url.href;
  }
  async function signInWithGitHub() {
    requireConfigured();
    if (!settings.githubEnabled) throw authError('PROVIDER_DISABLED', 'GitHub 登录尚未配置完成。');
    // PKCE requires the verifier to survive leaving the page and returning.
    const probe = `neuralbank-auth-probe:${Date.now()}`;
    try { suppliedStorage?.setItem(probe, probe); if (!suppliedStorage || suppliedStorage.getItem(probe) !== probe) persistent = false; suppliedStorage?.removeItem(probe); } catch { persistent = false; }
    if (!persistent) throw authError('STORAGE_UNAVAILABLE', '浏览器无法保留安全登录凭据，请允许本站存储后再使用 GitHub 登录。');
    const instance = await prepare('githubEnabled');
    const { error } = await instance.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: returnUrl() } });
    if (error) throw authError('OAUTH_START_FAILED', '暂时无法发起 GitHub 登录，请稍后重试。');
    return { redirecting: true };
  }
  async function sendEmailCode(value) {
    const instance = await prepare('emailEnabled');
    const email = normalizeEmail(value);
    if (await rpc('check_neuralbank_email_domain', { email_address: email }) !== true) throw authError('ACADEMIC_EMAIL_REQUIRED', '此高校邮箱域名尚未收录。请使用 GitHub 登录，或提交学校域名收录申请。');
    const { error } = await instance.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw authError(error.status === 429 ? 'RATE_LIMITED' : 'EMAIL_DELIVERY_FAILED', error.status === 429 ? '验证码请求过于频繁，请稍后重试。' : '验证码暂时无法发送，请确认邮件服务已配置，或稍后重试。');
    return { sent: true };
  }
  async function verifyEmailCode(value, code) {
    const instance = await prepare('emailEnabled');
    const email = normalizeEmail(value);
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) throw authError('INVALID_CODE', '请输入邮件中的六位验证码。');
    const { error } = await instance.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (error) throw authError(error.status === 429 ? 'RATE_LIMITED' : 'INVALID_CODE', '验证码无效或已过期，请检查或重新发送。');
    const session = await getSession();
    if (!session.authenticated) throw authError(session.code || 'AUTH_REQUIRED', session.error || '账户尚未通过验证，请重试。');
    return session;
  }
  async function signOut() {
    requireConfigured();
    await initialize().catch(() => {});
    const { error } = await sdk().auth.signOut({ scope: 'local' });
    if (error) throw authError('SIGN_OUT_FAILED', '暂时无法退出登录，请重试。');
    lastError = '';
    state = 'ready';
    return guest();
  }
  async function learningFetcher(path, init = {}) {
    if (path !== '/api/session' && path !== '/api/learning') return jsonResponse({ error: '此登录适配器不代理其他接口。' }, 404);
    const method = (init.method || 'GET').toUpperCase();
    if ((path === '/api/session' && method !== 'GET') || (path === '/api/learning' && !['GET', 'PUT'].includes(method))) return jsonResponse({ error: '此接口不支持该请求方式。' }, 405, { allow: path === '/api/session' ? 'GET' : 'GET, PUT' });
    if (!settings.configured) return path === '/api/session' ? jsonResponse(guest()) : jsonResponse({ code: 'AUTH_REQUIRED', error: '云端登录尚未配置，当前使用浏览器本地记录。', authAvailable: false }, 401);
    try {
      const verified = await identity();
      if (path === '/api/session') return jsonResponse(verified.session);
      if (!verified.session.authenticated) return jsonResponse({ code: verified.session.code || 'AUTH_REQUIRED', error: verified.session.error || '登录后才能读取和保存个人学习库。' }, verified.session.code === 'ACADEMIC_EMAIL_REQUIRED' ? 403 : 401);
      const headers = new Headers(init.headers);
      const expected = headers.get('x-neuralbank-user');
      if (expected !== null && expected !== verified.session.user.id) return jsonResponse({ code: 'ACCOUNT_CHANGED', error: '登录账号已改变，请刷新登录状态后再同步。' }, 401);
      if (method === 'GET') return jsonResponse(learningSnapshot(await rpc('get_neuralbank_learning', undefined, verified.token)));
      if ((headers.get('content-type') || '').split(';')[0].trim().toLowerCase() !== 'application/json') return jsonResponse({ error: '请使用 JSON 格式保存。' }, 415);
      if (typeof init.body !== 'string') return jsonResponse({ error: '请提供有效的 JSON 学习记录。' }, 400);
      if (new TextEncoder().encode(init.body).length > 8192) return jsonResponse({ error: '学习记录超过 8 KB 限制。' }, 413);
      let value;
      try { value = JSON.parse(init.body); } catch { return jsonResponse({ error: '学习记录不是有效 JSON。' }, 400); }
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(name => !['learned', 'revision'].includes(name)) || !Array.isArray(value.learned) || value.learned.length > 256 || value.learned.some(id => typeof id !== 'string' || !MODEL_ID.test(id)) || !Number.isSafeInteger(value.revision) || value.revision < 0) return jsonResponse({ error: '请提供有效的模型 ID 数组和学习记录版本号。' }, 400);
      const result = await rpc('put_neuralbank_learning', { expected_revision: value.revision, model_ids: [...new Set(value.learned)] }, verified.token);
      const snapshot = learningSnapshot(result);
      if (result.ok === false && result.code === 'REVISION_CONFLICT') return jsonResponse({ code: 'REVISION_CONFLICT', error: '学习记录已在其他页面或设备更新，请先合并最新记录。', ...snapshot }, 409);
      if (result.ok !== true) throw authError('INVALID_SERVER_RESPONSE', '云端未确认保存，请稍后重试。');
      return jsonResponse(snapshot);
    } catch (error) {
      lastError = error.message;
      const status = error.code === 'AUTH_REQUIRED' ? 401 : error.code === 'ACADEMIC_EMAIL_REQUIRED' ? 403 : ['UNKNOWN_MODEL_ID', 'INVALID_LEARNING_INPUT'].includes(error.code) ? 400 : 503;
      return jsonResponse({ code: error.code || 'CLOUD_UNAVAILABLE', error: error.message || '暂时无法连接云端学习库。' }, status);
    }
  }
  return {
    get configured() { return settings.configured; },
    get status() { return state; },
    get error() { return lastError; },
    get persistent() { return persistent; },
    initialize, getSession, signInWithGitHub, sendEmailCode, verifyEmailCode, signOut, learningFetcher,
    subscribe(listener) { if (typeof listener !== 'function') throw new TypeError('Expected a subscription listener'); listeners.add(listener); return () => listeners.delete(listener); },
  };
}
