import { handleContributions, createD1Store, jsonResponse } from './contributions.mjs';
import { handleSession, handleLearning, createD1LearningStore } from './learning-api.mjs';
import { handleSubmissions, createD1SubmissionStore } from './submission-api.mjs';

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/session') return handleSession(request, { trustedPlatform: true });
    if (pathname === '/api/learning') {
      return handleLearning(request, env.DB ? createD1LearningStore(env.DB) : null, { trustedPlatform: true, validModelIds: LEARNING_MODEL_IDS });
    }
    if (pathname === '/api/submissions' || pathname === '/api/submissions/validate') {
      return handleSubmissions(request, env.DB ? createD1SubmissionStore(env.DB) : null, { trustedPlatform: true, context: SUBMISSION_CONTEXT });
    }
    if (pathname === '/api/contributions') {
      if (!env.DB) return jsonResponse({ error: '社区贡献服务暂时不可用。' }, 503);
      return handleContributions(request, createD1Store(env.DB));
    }
    if (pathname.startsWith('/api/')) return jsonResponse({ error: '接口不存在。' }, 404);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    const key = pathname === '/' ? '/index.html' : pathname;
    const asset = ASSETS[key];
    if (!asset) return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : asset.body, {
      headers: {
        'content-type': asset.type,
        'cache-control': 'no-cache',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
      },
    });
  },
};
