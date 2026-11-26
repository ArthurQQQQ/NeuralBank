import { mkdir, readFile, writeFile, readdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { models } from '../src/models.js';
import { benchmarks } from '../src/benchmarks.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
const assets = {};
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await collect(file); continue; }
    const extension = path.extname(file);
    if (!types[extension]) throw new Error(`Unsupported source asset: ${entry.name}`);
    const key = '/' + path.relative(src, file).split(path.sep).join('/');
    const body = await readFile(file, 'utf8');
    assets[key] = { body, type: types[extension] };
    if (extension === '.js' || extension === '.mjs') execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  }
}
execFileSync(process.execPath, [path.join(root, 'scripts/validate-catalog.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(root, 'scripts/validate-benchmarks.mjs')], { stdio: 'inherit' });
await collect(src);
const submissionJsonSchema = await readFile(path.join(root, 'schemas/submission.schema.json'), 'utf8');
JSON.parse(submissionJsonSchema);
assets['/submission.schema.json'] = { body: submissionJsonSchema, type: 'application/json; charset=utf-8' };
for (const name of ['/index.html', '/app.js', '/styles.css', '/models.js', '/diagrams.js']) {
  if (!assets[name]) throw new Error(`Required asset missing: ${name}`);
}
for (const [name, asset] of Object.entries(assets)) {
  if (!name.endsWith('.js') && !name.endsWith('.mjs')) continue;
  const imports = [...asset.body.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);
  for (const dependency of imports) {
    if (!dependency.startsWith('.')) throw new Error(`Unexpected external import in ${name}: ${dependency}`);
    const resolved = path.posix.resolve(path.posix.dirname(name), dependency);
    if (!assets[resolved]) throw new Error(`Missing module ${resolved} imported by ${name}`);
  }
}
const manifest = JSON.parse(await readFile(path.join(root, '.openai/hosting.json'), 'utf8'));
if (!manifest.project_id) throw new Error('A Site project_id is required before packaging.');
if (manifest.static) throw new Error('Worker deployment must not declare static.directory.');
if (manifest.d1 !== 'DB') throw new Error('Community contributions require the D1 binding DB.');
const inlineModule = source => source.replace(/^import .*;[\t ]*\r?\n/gm, '').replace(/^export (?!default)/gm, '');
const core = inlineModule(await readFile(path.join(root, 'server/contributions.mjs'), 'utf8'));
const learningApi = inlineModule(await readFile(path.join(root, 'server/learning-api.mjs'), 'utf8'));
const submissionSchemaSource = await readFile(path.join(root, 'src/submission-schema.js'), 'utf8');
if (/^import\s/m.test(submissionSchemaSource)) throw new Error('The shared submission schema must be self-contained.');
const submissionSchema = inlineModule(submissionSchemaSource);
const submissionApi = inlineModule(await readFile(path.join(root, 'server/submission-api.mjs'), 'utf8'));
const worker = inlineModule(await readFile(path.join(root, 'server/worker.mjs'), 'utf8'));
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'server'), { recursive: true });
await mkdir(path.join(dist, '.openai'), { recursive: true });
await writeFile(path.join(dist, 'server/index.js'), `// Generated from src/ and server/. Do not edit.\nconst ASSETS = ${JSON.stringify(assets)};\nconst LEARNING_MODEL_IDS = new Set(${JSON.stringify(models.map(model => model.id))});\n${core}\n${learningApi}\nconst SUBMISSION_CONTEXT = ${JSON.stringify({models,benchmarks})};\nconst validateSubmission = (() => {\n${submissionSchema}\nreturn validateSubmission;\n})();\n${submissionApi}\n${worker}`);
await copyFile(path.join(root, '.openai/hosting.json'), path.join(dist, '.openai/hosting.json'));
execFileSync(process.execPath, ['--check', path.join(dist, 'server/index.js')], { stdio: 'pipe' });
console.log(`Built ${Object.keys(assets).length} assets and the community/account/submission APIs into dist/server/index.js.`);
