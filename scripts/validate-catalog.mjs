import assert from 'node:assert/strict';
import { models } from '../src/models.js';
import { diagram, diagramIds } from '../src/diagrams.js';
import { categories, difficulties, studyPaths, memoryBranches } from '../src/taxonomy.js';

const ids = new Set(models.map(model => model.id));
const familyIds = new Set(categories.map(category => category.id));
const levels = new Set(difficulties.map(level => level.id));
assert.equal(ids.size, models.length, 'Model ids must be unique.');
assert.equal(familyIds.size, categories.length, 'Family ids must be unique.');

for (const model of models) {
  const prefix = `${model.id}: `;
  assert.match(model.id, /^[a-z][a-z0-9-]+$/, prefix + 'use a stable lowercase id');
  assert(familyIds.has(model.category), prefix + 'unknown family');
  assert(levels.has(model.level), prefix + 'unknown difficulty');
  for (const field of ['name','fullName','tagline','description','input','output','formula','formulaExplanation','pitfall','yearNote','learningGoal']) {
    assert.equal(typeof model[field], 'string', prefix + `missing ${field}`);
    assert(model[field].trim().length, prefix + `empty ${field}`);
  }
  assert(Number.isInteger(model.year), prefix + 'year must describe a cited milestone');
  assert.equal(model.keyPoints.length, 3, prefix + 'provide three core points');
  assert.equal(model.quiz.options.length, 4, prefix + 'provide four quiz choices');
  assert.equal(new Set(model.quiz.options).size, 4, prefix + 'quiz choices must differ');
  assert(Number.isInteger(model.quiz.answer) && model.quiz.answer >= 0 && model.quiz.answer < 4, prefix + 'invalid quiz answer');
  assert(model.quiz.question && model.quiz.explanation, prefix + 'quiz needs a question and explanation');
  assert(diagramIds.includes(model.id), prefix + 'register a dedicated diagram instead of falling back');
  assert(model.layers.length > 1, prefix + 'describe the diagram modules');
  const svg = diagram(model.id, {activeLayer:0});
  const indexes = [...svg.matchAll(/data-layer="(\d+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(indexes, model.layers.map((_,index) => index), prefix + 'diagram and explanation modules must align');
  assert(!/data-layer=/.test(diagram(model.id,{compact:true})), prefix + 'card preview must not nest interactive controls');
  assert.equal(new Set(model.layers.map(layer => layer.id)).size, model.layers.length, prefix + 'duplicate module id');
  for (const layer of model.layers) for (const field of ['id','label','detail','shape']) assert(typeof layer[field] === 'string' && layer[field].trim(), prefix + `module needs ${field}`);
  assert(Array.isArray(model.prerequisites), prefix + 'prerequisites must be an array');
  for (const prerequisite of model.prerequisites) assert(ids.has(prerequisite) && prerequisite !== model.id, prefix + 'invalid prerequisite');
  if (model.venue) {
    const venueHosts = {ICLR:['proceedings.iclr.cc'],ICML:['proceedings.mlr.press'],NeurIPS:['papers.nips.cc','papers.neurips.cc','proceedings.neurips.cc']};
    assert(venueHosts[model.venue.name], prefix + 'unknown conference');
    assert(Number.isInteger(model.venue.year), prefix + 'conference year must be explicit');
    const venueUrl = new URL(model.venue.url);
    assert.equal(venueUrl.protocol,'https:',prefix + 'use the official proceedings URL');
    assert(venueHosts[model.venue.name].includes(venueUrl.hostname),prefix + 'conference provenance must link to its proceedings');
    for (const field of ['problemSolved','methodChange']) assert(typeof model[field] === 'string' && model[field].trim(),prefix + `paper needs ${field}`);
    assert(Array.isArray(model.limitations) && model.limitations.length >= 2,prefix + 'state at least two concrete limitations');
    assert(model.limitations.every(value => typeof value === 'string' && value.trim()),prefix + 'limitations must be explained');
    assert(model.evidence && typeof model.evidence.summary === 'string' && model.evidence.summary.trim(),prefix + 'summarize reported evidence');
    assert(typeof model.evidence.scope === 'string' && model.evidence.scope.trim(),prefix + 'bound the reported conclusion');
  }
  assert(model.references.length, prefix + 'cite a primary source');
  for (const reference of model.references) {
    assert(reference.label, prefix + 'source needs a label');
    assert.equal(new URL(reference.url).protocol, 'https:', prefix + 'source links must use HTTPS');
  }
}

const completed = new Set();
const visiting = new Set();
function visit(id) {
  assert(!visiting.has(id), `Prerequisite cycle involving ${id}`);
  if (completed.has(id)) return;
  visiting.add(id);
  models.find(model => model.id === id).prerequisites.forEach(visit);
  visiting.delete(id); completed.add(id);
}
models.forEach(model => visit(model.id));

const pathIds = studyPaths.flatMap(path => path.models);
assert.deepEqual(new Set(pathIds), ids, 'The study path must cover every model.');
assert.equal(pathIds.length, ids.size, 'Study path entries must not repeat.');
for (const branch of memoryBranches) for (const id of branch.models) {
  assert.equal(models.find(model => model.id === id)?.category, 'memory', 'Memory branches must link to memory models.');
}
console.log(`Catalog verified: ${models.length} models, ${categories.length} families, ${difficulties.length} difficulties; module mappings and prerequisites are consistent.`);
