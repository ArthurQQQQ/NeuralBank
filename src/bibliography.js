import { foundationBibliography } from './bibliography-foundation.js';
import { expandedBibliography } from './bibliography-expanded.js';
import { citationSnapshots } from './citation-snapshots.js';
import { citationSupplements } from './citation-supplements.js';

// Keep one series name for filtering while retaining the source's full
// proceedings title (including historical names, volume and edition) for citing.
function venueSeries(name) {
  if (/\bICLR\b/.test(name)) return 'International Conference on Learning Representations (ICLR)';
  if (/\b(?:NeurIPS|NIPS)\b/.test(name)) return 'Advances in Neural Information Processing Systems (NeurIPS)';
  if (/\bICML\b/.test(name)) return 'International Conference on Machine Learning (ICML)';
  if (/\bCVPR\b/.test(name)) return 'Conference on Computer Vision and Pattern Recognition (CVPR)';
  if (/\bMICCAI\b/.test(name)) return 'Medical Image Computing and Computer-Assisted Intervention (MICCAI)';
  if (/^Conference on Empirical Methods in Natural Language Processing/.test(name)) return 'Conference on Empirical Methods in Natural Language Processing (EMNLP)';
  if (/^arXiv\b/i.test(name)) return 'arXiv';
  return name;
}
export const bibliography = Object.fromEntries(Object.entries({ ...foundationBibliography, ...expandedBibliography }).map(([id, record]) => {
  const venue = record.primaryPaper.venue;
  return [id, { ...record, primaryPaper: { ...record.primaryPaper, venue: { ...venue, name: venueSeries(venue.name), publicationTitle: venue.name } } }];
}));
export const publicationTypes = ['conference', 'journal', 'preprint', 'technical-report', 'book'];
const clone = value => JSON.parse(JSON.stringify(value));
const https = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
};
const text = value => typeof value === 'string' && value.trim().length > 0;
const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function paperKey(paper) {
  return paper.doi ? `doi:${paper.doi.toLowerCase()}` : paper.arxivId ? `arxiv:${paper.arxivId.replace(/v\d+$/, '')}` : `title:${normalize(paper.title)}`;
}

export function validateBibliography(records, models) {
  const ids = new Set(models.map(model => model.id));
  if (Object.keys(records).length !== ids.size || Object.keys(records).some(id => !ids.has(id))) throw new Error('Bibliography must cover each catalog ID exactly once.');
  for (const model of models) {
    const record = records[model.id], paper = record?.primaryPaper, venue = paper?.venue;
    if (!paper || !text(paper.title) || !Array.isArray(paper.authors) || !paper.authors.length || !paper.authors.every(text) || !Number.isInteger(paper.year) || !https(paper.url)) throw new Error(`${model.id}: incomplete primary paper.`);
    if (!venue || !text(venue.name) || (venue.publicationTitle !== undefined && !text(venue.publicationTitle)) || !Number.isInteger(venue.year) || paper.year !== venue.year || !publicationTypes.includes(venue.type) || !https(venue.url)) throw new Error(`${model.id}: selected publication year and venue must agree.`);
    if (paper.doi !== null && (typeof paper.doi !== 'string' || !/^10\.\d{4,9}\/\S+$/.test(paper.doi))) throw new Error(`${model.id}: invalid publication DOI.`);
    if (paper.arxivId !== null && (typeof paper.arxivId !== 'string' || !/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/.test(paper.arxivId))) throw new Error(`${model.id}: invalid arXiv identifier.`);
    if (!Array.isArray(record.repositories) || record.repositories.some(repo => !https(repo.url) || !text(repo.label) || !text(repo.scope) || !['author-official', 'reference-implementation', 'third-party'].includes(repo.relationship))) throw new Error(`${model.id}: repository ownership and scope must be explicit.`);
    const citation = record.citation;
    if (!citation || citation.scope !== 'primary-paper' || !text(citation.note)) throw new Error(`${model.id}: citation scope is required.`);
    if (citation.count === null) {
      if ([citation.source, citation.url, citation.retrievedAt].some(value => value !== null)) throw new Error(`${model.id}: unknown citation counts cannot carry a fake snapshot.`);
    } else if (!Number.isSafeInteger(citation.count) || citation.count < 0 || !['OpenAlex', 'Semantic Scholar', 'Crossref'].includes(citation.source) || !https(citation.url) || !Number.isFinite(Date.parse(citation.retrievedAt))) throw new Error(`${model.id}: citation counts require a source and retrieval timestamp.`);
  }
}

export function venueLabel(paper) {
  const venue = paper.venue;
  return `${venue.name} ${venue.year}`;
}

const tex = value => String(value).replace(/[\\{}%&#_$]/g, character => ({ '\\':'\\textbackslash{}', '{':'\\{', '}':'\\}', '%':'\\%', '&':'\\&', '#':'\\#', '_':'\\_', '$':'\\$' }[character]));

export function formatPaperCitation(paper) {
  return `${paper.authors.join(', ')} (${paper.year}). ${paper.title}. ${paper.venue.publicationTitle || paper.venue.name}.${paper.doi ? ` https://doi.org/${paper.doi}` : ` ${paper.url}`}`;
}

export function paperBibtex(id, paper) {
  const type = { conference: 'inproceedings', journal: 'article', preprint: 'misc', 'technical-report': 'techreport', book: 'incollection' }[paper.venue.type];
  const fields = [
    ['title', `{${tex(paper.title)}}`], ['author', paper.authors.map(tex).join(' and ')],
    ['year', paper.venue.type === 'preprint' ? paper.year : paper.venue.year], ['url', paper.url],
  ];
  const publicationTitle = paper.venue.publicationTitle || paper.venue.name;
  if (paper.venue.type === 'conference' || paper.venue.type === 'book') fields.push(['booktitle', tex(publicationTitle)]);
  if (paper.venue.type === 'journal') fields.push(['journal', tex(publicationTitle)]);
  if (paper.venue.type === 'technical-report') fields.push(['institution', tex(publicationTitle)]);
  if (paper.doi) fields.push(['doi', paper.doi]);
  if (paper.arxivId) fields.push(['eprint', paper.arxivId], ['archivePrefix', 'arXiv']);
  return `@${type}{neuralbank_${id.replaceAll('-', '_')}_${paper.venue.year},\n${fields.map(([key, value]) => `  ${key} = {${value}}`).join(',\n')}\n}`;
}

export function getBibliography(id) {
  const record = bibliography[id];
  if (!record) throw new Error(`Missing bibliography for ${id}.`);
  const snapshot = [citationSnapshots[id], citationSupplements[id]].find(item => item?.paperKey === paperKey(record.primaryPaper));
  const matches = Boolean(snapshot);
  const versionNote = record.citation.note
    .replace(/^尚未核验可追溯的引用次数；null 表示未知，不是 0。统计对象为此处选定的主论文，不是整个架构家族。/, '')
    .replace(/^尚未收录可核对的引用次数快照；null 表示未知，并非零。/, '')
    .replace(/^尚未收录可核对的引用次数快照。/, '');
  const citation = matches ? { ...snapshot, note: [versionNote, snapshot.note].filter(Boolean).join(' ') } : record.citation;
  const arxivYear = /^(\d{2})\d{2}\./.exec(record.primaryPaper.arxivId || '');
  const primaryPaper = { ...record.primaryPaper, preprintYear: record.primaryPaper.preprintYear ?? (arxivYear ? 2000 + Number(arxivYear[1]) : null) };
  return clone({ ...record, primaryPaper, citation, citationText: formatPaperCitation(primaryPaper), bibtex: paperBibtex(id, primaryPaper) });
}
