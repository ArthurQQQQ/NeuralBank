import { validateSubmission, getSubmissionTemplate } from './submission-schema.js';
import { SubmissionDraft } from './submission-draft.js';

const h = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const q = selector => document.querySelector(selector);
const json = value => JSON.stringify(value,null,2);
const safeHref = value => { try {const url=new URL(value); return url.protocol==='https:' && !url.username && !url.password ? url.href : null;}catch{return null;} };

export function initializeContributions({models,benchmarks,getSession,navigate,notify}) {
  const context={models,benchmarks};
  let kind='benchmark-result', modelId=models[0].id, benchmarkId=benchmarks[0].id;
  let draft, scope=null, posting=false, feedSerial=0;
  const buffers=new Map();
  const key=()=>`${kind}:${modelId}:${kind==='benchmark-result'?benchmarkId:''}`;
  const editor=q('#submission-json');
  const status=q('#submission-status');
  const submitButton=q('#submit-report');
  const checkButton=q('#check-report');
  const draftStatus=q('#draft-status');

  async function remoteCheck(value) {
    const response=await fetch('/api/submissions/validate',{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(value)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error || '服务器检查暂时不可用。');
    return result;
  }
  draft=new SubmissionDraft({validate:value=>validateSubmission(value,context),remoteCheck,onChange:renderCheck});

  function renderControls() {
    const session=getSession() || {};
    const requiresLogin=scope==='hosted' && !session.authenticated;
    submitButton.disabled=posting || !draft.canSubmit || !scope || requiresLogin;
    submitButton.textContent=posting?'正在提交…':draft.submittedRevision===draft.revision?'此版本已提交':'提交待审核';
    checkButton.disabled=draft.checking || posting;
    checkButton.textContent=draft.checking?'正在检查…':'运行格式检查';
    q('#contribution-session').innerHTML=requiresLogin
      ? `登录后可提交；检查和下载无需登录。${session.signInUrl ? `<a href="${h(session.signInUrl)}" target="_top">使用 ChatGPT 登录</a>` : ''}`
      : scope==='local' ? '本地预览：投稿只保存在这台电脑，尚未发布到线上。'
      : scope==='hosted' ? '投稿及署名会公开展示。请勿填写私人信息。'
      : '正在连接投稿服务；可以先编辑和检查格式。';
  }
  function renderCheck() {
    renderControls();
    const report=draft.report;
    q('#validation-errors').innerHTML='';
    q('#validation-details').hidden=true;
    q('#validation-panel').classList.remove('is-valid','is-invalid');
    if(draft.checking) { draftStatus.textContent='正在进行服务器检查'; q('#validation-title').textContent='正在检查'; q('#validation-description').textContent='浏览器检查已通过，服务器正在使用同一份规范再次检查。'; return; }
    if(!report) { draftStatus.textContent='尚有未检查的修改'; q('#validation-title').textContent='等待检查'; q('#validation-description').textContent='填写自己的运行信息后，点击“运行格式检查”。__REQUIRED 占位内容不能提交。'; return; }
    if(report.valid && report.serverChecked) {
      q('#validation-panel').classList.add('is-valid');
      q('#validation-title').textContent='格式与条件检查通过';
      q('#validation-description').textContent=report.value.kind==='model-edit'?'已通过浏览器和服务器检查。编辑内容仍需人工审核，来源内容尚未核验。':'已通过浏览器和服务器检查。分数仍为自报结果，提交后等待人工审核，尚未复现。';
      draftStatus.textContent='当前版本检查通过';
      q('#validation-details').hidden=false;
      q('#validation-details').innerHTML=report.value.kind==='model-edit'?'<strong id="validation-target"></strong><span>✓ 编辑字段白名单</span><span>✓ 来源链接格式</span><span>✓ 修改内容与理由字段</span><span class="validation-unverified">待人工审核 · 来源未核验</span>':'<strong id="validation-target"></strong><span>✓ 数据结构与字段</span><span>✓ 指标、单位与取值范围</span><span>✓ 评测条件与材料字段</span><span class="validation-unverified">待人工审核 · 尚未复现</span>';
      const value=report.value;
      const target=models.find(model=>model.id===value.modelId)?.name || value.modelId;
      const benchmark=benchmarks.find(item=>item.id===value.benchmarkId);
      q('#validation-target').textContent=`投稿目标：${target}${benchmark ? ` · ${benchmark.name}` : ' · 模型编辑'}`;
    } else {
      q('#validation-panel').classList.add('is-invalid');
      q('#validation-title').textContent=report.localValid?'等待服务器检查':`还有 ${report.errors.length} 项需要修改`;
      q('#validation-description').textContent=report.localValid?'本地检查通过；服务器暂时无法连接，可以先下载草稿。':'点击错误字段可定位到编辑器中的对应位置。';
      draftStatus.textContent=report.localValid?'尚未完成服务器检查':'检查未通过';
      q('#validation-errors').innerHTML=report.errors.map((error,index)=>`<li><button data-validation-error="${index}"><code>${h(error.path)}</code><span>${h(error.message)}</span></button></li>`).join('');
    }
  }
  function syncSelectors() {
    q('#contribution-model').value=modelId;
    q('#contribution-benchmark').value=benchmarkId;
    q('#benchmark-target').hidden=kind!=='benchmark-result';
    q('#submission-editor-label').textContent=kind==='benchmark-result'?'运行报告 · JSON':'模型编辑建议 · JSON';
    document.querySelectorAll('[data-contribution-kind]').forEach(button=>{
      const selected=button.dataset.contributionKind===kind;
      button.classList.toggle('active',selected); button.setAttribute('aria-pressed',selected);
    });
    q('#submission-guide').innerHTML=kind==='benchmark-result'
      ? '<li>填写具体模型版本、分数及数据集划分。</li><li>保留评测配置、软件环境、配置文件与原始日志链接。</li><li>分数为数值；指标和单位须与所选 Benchmark 一致。</li>'
      : '<li>changes 中填写希望修改的教学内容。</li><li>sources 提供可靠来源，rationale 说明修改原因。</li><li>编辑建议经审核后收录；个人学习标注不受影响。</li>';
  }
  function saveBuffer() { if(draft.text) buffers.set(key(),draft.text); }
  function loadBuffer() {
    const template=getSubmissionTemplate(kind,{...context,modelId,benchmarkId});
    editor.value=buffers.get(key()) || json(template);
    draft.setText(editor.value); syncSelectors(); status.textContent=''; status.className='submission-status';
  }
  function open({model,benchmark,type='benchmark-result'}={}) {
    saveBuffer(); kind=type;
    if(models.some(item=>item.id===model)) modelId=model;
    if(benchmarks.some(item=>item.id===benchmark)) benchmarkId=benchmark;
    loadBuffer(); navigate('contribute'); editor.focus({preventScroll:true});
  }
  q('#contribution-model').innerHTML=models.map(model=>`<option value="${h(model.id)}">${h(model.name)}</option>`).join('');
  q('#contribution-benchmark').innerHTML=benchmarks.map(benchmark=>`<option value="${h(benchmark.id)}">${h(benchmark.name)} · ${h(benchmark.metric)}</option>`).join('');
  q('#contribution-kinds').addEventListener('click',event=>{
    const button=event.target.closest('[data-contribution-kind]'); if(!button || button.dataset.contributionKind===kind) return;
    saveBuffer(); kind=button.dataset.contributionKind; loadBuffer(); button.focus();
  });
  q('#contribution-model').addEventListener('change',event=>{saveBuffer();modelId=event.target.value;loadBuffer();});
  q('#contribution-benchmark').addEventListener('change',event=>{saveBuffer();benchmarkId=event.target.value;loadBuffer();});
  editor.addEventListener('input',()=>{
    try {
      const value=JSON.parse(editor.value);
      if(['model-edit','benchmark-result'].includes(value.kind))kind=value.kind;
      if(models.some(model=>model.id===value.modelId))modelId=value.modelId;
      if(benchmarks.some(benchmark=>benchmark.id===value.benchmarkId))benchmarkId=value.benchmarkId;
      syncSelectors();
    } catch {}
    draft.setText(editor.value); buffers.set(key(),editor.value); status.textContent='';
  });
  q('#reset-report').addEventListener('click',()=>{buffers.delete(key());loadBuffer();editor.focus();});
  checkButton.addEventListener('click',async()=>{
    const revision=draft.revision;
    await draft.check();
    if(revision===draft.revision && draft.report && !q('#contribute').hidden && [document.body,checkButton].includes(document.activeElement)) {const heading=q('#validation-title');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  });
  q('#validation-errors').addEventListener('click',event=>{
    const button=event.target.closest('[data-validation-error]'); if(!button) return;
    const path=draft.report?.errors[Number(button.dataset.validationError)]?.path || '';
    const tokens=path.split('/').filter(Boolean).map(token=>token.replaceAll('~1','/').replaceAll('~0','~'));
    let start=0;
    for(const token of tokens) { if(/^\d+$/.test(token)) continue; const found=editor.value.indexOf(JSON.stringify(token),start); if(found>=0) start=found; }
    editor.focus(); editor.setSelectionRange(start,Math.min(editor.value.length,start+(tokens.at(-1)?.length || 1)+2));
  });
  q('#download-report').addEventListener('click',()=>{
    let payload; try{payload=JSON.parse(editor.value);}catch{payload=null;}
    const body=payload?json(payload):editor.value;
    const url=URL.createObjectURL(new Blob([body+'\n'],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`neuralbank-${kind}-${modelId}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
    notify('投稿 JSON 已下载；可使用开源仓库中的检查器验证。');
  });
  q('#import-report').addEventListener('change',async event=>{
    const file=event.target.files?.[0]; if(!file)return;
    if(file.size>32768){notify('JSON 文件不能超过 32 KB。');event.target.value='';return;}
    const previous=draft.revision;
    try {
      const text=await file.text();
      if(draft.revision!==previous){notify('读取文件时草稿已修改，请重新导入。');return;}
      let payload;try{payload=JSON.parse(text);}catch{payload=null;}
      saveBuffer();
      if(['model-edit','benchmark-result'].includes(payload?.kind)) kind=payload.kind;
      if(models.some(item=>item.id===payload?.modelId))modelId=payload.modelId;
      if(benchmarks.some(item=>item.id===payload?.benchmarkId))benchmarkId=payload.benchmarkId;
      editor.value=payload?json(payload):text;draft.setText(editor.value);buffers.set(key(),editor.value);syncSelectors();status.textContent='';
    } catch {notify('文件没有读取成功，当前草稿已保留。');}
    finally {event.target.value='';}
  });
  submitButton.addEventListener('click',async()=>{
    const session=getSession()||{};
    if(!draft.canSubmit || posting || (scope==='hosted'&&!session.authenticated))return;
    const payload=draft.checkedValue, revision=draft.revision;
    posting=true;renderControls();status.textContent='正在提交…';status.className='submission-status';
    try {
      const headers={'content-type':'application/json',accept:'application/json'};
      if(session.authenticated&&session.user?.id)headers['x-neuralbank-user']=session.user.id;
      const response=await fetch('/api/submissions',{method:'POST',headers,body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok){
        if(result.errors&&draft.revision===revision){draft.report={valid:false,errors:result.errors,serverChecked:true};renderCheck();}
        throw new Error(result.error||'投稿未保存，请稍后重试。');
      }
      draft.markSubmitted(revision);
      status.className='submission-status success';
      status.textContent=draft.revision!==revision?'上一版本已提交；你刚才的新修改尚未提交。':result.duplicate?'这份投稿已经保存，无需重复提交。':result.scope==='local'?'投稿已保存在本地待审列表，未发布到线上。':payload.kind==='model-edit'?'编辑建议已保存：格式通过、待审核、来源未核验。':'投稿已保存：格式通过、待审核、未复现。';
      await loadFeed();
    }catch(error){status.className='submission-status error';status.textContent=error.message==='Failed to fetch'?'暂时无法连接，草稿已保留，请稍后重试。':error.message;}
    finally{posting=false;renderControls();}
  });
  function renderRecord(record) {
    const payload=record.payload;
    if(!payload || !['model-edit','benchmark-result'].includes(payload.kind))return '';
    const model=models.find(item=>item.id===payload.modelId);
    const benchmark=benchmarks.find(item=>item.id===payload.benchmarkId);
    const score=payload.kind==='benchmark-result'&&Number.isFinite(payload.score?.value)?`${payload.score.value}${payload.score.unit==='%'?'%':''}`:'';
    const title=payload.kind==='model-edit'?`${model?.name||payload.modelId} · 编辑建议`:payload.reportedModel;
    const detail=payload.kind==='model-edit'?payload.rationale:`${benchmark?.name||payload.benchmarkId} · ${payload.score?.metric||''} · ${payload.dataset?.split||''}`;
    const evidence=payload.kind==='benchmark-result'?payload.reproduction?.logUrl:payload.sources?.[0];
    const link=safeHref(evidence);
    return `<article class="community-record"><div class="community-record-heading"><div><span class="eyebrow">${payload.kind==='benchmark-result'?'自报成绩':'模型编辑'}</span><h3>${h(title)}</h3></div>${score?`<strong class="community-score">${h(score)}</strong>`:''}</div><p>${h(detail)}</p><div class="submission-badges"><span>格式通过</span><span>待审核</span><span>${payload.kind==='model-edit'?'来源未核验':'未复现'}</span>${record.scope==='local'?'<span>仅本地</span>':''}</div><div class="community-record-meta"><span>署名：${h(payload.displayName)} · ${h(new Date(record.createdAt).toLocaleDateString('zh-CN'))}</span>${link?`<a href="${h(link)}" target="_blank" rel="noopener noreferrer">${payload.kind==='benchmark-result'?'原始日志':'来源'}</a>`:''}</div><details><summary>查看完整投稿</summary><pre>${h(json(payload))}</pre><span class="submission-fingerprint">内容 SHA-256 · ${h(record.contentHash)}</span></details></article>`;
  }
  async function loadFeed() {
    const serial=++feedSerial;
    const refresh=q('#refresh-submissions');refresh.disabled=true;
    try {
      const response=await fetch('/api/submissions',{headers:{accept:'application/json'}});
      const result=await response.json();
      if(!response.ok||!Array.isArray(result.submissions)||!['local','hosted'].includes(result.scope))throw new Error('读取失败');
      if(serial!==feedSerial)return;
      scope=result.scope;renderControls();
      q('#submission-count').textContent=`${result.submissions.length} 份待审核`;
      q('#submission-feed').innerHTML=result.submissions.length?result.submissions.map(renderRecord).join(''):'<div class="community-empty"><h3>第一份贡献，从这里开始</h3><p>可以改进一个模型说明，也可以上报一次自己的评测结果。</p></div>';
      q('#submission-feed-note').textContent=scope==='local'?'此列表仅为本地投稿；恢复托管后才能与其他人共享。':'这些是贡献者自报内容，格式通过不代表成绩已复现，也不构成统一排行榜。';
    }catch{
      if(serial!==feedSerial)return;
      q('#submission-count').textContent='暂时无法读取';
      q('#submission-feed').innerHTML='<div class="community-empty"><h3>投稿列表暂时无法连接</h3><p>你可以继续编辑并下载草稿。</p></div>';
    }finally{if(serial===feedSerial)refresh.disabled=false;}
  }
  q('#refresh-submissions').addEventListener('click',loadFeed);
  loadBuffer();loadFeed();
  return {open,refreshSession:renderControls,refresh:loadFeed};
}
