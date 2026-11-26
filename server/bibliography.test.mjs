import test from 'node:test';
import assert from 'node:assert/strict';
import { models } from '../src/models.js';
import { benchmarks, benchmarkResults } from '../src/benchmarks.js';
import { bibliography, getBibliography, validateBibliography, paperKey } from '../src/bibliography.js';
import { getArchitecture, listCategories, searchArchitectures, compareArchitectures, suggestArchitectures } from '../src/architecture-catalog.js';
import { matchCitationWork } from '../scripts/update-citations.mjs';

test('all 64 entries have selected-version papers, source-qualified repositories and valid snapshots', () => {
  const records = Object.fromEntries(models.map(model => [model.id, getBibliography(model.id)]));
  assert.doesNotThrow(() => validateBibliography(bibliography, models));
  assert.doesNotThrow(() => validateBibliography(records, models));
  assert.equal(Object.keys(records).length, 64);
  for (const record of Object.values(records)) {
    assert.equal(record.primaryPaper.year, record.primaryPaper.venue.year);
    assert(record.citationText.includes(record.primaryPaper.title));
    assert(record.bibtex.includes(record.primaryPaper.title.replaceAll('&', '\\&')));
    if (record.citation.count !== null) assert.equal(record.citation.paperKey, paperKey(record.primaryPaper));
  }
});

test('unknown cited-by values stay null while a real zero requires complete provenance', () => {
  for (const id of ['gin', 'gpt', 'rbf']) {
    const value = getBibliography(id).citation;
    assert.equal(value.count, null);
    assert.equal(value.source, null);
    assert.equal(value.retrievedAt, null);
  }
  const records = structuredClone(bibliography);
  records.perceptron.citation.count = 0;
  assert.throws(() => validateBibliography(records, models), /source and retrieval timestamp/);
  Object.assign(records.perceptron.citation, { source:'OpenAlex', url:'https://openalex.org/W1', retrievedAt:'2026-11-26T00:00:00Z' });
  assert.doesNotThrow(() => validateBibliography(records, models));
});

test('formal publication years do not erase historical or preprint milestones', () => {
  const resnet = getArchitecture('resnet').item;
  assert.equal(resnet.year, 2015);
  assert.equal(resnet.primaryPaper.year, 2016);
  assert.equal(resnet.primaryPaper.venue.type, 'conference');
  assert.match(resnet.yearNote, /2015|预印本/);
  assert.match(resnet.bibtex, /year = \{2016\}/);
  assert.equal(getBibliography('alexnet').repositories[0].relationship, 'reference-implementation');
  assert.equal(getBibliography('perceptron').repositories.length, 0);
});

test('every discovery response retains paper, code relationship, citation and exact benchmark evidence', () => {
  const detail = getArchitecture('resnet').item;
  const compact = searchArchitectures({query:'Deep Residual Learning',limit:10}).items.find(item=>item.id==='resnet');
  const compared = compareArchitectures(['resnet','vit']).items.find(item=>item.id==='resnet');
  const suggested = suggestArchitectures({task:'vision',limit:20}).items.find(item=>item.architecture.id==='resnet').architecture;
  for (const row of [detail,compact,compared,suggested]) {
    assert(row.primaryPaper.title && row.citationText && row.bibtex);
    assert(Array.isArray(row.repositories));
    assert.equal(row.yearNote, models.find(model=>model.id==='resnet').yearNote);
    assert.equal(row.benchmarkResults.length, benchmarkResults.filter(result=>result.modelId==='resnet').length);
    for (const result of row.benchmarkResults) {
      const original = benchmarkResults.find(candidate=>candidate.id===result.id);
      const definition = benchmarks.find(candidate=>candidate.id===result.benchmarkId);
      assert.equal(result.modelId,'resnet');
      assert.equal(result.value,original.value);
      assert.equal(result.reportedModel,original.reportedModel);
      assert.deepEqual(result.source,original.source);
      assert.deepEqual(result.conditions,original.conditions);
      assert.deepEqual(result.metric,{name:definition.metric,unit:definition.unit,direction:definition.direction});
    }
  }
  assert.deepEqual(getArchitecture('mlp').item.benchmarkResults,[]);
});

test('publication and repository filters are exact, composable and type checked', () => {
  const venues = listCategories().axes.venues;
  const venue = getBibliography('resnet').primaryPaper.venue.name;
  assert(venues.includes(venue));
  const result = searchArchitectures({venue,venueYear:2016,publicationType:'conference',hasRepository:true});
  assert(result.items.some(item=>item.id==='resnet'));
  assert(result.items.every(item=>item.primaryPaper.venue.name===venue && item.primaryPaper.venue.year===2016 && item.repositories.length));
  assert.equal(searchArchitectures({venueYear:2099}).total,0);
  assert(searchArchitectures({hasRepository:false}).items.every(item=>item.repositories.length===0));
  assert.throws(()=>searchArchitectures({venueYear:'2016'}));
  assert.throws(()=>searchArchitectures({hasRepository:'true'}));
  assert.throws(()=>searchArchitectures({venue:'made-up venue'}));
});

test('venue series filters unite editions without losing the original proceedings title', () => {
  const iclr = getBibliography('vit').primaryPaper.venue.name;
  assert.deepEqual(searchArchitectures({venue:iclr,venueYear:2021}).items.map(item=>item.id), ['modern-hopfield','performer','vit']);
  const neurips = getBibliography('transformer').primaryPaper.venue.name;
  assert.deepEqual(searchArchitectures({venue:neurips,venueYear:2017}).items.map(item=>item.id), ['graphsage','transformer','vqvae']);
  assert.match(getBibliography('transformer').citationText, /Systems 30 \(NIPS 2017\)/);
  assert.match(getBibliography('transformer').bibtex, /Systems 30 \(NIPS 2017\)/);
  assert.equal(getBibliography('ntm').primaryPaper.venue.name, getBibliography('wavenet').primaryPaper.venue.name);
});

test('citation matching rejects polluted identifiers, ambiguous records and another publication version', () => {
  const paper={title:'How Powerful are Graph Neural Networks?',authors:['Keyulu Xu'],year:2019,arxivId:'1810.00826',venue:{year:2019}};
  const work={id:'https://openalex.org/W1',title:paper.title,cited_by_count:0,publication_year:2018,authorships:[{author:{display_name:'Keyulu Xu'}}]};
  assert.equal(matchCitationWork(paper,[work],true).cited_by_count,0);
  assert.equal(matchCitationWork(paper,[{...work,title:'Formal Semantics for Kolmogorov-Arnold Network Representations of Operational Games'}],true),null);
  assert.equal(matchCitationWork(paper,[work,{...work,id:'https://openalex.org/W2'}]),null);
  assert.equal(matchCitationWork(paper,[{...work,publication_year:2026}],true),null);
  assert.equal(matchCitationWork(paper,[{...work,cited_by_count:-1}],true),null);
  assert.equal(matchCitationWork(paper,[{...work,cited_by_count:'100'}],true),null);
});
