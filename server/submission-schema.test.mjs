import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateSubmission, getSubmissionTemplate, createSubmissionSchema } from '../src/submission-schema.js';
import { models } from '../src/models.js';
import { benchmarks } from '../src/benchmarks.js';

const context = { models, benchmarks };
const fixture = async kind => JSON.parse(await readFile(new URL(`../examples/submissions/${kind}.valid.json`, import.meta.url), 'utf8'));
const checkInvalid = (value, path, code) => {
  const result = validateSubmission(value, context);
  assert.equal(result.valid, false);
  assert.equal(result.value, undefined);
  assert.ok(result.errors.some(error => error.path === path && (!code || error.code === code)), JSON.stringify(result.errors));
};
const benchmarkInput = async (id, conditions) => {
  const value = await fixture('benchmark-result');
  const benchmark = benchmarks.find(item => item.id === id);
  value.benchmarkId = id;
  value.score = { value: 1, metric: benchmark.metric, unit: benchmark.unit, direction: benchmark.direction };
  value.evaluation.conditions = conditions;
  return value;
};

test('FID-50K at ImageNet-256 rejects one CIFAR-10 image at 32 × 32', async () => {
  const value = await benchmarkInput('imagenet-256-fid', {
    resolution: '32 × 32', sampleCount: 1, sampler: 'Euler', samplingSteps: 1,
    guidance: 'CFG = 1.0; no interval', referenceStatistics: 'CIFAR-10 test split; 32 × 32 reference statistics'
  });
  checkInvalid(value, '/evaluation/conditions/sampleCount', 'const');
  checkInvalid(value, '/evaluation/conditions/resolution', 'const');
  checkInvalid(value, '/evaluation/conditions/referenceDataset', 'required');
});

test('HellaSwag acc_norm rejects an unnormalized scoring declaration', async () => {
  const value = await fixture('benchmark-result');
  value.evaluation.conditions.scoring = 'raw candidate accuracy; no length normalization';
  checkInvalid(value, '/evaluation/conditions/scoring', 'const');
});

test('GIFT normalized metrics reject arithmetic means and missing baseline normalization', async () => {
  for (const id of ['gift-eval-normalized-mase', 'gift-eval-normalized-crps']) {
    const value = await benchmarkInput(id, {
      contextLength: 1024, forecastHorizon: '每个任务使用固定的官方预测范围。', taskCount: 97,
      aggregation: 'arithmetic mean of unnormalized task scores'
    });
    checkInvalid(value, '/evaluation/conditions/aggregation', 'const');
    checkInvalid(value, '/evaluation/conditions/baseline', 'required');
    checkInvalid(value, '/evaluation/conditions/normalization', 'required');
  }
});

test('LV-Eval 128K average requires the complete task set and macro aggregation', async () => {
  const value = await benchmarkInput('lv-eval-128k-avg', {
    shots: 0, contextLength: 8192, promptTemplate: '使用固定的长文问答模板并保留数据源文档。',
    scoring: '只评估一个任务；把所有问题汇总成单一 micro accuracy。'
  });
  checkInvalid(value, '/evaluation/conditions/taskSet', 'required');
  checkInvalid(value, '/evaluation/conditions/aggregation', 'required');
  checkInvalid(value, '/evaluation/conditions/lengthLevel', 'required');
});

test('FID identity constants reject individual protocol changes but permit different sampling budgets', async () => {
  const conditions = {
    resolution: '256 × 256', sampleCount: 50000, sampler: 'Different sampler', samplingSteps: 1,
    guidance: 'CFG 1.0 without guidance interval', referenceDataset: 'ImageNet-1K training set',
    referenceStatistics: '虚构测试参考文件版本：fixture-v1，https://example.org/fictional-reference-stats.npz'
  };
  const value = await benchmarkInput('imagenet-256-fid', conditions);
  assert.equal(validateSubmission(value, context).valid, true);
  for (const [field, wrong] of [['resolution', '32 × 32'], ['sampleCount', 1], ['referenceDataset', 'CIFAR-10 test set']]) {
    value.evaluation.conditions = { ...conditions, [field]: wrong };
    checkInvalid(value, `/evaluation/conditions/${field}`, 'const');
  }
});

test('GIFT explicitly fixes baseline, normalization, per-task metric and aggregation', async () => {
  for (const [id, metric] of [['gift-eval-normalized-mase', 'MASE'], ['gift-eval-normalized-crps', 'quantile-CRPS']]) {
    const conditions = {
      contextLength: 512, forecastHorizon: '各官方任务的预测区间，不设置统一长度。', taskCount: 97,
      taskMetric: metric, baseline: 'Seasonal Naive', baselineVersion: 'fictional-fixture-v1',
      normalization: 'per-task-score-divided-by-baseline', aggregation: 'geometric-mean'
    };
    const value = await benchmarkInput(id, conditions);
    assert.equal(validateSubmission(value, context).valid, true);
    for (const [field, wrong] of [['baseline', 'Naive'], ['normalization', 'none'], ['aggregation', 'arithmetic-mean'], ['taskMetric', 'MSE'], ['taskCount', 1]]) {
      value.evaluation.conditions = { ...conditions, [field]: wrong };
      checkInvalid(value, `/evaluation/conditions/${field}`, 'const');
    }
  }
});

test('LV-Eval task mean excludes missing, repeated or foreign tasks and wrong length levels', async () => {
  const taskSet = ['cmrc_mixup', 'dureader_mixup', 'factrecall_en', 'factrecall_zh', 'hotpotwikiqa_mixup', 'lic_mixup', 'loogle_CR_mixup', 'loogle_MIR_mixup', 'loogle_SD_mixup', 'multifieldqa_en_mixup', 'multifieldqa_zh_mixup'];
  const conditions = {
    shots: 0, contextLength: 8192, promptTemplate: '虚构测试：对128k档输入按声明策略截断，模型窗口为8192。',
    scoring: 'lv-eval-official-task-metrics', scoringDetails: '虚构测试：使用每个任务的官方评分器，再对11项分数等权平均。',
    lengthLevel: '128k', taskSet, aggregation: 'unweighted-arithmetic-mean-over-tasks'
  };
  const value = await benchmarkInput('lv-eval-128k-avg', conditions);
  assert.equal(validateSubmission(value, context).valid, true, 'task order and actual model window are not forced to AHN paper settings');
  value.evaluation.conditions = { ...conditions, taskSet: taskSet.slice(1) };
  checkInvalid(value, '/evaluation/conditions/taskSet', 'min-items');
  value.evaluation.conditions = { ...conditions, taskSet: [...taskSet.slice(1), taskSet[1]] };
  checkInvalid(value, '/evaluation/conditions/taskSet', 'unique-items');
  value.evaluation.conditions = { ...conditions, taskSet: ['unrelated_task', ...taskSet.slice(1)] };
  checkInvalid(value, '/evaluation/conditions/taskSet/0', 'enum');
  for (const [field, wrong] of [['lengthLevel', '32k'], ['aggregation', 'micro-average-over-questions'], ['scoring', 'exact-match-only']]) {
    value.evaluation.conditions = { ...conditions, [field]: wrong };
    checkInvalid(value, `/evaluation/conditions/${field}`, 'const');
  }
});

test('both explicitly fictional fixtures have valid complete metadata', async () => {
  for (const kind of ['benchmark-result', 'model-edit']) {
    const value = await fixture(kind);
    const result = validateSubmission(value, context);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    assert.match(JSON.stringify(result.value), /虚构/);
  }
});

test('normalization trims strings without mutating the input', async () => {
  const input = await fixture('model-edit');
  input.displayName = '  验证用虚构提交者  ';
  const result = validateSubmission(input, context);
  assert.equal(result.value.displayName, '验证用虚构提交者');
  assert.equal(input.displayName, '  验证用虚构提交者  ');
});

test('rejects fake server states and unknown nested properties', async () => {
  for (const key of ['validated', 'approved', 'reproduced', 'status', 'authorId', 'comparisonKey']) {
    const input = await fixture('benchmark-result');
    input[key] = true;
    checkInvalid(input, `/${key}`, 'unknown-field');
  }
  const input = await fixture('benchmark-result');
  input.score.isTrusted = true;
  checkInvalid(input, '/score/isTrusted', 'unknown-field');
});

test('catalog IDs and metric identity must match the supplied catalog', async () => {
  const input = await fixture('benchmark-result');
  input.modelId = 'made-up-model';
  checkInvalid(input, '/modelId', 'enum');
  input.modelId = 'mamba3';
  input.benchmarkId = 'unknown-benchmark';
  checkInvalid(input, '/benchmarkId', 'enum');
  input.benchmarkId = 'hellaswag-acc-norm';
  input.score.metric = 'accuracy';
  checkInvalid(input, '/score/metric', 'const');
});

test('numeric scores enforce finite values, bounds and no numeric coercion', async () => {
  for (const value of [-1, 100.01, NaN, Infinity, '61.9', null]) {
    const input = await fixture('benchmark-result');
    input.score.value = value;
    checkInvalid(input, '/score/value');
  }
  for (const value of [0, 100]) {
    const input = await fixture('benchmark-result');
    input.score.value = value;
    assert.equal(validateSubmission(input, context).valid, true);
  }
});

test('rejects empty, placeholder, unsafe markup and non-HTTPS credential URLs', async () => {
  for (const value of ['', '   ', 'TODO', '待填写', '......', '\u200b'.repeat(8), '__REQUIRED: 模型名称__', '<svg onload=alert(1)>']) {
    const input = await fixture('benchmark-result');
    input.reportedModel = value;
    checkInvalid(input, '/reportedModel');
  }
  for (const value of ['http://example.org/config.json', 'https://user:password@example.org/config.json', 'javascript:alert(1)']) {
    const input = await fixture('benchmark-result');
    input.reproduction.configUrl = value;
    checkInvalid(input, '/reproduction/configUrl');
  }
});

test('requires full source commits and paired optional checkpoint evidence', async () => {
  const input = await fixture('benchmark-result');
  input.reproduction.commit = 'a'.repeat(7);
  checkInvalid(input, '/reproduction/commit');
  input.reproduction.commit = 'a'.repeat(40);
  input.modelRevision.artifactUrl = 'https://example.org/fictional-checkpoint.bin';
  checkInvalid(input, '/modelRevision/sha256', 'required');
  input.modelRevision.sha256 = 'b'.repeat(64);
  assert.equal(validateSubmission(input, context).valid, true);
  delete input.modelRevision.artifactUrl;
  checkInvalid(input, '/modelRevision/artifactUrl', 'required');
});

test('requires task-specific evaluation fields and rejects foreign protocol fields', async () => {
  const input = await fixture('benchmark-result');
  delete input.evaluation.conditions.contextLength;
  checkInvalid(input, '/evaluation/conditions/contextLength', 'required');
  input.evaluation.conditions.contextLength = 2048;
  input.evaluation.conditions.resolution = '224 × 224';
  checkInvalid(input, '/evaluation/conditions/resolution', 'unknown-field');
});

test('model edits use a nonempty whitelist and retain plain mathematical comparisons', async () => {
  const input = await fixture('model-edit');
  input.changes = {};
  checkInvalid(input, '/changes', 'min-properties');
  input.changes = { id: 'new-id' };
  checkInvalid(input, '/changes/id', 'unknown-field');
  input.changes = { formula: 'f(x) = 1 if x > 0; 0 if x < 0' };
  assert.equal(validateSubmission(input, context).valid, true);
});

test('templates are intentionally invalid until required fields are completed', () => {
  for (const kind of ['benchmark-result', 'model-edit']) {
    const template = getSubmissionTemplate(kind, context);
    assert.equal(template.schemaVersion, 1);
    assert.equal(validateSubmission(template, context).valid, false);
  }
});

test('all seven benchmark protocols are covered by generated JSON Schema', () => {
  const schema = createSubmissionSchema(context);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.oneOf[0].allOf.length, benchmarks.length);
});

test('all benchmark variants require their own protocol and metric bounds', async () => {
  const conditions = {
    'hellaswag-acc-norm': { shots: 0, contextLength: 2048, promptTemplate: '虚构测试：固定上下文与候选格式，不执行评测。', scoring: 'acc_norm', scoringDetails: '虚构测试：使用候选长度归一化分数计算准确率。' },
    'lv-eval-128k-avg': {
      shots: 0, contextLength: 8192, promptTemplate: '虚构测试：长文问答模板以及答案提取格式。',
      scoring: 'lv-eval-official-task-metrics', scoringDetails: '虚构测试：各任务按指定评分器计分，再取任务平均。',
      lengthLevel: '128k', aggregation: 'unweighted-arithmetic-mean-over-tasks',
      taskSet: ['hotpotwikiqa_mixup', 'loogle_SD_mixup', 'loogle_CR_mixup', 'loogle_MIR_mixup', 'multifieldqa_en_mixup', 'multifieldqa_zh_mixup', 'factrecall_en', 'factrecall_zh', 'cmrc_mixup', 'lic_mixup', 'dureader_mixup']
    },
    'imagenet-1k-top1': { resolution: '224 × 224', crops: 1, pretraining: '虚构测试：从头训练，未使用任何外部预训练权重。' },
    'imagenet-1k-top1-error': { resolution: '224 × 224', crops: 10, pretraining: '虚构测试：从头训练，未使用任何外部预训练权重。' },
    'imagenet-256-fid': { resolution: '256 × 256', sampleCount: 50000, sampler: '虚构 Euler', samplingSteps: 250, guidance: '虚构测试：CFG 1.0，完整采样时间区间。', referenceDataset: 'ImageNet-1K training set', referenceStatistics: '虚构测试：ImageNet train 参考统计量的版本说明。' },
    'gift-eval-normalized-mase': { contextLength: 2048, forecastHorizon: '虚构测试：各任务采用其官方预测长度。', taskCount: 97, taskMetric: 'MASE', baseline: 'Seasonal Naive', baselineVersion: 'fictional-fixture-v1', normalization: 'per-task-score-divided-by-baseline', aggregation: 'geometric-mean' },
    'gift-eval-normalized-crps': { contextLength: 2048, forecastHorizon: '虚构测试：各任务采用其官方预测长度。', taskCount: 97, taskMetric: 'quantile-CRPS', baseline: 'Seasonal Naive', baselineVersion: 'fictional-fixture-v1', normalization: 'per-task-score-divided-by-baseline', aggregation: 'geometric-mean' }
  };
  for (const benchmark of benchmarks) {
    const input = await fixture('benchmark-result');
    input.benchmarkId = benchmark.id;
    input.score = { value: 0.5, metric: benchmark.metric, unit: benchmark.unit, direction: benchmark.direction };
    input.evaluation.conditions = structuredClone(conditions[benchmark.id]);
    assert.equal(validateSubmission(input, context).valid, true, benchmark.id);
    const required = Object.keys(input.evaluation.conditions)[0];
    delete input.evaluation.conditions[required];
    checkInvalid(input, `/evaluation/conditions/${required}`, 'required');
    input.evaluation.conditions = structuredClone(conditions[benchmark.id]);
    input.score.value = -0.01;
    checkInvalid(input, '/score/value', 'minimum');
  }
});

test('public JSON Schema is generated from exactly the runtime specification', async () => {
  const schema = JSON.parse(await readFile(new URL('../schemas/submission.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema, createSubmissionSchema(context));
});

test('prototype and excessive nesting inputs do not modify runtime state', async () => {
  const input = await fixture('model-edit');
  input.changes = JSON.parse('{"__proto__":{"approved":true}}');
  checkInvalid(input, '/changes/__proto__', 'unknown-field');
  assert.equal({}.approved, undefined);
  let nested = {};
  for (let i = 0; i < 25; i++) nested = { nested };
  checkInvalid(nested, '/', 'json');
});

test('CLI checks files without running their command and exits nonzero with field paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'neuralbank-submission-'));
  try {
    const input = await fixture('benchmark-result');
    input.reproduction.command = 'node -e "throw new Error(\'this command must never run\')"';
    const path = join(directory, 'submission.json');
    await writeFile(path, JSON.stringify(input));
    const cli = new URL('../scripts/check-submission.mjs', import.meta.url);
    let output = spawnSync(process.execPath, [cli.pathname, path], { encoding: 'utf8' });
    assert.equal(output.status, 0, output.stderr);
    input.score.value = 999;
    await writeFile(path, JSON.stringify(input));
    output = spawnSync(process.execPath, [cli.pathname, directory], { encoding: 'utf8' });
    assert.equal(output.status, 1);
    assert.match(output.stderr, /\/score\/value \[maximum\]/);
    assert.doesNotMatch(output.stderr, /this command must never run/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('fails closed without catalog context and rejects non-JSON values', () => {
  assert.equal(validateSubmission({}, {}).valid, false);
  assert.equal(validateSubmission(null, context).valid, false);
  const circular = {}; circular.self = circular;
  assert.equal(validateSubmission(circular, context).valid, false);
  const accessor = {};
  Object.defineProperty(accessor, 'kind', { get() { throw new Error('Getter must never execute'); }, enumerable: true });
  assert.equal(validateSubmission(accessor, context).errors[0].code, 'json');
  assert.equal(validateSubmission(new Array(2), context).errors[0].code, 'json');
});
