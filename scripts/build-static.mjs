import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, realpath, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { models } from '../src/models.js';
import { benchmarks, benchmarkResults } from '../src/benchmarks.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = await realpath(path.join(root, 'src'));
const output = path.join(root, 'dist-static');
const entry = 'app.js';
const modules = new Map();
const ordered = [];
const visiting = new Set();
// Parse the import forms used by this dependency-free application. Node's real
// ESM linker below independently verifies every dependency and exported binding.
const importPattern = () => /^[\t ]*import\s+(?:(?<clause>[\s\S]*?)\s+from\s+)?(?<quote>['"])(?<specifier>[^'"\r\n]+)\k<quote>\s*;[\t ]*(?:\r?\n|$)/gm;
function resolveImport(id, specifier) {
  if (!/^\.\.?\//.test(specifier) || /[?#]/.test(specifier)) throw new Error(`Static build only supports source-local imports: ${id}: ${specifier}`);
  const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(id), specifier));
  if (dependency.startsWith('../') || path.posix.isAbsolute(dependency) || !dependency.endsWith('.js')) throw new Error(`Import escapes the frontend source: ${id}: ${specifier}`);
  return dependency;
}
async function visit(id) {
  if (visiting.has(id)) throw new Error(`Cyclic modules need a different bundler: ${id}`);
  if (modules.has(id)) return;
  visiting.add(id);
  const filename = await realpath(path.join(sourceRoot, id));
  if (!filename.startsWith(sourceRoot + path.sep)) throw new Error(`Module is outside src/: ${id}`);
  const source = await readFile(filename, 'utf8');
  if (/\bimport\s*\(/.test(source) || /\bimport\s*\.\s*meta\b/.test(source)) throw new Error(`Dynamic imports and import.meta are not supported in this static bundle: ${id}`);
  const imports = [...source.matchAll(importPattern())].map(match => ({ ...match.groups, dependency: resolveImport(id, match.groups.specifier) }));
  modules.set(id, { source, imports });
  for (const item of imports) await visit(item.dependency);
  visiting.delete(id);
  ordered.push(id);
}
await visit(entry);

// SourceTextModule parses and links without executing any frontend code. Passing
// sources over stdin keeps this build independent of npm packages and hosting.
const parser = `
import { SourceTextModule } from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const input = JSON.parse(readFileSync(0, 'utf8'));
const graph = new Map(input.modules.map(item => [item.id, new SourceTextModule(item.source, { identifier: item.id })]));
await graph.get(input.entry).link((specifier, parent) => {
  const id = path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier), specifier));
  const child = graph.get(id);
  if (!child) throw new Error('Uncollected dependency: ' + parent.identifier + ': ' + specifier);
  return child;
});
process.stdout.write(JSON.stringify([...graph].map(([id, module]) => ({ id, dependencies: [...module.dependencySpecifiers], exports: Object.getOwnPropertyNames(module.namespace).sort() }))));
`;
const linked = JSON.parse(execFileSync(process.execPath, ['--experimental-vm-modules', '--input-type=module', '--eval', parser], {
  input: JSON.stringify({ entry, modules: [...modules].map(([id, item]) => ({ id, source: item.source })) }),
  encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' },
}));
const identifier = /^[A-Za-z_$][\w$]*$/;
const moduleMap = '__neuralBankStaticModules';
function importBindings(clause, dependency) {
  const reference = `${moduleMap}[${JSON.stringify(dependency)}]`;
  if (!clause) return `void ${reference};`;
  const trimmed = clause.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const bindings = trimmed.slice(1, -1).split(',').map(value => value.trim()).filter(Boolean).map(value => {
      const pair = value.split(/\s+as\s+/);
      if (pair.length > 2 || !pair.every(name => identifier.test(name))) throw new Error(`Unsupported named import: ${clause}`);
      return pair.length === 2 ? `${pair[0]}: ${pair[1]}` : pair[0];
    });
    return `const { ${bindings.join(', ')} } = ${reference};`;
  }
  if (trimmed.startsWith('*')) {
    const namespace = trimmed.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
    if (!namespace) throw new Error(`Unsupported namespace import: ${clause}`);
    return `const ${namespace[1]} = ${reference};`;
  }
  const comma = trimmed.indexOf(',');
  const defaultName = comma < 0 ? trimmed : trimmed.slice(0, comma).trim();
  if (!identifier.test(defaultName)) throw new Error(`Unsupported default import: ${clause}`);
  return `const ${defaultName} = ${reference}.default;${comma < 0 ? '' : '\n' + importBindings(trimmed.slice(comma + 1), dependency)}`;
}
for (const info of linked) {
  const item = modules.get(info.id);
  assert.deepEqual([...new Set(item.imports.map(value => value.specifier))].sort(), [...new Set(info.dependencies)].sort(), `Unsupported import syntax in ${info.id}`);
  item.exports = info.exports;
}
function compileModule(id) {
  const item = modules.get(id);
  const aliases = new Map();
  let code = item.source.replace(importPattern(), (...args) => {
    const groups = args.at(-1);
    return importBindings(groups.clause, resolveImport(id, groups.specifier)) + '\n';
  });
  code = code.replace(/^[\t ]*export\s*\{([^}]+)\}\s*;[\t ]*(?:\r?\n|$)/gm, (_, list) => {
    for (const value of list.split(',').map(value => value.trim()).filter(Boolean)) {
      const [local, exported = local, ...extra] = value.split(/\s+as\s+/);
      if (extra.length || !identifier.test(local) || !identifier.test(exported)) throw new Error(`Unsupported export in ${id}: ${value}`);
      aliases.set(exported, local);
    }
    return '';
  });
  code = code.replace(/^[\t ]*export\s+(?=(?:async\s+)?function\b|class\b|const\b)/gm, '');
  if (/^[\t ]*(?:export|import)\b/m.test(code)) throw new Error(`Unsupported module declaration in ${id}`);
  const namespace = item.exports.map(name => {
    const local = aliases.get(name) || name;
    if (!identifier.test(name) || !identifier.test(local)) throw new Error(`Unsupported exported name in ${id}: ${name}`);
    return `get ${name}() { return ${local}; }`;
  }).join(', ');
  return `// Frontend module: ${id}\n${moduleMap}[${JSON.stringify(id)}] = (() => {\n${code}\nreturn Object.freeze({ ${namespace} });\n})();`;
}
const opening = `(() => {\n'use strict';\nconst ${moduleMap} = Object.create(null);\n`;
const compiled = new Map(ordered.map(id => [id, compileModule(id)]));
const bundle = opening + ordered.map(id => compiled.get(id)).join('\n\n') + '\n})();';
execFileSync(process.execPath, ['--input-type=module', '--check'], { input: bundle, encoding: 'utf8' });

// Exercise the transformed, isolated data/validation modules, but never run the
// DOM application during a build. This catches export mapping or scope damage.
const fixture = await readFile(path.join(root, 'examples/submissions/benchmark-result.valid.json'), 'utf8');
const dependencyBundle = opening + ordered.filter(id => id !== entry).map(id => compiled.get(id)).join('\n\n') + `
const probeContext = { models: ${moduleMap}['models.js'].models, benchmarks: ${moduleMap}['benchmarks.js'].benchmarks };
globalThis.__neuralBankProbe = {
  models: JSON.stringify(probeContext.models),
  results: JSON.stringify(${moduleMap}['benchmarks.js'].benchmarkResults),
  schema: JSON.stringify(${moduleMap}['submission-schema.js'].createSubmissionSchema(probeContext)),
  validation: ${moduleMap}['submission-schema.js'].validateSubmission(JSON.parse(${JSON.stringify(fixture)}), probeContext)
};\n})();`;
const probeContext = { URL, TextEncoder, TextDecoder };
vm.runInNewContext(dependencyBundle, probeContext, { timeout: 5000, filename: 'NeuralBank static dependency verification' });
assert.equal(probeContext.__neuralBankProbe.models, JSON.stringify(models), 'Static bundle must preserve every model.');
assert.equal(probeContext.__neuralBankProbe.results, JSON.stringify(benchmarkResults), 'Static bundle must preserve reported results.');
assert.equal(probeContext.__neuralBankProbe.validation.valid, true, 'Static bundle must retain shared submission validation.');
const jsonSchema = await readFile(path.join(root, 'schemas/submission.schema.json'), 'utf8');
assert.deepEqual(JSON.parse(probeContext.__neuralBankProbe.schema), JSON.parse(jsonSchema), 'Downloaded schema must match the bundled validator.');

execFileSync(process.execPath, [path.join(root, 'scripts/validate-catalog.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(root, 'scripts/validate-benchmarks.mjs')], { stdio: 'inherit' });
let html = await readFile(path.join(sourceRoot, 'index.html'), 'utf8');
const css = await readFile(path.join(sourceRoot, 'styles.css'), 'utf8');
const appearance = await readFile(path.join(sourceRoot, 'appearance.js'), 'utf8');
const favicon = await readFile(path.join(sourceRoot, 'favicon.svg'));
const inlineScript = value => value.replace(/<\/script/gi, '<\\/script');
if (/<\/style/i.test(css)) throw new Error('The stylesheet contains an unsafe inline style terminator.');
function replaceExactlyOnce(pattern, replacement, label) {
  const matches = [...html.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))];
  assert.equal(matches.length, 1, `Expected one ${label} entry in index.html.`);
  html = html.replace(pattern, () => replacement);
}
replaceExactlyOnce(/<script\b(?=[^>]*\bsrc=["'](?:\/|\.\/)?appearance\.js["'])[^>]*>\s*<\/script>/i, `<script>globalThis.NEURALBANK_STATIC = true;\n${inlineScript(appearance)}</script>`, 'appearance script');
replaceExactlyOnce(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["'](?:\/|\.\/)?styles\.css["'])[^>]*>/i, `<style>\n${css}\n</style>`, 'stylesheet');
replaceExactlyOnce(/<link\b(?=[^>]*\brel=["']icon["'])(?=[^>]*\bhref=["'](?:\/|\.\/)?favicon\.svg["'])[^>]*>/i, `<link rel="icon" href="data:image/svg+xml;base64,${favicon.toString('base64')}" type="image/svg+xml">`, 'favicon');
replaceExactlyOnce(/<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["'](?:\/|\.\/)?app\.js["'])[^>]*>\s*<\/script>/i, `<script type="module">\n${inlineScript(bundle)}\n</script>`, 'application module');
html = html.replace(/(\bhref=["'])\/submission\.schema\.json(["'])/g, '$1./submission.schema.json$2');
const structuralHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
if (/\b(?:src|href|action)\s*=\s*["']\/(?!\/)/i.test(structuralHtml)) throw new Error('Root-relative resources would break GitHub project Pages.');
if (/<script\b[^>]*\bsrc=/i.test(structuralHtml) || /<link\b[^>]*\brel=["']stylesheet/i.test(structuralHtml)) throw new Error('Static application resources must be self-contained.');

// The output is an explicit public allowlist; no server, hosting identity, local
// database, credentials, or repository metadata are copied into this directory.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'index.html'), html);
await writeFile(path.join(output, 'submission.schema.json'), jsonSchema);
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`Static build verified: ${modules.size} isolated modules, ${models.length} models, ${benchmarkResults.length} reported results, shared submission validation.`);
console.log(`Public output: dist-static/index.html (${Buffer.byteLength(html)} bytes), submission.schema.json, .nojekyll`);
