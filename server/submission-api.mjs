import { jsonResponse } from './contributions.mjs';
import { platformUser } from './learning-api.mjs';
import { validateSubmission } from '../src/submission-schema.js';

export const SUBMISSION_BODY_LIMIT = 32 * 1024;

function submissionResponse(value, status = 200) {
  const response = jsonResponse(value, status);
  response.headers.set('cache-control', 'no-store');
  return response;
}
function submissionChecks(valid) {
  return { format: valid ? 'passed' : 'failed', reproduction: 'not-run', execution: 'not-run' };
}
async function readSubmissionJson(request) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > SUBMISSION_BODY_LIMIT) return { error: '单条投稿不能超过 32 KB。', status: 413 };
  if (!request.body) return { error: '请提供投稿 JSON。', status: 400 };
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > SUBMISSION_BODY_LIMIT) {
      await reader.cancel().catch(() => {});
      return { error: '单条投稿不能超过 32 KB。', status: 413 };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return { value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }; }
  catch { return { error: '投稿内容不是有效的 UTF-8 JSON。', status: 400 }; }
}
function canonicalSubmission(value) {
  if (Array.isArray(value)) return value.map(canonicalSubmission);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalSubmission(value[key])]));
  return value;
}
async function submissionHash(value) {
  const data = new TextEncoder().encode(JSON.stringify(canonicalSubmission(value)));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function publicSubmission(record, scope) {
  // Explicit projection: platform IDs and account email never leave the store.
  return {
    id: record.id,
    payload: record.payload,
    contentHash: record.contentHash,
    createdAt: record.createdAt,
    status: record.status,
    formatStatus: record.formatStatus,
    reproductionStatus: record.reproductionStatus,
    scope,
  };
}

export async function handleSubmissions(request, store, { trustedPlatform = false, context } = {}) {
  const pathname = new URL(request.url).pathname;
  const validateOnly = pathname === '/api/submissions/validate';
  if (pathname !== '/api/submissions' && !validateOnly) return submissionResponse({ error: '接口不存在。' }, 404);
  const scope = trustedPlatform ? 'hosted' : 'local';
  if ((validateOnly && request.method !== 'POST') || (!validateOnly && !['GET', 'POST'].includes(request.method))) {
    const response = submissionResponse({ error: validateOnly ? '格式验证只支持 POST。' : '投稿接口只支持读取和提交。' }, 405);
    response.headers.set('allow', validateOnly ? 'POST' : 'GET, POST');
    return response;
  }
  if (request.method === 'GET') {
    if (!store) return submissionResponse({ error: '投稿列表暂时无法连接。' }, 503);
    try { return submissionResponse({ submissions: (await store.list()).map(record => publicSubmission(record, scope)), scope, limit: 50 }); }
    catch { return submissionResponse({ error: '投稿列表暂时无法读取，请稍后重试。' }, 503); }
  }
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return submissionResponse({ error: '请从本站提交或验证投稿。' }, 403);
  }
  const mediaType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') return submissionResponse({ error: '请使用 JSON 格式投稿。' }, 415);
  let authorId = 'local-preview';
  if (!validateOnly && trustedPlatform) {
    const user = platformUser(request, { trustedPlatform: true });
    if (!user) return submissionResponse({ error: '登录后才能向托管站点提交投稿；仍可先验证格式。', code: 'AUTH_REQUIRED', authAvailable: true }, 401);
    const expected = request.headers.get('x-neuralbank-user');
    if (expected !== null && expected !== user.id) return submissionResponse({ error: '登录账号已改变，请刷新登录状态后再投稿。', code: 'ACCOUNT_CHANGED' }, 401);
    authorId = user.id;
  }
  const parsed = await readSubmissionJson(request);
  if (parsed.error) return submissionResponse({ error: parsed.error }, parsed.status);
  let validation;
  try { validation = validateSubmission(parsed.value, context); }
  catch { return submissionResponse({ error: '格式验证服务暂时不可用，请稍后重试。' }, 503); }
  const checks = submissionChecks(validation.valid);
  if (validateOnly) return submissionResponse({ ...validation, checks });
  if (!validation.valid) return submissionResponse({ error: '投稿未通过格式验证，请按字段修正后重试。', ...validation, checks }, 422);
  if (!store) return submissionResponse({ error: '投稿暂时无法保存，请稍后重试。' }, 503);
  try {
    const record = {
      id: crypto.randomUUID(),
      authorId,
      payload: validation.value,
      contentHash: await submissionHash(validation.value),
      createdAt: new Date().toISOString(),
      status: 'pending',
      formatStatus: 'passed',
      reproductionStatus: 'unverified',
    };
    const saved = await store.create(record);
    return submissionResponse({ submission: publicSubmission(saved.record, scope), duplicate: saved.duplicate, scope }, saved.duplicate ? 200 : 201);
  } catch { return submissionResponse({ error: '投稿暂时无法保存，请稍后重试。' }, 503); }
}

function storedSubmission(row) {
  return {
    id: row.id, authorId: row.authorId, payload: JSON.parse(row.payload),
    contentHash: row.contentHash, createdAt: row.createdAt,
    status: row.status, formatStatus: row.formatStatus, reproductionStatus: row.reproductionStatus,
  };
}
const SUBMISSION_COLUMNS = 'id, author_id AS authorId, payload_json AS payload, content_hash AS contentHash, created_at AS createdAt, status, format_status AS formatStatus, reproduction_status AS reproductionStatus';
export function createD1SubmissionStore(db) {
  if (!db) throw new Error('D1 binding DB is unavailable');
  return {
    async list() {
      const result = await db.prepare(`SELECT ${SUBMISSION_COLUMNS} FROM submissions ORDER BY created_at DESC, id DESC LIMIT 50`).all();
      return (result.results || []).map(storedSubmission);
    },
    async create(record) {
      await db.prepare('INSERT OR IGNORE INTO submissions (id, author_id, payload_json, content_hash, created_at, status, format_status, reproduction_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(record.id, record.authorId, JSON.stringify(record.payload), record.contentHash, record.createdAt, 'pending', 'passed', 'unverified').run();
      const result = await db.prepare(`SELECT ${SUBMISSION_COLUMNS} FROM submissions WHERE author_id = ? AND content_hash = ?`)
        .bind(record.authorId, record.contentHash).all();
      const found = result.results?.[0];
      if (!found) throw new Error('Submission save did not return a row');
      return { record: storedSubmission(found), duplicate: found.id !== record.id };
    },
  };
}
