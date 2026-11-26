import { jsonResponse, readBoundedJson } from './contributions.mjs';

const AUTH_PATHS = new Set(['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback']);

function privateJson(value, status = 200) {
  const response = jsonResponse(value, status);
  response.headers.set('cache-control', 'private, no-store');
  response.headers.set('vary', 'oai-authenticated-user-id, oai-authenticated-user-email');
  return response;
}

function authReturnPath(value = '/#learning') {
  if (!value.startsWith('/') || value.startsWith('//')) return '/#learning';
  try {
    const url = new URL(value, 'https://app.local');
    if (url.origin !== 'https://app.local' || AUTH_PATHS.has(url.pathname)) return '/#learning';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return '/#learning'; }
}

// Only the hosted Sites dispatch boundary may supply trusted identity headers.
// The local dev server always calls these handlers with trustedPlatform:false.
export function platformUser(request, { trustedPlatform = false } = {}) {
  if (!trustedPlatform) return null;
  const id = request.headers.get('oai-authenticated-user-id')?.trim();
  const email = request.headers.get('oai-authenticated-user-email')?.trim();
  if (!id || !email || id.length > 512 || email.length > 320) return null;
  let displayName = email;
  if (request.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try {
      const fullName = decodeURIComponent(request.headers.get('oai-authenticated-user-full-name') || '').trim();
      if (fullName && fullName.length <= 200) displayName = fullName;
    } catch {}
  }
  return { id, email, displayName };
}

export function handleSession(request, { trustedPlatform = false } = {}) {
  if (request.method !== 'GET') {
    const response = privateJson({ error: '此接口只支持读取登录状态。' }, 405);
    response.headers.set('allow', 'GET');
    return response;
  }
  const user = platformUser(request, { trustedPlatform });
  const returnTo = authReturnPath(new URL(request.url).searchParams.get('return_to') || '/#learning');
  return privateJson({
    authAvailable: trustedPlatform,
    authenticated: Boolean(user),
    user,
    signInUrl: trustedPlatform ? `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}` : null,
    signOutUrl: trustedPlatform ? `/signout-with-chatgpt?return_to=${encodeURIComponent(returnTo)}` : null,
  });
}

export function validateLearning(value, validModelIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: '请提供有效的学习记录。' };
  if (Object.keys(value).some(key => key !== 'learned' && key !== 'revision')) return { error: '学习记录只接受 learned 和 revision 字段。' };
  if (!Array.isArray(value.learned) || value.learned.length > 1000) return { error: '已掌握模型需要是最多 1000 项的 ID 数组。' };
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) return { error: '请先读取学习记录，再使用有效的版本号保存。' };
  for (const id of value.learned) {
    if (typeof id !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(id) || !validModelIds.has(id)) {
      return { error: '学习记录包含本站图谱中不存在的模型 ID。', code: 'UNKNOWN_MODEL_ID' };
    }
  }
  return { value: { learned: [...new Set(value.learned)], revision: value.revision } };
}

export async function handleLearning(request, store, { trustedPlatform = false, validModelIds = new Set() } = {}) {
  const user = platformUser(request, { trustedPlatform });
  if (!user) return privateJson({ error: '登录后才能读取和保存个人学习库。', code: 'AUTH_REQUIRED', authAvailable: trustedPlatform }, 401);
  // This client hint never selects an owner. It only rejects an account switch
  // between session discovery and a queued save from an older browser tab.
  const expectedUser = request.headers.get('x-neuralbank-user');
  if (expectedUser !== null && expectedUser !== user.id) {
    return privateJson({ error: '登录账号已改变，请刷新登录状态后再同步。', code: 'ACCOUNT_CHANGED' }, 401);
  }
  if (request.method !== 'GET' && request.method !== 'PUT') {
    const response = privateJson({ error: '此接口只支持读取和保存学习记录。' }, 405);
    response.headers.set('allow', 'GET, PUT');
    return response;
  }
  if (!store) return privateJson({ error: '个人学习库暂时无法连接，请稍后重试。', code: 'STORAGE_UNAVAILABLE' }, 503);
  let change;
  if (request.method === 'PUT') {
    const origin = request.headers.get('origin');
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
      return privateJson({ error: '请从本站保存个人学习记录。' }, 403);
    }
    const mediaType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (mediaType !== 'application/json') return privateJson({ error: '请使用 JSON 格式保存。' }, 415);
    const parsed = await readBoundedJson(request);
    if (parsed.error) return privateJson({ error: parsed.error }, parsed.status);
    const validated = validateLearning(parsed.value, validModelIds);
    if (validated.error) return privateJson({ error: validated.error, ...(validated.code ? { code: validated.code } : {}) }, 400);
    change = validated.value;
  }
  try {
    if (request.method === 'GET') return privateJson(await store.get(user.id));
    const saved = await store.put(user.id, change.learned, change.revision);
    if (!saved) {
      return privateJson({
        error: '学习记录已在其他页面或设备更新，请先合并最新记录。',
        code: 'REVISION_CONFLICT',
        ...await store.get(user.id),
      }, 409);
    }
    return privateJson(saved);
  } catch {
    return privateJson({ error: '个人学习库暂时无法保存或读取，请稍后重试。', code: 'STORAGE_UNAVAILABLE' }, 503);
  }
}

function learningSnapshot(row) {
  if (!row) return { learned: [], revision: 0, updatedAt: null };
  const learned = JSON.parse(row.learned);
  if (!Array.isArray(learned) || learned.some(id => typeof id !== 'string') || !Number.isSafeInteger(row.revision) || row.revision < 1) {
    throw new Error('Invalid stored learning snapshot');
  }
  return { learned, revision: row.revision, updatedAt: row.updatedAt };
}

export function createD1LearningStore(db) {
  if (!db) throw new Error('D1 binding DB is unavailable');
  return {
    async get(userId) {
      const result = await db.prepare(
        'SELECT learned_json AS learned, revision, updated_at AS updatedAt FROM learning_progress WHERE user_id = ?'
      ).bind(userId).all();
      return learningSnapshot(result.results?.[0]);
    },
    async put(userId, learned, revision) {
      const updatedAt = new Date().toISOString();
      // A single conditional upsert makes compare-and-save atomic, including first save.
      const result = await db.prepare(
        'INSERT INTO learning_progress (user_id, learned_json, revision, updated_at) SELECT ?, ?, 1, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM learning_progress WHERE user_id = ? AND revision = ?) ON CONFLICT(user_id) DO UPDATE SET learned_json = excluded.learned_json, revision = learning_progress.revision + 1, updated_at = excluded.updated_at WHERE learning_progress.revision = ? RETURNING learned_json AS learned, revision, updated_at AS updatedAt'
      ).bind(userId, JSON.stringify(learned), updatedAt, revision, userId, revision, revision).all();
      const row = result.results?.[0];
      return row ? learningSnapshot(row) : null;
    },
  };
}
