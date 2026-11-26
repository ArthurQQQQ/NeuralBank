// Shared, dependency-free submission contract. Validation checks metadata only:
// it never downloads artifacts, executes commands, verifies authorship or reproduces a score.
// The JSON Schema artifact is generated from createSubmissionSchema(), the same
// specification interpreted below. All submitted strings remain untrusted plain text.

const placeholderPattern = '__REQUIRED|^\\s*(?:[Tt][Oo][Dd][Oo]|[Tt][Bb][Dd]|[Nn]\\/?[Aa]|[Nn][Uu][Ll][Ll]|[Nn][Oo][Nn][Ee]|[Uu][Nn][Kk][Nn][Oo][Ww][Nn]|[Pp][Ll][Aa][Cc][Ee][Hh][Oo][Ll][Dd][Ee][Rr]|[Ee][Xx][Aa][Mm][Pp][Ll][Ee]|[Tt][Ee][Ss][Tt]|待填写|待补充|待完善|待确认|待定|未知|占位|暂无|示例|测试)[\\s.。!！_-]*$';
const unsafePattern = '<\\s*\\/?\\s*(?:[Ss][Cc][Rr][Ii][Pp][Tt]|[Ss][Vv][Gg]|[Ii][Ff][Rr][Aa][Mm][Ee]|[Oo][Bb][Jj][Ee][Cc][Tt]|[Ee][Mm][Bb][Ee][Dd]|[Ii][Mm][Gg]|[Ss][Tt][Yy][Ll][Ee]|[Ll][Ii][Nn][Kk]|[Mm][Ee][Tt][Aa]|[Ff][Oo][Rr][Mm])(?:\\s|/|>)|(?:[Jj][Aa][Vv][Aa][Ss][Cc][Rr][Ii][Pp][Tt]|[Vv][Bb][Ss][Cc][Rr][Ii][Pp][Tt])\\s*:';
const urlPattern = '^https://[^/?#@\\s]+(?:[/?#][^\\s]*)?$';
const commitPattern = '^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$';
const digestPattern = '^[a-fA-F0-9]{64}$';

const textField = (minLength = 3, maxLength = 1000) => ({
  type: 'string', minLength, maxLength, pattern: '[\\p{L}\\p{N}]',
  allOf: [{ not: { pattern: placeholderPattern } }, { not: { pattern: unsafePattern } }]
});
const httpsField = () => ({
  type: 'string', minLength: 9, maxLength: 2048, format: 'uri', pattern: urlPattern,
  allOf: [{ not: { pattern: '__REQUIRED|[\\\\]' } }]
});
const integerField = (minimum = 1) => ({ type: 'integer', minimum, maximum: Number.MAX_SAFE_INTEGER });
const objectField = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });

export const editableModelFields = ['tagline', 'description', 'input', 'output', 'formula', 'formulaExplanation', 'keyPoints', 'pitfall', 'learningGoal'];

// These task-specific requirements supplement the existing catalog, whose metric,
// unit and direction remain authoritative. A new benchmark must deliberately add
// a protocol rule here before it accepts community scores.
export const benchmarkSubmissionRules = {
  'hellaswag-acc-norm': { protocol: 'language', minimum: 0, maximum: 100 },
  'lv-eval-128k-avg': { protocol: 'language', minimum: 0, maximum: 100 },
  'imagenet-1k-top1': { protocol: 'vision-classification', minimum: 0, maximum: 100 },
  'imagenet-1k-top1-error': { protocol: 'vision-classification', minimum: 0, maximum: 100 },
  'imagenet-256-fid': { protocol: 'vision-generation', minimum: 0 },
  'gift-eval-normalized-mase': { protocol: 'timeseries', minimum: 0 },
  'gift-eval-normalized-crps': { protocol: 'timeseries', minimum: 0 }
};

// Official LV-Eval configuration IDs; AHN Table 6 also contains these 11 rows.
// https://github.com/infinigence/LVEval#load-data
const lvEval128kTasks = [
  'hotpotwikiqa_mixup', 'loogle_SD_mixup', 'loogle_CR_mixup', 'loogle_MIR_mixup',
  'multifieldqa_en_mixup', 'multifieldqa_zh_mixup', 'factrecall_en', 'factrecall_zh',
  'cmrc_mixup', 'lic_mixup', 'dureader_mixup'
];
const exactString = value => ({ type: 'string', const: value });

function conditionFields(protocol, benchmarkId) {
  if (benchmarkId === 'hellaswag-acc-norm') return {
    shots: integerField(0), contextLength: integerField(),
    promptTemplate: textField(10, 2000), scoring: exactString('acc_norm'), scoringDetails: textField(10, 2000)
  };
  if (benchmarkId === 'lv-eval-128k-avg') return {
    shots: integerField(0), contextLength: integerField(), promptTemplate: textField(10, 2000),
    scoring: exactString('lv-eval-official-task-metrics'), scoringDetails: textField(10, 2000),
    // 128k names the dataset length level; the evaluated model may have a smaller
    // context window and must disclose truncation in its preprocessing metadata.
    lengthLevel: exactString('128k'),
    taskSet: { type: 'array', minItems: 11, maxItems: 11, uniqueItems: true, items: { type: 'string', enum: lvEval128kTasks } },
    aggregation: exactString('unweighted-arithmetic-mean-over-tasks')
  };
  if (protocol === 'vision-classification') return {
    resolution: textField(3, 200), crops: integerField(), pretraining: textField(10, 1000)
  };
  if (protocol === 'vision-generation') return {
    resolution: exactString('256 × 256'), sampleCount: { ...integerField(), const: 50000 }, sampler: textField(3, 500),
    samplingSteps: integerField(), guidance: textField(8, 1000),
    referenceDataset: exactString('ImageNet-1K training set'), referenceStatistics: textField(10, 1500)
  };
  if (protocol === 'timeseries') return {
    contextLength: integerField(), forecastHorizon: textField(8, 1000),
    taskCount: { ...integerField(), const: 97 },
    taskMetric: exactString(benchmarkId === 'gift-eval-normalized-crps' ? 'quantile-CRPS' : 'MASE'),
    baseline: exactString('Seasonal Naive'), baselineVersion: textField(3, 500),
    normalization: exactString('per-task-score-divided-by-baseline'),
    aggregation: exactString('geometric-mean')
  };
  throw new Error(`Unsupported benchmark protocol: ${protocol}`);
}

const editProperties = () => ({
  tagline: textField(8, 160), description: textField(20, 3000),
  input: textField(4, 500), output: textField(4, 500), formula: textField(3, 1000),
  formulaExplanation: textField(15, 2000),
  keyPoints: { type: 'array', minItems: 3, maxItems: 3, items: textField(8, 700) },
  pitfall: textField(10, 1000), learningGoal: textField(10, 1000)
});

function ensureCatalog({ models, benchmarks } = {}) {
  if (!Array.isArray(models) || !models.length || !Array.isArray(benchmarks) || !benchmarks.length) {
    throw new Error('必须传入非空 models 和 benchmarks 目录，不能脱离服务端目录验证。');
  }
  if (!models.every(model => typeof model?.id === 'string') || !benchmarks.every(benchmark =>
    typeof benchmark?.id === 'string' && typeof benchmark.metric === 'string' && typeof benchmark.unit === 'string' && ['higher', 'lower'].includes(benchmark.direction))) {
    throw new Error('目录中的模型 ID 或 benchmark 指标定义不完整。');
  }
}

export function createSubmissionSchema(context) {
  ensureCatalog(context);
  const { models, benchmarks } = context;
  const common = {
    schemaVersion: { const: 1 }, displayName: textField(2, 80),
    modelId: { type: 'string', enum: models.map(model => model.id) }
  };
  const modelRevision = objectField({
    repositoryUrl: httpsField(), commit: { type: 'string', pattern: commitPattern },
    artifactUrl: httpsField(), sha256: { type: 'string', pattern: digestPattern }
  }, ['repositoryUrl', 'commit']);
  modelRevision.dependentRequired = { artifactUrl: ['sha256'], sha256: ['artifactUrl'] };
  const resultSchema = objectField({
    ...common, kind: { const: 'benchmark-result' },
    benchmarkId: { type: 'string', enum: benchmarks.filter(benchmark => benchmarkSubmissionRules[benchmark.id]).map(benchmark => benchmark.id) },
    reportedModel: textField(4, 200), modelRevision,
    score: objectField({ value: { type: 'number' }, metric: textField(2, 200), unit: { type: 'string', maxLength: 40 }, direction: { enum: ['higher', 'lower'] } }),
    dataset: objectField({ version: textField(3, 500), split: textField(3, 500) }),
    evaluation: objectField({ framework: textField(2, 200), version: textField(2, 200), conditions: { type: 'object' } }),
    configuration: objectField({
      architecture: textField(8, 2000), parameterCount: integerField(),
      trainingData: textField(10, 2000), trainingProcedure: textField(10, 2000),
      precision: textField(3, 200), preprocessing: textField(10, 2000), inference: textField(10, 2000)
    }),
    reproduction: objectField({
      repositoryUrl: httpsField(), commit: { type: 'string', pattern: commitPattern },
      configUrl: httpsField(), logUrl: httpsField(), command: textField(5, 2000)
    }),
    environment: objectField({ hardware: textField(10, 1500), software: textField(10, 2000) }),
    notes: { type: 'array', minItems: 1, maxItems: 10, items: textField(10, 1000) }
  });
  resultSchema.allOf = benchmarks.filter(benchmark => benchmarkSubmissionRules[benchmark.id]).map(benchmark => {
    const rule = benchmarkSubmissionRules[benchmark.id];
    return {
      if: { properties: { benchmarkId: { const: benchmark.id } }, required: ['benchmarkId'] },
      then: { properties: {
        score: objectField({
          value: { type: 'number', minimum: rule.minimum, ...(rule.maximum === undefined ? {} : { maximum: rule.maximum }) },
          metric: { const: benchmark.metric }, unit: { const: benchmark.unit }, direction: { const: benchmark.direction }
        }),
        evaluation: objectField({ framework: textField(2, 200), version: textField(2, 200), conditions: objectField(conditionFields(rule.protocol, benchmark.id)) })
      } }
    };
  });
  const changes = objectField(editProperties(), []);
  changes.minProperties = 1;
  const editSchema = objectField({
    ...common, kind: { const: 'model-edit' }, changes,
    sources: { type: 'array', minItems: 1, maxItems: 8, uniqueItems: true, items: httpsField() },
    rationale: textField(20, 2000)
  });
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://neuralbank.example/schemas/submission.schema.json',
    title: 'NeuralBank community submission · schema version 1',
    description: '格式与评测元数据检查；不执行用户命令，不验证真实性或复现，不产生 approved/validated/reproduced 状态。文字按 trim 后验证；所有输出仍应作为纯文本转义。',
    oneOf: [resultSchema, editSchema]
  };
}

const pathPart = key => String(key).replaceAll('~', '~0').replaceAll('/', '~1');
const propertyPath = (path, key) => `${path}/${pathPart(key)}`;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function normalizeJson(value, seen = new Set(), depth = 0) {
  if (depth > 20) throw new Error('JSON 嵌套过深。');
  if (typeof value === 'string') return value.trim();
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value !== 'object' || seen.has(value)) throw new Error('只接受不含循环引用的 JSON 数据。');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error('只接受普通 JSON 对象。');
  if (Object.getOwnPropertySymbols(value).length) throw new Error('JSON 数据不能包含 Symbol 字段。');
  seen.add(value);
  let normalized;
  if (Array.isArray(value)) {
    normalized = [];
    if (Object.keys(value).length !== value.length) throw new Error('JSON 数组不能包含空槽或额外字段。');
    for (let index = 0; index < value.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('JSON 数组不应包含空槽、getter 或 setter。');
      normalized.push(normalizeJson(descriptor.value, seen, depth + 1));
    }
  }
  else {
    normalized = Object.create(null);
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('JSON 对象不应包含 getter 或 setter。');
      normalized[key] = normalizeJson(descriptor.value, seen, depth + 1);
    }
  }
  seen.delete(value);
  return normalized;
}

// Deliberately small JSON Schema 2020-12 interpreter for the exact vocabulary
// emitted above. The same constraints generate the public documentation artifact.
function checkSchema(value, schema, path, errors) {
  const add = (code, message, at = path) => errors.push({ path: at || '/', code, message });
  if (schema.oneOf) {
    const selected = schema.oneOf.find(branch => branch.properties?.kind?.const === value?.kind);
    if (selected) checkSchema(value, selected, path, errors);
    else add('kind', 'kind 必须是 benchmark-result 或 model-edit。', propertyPath(path, 'kind'));
    return;
  }
  if (Object.hasOwn(schema, 'const') && value !== schema.const) add('const', `必须等于 ${JSON.stringify(schema.const)}。`);
  if (schema.enum && !schema.enum.includes(value)) add('enum', '值不在允许的目录或选项中。');
  if (schema.type) {
    const validType = schema.type === 'object' ? isObject(value)
      : schema.type === 'array' ? Array.isArray(value)
      : schema.type === 'integer' ? Number.isSafeInteger(value)
      : schema.type === 'number' ? typeof value === 'number' && Number.isFinite(value)
      : typeof value === schema.type;
    if (!validType) { add('type', `必须是${schema.type === 'number' ? '有限数值' : schema.type === 'integer' ? '安全整数' : schema.type}，不会自动转换类型。`); return; }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && [...value].length < schema.minLength) add('min-length', `至少需要 ${schema.minLength} 个字符，且不能留空。`);
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength) add('max-length', `最多允许 ${schema.maxLength} 个字符。`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) add('pattern',
      schema.pattern === commitPattern ? 'commit 必须是完整 40 或 64 位十六进制 Git commit。'
        : schema.pattern === digestPattern ? 'SHA-256 摘要必须是 64 位十六进制字符。'
        : schema.pattern === urlPattern ? '链接必须是完整 HTTPS URL，且不得包含凭据或空白。'
        : '请填写包含文字或数字的完整内容，不能只使用空白或标点。');
    if (schema.format === 'uri') {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || /[\\\s]/u.test(value) || value.includes('__REQUIRED')) throw new Error('invalid');
      } catch { add('url', '请输入不含用户名或密码的完整 HTTPS URL。'); }
    }
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) add('minimum', `不得小于 ${schema.minimum}。`);
    if (schema.maximum !== undefined && value > schema.maximum) add('maximum', `不得大于 ${schema.maximum}。`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) add('min-items', `至少需要 ${schema.minItems} 项。`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) add('max-items', `最多允许 ${schema.maxItems} 项。`);
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) add('unique-items', '不允许重复条目。');
    if (schema.items) value.forEach((item, index) => checkSchema(item, schema.items, propertyPath(path, index), errors));
  }
  if (isObject(value)) {
    const properties = schema.properties || {};
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) add('min-properties', '请至少修改一个允许的教学文字字段。');
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) add('required', '缺少必填字段。', propertyPath(path, key));
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.hasOwn(properties, key)) add('unknown-field', '不允许额外字段或客户端提供的审核/身份状态。', propertyPath(path, key));
    for (const [key, property] of Object.entries(properties)) if (Object.hasOwn(value, key)) checkSchema(value[key], property, propertyPath(path, key), errors);
    for (const [key, dependencies] of Object.entries(schema.dependentRequired || {})) if (Object.hasOwn(value, key)) {
      for (const dependency of dependencies) if (!Object.hasOwn(value, dependency)) add('required', `${key} 和 ${dependency} 必须成对提供。`, propertyPath(path, dependency));
    }
  }
  for (const branch of schema.allOf || []) checkSchema(value, branch, path, errors);
  if (schema.not) {
    const trial = [];
    checkSchema(value, schema.not, path, trial);
    if (!trial.length) add('disallowed-text', '不接受空白占位、待填写文字、脚本/SVG 等可执行标记；请提交完整纯文本。');
  }
  if (schema.if) {
    const trial = [];
    checkSchema(value, schema.if, path, trial);
    if (!trial.length && schema.then) checkSchema(value, schema.then, path, errors);
  }
}

export function validateSubmission(input, context) {
  let schema;
  try { schema = createSubmissionSchema(context); }
  catch (error) { return { valid: false, errors: [{ path: '/', code: 'catalog-context', message: error.message }] }; }
  let value;
  try { value = normalizeJson(input); }
  catch (error) { return { valid: false, errors: [{ path: '/', code: 'json', message: error.message }] }; }
  const errors = [];
  checkSchema(value, schema, '', errors);
  // Conditional schema branches may repeat an error; keep one locator per cause.
  const uniqueErrors = [...new Map(errors.map(error => [`${error.path}|${error.code}|${error.message}`, error])).values()];
  return uniqueErrors.length ? { valid: false, errors: uniqueErrors } : { valid: true, errors: [], value };
}

const requiredText = label => `__REQUIRED: ${label}__`;

export function getSubmissionTemplate(kind, context) {
  ensureCatalog(context);
  const modelId = context.modelId || context.models[0].id;
  if (kind === 'model-edit') return {
    schemaVersion: 1, kind, displayName: requiredText('展示名，身份由登录系统确定'), modelId,
    changes: { description: requiredText('填写修改后的完整教学说明，20–3000 字符') },
    sources: [requiredText('支持本次修改的一手资料 HTTPS URL')],
    rationale: requiredText('解释为什么修改、原文有什么问题以及来源依据')
  };
  if (kind !== 'benchmark-result') throw new Error('未知投稿 kind。');
  const benchmark = context.benchmarks.find(item => item.id === context.benchmarkId) || context.benchmarks[0];
  const rule = benchmarkSubmissionRules[benchmark.id];
  if (!rule) throw new Error('该 benchmark 尚未配置社区评测元数据要求。');
  const conditions = Object.fromEntries(Object.entries(conditionFields(rule.protocol, benchmark.id)).map(([key, field]) => {
    if (field.type === 'integer') return [key, null];
    if (field.type === 'array') return [key, [requiredText(`列出全部任务，不可缺失或重复：${field.items.enum.join(', ')}`)]];
    return [key, requiredText(Object.hasOwn(field, 'const') ? `${key} 必须填写 ${JSON.stringify(field.const)}；请确认实际评测符合要求` : key)];
  }));
  return {
    schemaVersion: 1, kind, displayName: requiredText('展示名，身份由登录系统确定'), modelId,
    benchmarkId: benchmark.id, reportedModel: requiredText('实际训练/评测模型名称和规模，不是教学图名称'),
    modelRevision: { repositoryUrl: requiredText('模型仓库 HTTPS URL'), commit: requiredText('完整 40 或 64 位 Git commit') },
    score: { value: null, metric: benchmark.metric, unit: benchmark.unit, direction: benchmark.direction },
    dataset: { version: requiredText('数据集版本/不可变 revision'), split: requiredText('精确评估 split 与子集') },
    evaluation: { framework: requiredText('评测框架名称'), version: requiredText('评测框架版本或完整 commit'), conditions },
    configuration: {
      architecture: requiredText('完整架构配置及与教学模型的关联'), parameterCount: null,
      trainingData: requiredText('预训练/微调数据及版本，未训练也须解释'),
      trainingProcedure: requiredText('训练/微调设置；使用现成权重须注明来源'),
      precision: requiredText('训练及推理精度'), preprocessing: requiredText('分词、归一化、裁剪等预处理'),
      inference: requiredText('推理、批量、解码或采样设置')
    },
    reproduction: {
      repositoryUrl: requiredText('复现代码仓库 HTTPS URL'), commit: requiredText('完整 40 或 64 位 Git commit'),
      configUrl: requiredText('完整配置文件 HTTPS URL'), logUrl: requiredText('原始评测日志 HTTPS URL'), command: requiredText('复现命令；本网站不会执行它')
    },
    environment: { hardware: requiredText('CPU/GPU/内存/设备数量'), software: requiredText('操作系统、运行时、框架和关键依赖版本') },
    notes: [requiredText('说明已知限制、协议差异和异常；格式通过不等于结果已复现')]
  };
}
