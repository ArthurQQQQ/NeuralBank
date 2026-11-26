import assert from 'node:assert/strict';
import { models } from '../src/models.js';
import { tasks, benchmarks, benchmarkResults } from '../src/benchmarks.js';

const taskIds = new Set(tasks.map(task => task.id));
const benchmarkById = new Map(benchmarks.map(benchmark => [benchmark.id, benchmark]));
const modelIds = new Set(models.map(model => model.id));
assert.equal(taskIds.size, tasks.length, 'Task ids must be unique.');
assert.equal(benchmarkById.size, benchmarks.length, 'Benchmark ids must be unique.');
assert.equal(new Set(benchmarkResults.map(result => result.id)).size, benchmarkResults.length, 'Result ids must be unique.');

function https(url, label) {
  assert.equal(new URL(url).protocol, 'https:', `${label}: cite an HTTPS primary source`);
}

for (const benchmark of benchmarks) {
  assert(taskIds.has(benchmark.taskId), `${benchmark.id}: unknown task`);
  assert(['higher', 'lower'].includes(benchmark.direction), `${benchmark.id}: metric direction is required`);
  for (const field of ['name', 'subtask', 'metric', 'description', 'protocolNote']) {
    assert(typeof benchmark[field] === 'string' && benchmark[field].trim(), `${benchmark.id}: missing ${field}`);
  }
  assert.equal(typeof benchmark.unit, 'string');
  https(benchmark.officialUrl, benchmark.id);
}

for (const result of benchmarkResults) {
  const benchmark = benchmarkById.get(result.benchmarkId);
  assert(benchmark, `${result.id}: unknown benchmark`);
  assert(result.modelId === null || modelIds.has(result.modelId), `${result.id}: unknown model or invalid baseline`);
  assert.equal(typeof result.value, 'number', `${result.id}: do not put missing values or formatted text in the numeric field`);
  assert(Number.isFinite(result.value) && result.value >= 0, `${result.id}: invalid reported score`);
  if (benchmark.unit === '%') assert(result.value <= 100, `${result.id}: percent must be on the 0–100 scale`);
  for (const field of ['reportedModel', 'configuration', 'protocol', 'comparisonKey', 'displayValue', 'verifiedAt']) {
    assert(typeof result[field] === 'string' && result[field].trim(), `${result.id}: missing ${field}`);
  }
  assert(Number.isInteger(result.reportedYear), `${result.id}: missing report year`);
  assert(result.source?.title && result.source?.location, `${result.id}: paper and table/section are required`);
  https(result.source.url, result.id);
  assert(result.conditions && Object.keys(result.conditions).length >= 2, `${result.id}: retain evaluation conditions`);
  assert(Object.values(result.conditions).every(value => typeof value === 'string' && value.trim()), `${result.id}: conditions must be disclosed text`);
  assert(Array.isArray(result.notes) && result.notes.length, `${result.id}: state the interpretation limits`);
  for (const source of result.supportingSources ?? []) https(source.url, result.id);
}

// A task should not be advertised with no curated results.
for (const task of tasks) {
  assert(benchmarkResults.some(result => benchmarkById.get(result.benchmarkId).taskId === task.id), `${task.id}: no verified results`);
}

// The full comparison identity includes the benchmark metric, never just a dataset name.
const comparisonGroups = new Map();
for (const result of benchmarkResults) {
  const key = `${result.benchmarkId}:${result.comparisonKey}`;
  const group = comparisonGroups.get(key) ?? [];
  group.push(result.id);
  comparisonGroups.set(key, group);
}

console.log(`Benchmarks verified: ${tasks.length} tasks, ${benchmarks.length} metric definitions, ${benchmarkResults.length} reported results; ${comparisonGroups.size} protocol groups.`);
