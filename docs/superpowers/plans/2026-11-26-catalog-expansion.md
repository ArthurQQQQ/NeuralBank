# Catalog expansion implementation plan

**Goal:** Expand the researched learning library from 26 to 64 architectures and verify the existing contribution flow.

**Architecture:** Two content-only ES modules feed the existing model registry. Dedicated diagrams preserve current interaction semantics. Root integration owns taxonomy, generated schema, documentation, verification, and publication.

**Tech stack:** Vanilla JavaScript, original SVG, Node built-in tests, existing GitHub Pages deployment.

**Spec:** `docs/superpowers/specs/2026-11-26-catalog-expansion-design.md`.

- [x] Test JSON import, size limits, edit races, invalid JSON, and static mode's honest PR flow. Do not publish synthetic scores.
- [x] Research and implement 19 foundations/vision/attention entries in `src/expanded-core-models.js`.
- [x] Research and implement 19 sequence/graph/generative/memory entries in `src/expanded-specialist-models.js`.
- [x] Implement 38 mechanism-specific diagrams in `src/expanded-diagrams.js`, dispatched by `src/diagrams.js`.
- [x] Integrate models into `src/models.js`, seven families, ordered study paths, and the downloaded JSON schema. Preserve existing IDs.
- [ ] Strengthen catalog checks for family membership/order coverage, source links, module mappings, and a prerequisite DAG. Validate that new entries appear in submission templates/schema.
- [x] Review all additions and diagram alignment; run tests, fixture checks, catalog validation, and server/static builds.
- [x] Prepare the verified public update for the existing repository and Pages workflow. Confirm deployment status and the public artifact before reporting publication.

## Verification

- All 69 automated tests and both submission fixtures passed.
- Actual local HTTP checks covered valid metadata, score/protocol/JSON/size rejection, pending unverified storage, deduplication, and a feed without private identity. The synthetic local QA record was removed.
- The public contribution page successfully imported the fictional JSON fixture. A passing browser check enabled the PR handoff; editing the score to 101 invalidated the check, then produced `/score/value` and kept handoff disabled. The draft was reset afterward; no fictional score or PR was published.
- Independent review confirmed the original 26 content records and all legacy mastery IDs remain intact. The schema includes all 64 IDs in both kinds. All 38 new diagrams were rendered and visually reviewed; the WaveNet causal edge and graph classification heads were corrected.
- Final Worker and static builds passed with 64 models, seven families, and the existing 15 published-paper results. The refreshed local server accepts model-edit checks for GCN and serves the expanded schema.
