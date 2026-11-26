import { models } from './models.js';
import { diagram } from './diagrams.js';
import { categories, difficulties, studyPaths, memoryBranches } from './taxonomy.js';
import { loadLearned, matchesLearningStatus, summarizeLearning } from './learning-progress.js';
import { createLearningLibrary } from './learning-sync.js';
import { tasks, benchmarks, benchmarkResults } from './benchmarks.js';
import { initializeContributions } from './contribute.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const categoryNames = Object.fromEntries(categories.map(category => [category.id, category.name]));
const rank = id => difficulties.findIndex(level => level.id === id);
const orderedModels = categories.flatMap(category => models.filter(model => model.category === category.id).sort((a,b) => rank(a.level) - rank(b.level) || category.order.indexOf(a.id) - category.order.indexOf(b.id)));
const modelIds = new Set(models.map(model => model.id));
let learningStorage = null;
try { learningStorage = window.localStorage; learningStorage.getItem('neuralbank-learned'); } catch { learningStorage = null; }
const statuses = [{id:'all',name:'全部'},{id:'mastered',name:'已掌握'},{id:'unmastered',name:'未掌握'}];
const venueKey = model => model.venue ? `${model.venue.name}:${model.venue.year}` : 'classic';
const sourceOptions = [{id:'all',name:'全部来源'},{id:'classic',name:'基础图谱'},{id:'recent',name:'三会新架构'},...['ICLR','ICML','NeurIPS'].flatMap(name => [...new Set(models.filter(model => model.venue?.name === name).map(model => model.venue.year))].sort((a,b) => b-a).map(year => ({id:`${name}:${year}`,name:`${name} ${year}`})))];
const state = { view:'learning',track:'foundations',task:'all',benchmarkQuery:'',category:'all',level:'all',venue:'all',mastery:'all',query:'',learned:loadLearned(learningStorage,modelIds),progressSaved:Boolean(learningStorage),model:null,tab:'structure',layer:0,quizAnswer:null };
let diagramTimer = null;
let toastTimer = null;
let modelOpener = null;
let modelOpenerZone = 'learning';
let modelReturnView = 'learning';
let learningLibrary;
let librarySnapshot;
let contributionUI;
const staticPublication=globalThis.NEURALBANK_STATIC===true;
const learningSequence = studyPaths.flatMap(path => path.models).map(id => models.find(model => model.id === id)).filter(Boolean);
const scrollBehavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 3200);
}

function storageLabel() {
  const status = librarySnapshot?.status;
  if (status === 'loading') return '正在读取学习库';
  if (status === 'syncing') return '正在同步学习进度';
  if (status === 'synced') return '学习进度已同步到账户';
  if (status === 'error' && librarySnapshot?.session.authenticated) return state.progressSaved ? '更改已保留，等待重新同步' : '尚未同步，进度仅在本次会话有效';
  return state.progressSaved ? '进度保存在此浏览器' : '进度仅在本次会话有效';
}
function updateProgress() {
  $('#header-progress').textContent = `${state.learned.size} / ${models.length}`;
  $('#learning-storage-note').textContent = storageLabel();
  renderDashboard();
}
function renderDashboard() {
  const summary = summarizeLearning(learningSequence,state.learned);
  const next = models.find(model => model.id === summary.nextModelId);
  const percent = Math.round(summary.mastered / summary.total * 100);
  const circumference = 2 * Math.PI * 47;
  $('#dashboard-overview').innerHTML = `<div class="progress-panel"><div class="progress-ring" role="img" aria-label="已掌握 ${summary.mastered} / ${summary.total} 个模型，${percent}%"><svg viewBox="0 0 112 112" aria-hidden="true"><circle class="ring-track" cx="56" cy="56" r="47"/><circle class="ring-value" cx="56" cy="56" r="47" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference*(1-summary.mastered/summary.total)}"/></svg><div><strong>${percent}<small>%</small></strong></div></div><div class="progress-copy"><span class="eyebrow">学习进度</span><h2><strong>${summary.mastered}</strong><span> / ${summary.total}</span></h2><span>${summary.unmastered ? `${summary.unmastered} 个模型待掌握` : '全部关卡已掌握'}</span></div></div>${next ? `<div class="next-panel"><div class="next-copy"><span class="eyebrow">下一关</span><h2>${escape(next.name)}</h2><p>${categoryNames[next.category]} · ${next.level}</p><button class="button primary" data-open="${next.id}">${summary.mastered ? '继续学习' : '开始学习'}</button></div><div class="next-visual" aria-hidden="true">${diagram(next.id,{compact:true})}</div></div>` : `<div class="next-panel"><div class="next-copy"><span class="eyebrow">全部完成</span><h2>回顾你的架构库</h2><p>${summary.total} 个架构与模块</p><a class="button primary" href="#models">打开架构库</a></div><div class="next-visual" aria-hidden="true">${diagram('transformer',{compact:true})}</div></div>`}`;
  $('#track-count').textContent = `${categories.length} 个板块 · ${models.length} 个关卡`;
  $('#learning-modules').innerHTML = categories.map(category => {
    const members = category.order.map(id => models.find(model => model.id === id)).filter(Boolean);
    const done = members.filter(model => state.learned.has(model.id)).length;
    const target = members.find(model => !state.learned.has(model.id) && model.prerequisites.every(id => state.learned.has(id))) || members.find(model => !state.learned.has(model.id)) || members[0];
    return `<button class="module-card ${state.track === category.id ? 'selected' : ''}" data-track="${category.id}" aria-pressed="${state.track === category.id}" aria-controls="level-board"><span class="module-heading"><strong class="cat-${category.id}">${category.name}</strong><span>${done} / ${members.length}</span></span><span class="module-visual" aria-hidden="true">${diagram(target.id,{compact:true})}</span><span class="module-footer"><span>${done === members.length ? '已完成所有关卡' : `第 ${members.indexOf(target)+1} 关 · ${escape(target.name)}`}</span><span class="module-state">${done === members.length ? '✓' : '学习'}</span></span><span class="module-progress" aria-hidden="true"><i style="width:${done/members.length*100}%"></i></span></button>`;
  }).join('');
  renderLevels();
}
function renderLevels() {
  const category = categories.find(item => item.id === state.track) || categories[0];
  const members = category.order.map(id => models.find(model => model.id === id)).filter(Boolean);
  const completed = members.filter(model => state.learned.has(model.id)).length;
  $('#level-title').textContent = category.name;
  $('#level-eyebrow').textContent = `${completed} / ${members.length} 关已掌握`;
  $('#level-board').innerHTML = members.map((model,index) => {
    const done = state.learned.has(model.id);
    const prerequisites = model.prerequisites.filter(id => !state.learned.has(id));
    const label = done ? '已掌握' : prerequisites.length ? '建议先学' : '可以开始';
    return `<article class="level-card ${done ? 'completed' : prerequisites.length ? 'upcoming' : 'ready'}"><button class="level-main" data-open="${model.id}" aria-label="第 ${index+1} 关 ${escape(model.name)}，${label}"><span class="level-card-heading"><span class="lesson-number">${done ? '✓' : String(index+1).padStart(2,'0')}</span><span class="lesson-state">${done ? '已掌握' : model.level}</span></span><span class="level-visual" aria-hidden="true">${diagram(model.id,{compact:true})}</span><strong>${escape(model.name)}</strong><span class="level-description">${escape(model.tagline)}</span></button><div class="level-card-footer"><span>${prerequisites.length && !done ? `先学 ${prerequisites.map(id => models.find(item => item.id === id)?.name).join('、')}` : done ? '随时回顾' : '结构 · 原理 · 自测'}</span>${masteryControl(model,'level')}</div></article>`;
  }).join('');
}

function matchesSearch(model) {
  const query = state.query.toLocaleLowerCase().trim();
  return `${model.name} ${model.fullName} ${model.tagline} ${model.description} ${model.problemSolved || ''} ${model.methodChange || ''} ${(model.limitations || []).join(' ')} ${model.venue?.name || ''} ${model.venue?.year || ''} ${categoryNames[model.category]} ${model.keyPoints.join(' ')} ${model.layers.map(layer => layer.label).join(' ')}`.toLocaleLowerCase().includes(query);
}
function matchesSource(model,source) {
  return source === 'all' || (source === 'recent' ? Boolean(model.venue) : venueKey(model) === source);
}
function matchesFilters(model,ignore = '') {
  return (ignore === 'category' || state.category === 'all' || model.category === state.category)
    && (ignore === 'level' || state.level === 'all' || model.level === state.level)
    && (ignore === 'venue' || matchesSource(model,state.venue))
    && (ignore === 'mastery' || matchesLearningStatus(model.id,state.learned,state.mastery))
    && matchesSearch(model);
}
function publicationLabel(model) { return model.venue ? `${model.venue.name} ${model.venue.year}` : `${model.year} · 经典里程碑`; }
function masteryControl(model,context = 'card') {
  const learned = state.learned.has(model.id);
  return `<button class="mastery-toggle ${learned ? 'is-mastered' : ''} ${context === 'level' ? 'level-mastery-toggle' : ''}" data-toggle-learned="${model.id}" aria-pressed="${learned}" aria-label="${escape(model.name)}：${learned ? '标记为未掌握' : '标记为已掌握'}" title="${learned ? '标记为未掌握' : '标记为已掌握'}"><span aria-hidden="true">${learned ? '✓' : '○'}</span>${learned ? '已掌握' : '未掌握'}</button>`;
}
function modelCard(model) {
  const levelIndex = rank(model.level);
  const scoreCount = new Set(benchmarkResults.filter(result => result.modelId === model.id).map(result => result.benchmarkId)).size;
  return `<article class="model-card" data-model-id="${model.id}"><button class="card-main" data-open="${model.id}" aria-label="探索 ${escape(model.name)} ${escape(model.fullName)}"><div class="card-top"><span class="category-tag cat-${model.category}"><span class="category-mark"></span>${categoryNames[model.category]}</span><span class="level-tag level-${levelIndex}"><span class="difficulty-bars" aria-hidden="true">${[0,1,2].map(index => `<i class="${index <= levelIndex ? 'filled' : ''}"></i>`).join('')}</span>${model.level}</span></div><div class="model-visual" aria-hidden="true">${diagram(model.id,{compact:true})}</div><div class="card-content"><h3 class="card-title">${escape(model.name)}</h3><div class="card-full-name">${escape(model.fullName)}</div><p class="card-tagline">${escape(model.tagline)}</p></div></button><div class="card-bottom"><span class="publication-label ${model.venue ? 'recent-publication' : ''}" title="${escape(model.yearNote)}">${escape(publicationLabel(model))}</span><div class="card-actions"><button class="card-scores" data-score-model="${model.id}" aria-label="查看 ${escape(model.name)} 的 Benchmark 成绩">${scoreCount ? `${scoreCount} 项 Benchmark` : '暂无成绩'}</button>${masteryControl(model)}</div></div></article>`;
}
function renderCatalog() {
  const filtered = orderedModels.filter(model => matchesFilters(model));
  $('#model-grid').innerHTML = categories.map(category => {
    const members = filtered.filter(model => model.category === category.id);
    if (!members.length) return '';
    return `<section class="architecture-family" aria-labelledby="family-${category.id}">${state.category === 'all' ? `<div class="family-heading"><div><h3 id="family-${category.id}">${category.name}<span>${members.length} 个模型</span></h3><p>${escape(category.description)}</p></div><button class="text-button" data-browse-family="${category.id}" aria-label="单独浏览${category.name}">浏览此类</button></div>` : `<h3 id="family-${category.id}" class="visually-hidden">${category.name}</h3>`}<div class="model-grid">${members.map(modelCard).join('')}</div></section>`;
  }).join('');
  $('#results-count').textContent = `${filtered.length} / ${models.length} 个模型`;
  const labels = [state.category === 'all' ? '全部类别' : categoryNames[state.category],state.level === 'all' ? '全部难度' : state.level];
  if (state.venue !== 'all') labels.push(sourceOptions.find(option => option.id === state.venue)?.name || '论文来源');
  if (state.mastery !== 'all') labels.push(statuses.find(status => status.id === state.mastery).name);
  $('#visible-models').textContent = `${labels.join(' · ')} · ${filtered.length} 个模型`;
  $('#empty-state').hidden = filtered.length !== 0;
  $('#reset-filters').hidden = state.category === 'all' && state.level === 'all' && state.venue === 'all' && state.mastery === 'all' && !state.query;
  const facetGroups = [
    {selector:'.filter',field:'category',data:'category',predicate:(model,value) => value === 'all' || model.category === value},
    {selector:'.difficulty-filter',field:'level',data:'difficulty',predicate:(model,value) => value === 'all' || model.level === value},
    {selector:'.source-filter',field:'venue',data:'venue',predicate:matchesSource},
    {selector:'.mastery-filter',field:'mastery',data:'mastery',predicate:(model,value) => matchesLearningStatus(model.id,state.learned,value)}
  ];
  facetGroups.forEach(group => $$(group.selector).forEach(button => {
    const value = button.dataset[group.data];
    const active = value === state[group.field];
    button.classList.toggle('active',active); button.setAttribute('aria-pressed',active);
    $('[data-count]',button).textContent = orderedModels.filter(model => matchesFilters(model,group.field) && group.predicate(model,value)).length;
  }));
  $('#difficulty-guide').textContent = state.level === 'all' ? '难度按理解核心机制所需的前置知识划分，可与类别组合筛选。' : difficulties.find(level => level.id === state.level).description;
  const publications = sourceOptions.filter(option => !['all','classic','recent'].includes(option.id)).map(option => option.name);
  $('#venue-guide').textContent = publications.length ? `近期论文选读：${publications.join('、')}。这是代表架构选集，并非会议完整论文集。` : '基础图谱与近期论文分别标注；会议年份以正式论文集为准。';
  renderCategoryContext();
}

function syncMasteryButton() {
  const button = $('#toggle-mastered');
  if (!button || !state.model) return;
  const learned = state.learned.has(state.model.id);
  button.className = `button ${learned ? 'mastered-button' : 'secondary'}`;
  button.setAttribute('aria-pressed',learned);
  button.textContent = learned ? '✓ 已掌握 · 标记为未掌握' : '标记为已掌握';
}
function changeMastery(id,zone = '') {
  const model = models.find(item => item.id === id);
  if (!model || !learningLibrary) return;
  learningLibrary.toggle(id);
  if (zone) {
    const root = zone === 'learning' ? $('#learning') : $('#models');
    const target = $(`[data-toggle-learned="${id}"]`,root) || (zone === 'learning' ? $(`[data-track="${state.track}"]`) : $(`[data-mastery="${state.mastery}"]`));
    target?.focus({preventScroll:true});
  }
  toast(`${model.name} 已标记为${state.learned.has(id) ? '已掌握' : '未掌握'}`);
}

function renderCategoryContext() {
  const context = $('#category-context');
  const category = categories.find(item => item.id === state.category);
  context.hidden = !category;
  if (!category) { context.innerHTML = ''; return; }
  context.innerHTML = `<div class="category-introduction"><span class="category-tag cat-${category.id}">${category.name}</span><h3>${escape(category.question)}</h3><p>${escape(category.description)}</p></div>${category.id === 'memory' ? `<div class="memory-branches">${memoryBranches.map(branch => `<article><h4>${branch.title}</h4><p>${branch.description}</p><div class="path-links">${branch.models.map(id => { const model = models.find(item => item.id === id); return model ? `<button data-open="${id}" class="${state.learned.has(id) ? 'learned' : ''}">${escape(model.name)}</button>` : ''; }).join('')}</div></article>`).join('')}</div>` : ''}`;
}

function initializeCatalog() {
  $('#category-filters').innerHTML = [{id:'all',name:'全部架构'},...categories].map(category => `<button data-category="${category.id}" class="filter" aria-pressed="false">${category.name}<span data-count></span></button>`).join('');
  $('#difficulty-filters').innerHTML = [{id:'all',name:'全部'},...difficulties.map(level => ({id:level.id,name:level.id}))].map(level => `<button data-difficulty="${level.id}" class="difficulty-filter" aria-pressed="false">${level.name}<span data-count></span></button>`).join('');
  $('#venue-filters').innerHTML = sourceOptions.map(source => `<button data-venue="${source.id}" class="source-filter" aria-pressed="false">${source.name}<span data-count></span></button>`).join('');
  $('#mastery-filters').innerHTML = statuses.map(status => `<button data-mastery="${status.id}" class="mastery-filter" aria-pressed="false">${status.name}<span data-count></span></button>`).join('');

}

function resetFilters() {
  state.category = 'all'; state.level = 'all'; state.venue = 'all'; state.mastery = 'all'; state.query = ''; $('#model-search').value = ''; renderCatalog();
}
function setFilter(category) { state.category = category; renderCatalog(); }
$('.category-filters').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (button) setFilter(button.dataset.category); });
$('#difficulty-filters').addEventListener('click', event => { const button = event.target.closest('[data-difficulty]'); if (button) { state.level = button.dataset.difficulty; renderCatalog(); } });
$('#model-grid').addEventListener('click', event => { const button = event.target.closest('[data-browse-family]'); if (button) { setFilter(button.dataset.browseFamily); $('#models').scrollIntoView({block:'start',behavior:scrollBehavior()}); $(`[data-category="${button.dataset.browseFamily}"]`).focus({preventScroll:true}); } });
$('#explore-memory').addEventListener('click', () => { state.level = 'all'; state.venue = 'all'; state.mastery = 'all'; state.query = ''; $('#model-search').value = ''; setFilter('memory'); });
$('#explore-recent').addEventListener('click',() => { resetFilters(); state.venue = 'recent'; renderCatalog(); });
$('#venue-filters').addEventListener('click',event => { const button = event.target.closest('[data-venue]'); if (button) { state.venue = button.dataset.venue; renderCatalog(); } });
$('#mastery-filters').addEventListener('click',event => { const button = event.target.closest('[data-mastery]'); if (button) { state.mastery = button.dataset.mastery; renderCatalog(); } });
$('#learning-modules').addEventListener('click',event => {
  const button = event.target.closest('[data-track]');
  if (!button) return;
  state.track = button.dataset.track;
  renderDashboard();
  $(`[data-track="${state.track}"]`).focus({preventScroll:true});
  $('.level-section').scrollIntoView({block:'start',behavior:scrollBehavior()});
});
$('#browse-track').addEventListener('click',() => { resetFilters(); state.category = state.track; renderCatalog(); navigate('models'); });
$('#reset-filters').addEventListener('click',() => { resetFilters(); $('#model-search').focus({preventScroll:true}); });
$('#model-search').addEventListener('input', event => { state.query = event.target.value; renderCatalog(); });
$('#clear-search').addEventListener('click', () => { resetFilters(); $('#model-search').focus(); });
document.addEventListener('keydown', event => { if (event.key === '/' && !event.metaKey && !event.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$('dialog[open]')) { event.preventDefault(); navigate('models'); $('#model-search').focus(); } });

function showDialog(id) { const element = $(`#${id}`); if (!element.open) element.showModal(); document.body.classList.add('dialog-open'); }
function stopDiagram() { clearTimeout(diagramTimer); diagramTimer = null; }
function syncDialogState() { if (!$('dialog[open]')) document.body.classList.remove('dialog-open'); }
$$('dialog').forEach(element => {
  element.addEventListener('click', event => { if (event.target === element) { const bounds = element.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) element.close(); } });
  element.addEventListener('close', () => {
    syncDialogState();
    if (element.id === 'model-dialog') {
      stopDiagram();
      if (state.view !== modelReturnView) { focusViewHeading(); return; }
      if (location.hash.startsWith('#model/')) history.replaceState(null,'',`#${modelReturnView}`);
      const fallback = modelOpenerZone === 'learning' ? $(`#level-board [data-open="${state.model?.id}"]`) || $(`[data-track="${state.track}"]`) : modelOpenerZone === 'benchmarks' ? $('#benchmark-search') : $(`#model-grid [data-open="${state.model?.id}"]`) || $(`[data-mastery="${state.mastery}"]`);
      const target = modelOpener?.isConnected ? modelOpener : fallback;
      target?.focus({preventScroll:true});
    }
  });
});
document.addEventListener('click', event => {
  const contributor = event.target.closest('[data-open-contribution], [data-edit-model], [data-report-benchmark]');
  if (contributor) {
    event.preventDefault();
    contributionUI.open({type:contributor.dataset.editModel ? 'model-edit' : 'benchmark-result',model:contributor.dataset.editModel || contributor.dataset.reportModel,benchmark:contributor.dataset.reportBenchmark});
    if ($('#model-dialog').open) $('#model-dialog').close();
    return;
  }
  const mastery = event.target.closest('[data-toggle-learned]');
  if (mastery) { event.preventDefault(); changeMastery(mastery.dataset.toggleLearned,mastery.closest('#learning') ? 'learning' : 'catalog'); return; }
  const closer = event.target.closest('[data-close]');
  if (closer) $(`#${closer.dataset.close}`).close();
  const scores = event.target.closest('[data-score-model]');
  if (scores) { openModel(scores.dataset.scoreModel,'scores'); return; }
  const opener = event.target.closest('[data-open]');
  if (opener) openModel(opener.dataset.open);
});

function openModel(id,initialTab) {
  const model = models.find(item => item.id === id);
  if (!model) return;
  if (!$('#model-dialog').open) { modelOpener = document.activeElement === document.body ? null : document.activeElement; modelOpenerZone = state.view; modelReturnView = state.view; }
  stopDiagram();
  state.model = model; state.tab = initialTab === 'scores' ? 'scores' : model.venue ? 'problem' : 'structure'; state.layer = 0; state.quizAnswer = null;
  renderDetail();
  showDialog('model-dialog');
  $('#model-dialog').scrollTop = 0;
  $('[data-close="model-dialog"]', $('#model-detail')).focus({preventScroll:true});
  history.replaceState(null,'',`#model/${id}`);
}

function renderDetail() {
  const model = state.model;
  const mastered = state.learned.has(model.id);
  $('#model-detail').innerHTML = `<div class="detail-header"><div><div class="detail-eyebrow"><span>${categoryNames[model.category]}</span><span>${model.level}</span></div><h2 id="model-title">${escape(model.name)}</h2><p class="detail-subtitle">${escape(model.fullName)} · ${escape(publicationLabel(model))}</p>${model.venue ? `<a class="detail-paper-link" href="${escape(model.venue.url)}" target="_blank" rel="noopener noreferrer">${escape(model.venue.name)} ${model.venue.year} · 正式论文</a>` : ''}</div><div class="detail-header-actions"><button class="text-button" data-edit-model="${model.id}">建议编辑</button><button class="icon-button" data-close="model-dialog" aria-label="关闭模型详情">×</button></div></div><div class="model-learning-context"><p>${escape(model.learningGoal || model.tagline)}</p><div class="prerequisite-links"><span>建议先学</span>${(model.prerequisites || []).length ? model.prerequisites.map(id => { const prerequisite = models.find(item => item.id === id); return prerequisite ? `<button data-open="${id}">${escape(prerequisite.name)}</button>` : ''; }).join('') : '<span class="no-prerequisite">可作为学习起点</span>'}</div></div><div class="detail-tabs" role="tablist" aria-label="模型学习内容">${[...(model.venue ? [['problem','问题与局限']] : []),['structure','结构拆解'],['principles','核心原理'],['quiz','考点自测'],['scores','Benchmarks']].map(([id,label]) => `<button role="tab" id="tab-${id}" data-tab="${id}" aria-selected="${state.tab === id}" aria-controls="detail-tabpanel" tabindex="${state.tab === id ? '0' : '-1'}">${label}</button>`).join('')}</div><div class="detail-body" id="detail-tabpanel" role="tabpanel" aria-labelledby="tab-${state.tab}"></div><div class="detail-footer"><p class="detail-storage-label">${escape(storageLabel())}</p><button class="button ${mastered ? 'mastered-button' : 'secondary'}" id="toggle-mastered" aria-pressed="${mastered}">${mastered ? '✓ 已掌握 · 标记为未掌握' : '标记为已掌握'}</button></div>`;
  renderDetailBody();
}

function renderDetailBody() {
  const model = state.model;
  const body = $('#detail-tabpanel');
  body.setAttribute('aria-labelledby',`tab-${state.tab}`);
  if (state.tab === 'problem') {
    body.innerHTML = `<div class="paper-problem"><span class="problem-label">它要解决什么问题</span><h3>${escape(model.problemSolved)}</h3></div><section class="paper-method"><h3>方法改在哪里</h3><p>${escape(model.methodChange)}</p></section><div class="paper-evidence-grid"><section class="paper-limitations"><h3>仍有哪些问题</h3><ul>${model.limitations.map(limitation => `<li>${escape(limitation)}</li>`).join('')}</ul></section><section class="paper-evidence"><h3>论文报告的证据</h3><p>${escape(model.evidence.summary)}</p><h4>结论适用的范围</h4><p>${escape(model.evidence.scope)}</p></section></div><div class="references"><h3>核对原文</h3>${model.references.map(reference => `<a href="${escape(reference.url)}" target="_blank" rel="noopener noreferrer">${escape(reference.label)}</a>`).join('')}</div>`;
  } else if (state.tab === 'structure') {
    body.innerHTML = `<p class="detail-intro">${escape(model.description)}</p><dl class="model-interface"><div><dt>输入</dt><dd>${escape(model.input)}</dd></div><div><dt>输出</dt><dd>${escape(model.output)}</dd></div></dl><div class="architecture-panel"><div class="architecture-canvas" id="architecture-svg">${diagram(model.id,{activeLayer:state.layer})}</div><div class="layer-inspector" id="layer-inspector" aria-live="polite"></div></div><div class="diagram-tools"><span class="diagram-help">节点与网格仅作示意，实际维度见各层标注</span><div class="diagram-actions"><button class="button secondary" id="toggle-zoom" aria-pressed="false">放大结构图</button><button class="button secondary" id="play-flow">逐模块导览</button></div></div><div class="layer-steps" role="group" aria-label="选择结构模块">${model.layers.map((layer,index) => `<button data-select-layer="${index}" class="${index === state.layer ? 'active' : ''}" aria-pressed="${index === state.layer}">${escape(layer.label)}</button>`).join('')}</div><div class="formula-box"><h3>记住背后的运算</h3><p class="formula">${escape(model.formula)}</p><p class="formula-explanation">${escape(model.formulaExplanation)}</p></div>`;
    renderInspector();
  } else if (state.tab === 'principles') {
    body.innerHTML = `<p class="detail-intro">${escape(model.description)}</p><div class="principle-grid"><div><h3>三个核心要点</h3><ul>${model.keyPoints.map(point => `<li>${escape(point)}</li>`).join('')}</ul></div><aside class="pitfall"><h3>容易踩的坑</h3><p>${escape(model.pitfall)}</p></aside></div><div class="formula-box"><h3>核心公式</h3><p class="formula">${escape(model.formula)}</p><p class="formula-explanation">${escape(model.formulaExplanation)}</p></div><div class="references"><h3>回到原始资料</h3>${model.references.map(reference => `<a href="${escape(reference.url)}" target="_blank" rel="noopener noreferrer">${escape(reference.label)}</a>`).join('')}</div>`;
  } else if (state.tab === 'scores') {
    const results = benchmarkResults.filter(result => result.modelId === model.id);
    body.innerHTML = `<div class="model-score-heading"><p class="score-context">以下为论文报告的具体模型配置，结构图为教学示意。</p><button class="button secondary" data-report-model="${model.id}" data-open-contribution="benchmark-result">上报我的成绩</button></div>${results.length ? results.map(scoreCard).join('') : '<div class="score-empty"><h3>还没有收录可比成绩</h3><p>该条目是架构或模块，不对应一份固定训练配置。后续可补充有明确评测条件的论文结果。</p></div>'}`;
  } else renderQuiz();
}

function renderInspector() {
  const layer = state.model.layers[state.layer];
  $('#layer-inspector').innerHTML = `<span class="inspector-overline">${state.layer + 1} / ${state.model.layers.length} · 结构模块</span><h3>${escape(layer.label)}</h3><span class="shape-value">${escape(layer.shape)}</span><p>${escape(layer.detail)}</p>`;
}

function selectLayer(index, signal = false) {
  if (state.tab !== 'structure' || !state.model.layers[index]) return;
  state.layer = index;
  $('#architecture-svg').innerHTML = diagram(state.model.id,{activeLayer:index,signalStep:signal ? index : -1});
  $$('.layer-steps button').forEach(button => { const active = Number(button.dataset.selectLayer) === index; button.classList.toggle('active',active); button.setAttribute('aria-pressed',active); });
  renderInspector();
}

function playFlow() {
  if (diagramTimer) { stopDiagram(); $('#play-flow').textContent = '逐模块导览'; return; }
  let index = 0;
  const button = $('#play-flow');
  button.textContent = '停止导览';
  const tick = () => {
    selectLayer(index,true);
    index += 1;
    if (index < state.model.layers.length) diagramTimer = setTimeout(tick,1250);
    else diagramTimer = setTimeout(() => { stopDiagram(); if ($('#play-flow')) $('#play-flow').textContent = '重新导览'; },1000);
  };
  tick();
}

function renderQuiz() {
  const model = state.model;
  const quiz = model.quiz;
  const answered = state.quizAnswer !== null;
  $('#detail-tabpanel').innerHTML = `<div class="quiz-heading"><span>用一个问题，检查理解</span><span>单项选择</span></div><h3 class="quiz-question">${escape(quiz.question)}</h3><div class="quiz-options">${quiz.options.map((option,index) => `<button class="quiz-option${answered && index === quiz.answer ? ' correct' : answered && index === state.quizAnswer ? ' wrong' : ''}" data-answer="${index}" ${answered ? 'disabled' : ''}><span>${'ABCD'[index]}</span>${escape(option)}${answered && index === quiz.answer ? ' ✓' : ''}</button>`).join('')}</div>${answered ? `<div class="quiz-feedback" role="status" tabindex="-1"><strong>${state.quizAnswer === quiz.answer ? '答对了。你抓住了关键。' : `正确答案是 ${'ABCD'[quiz.answer]}。一起看看原因。`}</strong><p>${escape(quiz.explanation)}</p><button class="button secondary" id="retry-quiz">再做一次</button></div>` : ''}`;
}

$('#model-detail').addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    stopDiagram(); state.tab = tab.dataset.tab;
    $$('.detail-tabs button').forEach(button => { const selected = button === tab; button.setAttribute('aria-selected',selected); button.tabIndex = selected ? 0 : -1; });
    renderDetailBody(); return;
  }
  const layer = event.target.closest('[data-layer], [data-select-layer]');
  if (layer) { stopDiagram(); if ($('#play-flow')) $('#play-flow').textContent = '逐模块导览'; selectLayer(Number(layer.dataset.layer ?? layer.dataset.selectLayer)); return; }
  if (event.target.closest('#toggle-zoom')) {
    const button = $('#toggle-zoom');
    const zoomed = $('#architecture-svg').classList.toggle('diagram-zoomed');
    button.setAttribute('aria-pressed',zoomed);
    button.textContent = zoomed ? '适应宽度' : '放大结构图';
    return;
  }
  if (event.target.closest('#play-flow')) { playFlow(); return; }
  const answer = event.target.closest('[data-answer]');
  if (answer && state.quizAnswer === null) { state.quizAnswer = Number(answer.dataset.answer); renderQuiz(); $('.quiz-feedback').focus({preventScroll:true}); $('.quiz-feedback').scrollIntoView({block:'nearest',behavior:scrollBehavior()}); return; }
  if (event.target.closest('#retry-quiz')) { state.quizAnswer = null; renderQuiz(); $('.quiz-option').focus(); return; }
  if (event.target.closest('#toggle-mastered')) changeMastery(state.model.id);
});
$('#model-detail').addEventListener('keydown', event => {
  const layer = event.target.closest('[data-layer]');
  if (layer && ['Enter',' '].includes(event.key)) { event.preventDefault(); stopDiagram(); const index = Number(layer.dataset.layer); selectLayer(index); $(`[data-layer="${index}"]`,$('#architecture-svg')).focus(); }
  const tab = event.target.closest('[data-tab]');
  if (tab && ['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) {
    event.preventDefault(); const tabs = $$('.detail-tabs button'); const index = tabs.indexOf(tab);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[nextIndex].click(); tabs[nextIndex].focus();
  }
});
$('#credits-button').addEventListener('click', () => showDialog('credits-dialog'));

function renderScoreConditions(result,benchmark) {
  const labels = {split:'评估划分',shots:'示例数',metricVariant:'评分口径',pretraining:'预训练',trainingContext:'训练上下文',contextLength:'评估上下文',resolution:'分辨率',evaluation:'评估设置',fineTuning:'微调',aggregation:'汇总方式',baseModel:'基座模型',memory:'记忆配置',samples:'样本数',sampler:'采样器',guidance:'引导设置',budget:'训练预算',forecastHorizon:'预测长度'};
  return `${benchmark.protocolNote ? `<p class="protocol-note">${escape(benchmark.protocolNote)}</p>` : ''}<dl class="score-conditions">${Object.entries(result.conditions || {}).map(([key,value]) => `<div><dt>${escape(labels[key] || key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>${(result.supportingSources || []).map(source => `<a class="supporting-source" href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`).join('')}`;
}
function metricValue(result) {
  const benchmark = benchmarks.find(item => item.id === result.benchmarkId);
  return `${escape(result.displayValue ?? result.value)}${benchmark?.unit === '%' ? '%' : ''}`;
}
function scoreCard(result) {
  const benchmark = benchmarks.find(item => item.id === result.benchmarkId);
  return `<article class="score-card"><div class="score-card-top"><div><span class="eyebrow">${escape(benchmark.name)} · ${escape(benchmark.metric)} ${benchmark.direction === 'higher' ? '↑' : '↓'}</span><h3>${escape(result.reportedModel)}</h3></div><strong class="score-value">${metricValue(result)}</strong></div><p>${escape(result.configuration)}</p><details><summary>评测条件与出处</summary><p>${escape(result.protocol)}</p>${renderScoreConditions(result,benchmark)}${result.notes?.length ? `<ul>${result.notes.map(note => `<li>${escape(note)}</li>`).join('')}</ul>` : ''}<a href="${escape(result.source.url)}" target="_blank" rel="noopener noreferrer">${escape(result.source.title)} · ${escape(result.source.location)}</a></details></article>`;
}
function renderBenchmarks() {
  const query = state.benchmarkQuery.trim().toLocaleLowerCase();
  const records = benchmarkResults.filter(result => {
    const benchmark = benchmarks.find(item => item.id === result.benchmarkId);
    return (state.task === 'all' || benchmark.taskId === state.task) && `${benchmark.name} ${benchmark.subtask} ${benchmark.metric} ${result.reportedModel} ${result.configuration} ${result.protocol}`.toLocaleLowerCase().includes(query);
  });
  $('#benchmark-count').textContent = `${new Set(records.map(result => result.benchmarkId)).size} 项 Benchmark · ${records.length} 条成绩`;
  $('#task-filters').innerHTML = [{id:'all',name:'全部任务'},...tasks].map(task => `<button data-task="${task.id}" class="${state.task === task.id ? 'active' : ''}" aria-pressed="${state.task === task.id}">${escape(task.name)}</button>`).join('');
  $('#benchmark-list').innerHTML = tasks.map(task => {
    const taskBenchmarks = benchmarks.filter(benchmark => benchmark.taskId === task.id && records.some(result => result.benchmarkId === benchmark.id));
    if (!taskBenchmarks.length) return '';
    return `<section class="benchmark-task" aria-labelledby="task-${task.id}"><h2 id="task-${task.id}">${escape(task.name)}<span>${taskBenchmarks.length} 项</span></h2>${taskBenchmarks.map(benchmark => {
      const results = records.filter(result => result.benchmarkId === benchmark.id);
      const protocols = [...new Set(results.map(result => result.comparisonKey))];
      return `<article class="benchmark-panel"><div class="benchmark-panel-header"><div><span class="eyebrow">${escape(benchmark.subtask)}</span><h3><a href="${escape(benchmark.officialUrl)}" target="_blank" rel="noopener noreferrer">${escape(benchmark.name)}</a></h3><p>${escape(benchmark.description)}</p></div><div class="benchmark-panel-actions"><span class="metric-badge">${escape(benchmark.metric)} ${benchmark.direction === 'higher' ? '↑ 越高越好' : '↓ 越低越好'}</span><button class="text-button" data-report-benchmark="${benchmark.id}">上报成绩</button></div></div>${protocols.map(key => {
        const group = results.filter(result => result.comparisonKey === key);
        return `<div class="benchmark-protocol"><p class="protocol-label">${escape(group[0].protocol)}</p><div class="benchmark-table-scroll" tabindex="0" role="region" aria-label="${escape(benchmark.name)} 成绩与配置"><table class="benchmark-table"><thead><tr><th scope="col">模型配置</th><th scope="col">${escape(benchmark.metric)}</th><th scope="col">条件与来源</th></tr></thead><tbody>${group.map(result => `<tr><th scope="row">${result.modelId ? `<button data-open="${escape(result.modelId)}">${escape(result.reportedModel)}</button>` : `<strong>${escape(result.reportedModel)}</strong>`}${result.modelId ? '<span>查看架构</span>' : '<span>论文对照模型</span>'}</th><td class="table-score">${metricValue(result)}</td><td><span>${escape(result.configuration)}</span><details><summary>评测条件与来源</summary>${renderScoreConditions(result,benchmark)}<a href="${escape(result.source.url)}" target="_blank" rel="noopener noreferrer">${escape(result.source.title)} · ${escape(result.source.location)}</a>${result.notes?.length ? `<ul>${result.notes.map(note => `<li>${escape(note)}</li>`).join('')}</ul>` : ''}</details></td></tr>`).join('')}</tbody></table></div></div>`;
      }).join('')}</article>`;
    }).join('')}</section>`;
  }).join('') || '<div class="empty-state"><h3>没有匹配的 Benchmark</h3><p>试试其他任务、数据集或模型名称。</p><button class="button secondary" id="reset-benchmarks">查看全部成绩</button></div>';
}
$('#task-filters').addEventListener('click',event => { const button = event.target.closest('[data-task]'); if (!button) return; state.task = button.dataset.task; renderBenchmarks(); $(`[data-task="${state.task}"]`).focus({preventScroll:true}); });
$('#benchmark-search').addEventListener('input',event => { state.benchmarkQuery = event.target.value; renderBenchmarks(); });
$('#benchmark-list').addEventListener('click',event => { if (event.target.closest('#reset-benchmarks')) { state.task = 'all'; state.benchmarkQuery = ''; $('#benchmark-search').value = ''; renderBenchmarks(); $('#benchmark-search').focus(); } });

function renderAccount() {
  const snapshot = librarySnapshot;
  if (!snapshot) return;
  const session = snapshot.session;
  const importCount = [...loadLearned(learningStorage,modelIds)].filter(id => !snapshot.learned.has(id)).length;
  $('#account-label').textContent = session.authenticated ? session.user.displayName || '我的账户' : '我的学习库';
  if (!$('#account-dialog').open) return;
  $('#account-content').innerHTML = session.authenticated ? `<div class="account-profile"><span class="account-avatar" aria-hidden="true">${escape((session.user.displayName || session.user.email || '我').slice(0,1))}</span><div><h3>${escape(session.user.displayName || '我的账户')}</h3><p>${escape(session.user.email || '')}</p></div></div><p class="account-status">${escape(storageLabel())}</p>${snapshot.status === 'error' ? `<p class="account-error" role="alert">${escape(snapshot.error || '同步暂未完成，更改已保留。')}</p><button class="button secondary" id="retry-learning">重新同步</button>` : ''}${importCount ? `<div class="import-panel"><h3>此浏览器还有 ${importCount} 项访客标注</h3><p>合并后会保留账户已掌握的模型。</p><button class="button secondary" id="import-learning">合并到我的学习库</button></div>` : ''}<a class="text-button account-signout" href="${escape(session.signOutUrl)}" target="_top">退出登录</a>` : `<div class="account-intro"><h3>${session.authAvailable ? '登录你的学习库' : '本地学习库'}</h3><p>${session.authAvailable ? '登录后，在不同设备上继续自己的学习进度。' : staticPublication ? '公开版的学习进度保存在此浏览器。你可以直接学习；账户同步由服务器版提供。' : '你的掌握标注会保存在此浏览器。云端登录将在托管站点恢复后启用。'}</p>${session.authAvailable && session.signInUrl ? `<a class="button primary" href="${escape(session.signInUrl)}" target="_top">使用 ChatGPT 登录</a>` : ''}<span class="account-local-count">此浏览器已掌握 ${state.learned.size} / ${models.length} 个模型</span></div>`;
}
$('#account-button').addEventListener('click',() => { showDialog('account-dialog'); renderAccount(); });
$('#account-content').addEventListener('click',event => { if (event.target.closest('#import-learning')) learningLibrary.importGuest(); if (event.target.closest('#retry-learning')) learningLibrary.retry(); });
function onLearningChange(snapshot) {
  const previousFocus = document.activeElement;
  const accountFocus = previousFocus?.closest('#account-content') ? previousFocus.id : null;
  const focusZone = previousFocus?.closest('#learning') ? $('#learning') : previousFocus?.closest('#models') ? $('#models') : null;
  const focusAttribute = ['data-toggle-learned','data-open','data-track'].find(attribute => previousFocus?.hasAttribute(attribute));
  const focusValue = focusAttribute ? previousFocus.getAttribute(focusAttribute) : null;
  librarySnapshot = snapshot;
  state.learned = snapshot.learned;
  state.progressSaved = snapshot.saved;
  updateProgress(); renderCatalog(); syncMasteryButton(); renderAccount(); contributionUI?.refreshSession();
  if ($('.detail-storage-label')) $('.detail-storage-label').textContent = storageLabel();
  if (accountFocus && !previousFocus.isConnected && $('#account-dialog').open) (document.getElementById(accountFocus) || $('[data-close="account-dialog"]'))?.focus({preventScroll:true});
  if (focusZone && focusAttribute && !previousFocus.isConnected && !$('dialog[open]')) $(`[${focusAttribute}="${CSS.escape(focusValue)}"]`,focusZone)?.focus({preventScroll:true});
}
function navigate(view,replace = false) {
  const previousPanel = document.activeElement?.closest('.app-view');
  state.view = ['learning','models','benchmarks','contribute'].includes(view) ? view : 'learning';
  $('#learning').hidden = state.view !== 'learning';
  $('#library-view').hidden = state.view !== 'models';
  $('#benchmarks').hidden = state.view !== 'benchmarks';
  $('#contribute').hidden = state.view !== 'contribute';
  $$('.main-nav a').forEach(link => {
    const selected = link.getAttribute('href') === `#${state.view}`;
    link.classList.toggle('active',selected);
    if (selected) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  });
  if (replace) history.replaceState(null,'',`#${state.view}`); else if (location.hash !== `#${state.view}`) history.pushState(null,'',`#${state.view}`);
  window.scrollTo({top:0,behavior:'instant'});
  if (previousPanel?.hidden) focusViewHeading();
}
function focusViewHeading() {
  const heading = $(state.view === 'learning' ? '#learning-title' : state.view === 'models' ? '#catalog-title' : state.view === 'benchmarks' ? '#benchmarks-title' : '#contribution-title');
  heading.tabIndex = -1; heading.focus({preventScroll:true});
}
document.addEventListener('click',event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const view = link.getAttribute('href').slice(1);
  if (['learning','models','benchmarks','contribute',''].includes(view)) { event.preventDefault(); navigate(view || 'learning'); if (link.classList.contains('skip-link')) focusViewHeading(); }
});
window.addEventListener('hashchange',() => {
  if (location.hash.startsWith('#model/')) openModel(location.hash.slice(7));
  else { if ($('#model-dialog').open) $('#model-dialog').close(); navigate(location.hash.slice(1),true); }
});
window.addEventListener('popstate',() => { if (!location.hash.startsWith('#model/')) navigate(location.hash.slice(1),true); });
initializeCatalog(); updateProgress(); renderCatalog(); renderBenchmarks();
contributionUI=initializeContributions({models,benchmarks,getSession:()=>librarySnapshot?.session,navigate,notify:toast,staticMode:staticPublication});
learningLibrary = createLearningLibrary({storage:learningStorage,validIds:modelIds,fetcher:staticPublication ? async () => new Response(JSON.stringify({authAvailable:false,authenticated:false,user:null,signInUrl:null,signOutUrl:null}),{headers:{'content-type':'application/json'}}) : window.fetch.bind(window),onChange:onLearningChange});
librarySnapshot = learningLibrary.getSnapshot();
learningLibrary.initialize();
window.addEventListener('focus',() => { if (document.visibilityState === 'visible') void learningLibrary.refresh(); });
const initialHash = location.hash;
navigate(initialHash.startsWith('#model/') ? 'learning' : initialHash.slice(1),true);
if (initialHash.startsWith('#model/')) openModel(initialHash.slice(7));
