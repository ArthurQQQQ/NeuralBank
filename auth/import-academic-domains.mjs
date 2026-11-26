#!/usr/bin/env node
/** Preparation only: downloads public, pinned data and writes candidate JSON,
 * or SQL for an explicit human-reviewed manifest. Never connects to a database.
 * SWOT educational-domain data is not a universal university/enrollment registry.
 * Sources/licensing: https://github.com/JetBrains/swot (MIT),
 * https://publicsuffix.org/list/ (MPL-2.0). No source data is executed.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { domainToASCII } from 'node:url';

const SWOT_COMMIT = 'c72dc870cfdc7a84b2bc7cdf0e0230369e134c22';
const SWOT_URL = `https://codeload.github.com/JetBrains/swot/tar.gz/${SWOT_COMMIT}`;
const SWOT_SHA256 = 'c3287216aaeda3f169ddb6d65258438725804f11c20139fe0a58f8fc11be0e1c';
const PSL_URL = 'https://publicsuffix.org/list/public_suffix_list.dat';
const PSL_SHA256 = 'b72c3a0613415f020788337b449d9d6d88b8010cd5798a95ebaf324e42b0e404';
const SHARED_PROVIDERS = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com', 'aol.com', 'qq.com', '163.com', '126.com', 'mail.com', 'gmx.com', 'yandex.com', 'onmicrosoft.com'];
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Candidate JSON: node auth/import-academic-domains.mjs --output candidates.json\nReviewed SQL: node auth/import-academic-domains.mjs --approved reviewed.json --output reviewed.sql\nOptional offline snapshots: --archive swot.tgz --psl public_suffix_list.dat\nSource hashes are pinned; an upstream change fails closed and requires an audited pin update.');
  process.exit(0);
}
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--output', '--approved', '--archive', '--psl'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i]]) throw new Error('Unknown, missing or repeated option; use --help.');
  options[args[i]] = args[i + 1];
}
if (!options['--output']) throw new Error('--output is required; no database is modified.');

async function pinnedBytes(url, file, expectedHash, maxBytes) {
  let bytes;
  if (file) bytes = await readFile(file);
  else {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Public source download failed: ${response.status}`);
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) { await reader.cancel(); throw new Error('Public source exceeds size limit.'); }
      chunks.push(value);
    }
    bytes = Buffer.concat(chunks);
  }
  if (bytes.length > maxBytes || createHash('sha256').update(bytes).digest('hex') !== expectedHash) throw new Error(`Pinned source mismatch: ${url}. Review upstream and update the pin deliberately; do not bypass this check.`);
  return bytes;
}

function normalizeDomain(value) {
  if (typeof value !== 'string' || value !== value.trim() || /[\s/@:*\\]/.test(value) || value.endsWith('.')) return null;
  const domain = domainToASCII(value.toLowerCase());
  if (!domain || domain.length > 253 || !domain.includes('.') || domain.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  return domain;
}
const under = (domain, parent) => domain === parent || domain.endsWith(`.${parent}`);
function tarFiles(archive) {
  const tar = gunzipSync(archive, { maxOutputLength: 100 * 1024 * 1024 });
  const entries = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').split('\0')[0];
    const prefix = header.subarray(345, 500).toString('utf8').split('\0')[0];
    const path = prefix ? `${prefix}/${name}` : name;
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0/g, '').trim();
    if (!/^[0-7]+$/.test(sizeText)) throw new Error('Unsupported archive size header.');
    const size = Number.parseInt(sizeText, 8);
    const dataStart = offset + 512;
    if (!Number.isSafeInteger(size) || dataStart + size > tar.length || path.split('/').includes('..') || path.startsWith('/')) throw new Error('Unsafe or truncated source archive.');
    // Read regular files in memory only. Never extract paths, links or execute data.
    const type = String.fromCharCode(header[156]);
    if (type === '0' || type === '\0') entries.set(path, tar.subarray(dataStart, dataStart + size).toString('utf8'));
    else if (type === 'g') {
      if (tar.subarray(dataStart, dataStart + size).toString('utf8') !== `52 comment=${SWOT_COMMIT}\n`) throw new Error('Unexpected global archive metadata.');
    } else if (type !== '5') throw new Error(`Unsupported archive entry type ${type}; review the pinned source.`);
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

const [archive, pslBytes] = await Promise.all([
  pinnedBytes(SWOT_URL, options['--archive'], SWOT_SHA256, 8 * 1024 * 1024),
  pinnedBytes(PSL_URL, options['--psl'], PSL_SHA256, 2 * 1024 * 1024),
]);
const exact = new Set();
const wildcards = new Set();
const exceptions = new Set();
for (const raw of pslBytes.toString('utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('//')) continue;
  if (line.startsWith('!')) exceptions.add(domainToASCII(line.slice(1)));
  else if (line.startsWith('*.')) wildcards.add(domainToASCII(line.slice(2)));
  else exact.add(domainToASCII(line));
}
function isPublicSuffix(domain) {
  if (exceptions.has(domain)) return false;
  if (exact.has(domain)) return true;
  const labels = domain.split('.');
  return labels.length === 1 || wildcards.has(labels.slice(1).join('.'));
}
const files = tarFiles(archive);
const prefix = `swot-${SWOT_COMMIT}/lib/domains/`;
const abused = new Set((files.get(`${prefix}abused.txt`) || '').split(/\r?\n/).map(line => line.trim().toLowerCase()).filter(line => line && !line.startsWith('#')));
if (abused.size < 10) throw new Error('Pinned SWOT abuse list is missing.');
const candidates = new Map();
for (const [path, text] of files) {
  if (!path.startsWith(prefix) || !path.endsWith('.txt') || path === `${prefix}abused.txt`) continue;
  const relative = path.slice(prefix.length, -4);
  const domain = normalizeDomain(relative.split('/').reverse().join('.'));
  if (!domain || isPublicSuffix(domain) || SHARED_PROVIDERS.some(root => under(domain, root)) || [...abused].some(root => under(domain, root))) continue;
  const institution = text.split(/\r?\n/).find(line => line.trim() && !line.startsWith('.'))?.trim();
  if (!institution || institution.length < 2 || institution.length > 300) continue;
  candidates.set(domain, { domain, institution, suggestedSubdomains: true });
}
if (candidates.size < 1000) throw new Error('Unexpectedly small candidate list; review source format.');
const source = { swotCommit: SWOT_COMMIT, swotSha256: SWOT_SHA256, pslSha256: PSL_SHA256 };
if (!options['--approved']) {
  await writeFile(options['--output'], JSON.stringify({ schemaVersion: 1, purpose: 'UNREVIEWED_CANDIDATES_NOT_AUTHORIZATION', source, warning: 'Educational institutions are not necessarily universities. Human review with official evidence is required; this file enables no login domains.', domains: [...candidates.values()].sort((a, b) => a.domain.localeCompare(b.domain)) }, null, 2) + '\n', { flag: 'wx' });
  console.log(`Wrote ${candidates.size} unapproved educational-domain candidates. No database was contacted.`);
} else {
  const approved = JSON.parse(await readFile(options['--approved'], 'utf8'));
  if (approved.schemaVersion !== 1 || !Array.isArray(approved.domains) || !approved.domains.length || approved.domains.length > 50000) throw new Error('Reviewed manifest needs schemaVersion:1 and a nonempty domains array.');
  const quote = value => `'${String(value).replace(/'/g, "''")}'`;
  const seen = new Set();
  const rows = approved.domains.map(item => {
    const domain = normalizeDomain(item.domain);
    let evidence;
    try { evidence = new URL(item.evidenceUrl); } catch { throw new Error('Reviewed institution evidenceUrl must be HTTPS.'); }
    if (!domain || item.domain !== domain || !candidates.has(domain) || seen.has(domain) || typeof item.allowSubdomains !== 'boolean' || typeof item.institution !== 'string' || item.institution.trim().length < 2 || item.institution.length > 300 || typeof item.reviewedBy !== 'string' || item.reviewedBy.trim().length < 2 || item.reviewedBy.length > 100 || !/^\d{4}-\d{2}-\d{2}T/.test(item.reviewedAt || '') || !Number.isFinite(Date.parse(item.reviewedAt)) || evidence.protocol !== 'https:' || evidence.username || evidence.password) throw new Error(`Invalid, duplicate, blocked or unreviewed candidate: ${item.domain}`);
    seen.add(domain);
    return `(${quote(domain)}, ${quote(item.institution.trim())}, ${item.allowSubdomains}, ${quote(evidence.href)}, ${quote(item.reviewedBy.trim())}, ${quote(new Date(item.reviewedAt).toISOString())}, ${quote(`JetBrains/swot@${SWOT_COMMIT}`)})`;
  });
  const blocked = [...abused].filter(domain => /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain)).sort().map(domain => `(${quote(domain)}, 'SWOT abused-domain list', ${quote(`JetBrains/swot@${SWOT_COMMIT}`)})`);
  const sql = `-- Prepared from pinned public data. Review before applying as database administrator.\n-- Academic approval is a maintainer decision, not a claim made by SWOT.\nbegin;\ninsert into neuralbank_private.blocked_email_domains(domain, reason, source_ref) values\n${blocked.join(',\n')}\non conflict (domain) do update set reason = excluded.reason, source_ref = excluded.source_ref;\ninsert into neuralbank_private.academic_email_domains(domain, institution, allow_subdomains, evidence_url, reviewed_by, reviewed_at, source_ref) values\n${rows.join(',\n')}\non conflict (domain) do update set institution = excluded.institution, allow_subdomains = excluded.allow_subdomains, evidence_url = excluded.evidence_url, reviewed_by = excluded.reviewed_by, reviewed_at = excluded.reviewed_at, source_ref = excluded.source_ref, enabled = true;\ncommit;\n`;
  await writeFile(options['--output'], sql, { flag: 'wx' });
  console.log(`Prepared SQL for ${rows.length} explicitly reviewed institution domains and ${blocked.length} abuse blocks. No database was contacted.`);
}
