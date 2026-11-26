// Keep the original key and array format so existing learning records need no migration.
const STORAGE_KEY = 'neuralbank-learned';

function idSet(ids) {
  return new Set([...ids].filter(id => typeof id === 'string' && id.length > 0));
}

export function loadLearned(storage, validIds) {
  const valid = idSet(validIds);
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return new Set();
    // Do not rewrite storage on load: another catalog version may recognize more IDs.
    return new Set(value.filter(id => typeof id === 'string' && valid.has(id)));
  } catch {
    return new Set();
  }
}

export function saveLearned(storage, learned) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...idSet(learned)]));
    return { saved: true };
  } catch {
    return { saved: false };
  }
}

export function toggleLearned(learned, id, validIds) {
  const next = new Set(learned);
  if (typeof id !== 'string' || !idSet(validIds).has(id)) return next;
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function matchesLearningStatus(modelId, learned, status = 'all') {
  if (status === 'all') return true;
  if (status === 'mastered') return learned.has(modelId);
  if (status === 'unmastered') return !learned.has(modelId);
  return false;
}

export function summarizeLearning(models, learned) {
  const uniqueModels = [...new Map(models.map(model => [model.id, model])).values()];
  const byCategory = new Map();
  let mastered = 0;
  for (const model of uniqueModels) {
    if (!byCategory.has(model.category)) byCategory.set(model.category, { id: model.category, total: 0, mastered: 0, unmastered: 0 });
    const category = byCategory.get(model.category);
    category.total += 1;
    if (learned.has(model.id)) { mastered += 1; category.mastered += 1; }
    else category.unmastered += 1;
  }
  const pending = uniqueModels.filter(model => !learned.has(model.id));
  const next = pending.find(model => (model.prerequisites || []).every(id => learned.has(id))) || pending[0];
  return {
    total: uniqueModels.length,
    mastered,
    unmastered: uniqueModels.length - mastered,
    byCategory: [...byCategory.values()],
    nextModelId: next?.id ?? null,
  };
}
