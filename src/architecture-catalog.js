import { models as sourceModels } from './models.js';
import * as sourceTaxonomy from './taxonomy.js';
import { benchmarks as sourceBenchmarks, benchmarkResults as sourceBenchmarkResults } from './benchmarks.js';
import { architectureMetadata, architectureAxes, architectureMetadataScope } from './architecture-metadata.js';

const SCHEMA_VERSION = 1;
const clone = value => JSON.parse(JSON.stringify(value));
const idOrder = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const unique = values => [...new Set(values)];
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const caveats = [
  architectureMetadataScope.supportedTasks,
  architectureMetadataScope.configuration,
  architectureMetadataScope.evidence,
  architectureMetadataScope.absence,
  '比较与建议仅展示机制匹配、理由和局限；按稳定ID排序，不提供主观最佳总排名或跨协议性能排名。',
  'benchmarkIds只链接目录中已收录的论文结果；成绩属于原文具体训练配置，不属于缩略教学图。'
];

export class CatalogQueryError extends Error {
  constructor(code, message, path = '/', status = 400) {
    super(message);
    this.name = 'CatalogQueryError';
    this.code = code;
    this.path = path;
    this.status = status;
  }
}
const fail = (code, message, path = '/', status = 400) => { throw new CatalogQueryError(code, message, path, status); };

function objectArgument(value, allowed, path) {
  if (!plainObject(value)) fail('INVALID_ARGUMENT', '必须提供普通JSON对象。', path);
  if (Object.getOwnPropertySymbols(value).length) fail('INVALID_ARGUMENT', '不能包含Symbol字段。', path);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail('UNKNOWN_FILTER', `不支持字段 ${key}；允许：${allowed.join(', ')}。`, `${path}/${key}`);
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) fail('INVALID_ARGUMENT', '不能包含getter或setter。', `${path}/${key}`);
  }
}
function stringArgument(value, path, { max = 300, allowEmpty = false } = {}) {
  if (typeof value !== 'string') fail('INVALID_ARGUMENT', '必须提供字符串，不会自动转换类型。', path);
  const normalized = value.trim();
  if ((!allowEmpty && !normalized) || normalized.length > max) fail('INVALID_ARGUMENT', `需要${allowEmpty ? '不超过' : '1至'}${max}字符的字符串。`, path);
  return normalized;
}
function enumArgument(value, allowed, path) {
  const normalized = stringArgument(value, path);
  if (!allowed.includes(normalized)) fail('UNKNOWN_VALUE', `未知值 ${normalized}；允许：${allowed.join(', ')}。`, path);
  return normalized;
}
function arrayArgument(value, allowed, path, max = 20) {
  if (!Array.isArray(value) || value.length > max) fail('INVALID_ARGUMENT', `必须是最多${max}项的字符串数组。`, path);
  const normalized = [];
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index)) fail('INVALID_ARGUMENT', '数组不能有空槽。', `${path}/${index}`);
    normalized.push(enumArgument(value[index], allowed, `${path}/${index}`));
  }
  if (new Set(normalized).size !== normalized.length) fail('INVALID_ARGUMENT', '数组不能包含重复值。', path);
  return normalized;
}
function integerArgument(value, min, max, path) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail('INVALID_ARGUMENT', `必须是${min}至${max}之间的整数，不接受数字字符串。`, path);
  return value;
}
const intersection = arrays => arrays.length ? arrays[0].filter(value => arrays.every(array => array.includes(value))) : [];

export function createArchitectureCatalog({ models, taxonomy, benchmarks, benchmarkResults = [], metadata = architectureMetadata } = {}) {
  if (!Array.isArray(models) || !models.length || !Array.isArray(taxonomy?.categories) || !Array.isArray(benchmarks) || !plainObject(metadata)) {
    fail('CATALOG_INVALID', '需要完整models、taxonomy.categories、benchmarks与metadata。', '/', 500);
  }
  const rows = clone(models).sort(idOrder);
  const info = clone(metadata);
  const categoryRows = clone(taxonomy.categories);
  const benchmarkRows = clone(benchmarks);
  const literatureResults = clone(benchmarkResults);
  const paths = clone(taxonomy.studyPaths || []);
  const byId = new Map(rows.map(model => [model.id, model]));
  if (byId.size !== rows.length || rows.some(model => typeof model.id !== 'string' || !model.id)) fail('CATALOG_INVALID', '模型ID必须唯一且非空。', '/models', 500);
  const missing = rows.filter(model => !Object.hasOwn(info, model.id)).map(model => model.id);
  const extra = Object.keys(info).filter(id => !byId.has(id));
  if (missing.length || extra.length) fail('CATALOG_INCOMPLETE', `metadata覆盖不一致；缺失：${missing.join(', ') || '无'}；未知：${extra.join(', ') || '无'}。`, '/metadata', 500);
  const axes = {
    supportedTasks: architectureAxes.tasks.map(item => item.id), mechanisms: architectureAxes.mechanisms.map(item => item.id),
    inputModalities: architectureAxes.inputModalities.map(item => item.id), outputTypes: architectureAxes.outputTypes.map(item => item.id),
    traits: architectureAxes.traits.map(item => item.id), entityTypes: architectureAxes.entityTypes.map(item => item.id),
    levels: ['入门', '进阶', '深入']
  };
  const categoriesById = new Map(categoryRows.map(category => [category.id, category]));
  if (categoriesById.size !== categoryRows.length) fail('CATALOG_INVALID', '分类ID必须唯一。', '/taxonomy/categories', 500);
  const benchmarkById = new Map(benchmarkRows.map(benchmark => [benchmark.id, benchmark]));
  if (benchmarkById.size !== benchmarkRows.length) fail('CATALOG_INVALID', 'benchmark ID必须唯一。', '/benchmarks', 500);
  for (const model of rows) {
    const data = info[model.id];
    if (!categoriesById.has(model.category)) fail('CATALOG_INVALID', `模型${model.id}分类未知。`, `/models/${model.id}/category`, 500);
    if (!axes.entityTypes.includes(data.entityType) || typeof data.teachingScope !== 'string' || !data.teachingScope || typeof data.scopeNote !== 'string' || !data.scopeNote) fail('CATALOG_INVALID', `模型${model.id}类型或范围说明不完整。`, `/metadata/${model.id}`, 500);
    for (const key of ['supportedTasks', 'mechanisms', 'inputModalities', 'outputTypes', 'traits']) {
      if (!Array.isArray(data[key]) || !data[key].length || new Set(data[key]).size !== data[key].length || data[key].some(value => !axes[key].includes(value))) fail('CATALOG_INVALID', `模型${model.id}的${key}不符合受控词表。`, `/metadata/${model.id}/${key}`, 500);
    }
    for (const key of ['representativeUseCases', 'tradeoffs']) if (!Array.isArray(data[key]) || !data[key].length || data[key].some(value => typeof value !== 'string' || !value.trim())) fail('CATALOG_INVALID', `模型${model.id}缺少${key}。`, `/metadata/${model.id}/${key}`, 500);
    for (const [key, ids] of [['prerequisites', model.prerequisites], ['relatedModelIds', data.relatedModelIds]]) {
      if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => !byId.has(id) || id === model.id)) fail('CATALOG_INVALID', `模型${model.id}包含未知/重复/自身${key}。`, `/models/${model.id}/${key}`, 500);
    }
    if (!Array.isArray(model.references) || !model.references.length || model.references.some(reference => {
      try { const url = new URL(reference.url); return url.protocol !== 'https:' || !!url.username || !!url.password || typeof reference.label !== 'string' || !reference.label; } catch { return true; }
    })) fail('CATALOG_INVALID', `模型${model.id}缺少有效HTTPS来源。`, `/models/${model.id}/references`, 500);
  }
  const active = new Set(), visited = new Set();
  function visit(id) {
    if (active.has(id)) fail('CATALOG_INVALID', `先修关系存在环：${id}。`, '/models/prerequisites', 500);
    if (visited.has(id)) return;
    active.add(id); byId.get(id).prerequisites.forEach(visit); active.delete(id); visited.add(id);
  }
  rows.forEach(model => visit(model.id));
  for (const category of categoryRows) for (const id of category.order || []) if (!byId.has(id) || byId.get(id).category !== category.id) fail('CATALOG_INVALID', `分类顺序含未知或错类ID：${id}。`, '/taxonomy/categories', 500);
  for (const path of paths) for (const id of path.models || []) if (!byId.has(id)) fail('CATALOG_INVALID', `学习路径含未知ID：${id}。`, '/taxonomy/studyPaths', 500);
  for (const result of literatureResults) if (!benchmarkById.has(result.benchmarkId) || (result.modelId !== null && !byId.has(result.modelId))) fail('CATALOG_INVALID', '论文成绩包含未知模型或benchmark ID。', '/benchmarkResults', 500);

  const lookup = id => {
    const normalized = stringArgument(id, '/id', { max: 100 });
    const model = byId.get(normalized);
    if (!model) fail('NOT_FOUND', `未知架构ID：${normalized}。请先检索目录。`, '/id', 404);
    return model;
  };
  const limitations = model => unique([...(model.limitations || []), ...info[model.id].tradeoffs, model.pitfall].filter(Boolean));
  const benchmarkIds = id => unique(literatureResults.filter(result => result.modelId === id).map(result => result.benchmarkId)).sort();
  const shortLink = id => ({ id, name: byId.get(id).name, category: byId.get(id).category });
  const summary = model => ({
    id: model.id, name: model.name, fullName: model.fullName, category: model.category,
    categoryName: categoriesById.get(model.category).name, level: model.level, year: model.year,
    tagline: model.tagline, metadata: info[model.id], prerequisites: model.prerequisites,
    relatedModelIds: info[model.id].relatedModelIds, references: model.references,
    limitations: limitations(model), benchmarkIds: benchmarkIds(model.id)
  });
  const detail = model => ({
    ...model, categoryName: categoriesById.get(model.category).name, metadata: info[model.id], limitations: limitations(model),
    prerequisiteModels: model.prerequisites.map(shortLink), relatedModels: info[model.id].relatedModelIds.map(shortLink),
    benchmarkIds: benchmarkIds(model.id)
  });
  const categoryDocument = () => categoryRows.map(category => {
    const members = rows.filter(model => model.category === category.id).map(model => model.id);
    const order = category.order || [];
    const architectureIds = [...order, ...members.filter(id => !order.includes(id))];
    return { id: category.id, name: category.name, description: category.description, question: category.question, architectureIds, count: architectureIds.length };
  });
  const envelope = value => clone({ schemaVersion: SCHEMA_VERSION, ...value, caveats });
  const paginated = (items, limit, offset) => ({ total: items.length, limit, offset, nextOffset: offset + limit < items.length ? offset + limit : null, items: items.slice(offset, offset + limit) });

  function listCatalogCategories() {
    return envelope({ categories: categoryDocument(), axes, axisLabels: architectureAxes });
  }
  const searchKeys = ['query', 'category', 'task', 'level', 'entityType', 'mechanisms', 'inputModalities', 'outputTypes', 'traits', 'limit', 'offset'];
  function normalizeFilters(filters) {
    objectArgument(filters, searchKeys, '/filters');
    const normalized = {};
    if (Object.hasOwn(filters, 'query')) normalized.query = stringArgument(filters.query, '/filters/query', { allowEmpty: true });
    for (const [key, allowed] of [['category', [...categoriesById.keys()]], ['task', axes.supportedTasks], ['level', axes.levels], ['entityType', axes.entityTypes]]) if (Object.hasOwn(filters, key)) normalized[key] = enumArgument(filters[key], allowed, `/filters/${key}`);
    for (const key of ['mechanisms', 'inputModalities', 'outputTypes', 'traits']) if (Object.hasOwn(filters, key)) normalized[key] = arrayArgument(filters[key], axes[key], `/filters/${key}`);
    normalized.limit = Object.hasOwn(filters, 'limit') ? integerArgument(filters.limit, 1, 100, '/filters/limit') : 20;
    normalized.offset = Object.hasOwn(filters, 'offset') ? integerArgument(filters.offset, 0, Number.MAX_SAFE_INTEGER, '/filters/offset') : 0;
    return normalized;
  }
  const searchableText = model => [model.id, model.name, model.fullName, model.tagline, model.description, model.learningGoal,
    ...info[model.id].mechanisms, ...info[model.id].supportedTasks, ...info[model.id].representativeUseCases,
    ...info[model.id].mechanisms.map(id => architectureAxes.mechanisms.find(item => item.id === id).label)
  ].join(' ').normalize('NFKC').toLowerCase();
  function matches(model, filters) {
    const data = info[model.id];
    if (filters.category && model.category !== filters.category) return false;
    if (filters.level && model.level !== filters.level) return false;
    if (filters.entityType && data.entityType !== filters.entityType) return false;
    if (filters.task && !data.supportedTasks.includes(filters.task)) return false;
    for (const key of ['mechanisms', 'inputModalities', 'outputTypes', 'traits']) if (filters[key]?.some(value => !data[key].includes(value))) return false;
    return !filters.query || filters.query.normalize('NFKC').toLowerCase().split(/\s+/u).filter(Boolean).every(token => searchableText(model).includes(token));
  }
  function searchArchitectures(filters = {}) {
    const normalized = normalizeFilters(filters);
    return envelope({ filters: normalized, ...paginated(rows.filter(model => matches(model, normalized)).map(summary), normalized.limit, normalized.offset) });
  }
  function getArchitecture(id) { return envelope({ item: detail(lookup(id)) }); }
  function compareArchitectures(ids) {
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 6) fail('INVALID_ARGUMENT', '比较需要2至6个不同架构ID。', '/ids');
    const selected = ids.map(lookup);
    if (new Set(selected.map(model => model.id)).size !== selected.length) fail('INVALID_ARGUMENT', '比较列表不能包含重复架构。', '/ids');
    const sharedAxes = Object.fromEntries(['supportedTasks', 'mechanisms', 'inputModalities', 'outputTypes', 'traits'].map(key => [key, intersection(selected.map(model => info[model.id][key]))]));
    return envelope({ items: selected.map(summary), sharedAxes, differences: selected.map(model => ({
      id: model.id, distinctMechanisms: info[model.id].mechanisms.filter(value => !sharedAxes.mechanisms.includes(value)), tradeoffs: info[model.id].tradeoffs
    })) });
  }
  const constraintKeys = ['requireTraits', 'excludeTraits', 'requireMechanisms', 'excludeMechanisms', 'inputModalities', 'outputTypes', 'entityTypes'];
  function suggestArchitectures(request) {
    objectArgument(request, ['task', 'constraints', 'limit', 'offset'], '/request');
    const task = enumArgument(request.task, axes.supportedTasks, '/request/task');
    const constraints = {};
    if (Object.hasOwn(request, 'constraints')) {
      objectArgument(request.constraints, constraintKeys, '/request/constraints');
      const allowed = { requireTraits: axes.traits, excludeTraits: axes.traits, requireMechanisms: axes.mechanisms, excludeMechanisms: axes.mechanisms, inputModalities: axes.inputModalities, outputTypes: axes.outputTypes, entityTypes: axes.entityTypes };
      for (const key of constraintKeys) if (Object.hasOwn(request.constraints, key)) constraints[key] = arrayArgument(request.constraints[key], allowed[key], `/request/constraints/${key}`);
    }
    for (const [required, excluded] of [['requireTraits', 'excludeTraits'], ['requireMechanisms', 'excludeMechanisms']]) {
      if (constraints[required]?.some(value => constraints[excluded]?.includes(value))) fail('INVALID_ARGUMENT', '同一属性不能同时要求和排除。', '/request/constraints');
    }
    const limit = Object.hasOwn(request, 'limit') ? integerArgument(request.limit, 1, 20, '/request/limit') : 8;
    const offset = Object.hasOwn(request, 'offset') ? integerArgument(request.offset, 0, Number.MAX_SAFE_INTEGER, '/request/offset') : 0;
    const matching = rows.filter(model => {
      const data = info[model.id];
      if (!data.supportedTasks.includes(task)) return false;
      for (const [key, axis] of [['requireTraits', 'traits'], ['requireMechanisms', 'mechanisms'], ['inputModalities', 'inputModalities'], ['outputTypes', 'outputTypes']]) if (constraints[key]?.some(value => !data[axis].includes(value))) return false;
      for (const [key, axis] of [['excludeTraits', 'traits'], ['excludeMechanisms', 'mechanisms']]) if (constraints[key]?.some(value => data[axis].includes(value))) return false;
      return !constraints.entityTypes?.length || constraints.entityTypes.includes(data.entityType);
    }).map(model => ({
      architecture: summary(model),
      matchReasons: [
        `任务线索包含${architectureAxes.tasks.find(item => item.id === task).label}；这不是性能认证。`,
        ...Object.entries(constraints).filter(([key]) => !key.startsWith('exclude')).filter(([, values]) => values.length).map(([key, values]) => `满足声明约束 ${key}: ${values.join(', ')}。`),
        `条目类型为${architectureAxes.entityTypes.find(item => item.id === info[model.id].entityType).label}；范围为${info[model.id].teachingScope}。`
      ], limitations: limitations(model)
    }));
    return envelope({ request: { task, constraints }, ...paginated(matching, limit, offset) });
  }
  function getCatalogDocument() {
    return envelope({ categories: categoryDocument(), axes, axisLabels: architectureAxes, scope: architectureMetadataScope,
      architectures: rows.map(detail), benchmarks: benchmarkRows, learningPaths: paths });
  }
  return { listCatalogCategories, listCategories: listCatalogCategories, searchArchitectures, getArchitecture, compareArchitectures, suggestArchitectures, getCatalogDocument };
}

const defaultCatalog = createArchitectureCatalog({ models: sourceModels, taxonomy: sourceTaxonomy, benchmarks: sourceBenchmarks, benchmarkResults: sourceBenchmarkResults });
export const listCatalogCategories = defaultCatalog.listCatalogCategories;
export const listCategories = defaultCatalog.listCatalogCategories;
export const searchArchitectures = defaultCatalog.searchArchitectures;
export const getArchitecture = defaultCatalog.getArchitecture;
export const compareArchitectures = defaultCatalog.compareArchitectures;
export const suggestArchitectures = defaultCatalog.suggestArchitectures;
export const getCatalogDocument = defaultCatalog.getCatalogDocument;
