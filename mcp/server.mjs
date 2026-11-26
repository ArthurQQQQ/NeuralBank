#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer, ResourceTemplate, ResourceNotFoundError } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import {
  listCatalogCategories,
  searchArchitectures,
  getArchitecture,
  compareArchitectures,
  suggestArchitectures,
  CatalogQueryError,
} from '../src/architecture-catalog.js';

const MAX_RESULT_BYTES = 262_144;
const SOURCE_REPOSITORY = 'https://github.com/ArthurQQQQ/NeuralBank';
const READ_ONLY = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

function serialize(value) {
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json, 'utf8') > MAX_RESULT_BYTES) {
    const error = new Error('Result exceeds 256 KiB. Use a smaller limit, narrower filters, or read one model resource. Sources and limitations are never silently truncated.');
    error.code = 'RESULT_TOO_LARGE';
    throw error;
  }
  return json;
}

/** A fresh SDK instance serves either modern discovery or legacy initialize. */
export function createNeuralBankServer() {
  const taxonomy = { ...listCatalogCategories(), sourceRepository: SOURCE_REPOSITORY };
  const axes = taxonomy.axes;
  const modelIds = [...new Set(taxonomy.categories.flatMap(category => category.architectureIds))].sort();
  const id = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a canonical architecture ID from search_architectures.');
  const offset = z.number().int().min(0).max(1_000_000).optional();
  const enumList = (values, description) => z.array(z.enum(values)).max(Math.min(values.length, 32)).describe(description).optional();
  const server = new McpServer({ name: 'neuralbank', version: '1.0.0' }, {
    instructions: 'Read-only public neural network architecture catalog. Begin with list_categories for supported filter IDs, then search or suggest, and inspect get_architecture or compare_architectures. Preserve references, limitations and caveats when presenting findings. Suggestions are deterministic constraint matches, not a performance ranking or proof of scientific novelty. Results describe teaching configurations, not downloadable trained weights. This server has no account, personal progress, submission, execution, training, or remote-fetch capabilities.',
  });

  const tool = (name, description, inputSchema, query) => {
    server.registerTool(name, { description, inputSchema, annotations: READ_ONLY }, async args => {
      try {
        const output = { ...query(args), sourceRepository: SOURCE_REPOSITORY };
        return { content: [{ type: 'text', text: serialize(output) }], structuredContent: output };
      } catch (error) {
        const known = error instanceof CatalogQueryError || error?.code === 'RESULT_TOO_LARGE';
        const output = {
          schemaVersion: 1,
          sourceRepository: SOURCE_REPOSITORY,
          error: {
            code: known ? error.code : 'CATALOG_ERROR',
            message: known ? error.message : 'The public catalog could not be read.',
            ...(error?.path === undefined ? {} : { path: error.path }),
          },
          caveats: taxonomy.caveats,
        };
        if (!known) console.error('[neuralbank] Catalog query failed.');
        return { isError: true, content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
      }
    });
  };

  tool('list_categories',
    'List NeuralBank architecture families, their member IDs, all valid task/mechanism/modality/output/trait/entity/level filter IDs and labels, and catalog caveats. Use these IDs in search and suggestions.',
    z.object({}).strict(),
    () => taxonomy);

  tool('search_architectures',
    'Search the curated public catalog by name, mechanism or teaching text and optional exact filters. Arrays are AND filters; axes are also AND. Order is stable canonical ID order, never a performance ranking. Each item includes primary references and limitations. Use offset=nextOffset to continue. Default limit 12; maximum 30.',
    z.object({
      query: z.string().trim().max(300).optional(),
      category: z.enum(taxonomy.categories.map(category => category.id)).optional(),
      task: z.enum(axes.supportedTasks).optional(),
      level: z.enum(axes.levels).optional(),
      entityType: z.enum(axes.entityTypes).optional(),
      mechanisms: enumList(axes.mechanisms, 'Require all listed mechanisms.'),
      inputModalities: enumList(axes.inputModalities, 'Require all listed input modalities.'),
      outputTypes: enumList(axes.outputTypes, 'Require all listed output types.'),
      traits: enumList(axes.traits, 'Require all listed qualitative traits; these are curated tags, not measured guarantees.'),
      limit: z.number().int().min(1).max(30).optional(),
      offset,
    }).strict(),
    args => searchArchitectures({ ...args, limit: args.limit ?? 12 }));

  tool('get_architecture',
    'Read one architecture by canonical ID: teaching configuration, module/layer explanations, shapes, formulas, metadata, limitations, prerequisites, related models, benchmark associations and original source citations. Teaching sizes are not claims about all real implementations.',
    z.object({ id }).strict(),
    args => getArchitecture(args.id));

  tool('compare_architectures',
    'Compare 2–6 distinct canonical architecture IDs by mechanisms, tasks, modalities, qualitative tradeoffs and limitations, retaining source citations. This is a structural comparison, not a leaderboard; teaching configurations and benchmark settings can differ.',
    z.object({ ids: z.array(id).min(2).max(6).refine(ids => new Set(ids).size === ids.length, 'Architecture IDs must be unique; remove duplicates.') }).strict(),
    args => compareArchitectures(args.ids));

  tool('suggest_architectures',
    'Find architecture candidates matching a supported task and explicit qualitative constraints. Return match reasons, limitations and citations in stable ID order. Required tag arrays are exact AND filters; entityTypes is an allowlist; any matching excluded trait/mechanism removes a candidate. No measured best-model ranking, novelty guarantee, hardware guarantee or automatic experiment. Empty results mean the curated tags found no match. Default limit 6; maximum 12.',
    z.object({
      task: z.enum(axes.supportedTasks),
      constraints: z.object({
        requireTraits: enumList(axes.traits, 'Require all these qualitative traits.'),
        excludeTraits: enumList(axes.traits, 'Exclude candidates with any of these traits.'),
        requireMechanisms: enumList(axes.mechanisms, 'Require all these mechanisms.'),
        excludeMechanisms: enumList(axes.mechanisms, 'Exclude candidates with any of these mechanisms.'),
        inputModalities: enumList(axes.inputModalities, 'Require all these input modalities.'),
        outputTypes: enumList(axes.outputTypes, 'Require all these output types.'),
        entityTypes: enumList(axes.entityTypes, 'Allow only these entity types.'),
      }).strict().optional(),
      limit: z.number().int().min(1).max(12).optional(),
      offset,
    }).strict(),
    args => suggestArchitectures({ ...args, limit: args.limit ?? 6 }));

  const resourceResult = (uri, data) => ({
    contents: [{ uri: uri.href, mimeType: 'application/json', text: serialize({ ...data, sourceRepository: SOURCE_REPOSITORY }) }],
  });
  server.registerResource('catalog', 'neuralbank://catalog', {
    title: 'NeuralBank public architecture index',
    description: 'Index of public architecture IDs and per-model resource URIs, with original references and limitations. Read individual models for full teaching content; use paginated search for filtered results.',
    mimeType: 'application/json',
  }, uri => resourceResult(uri, {
    schemaVersion: 1,
    sourceRepository: SOURCE_REPOSITORY,
    total: modelIds.length,
    items: modelIds.map(modelId => {
      const { item } = getArchitecture(modelId);
      return {
        id: item.id,
        name: item.name,
        fullName: item.fullName,
        category: item.category,
        resourceUri: `neuralbank://model/${item.id}`,
        references: item.references,
        limitations: item.limitations,
      };
    }),
    caveats: taxonomy.caveats,
  }));
  server.registerResource('taxonomy', 'neuralbank://taxonomy', {
    title: 'NeuralBank families and filter vocabulary',
    description: 'Architecture categories, member IDs, supported axes and human-readable labels, with caveats about the curated taxonomy.',
    mimeType: 'application/json',
  }, uri => resourceResult(uri, taxonomy));

  server.registerResource('architecture', new ResourceTemplate('neuralbank://model/{id}', {
    list: () => ({ resources: modelIds.map(modelId => ({
      name: modelId,
      uri: `neuralbank://model/${modelId}`,
      mimeType: 'application/json',
    })) }),
    complete: { id: value => modelIds.filter(modelId => modelId.startsWith(value)).slice(0, 100) },
  }), {
    title: 'NeuralBank architecture',
    description: 'Full public teaching model, source citations, limitations, prerequisites and related architectures for a canonical ID.',
    mimeType: 'application/json',
  }, (uri, variables) => {
    const modelId = variables.id;
    if (typeof modelId !== 'string' || !modelIds.includes(modelId) || uri.href !== `neuralbank://model/${modelId}`) {
      throw new ResourceNotFoundError(uri.href, 'Architecture resource not found. Use search_architectures to obtain a canonical ID.');
    }
    return resourceResult(uri, getArchitecture(modelId));
  });
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  serveStdio(createNeuralBankServer, {
    onerror: () => { console.error('[neuralbank] MCP transport error.'); },
  });
}
