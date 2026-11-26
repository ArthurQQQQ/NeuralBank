#!/usr/bin/env node
// Explicit public-metadata refresh. No account or private repository data is read.
import { writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bibliography, paperKey } from '../src/bibliography.js';
import { citationSnapshots } from '../src/citation-snapshots.js';

const normalizeTitle = value => String(value).normalize('NFKD').replaceAll('×', 'x').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const normalizeAuthor = value => String(value).normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function matchCitationWork(paper, candidates, identifierMatched = false) {
  const matching = candidates.filter(work => {
    if (!/^https:\/\/openalex\.org\/W\d+$/.test(work.id || '') || !Number.isSafeInteger(work.cited_by_count) || work.cited_by_count < 0) return false;
    if (normalizeTitle(work.title) !== normalizeTitle(paper.title)) return false;
    const arxivYear = /^(\d{2})\d{2}\./.exec(paper.arxivId || '');
    const earliest = Math.min(paper.year, paper.preprintYear || paper.year, arxivYear ? 2000 + Number(arxivYear[1]) : paper.year);
    if (!Number.isInteger(work.publication_year) || work.publication_year < earliest - 1 || work.publication_year > paper.venue.year + 1) return false;
    return identifierMatched || paper.authors.some(name => (work.authorships || []).some(row => normalizeAuthor(row.author?.display_name) === normalizeAuthor(name)));
  });
  const unique = [...new Map(matching.map(work => [work.id, work])).values()];
  return unique.length === 1 ? unique[0] : null;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log('node scripts/update-citations.mjs [--output src/citation-snapshots.js]\nFetches OpenAlex public records, requires exact paper matching, and retains source/time/version evidence. No citation ranking.'); return; }
  const outputAt = args.indexOf('--output');
  const output = resolve(outputAt >= 0 ? args[outputAt + 1] : 'src/citation-snapshots.js');
  if (!output.endsWith('.js')) throw new Error('Snapshot output must be a JavaScript data module.');
  const updated = {};
  const cache = new Map();
  const fields = 'id,doi,title,cited_by_count,publication_year,authorships';
  async function request(url) {
    const response = await fetch(url, { headers: { 'user-agent': 'NeuralBank/1.0 (https://github.com/ArthurQQQQ/NeuralBank)' }, signal: AbortSignal.timeout(20000) });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`OpenAlex returned HTTP ${response.status}.`);
    const data = await response.json();
    return data.results || [data];
  }
  async function lookup(paper) {
    const key = paperKey(paper);
    if (cache.has(key)) return cache.get(key);
    const operation = (async () => {
      let work;
      if (paper.doi) work = matchCitationWork(paper, await request(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(paper.doi)}?select=${fields}`), true);
      if (!work && paper.arxivId) {
        const doi = `10.48550/arxiv.${paper.arxivId.replace(/v\d+$/, '')}`;
        work = matchCitationWork(paper, await request(`https://api.openalex.org/works?filter=${encodeURIComponent(`doi:${doi}`)}&select=${fields}&per_page=5`), true);
      }
      if (!work) work = matchCitationWork(paper, await request(`https://api.openalex.org/works?search=${encodeURIComponent(paper.title)}&select=${fields}&per_page=5`));
      if (!work) return null;
      return {
        paperKey: key, count: work.cited_by_count, source: 'OpenAlex', url: work.id,
        retrievedAt: new Date().toISOString(), scope: 'primary-paper',
        workId: work.id, matchedTitle: work.title, matchedDoi: work.doi || null,
        note: 'OpenAlex 收录记录的被引次数快照；数据库可能合并预印本与发表版本。不同数据库覆盖不同，不是模型性能或论文质量分数。',
      };
    })();
    cache.set(key, operation);
    return operation;
  }
  let cursor = 0;
  const entries = Object.entries(bibliography).sort(([a], [b]) => a.localeCompare(b));
  async function worker() {
    while (cursor < entries.length) {
      const [id, record] = entries[cursor++];
      try {
        const result = await lookup(record.primaryPaper);
        if (result) { updated[id] = result; console.log(`${id}: ${result.count} (OpenAlex)`); }
        else if (citationSnapshots[id]?.paperKey === paperKey(record.primaryPaper)) { updated[id] = citationSnapshots[id]; console.log(`${id}: retained previous dated snapshot`); }
        else console.log(`${id}: no unambiguous match; count remains unknown`);
      } catch (error) {
        if (citationSnapshots[id]?.paperKey === paperKey(record.primaryPaper)) updated[id] = citationSnapshots[id];
        console.log(`${id}: ${error.message} ${updated[id] ? 'Previous snapshot retained.' : 'Count remains unknown.'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  await Promise.all([worker(), worker()]);
  const ordered = Object.fromEntries(Object.entries(updated).sort(([a], [b]) => a.localeCompare(b)));
  const source = `// Public OpenAlex citation snapshots. Refresh explicitly with scripts/update-citations.mjs.\n// Exact paper matching; missing records remain unknown, never zero-filled.\nexport const citationSnapshots = ${JSON.stringify(ordered, null, 2)};\n`;
  await writeFile(output + '.tmp', source); await rename(output + '.tmp', output);
  console.log(`Saved ${Object.keys(ordered).length}/${entries.length} cited-by snapshots; all counts retain source, exact work, and retrieval time.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
