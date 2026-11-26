export const CATEGORIES = ['foundations', 'vision', 'sequence', 'attention', 'graph', 'generative', 'memory'];
export const MAX_BODY_BYTES = 8192;

export function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export function validateProposal(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '请填写有效的模型贡献。' };
  }
  const fields = ['name', 'category', 'summary', 'source', 'contributor'];
  for (const field of fields) {
    if (value[field] !== undefined && typeof value[field] !== 'string') {
      return { error: '表单字段必须是文字。' };
    }
  }
  const name = (value.name ?? '').trim();
  const category = (value.category ?? '').trim();
  const summary = (value.summary ?? '').trim();
  const source = (value.source ?? '').trim();
  const contributor = (value.contributor ?? '').trim() || '匿名贡献者';
  if (name.length < 2 || name.length > 80) return { error: '模型名称需要 2–80 个字符。' };
  if (!CATEGORIES.includes(category)) return { error: '请选择有效的架构分类。' };
  if (summary.length < 20 || summary.length > 1600) return { error: '结构说明需要 20–1600 个字符。' };
  if (contributor.length < 2 || contributor.length > 60) return { error: '署名需要 2–60 个字符，也可以留空。' };
  if (source.length > 2048) return { error: '来源链接过长。' };
  let parsed;
  try { parsed = new URL(source); } catch { return { error: '请提供有效的 HTTPS 论文或文档链接。' }; }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
    return { error: '来源必须是不含登录信息的 HTTPS 链接。' };
  }
  return { value: { name, category, summary, source: parsed.href, contributor } };
}

export async function readBoundedJson(request) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { error: '提交内容不能超过 8 KB。', status: 413 };
  }
  if (!request.body) return { error: '请填写贡献内容。', status: 400 };
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return { error: '提交内容不能超过 8 KB。', status: 413 };
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
  try { return { value: JSON.parse(new TextDecoder().decode(combined)) }; }
  catch { return { error: '提交内容不是有效的 JSON。', status: 400 }; }
}

export async function handleContributions(request, store) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/contributions') return jsonResponse({ error: '接口不存在。' }, 404);
  if (request.method !== 'GET' && request.method !== 'POST') {
    const response = jsonResponse({ error: '此接口只支持读取和提交。' }, 405);
    response.headers.set('allow', 'GET, POST');
    return response;
  }
  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return jsonResponse({ error: '请从本站提交贡献。' }, 403);
    const mediaType = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (mediaType !== 'application/json') return jsonResponse({ error: '请使用 JSON 格式提交。' }, 415);
    const parsed = await readBoundedJson(request);
    if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status);
    const validated = validateProposal(parsed.value);
    if (validated.error) return jsonResponse({ error: validated.error }, 400);
    const contribution = {
      id: crypto.randomUUID(),
      ...validated.value,
      createdAt: new Date().toISOString(),
    };
    try {
      await store.create(contribution);
      return jsonResponse({ contribution, message: '已提交，等待审核。' }, 201);
    } catch {
      return jsonResponse({ error: '暂时无法保存贡献，请稍后重试。' }, 503);
    }
  }
  try {
    const contributions = await store.list();
    return jsonResponse({ contributions });
  } catch {
    return jsonResponse({ error: '暂时无法读取社区贡献，请稍后重试。' }, 503);
  }
}

export function createD1Store(db) {
  if (!db) throw new Error('D1 binding DB is unavailable');
  return {
    async list() {
      const result = await db.prepare(
        'SELECT id, name, category, summary, source, contributor, created_at AS createdAt FROM contributions WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT 100'
      ).bind('pending').all();
      return result.results ?? [];
    },
    async create(value) {
      await db.prepare(
        'INSERT INTO contributions (id, name, category, summary, source, contributor, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(value.id, value.name, value.category, value.summary, value.source, value.contributor, value.createdAt, 'pending').run();
    },
  };
}
