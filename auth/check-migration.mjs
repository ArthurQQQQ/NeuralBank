#!/usr/bin/env node
// Local integration test. Creates/deletes its own isolated PostgreSQL cluster;
// never reads connection env vars, connects to cloud, or touches an existing DB.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir, userInfo } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let bin;
try {
  if (userInfo().uid === 0) throw new Error('PostgreSQL initdb cannot run as root.');
  bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  execFileSync(path.join(bin, 'initdb'), ['--version'], { stdio: 'ignore' });
  execFileSync(path.join(bin, 'postgres'), ['--version'], { stdio: 'ignore' });
} catch {
  console.log('SKIP auth SQL integration: local PostgreSQL server binaries and a non-root OS user are required; no database assertions ran.');
  process.exit(process.argv.includes('--require') ? 1 : 0);
}
const dir = await mkdtemp(path.join(tmpdir(), 'neuralbank-auth-test-'));
let postgres;
let closed;
let serverOutput = '';
const port = '65432'; // TCP is disabled; the socket directory is unique per run.
const psqlArgs = ['-h', dir, '-p', port, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-At'];
const sql = query => execFileSync(path.join(bin, 'psql'), psqlArgs, { input: query, encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const concurrentSql = query => new Promise((resolve, reject) => {
  const child = spawn(path.join(bin, 'psql'), psqlArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '', error = '';
  child.stdout.on('data', value => output += value);
  child.stderr.on('data', value => error += value);
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
  child.stdin.end(query);
});
try {
  execFileSync(path.join(bin, 'initdb'), ['-D', path.join(dir, 'db'), '--auth=trust', '--no-locale'], { stdio: 'ignore', timeout: 30000 });
  postgres = spawn(path.join(bin, 'postgres'), ['-D', path.join(dir, 'db'), '-k', dir, '-p', port, '-c', 'listen_addresses='], { stdio: ['ignore', 'pipe', 'pipe'] });
  postgres.stdout.on('data', value => serverOutput += value);
  postgres.stderr.on('data', value => serverOutput += value);
  closed = new Promise(resolve => postgres.once('close', resolve));
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { sql('select 1'); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!ready) throw new Error(`Temporary PostgreSQL failed to start: ${serverOutput}`);
  sql(`create role anon; create role authenticated; create role supabase_auth_admin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean default false, raw_user_meta_data jsonb default '{}');
    create table auth.identities(id uuid primary key, user_id uuid references auth.users, provider text, identity_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  const migration = fileURLToPath(new URL('../supabase/migrations/0001_neuralbank_auth.sql', import.meta.url));
  execFileSync(path.join(bin, 'psql'), [...psqlArgs, '-f', migration], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 });
  const A = '10000000-0000-4000-8000-000000000001';
  const B = '10000000-0000-4000-8000-000000000002';
  const C = '10000000-0000-4000-8000-000000000003';
  const D = '10000000-0000-4000-8000-000000000004';
  const E = '10000000-0000-4000-8000-000000000005';
  const scoped = (id, query) => `begin; set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true); ${query}; rollback;`;
  const value = (id, query) => sql(scoped(id, query)).split('\n').at(-2);
  const deny = (query, pattern) => {
    assert.throws(() => sql(query), error => pattern.test(String(error.stderr || error)));
  };
  sql(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
    ('${A}','a@example.com',now(),'{}'), ('${B}','b@example.com',now(),'{}'),
    ('${C}','fake@example.com',now(),'{"provider":"github","providers":["github"]}'),
    ('${D}','student@institution.example',now(),'{}'), ('${E}','pending@institution.example',null,'{}');
    insert into auth.identities(id,user_id,provider) values ('${A}','${A}','github'), ('${B}','${B}','github'), ('${C}','${C}','email'), ('${D}','${D}','email'), ('${E}','${E}','email');
    insert into neuralbank_private.academic_email_domains(domain,institution,allow_subdomains,evidence_url,reviewed_by,reviewed_at,source_ref) values ('institution.example','Synthetic University',true,'https://institution.example/','Test reviewer',now(),'test-only');
    insert into neuralbank_private.blocked_email_domains values ('alumni.institution.example','test block','test-only');`);
  assert.equal(sql('select count(*) from neuralbank_private.model_ids'), '64');
  assert.equal(value(A, "select (public.get_neuralbank_auth_status()->>'eligible')::boolean"), 't');
  assert.equal(value(C, "select public.get_neuralbank_auth_status()->>'reason'"), 'ACADEMIC_EMAIL_REQUIRED');
  assert.equal(value(D, "select (public.get_neuralbank_auth_status()->>'eligible')::boolean"), 't');
  assert.equal(value(E, "select (public.get_neuralbank_auth_status()->>'eligible')::boolean"), 'f');
  assert.equal(sql(`select public.check_neuralbank_email_domain('a@student.institution.example'),
    public.check_neuralbank_email_domain('a@institution.example.attacker.com'),
    public.check_neuralbank_email_domain('a@evilinstitution.example'),
    public.check_neuralbank_email_domain('a@alumni.institution.example'),
    public.check_neuralbank_email_domain('a@gmail.com'),
    public.check_neuralbank_email_domain('a@bad-.institution.example')`), 't|f|f|f|f|f');
  assert.equal(sql("select has_function_privilege('anon','public.get_neuralbank_learning()','execute'), has_table_privilege('anon','neuralbank_private.learning_progress','select'), has_table_privilege('authenticated','neuralbank_private.academic_email_domains','select')"), 'f|f|f');
  deny(scoped(C, "select public.put_neuralbank_learning(0,array['mlp'])"), /ACADEMIC_EMAIL_REQUIRED/);
  deny(scoped(E, 'select public.get_neuralbank_learning()'), /ACADEMIC_EMAIL_REQUIRED/);
  deny(scoped('', 'select public.get_neuralbank_learning()'), /AUTH_REQUIRED/);
  assert.deepEqual(JSON.parse(value(A, 'select public.get_neuralbank_learning()')), { learned: [], revision: 0, updatedAt: null });
  const first = sql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${A}',true); select public.put_neuralbank_learning(0,array['mlp','cnn','mlp']); commit;`).split('\n').at(-2);
  assert.deepEqual(JSON.parse(first).learned, ['cnn', 'mlp']);
  assert.equal(JSON.parse(value(A, 'select public.get_neuralbank_learning()')).revision, 1);
  assert.deepEqual(JSON.parse(value(B, 'select public.get_neuralbank_learning()')).learned, []);
  assert.equal(value(B, `select count(*) from neuralbank_private.learning_progress where user_id='${A}'`), '0');
  deny(scoped(B, `insert into neuralbank_private.learning_progress(user_id) values('${A}')`), /row-level security/);
  assert.equal(value(B, `with changed as (update neuralbank_private.learning_progress set learned='{}' where user_id='${A}' returning *) select count(*) from changed`), '0');
  deny(scoped(A, "select public.put_neuralbank_learning(1,array['invented-id'])"), /UNKNOWN_MODEL_ID/);
  deny(scoped(A, "select public.put_neuralbank_learning(-1,array['mlp'])"), /INVALID_LEARNING_RECORD/);
  deny(scoped(A, 'select public.put_neuralbank_learning(1,array[null]::text[])'), /INVALID_LEARNING_RECORD/);
  const clash = JSON.parse(value(A, "select public.put_neuralbank_learning(0,array['rnn'])"));
  assert.equal(clash.ok, false); assert.equal(clash.code, 'REVISION_CONFLICT');
  assert.equal(clash.revision, 1); assert.deepEqual(clash.learned, ['cnn', 'mlp']);
  const results = (await Promise.all(['rnn', 'lstm'].map(id => concurrentSql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${A}',true); select public.put_neuralbank_learning(1,array['${id}']); commit;`)))).map(text => JSON.parse(text.split('\n').at(-2)));
  assert.equal(results.filter(item => item.ok).length, 1);
  assert.equal(results.filter(item => item.code === 'REVISION_CONFLICT').length, 1);
  assert(results.every(item => item.revision === 2));
  assert.deepEqual(JSON.parse(sql("select public.neuralbank_before_user_created('{\"user\":{\"app_metadata\":{\"provider\":\"github\"}}}'::jsonb)")), {});
  assert.equal(JSON.parse(sql("select public.neuralbank_before_user_created('{\"user\":{\"email\":\"x@example.com\",\"app_metadata\":{\"provider\":\"email\"},\"user_metadata\":{\"provider\":\"github\"}}}'::jsonb)")).error.message, 'ACADEMIC_EMAIL_REQUIRED');
  console.log('PASS auth SQL integration: real PostgreSQL migration, trusted identity/confirmation, domain boundaries, role grants, RLS owner isolation, persistence, invalid IDs, hooks, conflict snapshots and simultaneous CAS. Synthetic auth fixtures are not a hosted Supabase/OAuth/SMTP test.');
} finally {
  if (postgres && postgres.exitCode === null) { postgres.kill('SIGTERM'); await closed; }
  await rm(dir, { recursive: true, force: true });
}
