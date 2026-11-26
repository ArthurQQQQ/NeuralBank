const GUEST_KEY = 'neuralbank-learned';
const ACCOUNT_PREFIX = 'neuralbank-learning-v1:';
const emptySession = () => ({ authAvailable: false, authenticated: false, user: null, signInUrl: null, signOutUrl: null });
const strings = values => [...new Set((Array.isArray(values) ? values : []).filter(id => typeof id === 'string' && id.length > 0))];
const version = value => value && Number.isSafeInteger(value.clock) && value.clock >= 0 && typeof value.writer === 'string';
const compare = (a, b) => !b ? 1 : a.clock - b.clock || a.writer.localeCompare(b.writer);
const dictionary = values => Object.assign(Object.create(null), values);
const emptyRecord = () => ({ schema: 2, journal: false, learned: [], revision: null, updatedAt: null, pending: dictionary(), unlogged: dictionary(), acknowledged: dictionary(), clock: 0 });
const accountKey = id => `${ACCOUNT_PREFIX}${encodeURIComponent(id)}`;

function parseRecord(value) {
  const record = emptyRecord();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return record;
  record.learned = strings(value.learned);
  record.revision = Number.isSafeInteger(value.revision) && value.revision >= 0 ? value.revision : null;
  record.updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
  record.journal = value.journal === true;
  for (const [id, intent] of Object.entries(value.pending || {})) {
    if (id && version(intent) && typeof intent.value === 'boolean') record.pending[id] = { value: intent.value, clock: intent.clock, writer: intent.writer };
  }
  for (const [id, settled] of Object.entries(value.acknowledged || {})) {
    if (id && version(settled)) record.acknowledged[id] = { clock: settled.clock, writer: settled.writer };
  }
  for (const [id, intent] of Object.entries(value.unlogged || {})) {
    if (id && version(intent) && typeof intent.value === 'boolean') record.unlogged[id] = { value: intent.value, clock: intent.clock, writer: intent.writer };
  }
  record.clock = Math.max(Number.isSafeInteger(value.clock) ? value.clock : 0, ...Object.values(record.pending).map(item => item.clock), ...Object.values(record.unlogged).map(item => item.clock), ...Object.values(record.acknowledged).map(item => item.clock));
  return record;
}

function mergeRecords(left, right) {
  const base = (right.revision ?? -1) > (left.revision ?? -1) ? right : left;
  const merged = { ...base, journal: left.journal || right.journal, learned: [...base.learned], pending: dictionary(left.pending), unlogged: dictionary(left.unlogged), acknowledged: dictionary(left.acknowledged), clock: Math.max(left.clock, right.clock) };
  for (const [id, settled] of Object.entries(right.acknowledged)) {
    if (compare(settled, merged.acknowledged[id]) > 0) merged.acknowledged[id] = settled;
  }
  for (const [id, intent] of Object.entries(right.pending)) {
    if (compare(intent, merged.pending[id]) > 0) merged.pending[id] = intent;
  }
  for (const [id, intent] of Object.entries(right.unlogged)) {
    if (compare(intent, merged.unlogged[id]) > 0) merged.unlogged[id] = intent;
  }
  // Acknowledgement tombstones prevent an older tab from resurrecting an
  // operation another tab has already saved. A newer toggle always survives.
  for (const [id, intent] of Object.entries(merged.pending)) {
    if (merged.acknowledged[id] && compare(intent, merged.acknowledged[id]) <= 0) delete merged.pending[id];
  }
  for (const [id, intent] of Object.entries(merged.unlogged)) {
    if (merged.acknowledged[id] && compare(intent, merged.acknowledged[id]) <= 0) delete merged.unlogged[id];
  }
  return merged;
}

function applied(record) {
  const learned = new Set(record.learned);
  for (const [id, intent] of Object.entries(record.pending)) intent.value ? learned.add(id) : learned.delete(id);
  return learned;
}

function remoteSnapshot(value) {
  if (!value || !Array.isArray(value.learned) || value.learned.some(id => typeof id !== 'string' || !id) || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error('服务器返回了无效的学习记录，请重试。');
  return { learned: strings(value.learned), revision: value.revision, updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null };
}

function sessionSnapshot(value) {
  if (!value || typeof value.authAvailable !== 'boolean' || typeof value.authenticated !== 'boolean') throw new Error('暂时无法确认登录状态。');
  if (value.authenticated && (!value.user || typeof value.user.id !== 'string' || !value.user.id)) throw new Error('暂时无法确认账户身份。');
  return {
    authAvailable: value.authAvailable, authenticated: value.authenticated,
    user: value.authenticated ? { ...value.user } : null,
    signInUrl: typeof value.signInUrl === 'string' ? value.signInUrl : null,
    signOutUrl: typeof value.signOutUrl === 'string' ? value.signOutUrl : null,
  };
}

/**
 * Local guest progress and a revisioned, account-scoped learning library.
 * Mutations are optimistic; their desired per-ID values are persisted before
 * network work. Guest progress is imported only by an explicit importGuest().
 */
export function createLearningLibrary({ storage, validIds = [], fetcher = globalThis.fetch?.bind(globalThis), onChange = () => {} } = {}) {
  const valid = new Set(validIds);
  const writer = globalThis.crypto?.randomUUID?.() || `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let session = emptySession();
  let current = null;
  let guest = new Set();
  let guestSaved = false;
  let guestError = '';
  let checking = false;
  let checkSerial = 0;
  let checkPromise = null;
  let destroyed = false;
  let journalAvailable = false;
  try { journalAvailable = typeof storage.key === 'function' && typeof storage.removeItem === 'function' && Number.isInteger(storage.length); } catch { /* Browser storage is optional. */ }

  const read = key => {
    try { return { ok: true, value: JSON.parse(storage.getItem(key) || 'null') }; }
    catch { return { ok: false, value: null }; }
  };
  function readGuest() {
    const stored = read(GUEST_KEY);
    if (stored.ok) { guest = new Set(strings(stored.value)); guestSaved = true; }
  }
  readGuest();
  const active = context => !destroyed && current === context;
  const visible = ids => new Set([...ids].filter(id => valid.has(id)));
  const pendingCount = context => Object.keys(context.record.pending).length;

  function getSnapshot() {
    let status = 'local';
    if (checking) status = 'loading';
    else if (current) status = current.error ? 'error' : current.reading || !current.loaded ? 'loading' : current.saving || pendingCount(current) ? 'syncing' : 'synced';
    const synced = current && current.loaded && !pendingCount(current) && !current.error;
    return {
      learned: visible(current ? applied(current.record) : guest),
      session: { ...session, user: session.user ? { ...session.user } : null },
      status,
      saved: current ? Boolean(current.cacheSaved || synced) : guestSaved,
      error: current?.error || guestError,
      guestCount: visible(guest).size,
      pendingCount: current ? pendingCount(current) : 0,
    };
  }
  function emit() { if (!destroyed) onChange(getSnapshot()); }

  const intentKey = (context, id, intent) => `${context.journalPrefix}${encodeURIComponent(id)}:${encodeURIComponent(intent.writer)}:${intent.clock}`;
  function journalEntries(context) {
    const entries = [];
    try {
      const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
      for (const key of keys) {
        if (typeof key !== 'string' || !key.startsWith(context.journalPrefix)) continue;
        const item = JSON.parse(storage.getItem(key) || 'null');
        if (item && typeof item.id === 'string' && item.id && version(item) && typeof item.value === 'boolean' && intentKey(context, item.id, item) === key) entries.push({ key, ...item });
      }
      return { ok: true, entries };
    } catch { return { ok: false, entries: [] }; }
  }
  function logIntent(context, id, intent) {
    try { storage.setItem(intentKey(context, id, intent), JSON.stringify({ id, ...intent })); }
    catch { context.record.unlogged[id] = intent; }
  }
  function pullCache(context) {
    const stored = read(context.key);
    if (stored.ok) context.record = mergeRecords(context.record, parseRecord(stored.value));
    if (context.useJournal) {
      const journal = journalEntries(context);
      if (journal.ok) {
        const pending = dictionary(context.record.unlogged);
        for (const { id, key: _key, ...intent } of journal.entries) {
          if (compare(intent, pending[id]) > 0) pending[id] = intent;
        }
        context.record.pending = pending;
        context.record = mergeRecords(context.record, emptyRecord());
        context.record.clock = Math.max(context.record.clock, ...Object.values(pending).map(intent => intent.clock));
      }
    }
  }
  function persist(context) {
    pullCache(context);
    const record = context.record;
    const ordered = values => Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
    try {
      storage.setItem(context.key, JSON.stringify({ ...record, learned: [...record.learned].sort(), pending: ordered(record.pending), unlogged: ordered(record.unlogged), acknowledged: ordered(record.acknowledged) }));
      context.cacheSaved = true;
    } catch { context.cacheSaved = false; }
  }
  function adopt(nextSession) {
    const nextId = nextSession.authenticated ? nextSession.user.id : null;
    session = nextSession;
    if (nextId === current?.id) return;
    if (!nextId) { current = null; readGuest(); return; }
    const stored = read(accountKey(nextId));
    current = {
      id: nextId, key: accountKey(nextId), journalPrefix: `${accountKey(nextId)}:intent:`, useJournal: journalAvailable, record: parseRecord(stored.value),
      cacheSaved: stored.ok && stored.value !== null, loaded: false,
      needsRead: true, reading: false, saving: false, error: '', worker: null,
    };
    if (current.useJournal) {
      if (!current.record.journal) for (const [id, intent] of Object.entries(current.record.pending)) logIntent(current, id, intent);
      current.record.journal = true;
      pullCache(current);
    }
  }
  async function request(path, options = {}) {
    if (typeof fetcher !== 'function') throw new Error('当前无法连接服务器。');
    let response;
    try { response = await fetcher(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { Accept: 'application/json', ...options.headers } }); }
    catch { throw new Error('网络连接失败，修改尚未同步，请重试。'); }
    let value;
    try { value = await response.json(); } catch { throw new Error('服务器暂时无法读取学习记录，请重试。'); }
    if (!response.ok) {
      const error = new Error(value?.error || '学习记录暂时未能同步，请重试。');
      error.code = value?.code;
      error.status = response.status;
      error.snapshot = value;
      throw error;
    }
    return value;
  }
  async function checkSession() {
    const serial = ++checkSerial;
    checking = true;
    emit();
    const job = (async () => {
      try {
        const next = sessionSnapshot(await request('/api/session'));
        if (destroyed || serial !== checkSerial) return false;
        adopt(next);
        guestError = '';
        return true;
      } catch {
        if (destroyed || serial !== checkSerial) return false;
        if (current) current.error = '暂时无法确认登录状态，已保留此账户的待同步记录。';
        else guestError = '暂时无法连接登录服务，当前使用此浏览器的学习记录。';
        return false;
      } finally {
        if (!destroyed && serial === checkSerial) { checking = false; emit(); }
      }
    })();
    checkPromise = job;
    return job;
  }
  function acceptRemote(context, value) {
    const remote = remoteSnapshot(value);
    pullCache(context);
    if (remote.revision >= (context.record.revision ?? -1)) context.record = { ...context.record, ...remote };
    context.loaded = true;
  }
  function addIntent(context, id, value) {
    pullCache(context);
    const clock = Math.max(Date.now(), context.record.clock + 1);
    context.record.clock = clock;
    context.record.pending[id] = { value, clock, writer };
    if (context.useJournal) logIntent(context, id, context.record.pending[id]);
  }

  async function work(context) {
    let conflicts = 0;
    while (active(context)) {
      pullCache(context);
      try {
        const headers = { 'X-NeuralBank-User': context.id };
        if (context.needsRead) {
          context.reading = true;
          emit();
          const value = await request('/api/learning', { headers });
          if (!active(context)) break;
          acceptRemote(context, value);
          context.needsRead = false;
          context.reading = false;
          persist(context);
          emit();
        }
        if (!pendingCount(context)) break;
        context.saving = true;
        const captured = { ...context.record.pending };
        const learned = [...applied(context.record)];
        emit();
        const value = await request('/api/learning', {
          method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ learned, revision: context.record.revision }),
        });
        if (!active(context)) break;
        acceptRemote(context, value);
        for (const [id, intent] of Object.entries(captured)) {
          if (compare(intent, context.record.acknowledged[id]) > 0) context.record.acknowledged[id] = { clock: intent.clock, writer: intent.writer };
        }
        if (context.useJournal) {
          for (const entry of journalEntries(context).entries) {
            if (captured[entry.id] && compare(entry, captured[entry.id]) <= 0) {
              try { storage.removeItem(entry.key); } catch { /* Acknowledgements also suppress a stale journal. */ }
            }
          }
        }
        context.record = mergeRecords(context.record, emptyRecord());
        persist(context);
        context.saving = false;
        conflicts = 0;
        emit();
      } catch (error) {
        if (!active(context)) break;
        context.reading = false;
        context.saving = false;
        if (error.status === 409 && error.code === 'REVISION_CONFLICT' && ++conflicts <= 5) {
          try { acceptRemote(context, error.snapshot); persist(context); emit(); continue; }
          catch { /* Preserve all local intents if a conflict response is malformed. */ }
        }
        if (error.status === 401 && ['AUTH_REQUIRED', 'ACCOUNT_CHANGED'].includes(error.code)) {
          // Re-check identity before making any more requests. The expected-user
          // header prevents old-account intents being written into a new account.
          context.error = '登录状态已变化，正在重新确认账户。';
          emit();
          const checked = await checkSession();
          if (checked && current !== context) {
            if (current) await run(current);
            return getSnapshot();
          }
        }
        if (active(context)) {
          context.needsRead = true;
          context.error = error.status === 409 ? '其他页面正在更新学习记录，已保留你的修改，请重试。' : error.message || '网络连接失败，已保留待同步修改，请重试。';
          persist(context);
          emit();
        }
        break;
      }
    }
    return getSnapshot();
  }
  function run(context = current) {
    if (destroyed || !context || !active(context)) return Promise.resolve(getSnapshot());
    if (checking) return Promise.resolve(checkPromise).then(() => run(current));
    if (context.worker) return context.worker;
    if (context.error) return Promise.resolve(getSnapshot());
    context.worker = work(context).finally(() => {
      context.worker = null;
      if (active(context) && !context.error && (context.needsRead || pendingCount(context))) void run(context);
    });
    return context.worker;
  }
  async function refresh() {
    if (destroyed) return getSnapshot();
    readGuest();
    if (current) { pullCache(current); current.error = ''; current.needsRead = true; }
    if (await checkSession()) return run(current);
    return getSnapshot();
  }
  function toggle(id) {
    if (destroyed || typeof id !== 'string' || !valid.has(id)) return Promise.resolve(getSnapshot());
    if (!current) {
      readGuest();
      guest.has(id) ? guest.delete(id) : guest.add(id);
      try { storage.setItem(GUEST_KEY, JSON.stringify([...guest])); guestSaved = true; }
      catch { guestSaved = false; }
      emit();
      return Promise.resolve(getSnapshot());
    }
    pullCache(current);
    addIntent(current, id, !applied(current.record).has(id));
    if (current.error) { current.error = ''; current.needsRead = true; }
    persist(current);
    emit();
    return run(current);
  }
  function importGuest() {
    if (destroyed || !current) return Promise.resolve(getSnapshot());
    readGuest();
    pullCache(current);
    for (const id of visible(guest)) if (!applied(current.record).has(id)) addIntent(current, id, true);
    if (current.error) { current.error = ''; current.needsRead = true; }
    persist(current);
    emit();
    return run(current);
  }
  function onStorage(event) {
    if (destroyed) return;
    if (event.key === null || event.key === GUEST_KEY) { readGuest(); emit(); }
    if (current && (event.key === null || event.key === current.key || event.key?.startsWith(current.journalPrefix))) {
      pullCache(current);
      current.needsRead = true;
      emit();
      void run(current);
    }
  }
  const eventTarget = typeof window !== 'undefined' ? window : null;
  eventTarget?.addEventListener('storage', onStorage);
  return {
    getSnapshot, initialize: refresh, refresh, retry: refresh, toggle, importGuest,
    destroy() { destroyed = true; checkSerial += 1; eventTarget?.removeEventListener('storage', onStorage); },
  };
}
