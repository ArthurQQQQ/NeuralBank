import test from 'node:test';
import assert from 'node:assert/strict';
import { SubmissionDraft } from '../src/submission-draft.js';
const local = value => ({valid:true,errors:[],value});
const remote = async value => ({valid:true,errors:[],value});

test('editing after a successful check requires a fresh check before submission',async () => {
  const draft = new SubmissionDraft({validate:local,remoteCheck:remote});
  draft.setText('{"value":1}');
  await draft.check();
  assert.equal(draft.canSubmit,true);
  assert.deepEqual(draft.checkedValue,{value:1});
  draft.setText('{"value":2}');
  assert.equal(draft.canSubmit,false);
  assert.equal(draft.checkedValue,null);
});

test('a validation response for an older document cannot validate the current edits',async () => {
  let finish;
  const draft = new SubmissionDraft({validate:local,remoteCheck:() => new Promise(resolve => {finish=resolve;})});
  draft.setText('{"value":1}');
  const checking = draft.check();
  draft.setText('{"value":2}');
  finish({valid:true,errors:[],value:{value:1}});
  await checking;
  assert.equal(draft.canSubmit,false);
  assert.equal(draft.report,null);
});

test('malformed JSON and failed metadata checks do not contact the server',async () => {
  let calls=0;
  const draft = new SubmissionDraft({validate:() => ({valid:false,errors:[{path:'$.score',code:'REQUIRED',message:'缺少分数'}]}),remoteCheck:async () => {calls++; return {valid:true};}});
  draft.setText('{');
  await draft.check();
  assert.equal(draft.report.errors[0].code,'JSON_PARSE');
  draft.setText('{}');
  await draft.check();
  assert.equal(draft.report.errors[0].path,'$.score');
  assert.equal(calls,0);
  assert.equal(draft.canSubmit,false);
});

test('network failure retains the draft and local success does not claim server validation',async () => {
  const draft = new SubmissionDraft({validate:local,remoteCheck:async () => {throw new Error('offline');}});
  draft.setText('{"value":1}');
  await draft.check();
  assert.equal(draft.text,'{"value":1}');
  assert.equal(draft.report.localValid,true);
  assert.equal(draft.report.serverChecked,false);
  assert.equal(draft.canSubmit,false);
});

test('a successful submission locks only the version that was sent',async () => {
  const draft = new SubmissionDraft({validate:local,remoteCheck:remote});
  draft.setText('{"value":1}');
  await draft.check();
  const sent=draft.revision;
  draft.setText('{"value":2}');
  draft.markSubmitted(sent);
  assert.equal(draft.canSubmit,false);
  await draft.check();
  assert.equal(draft.canSubmit,true);
  draft.markSubmitted(draft.revision);
  assert.equal(draft.canSubmit,false);
});
