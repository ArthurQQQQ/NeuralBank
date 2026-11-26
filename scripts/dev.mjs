import http from 'node:http';
import { Readable } from 'node:stream';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleContributions, jsonResponse } from '../server/contributions.mjs';
import { createLocalStore } from '../server/local-store.mjs';
import { handleSession, handleLearning } from '../server/learning-api.mjs';
import { handleSubmissions } from '../server/submission-api.mjs';
import { createLocalSubmissionStore } from '../server/submission-local-store.mjs';
import { models } from '../src/models.js';
import { benchmarks } from '../src/benchmarks.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const port = Number(process.env.NEURALBANK_PORT || 4173);
const store = createLocalStore(path.join(root, '.local/contributions.json'));
const submissionStore = createLocalSubmissionStore(path.join(root, '.local/submissions.json'));
const submissionContext = { models, benchmarks };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host || `127.0.0.1:${port}`;
    const requestUrl = new URL(incoming.url, `http://${host}`);
    let response;
    if (requestUrl.pathname.startsWith('/api/')) {
      const init = { method: incoming.method, headers: incoming.headers };
      if (!['GET', 'HEAD'].includes(incoming.method)) {
        init.body = Readable.toWeb(incoming);
        init.duplex = 'half';
      }
      const request = new Request(requestUrl, init);
      // Never trust identity headers provided by a caller to the local preview.
      if (requestUrl.pathname === '/api/session') response = handleSession(request, { trustedPlatform: false });
      else if (requestUrl.pathname === '/api/learning') response = await handleLearning(request, null, { trustedPlatform: false });
      else if (requestUrl.pathname === '/api/submissions' || requestUrl.pathname === '/api/submissions/validate') response = await handleSubmissions(request, submissionStore, { trustedPlatform: false, context: submissionContext });
      else response = await handleContributions(request, store);
    } else if (!['GET', 'HEAD'].includes(incoming.method)) {
      response = new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    } else if (requestUrl.pathname === '/submission.schema.json') {
      try {
        response = new Response(incoming.method === 'HEAD' ? null : await readFile(path.join(root, 'schemas/submission.schema.json')), {
          headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' },
        });
      } catch { response = new Response('Not found', { status: 404 }); }
    } else {
      let pathname;
      try { pathname = decodeURIComponent(requestUrl.pathname); } catch { pathname = '/invalid'; }
      const target = path.resolve(src, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!target.startsWith(src + path.sep)) { response = new Response('Not found', { status: 404 }); }
      else {
        try {
          if (!(await stat(target)).isFile()) throw new Error('Not a file');
          response = new Response(incoming.method === 'HEAD' ? null : await readFile(target), {
            headers: { 'content-type': types[path.extname(target)] || 'application/octet-stream', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' },
          });
        } catch { response = new Response('Not found', { status: 404 }); }
      }
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    const response = jsonResponse({ error: '本地服务暂时不可用。' }, 500);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(await response.text());
  }
});
server.listen(port, '127.0.0.1', () => console.log(`NeuralBank local preview: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
