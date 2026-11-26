#!/usr/bin/env node
// Metadata-only checker: submitted commands and links are never executed/fetched.
import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSubmission, createSubmissionSchema } from '../src/submission-schema.js';
import { models } from '../src/models.js';
import { benchmarks } from '../src/benchmarks.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const context = { models, benchmarks };
const argumentsList = process.argv.slice(2).filter(argument => argument !== '--');

if (argumentsList.includes('--help') || argumentsList.includes('-h')) {
  console.log('Usage: node scripts/check-submission.mjs [JSON files or directories...]');
  console.log('No arguments: check examples/submissions and submissions/ when present.');
  console.log('Only checks format and evaluation metadata. Does not run commands or reproduce scores.');
  process.exit(0);
}

if (argumentsList[0] === '--schema') {
  console.log(JSON.stringify(createSubmissionSchema(context), null, 2));
  process.exit(0);
}

const files = [];
const collectionErrors = [];
async function collect(path, optional = false) {
  let stat;
  try { stat = await lstat(path); }
  catch (error) {
    if (optional && error.code === 'ENOENT') return;
    collectionErrors.push({ file: path, path: '/', code: 'file', message: error.message });
    return;
  }
  if (stat.isSymbolicLink()) {
    collectionErrors.push({ file: path, path: '/', code: 'symlink', message: 'Submission inputs must be ordinary files or directories, not symbolic links.' });
  } else if (stat.isDirectory()) {
    for (const name of (await readdir(path)).sort()) await collect(join(path, name));
  } else if (stat.isFile() && path.endsWith('.json')) files.push(path);
  else if (stat.isFile()) collectionErrors.push({ file: path, path: '/', code: 'extension', message: 'Only .json submission files are accepted.' });
}

if (argumentsList.length) for (const path of argumentsList) await collect(resolve(path));
else {
  await collect(join(projectRoot, 'examples/submissions'));
  await collect(join(projectRoot, 'submissions'), true);
}

let failed = collectionErrors.length;
for (const error of collectionErrors) console.error(`${relative(projectRoot, error.file)} ${error.path} [${error.code}] ${error.message}`);
for (const path of [...new Set(files)]) {
  const label = relative(projectRoot, path);
  let value;
  try { value = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    failed++;
    console.error(`${label} / [json] ${error.message}`);
    continue;
  }
  const result = validateSubmission(value, context);
  if (!result.valid) {
    failed++;
    for (const error of result.errors) console.error(`${label} ${error.path} [${error.code}] ${error.message}`);
  } else console.log(`PASS ${label} — format and metadata only; reproduction not run`);
}
if (!files.length) {
  failed++;
  console.error('/ [no-files] No JSON submission files found.');
}
console.log(`Checked ${new Set(files).size} JSON submission file(s); ${failed} file/input failure(s).`);
process.exitCode = failed ? 1 : 0;
