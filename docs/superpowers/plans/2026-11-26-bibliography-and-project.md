# Bibliography and backend implementation plan

**Goal:** Make paper/venue/citation/repository/benchmark evidence clear in the UI and MCP, while continuing the approved free Supabase project setup.

**Architecture:** Two researched bibliography data modules plus shared format/validation and dated citation snapshots feed UI and the existing query layer. Existing benchmark records are joined by exact model ID. MCP keeps these shared fields intact.

**Spec:** `docs/superpowers/specs/2026-11-26-bibliography-and-project-design.md`.

- [x] Research original 26 entries' paper metadata and source-qualified repositories.
- [x] Research expanded 38 entries' paper metadata and source-qualified repositories.
- [x] Add validated bibliography assembly, readable citations/BibTeX and strict, dated citation snapshots.
- [x] Attach evidence to query responses and add publication/repository filters with meaningful tests.
- [x] Update model cards, learning levels and detail views; review link, export, keyboard and responsive wiring.
- [x] Update MCP descriptions, resources and real-client tests; retain evidence under output limits.
- [ ] Verify the new browser flows after the active credential handoff ends.
- [ ] Complete authorized free backend setup after the necessary account/terms step; preserve an honest disabled state until actual provider acceptance.
- [x] Verify tests/builds, publish the public data/UI update, and check the live artifacts.

Local validation: 112 root tests and 5 real MCP client tests pass; both build targets and submission fixture checks pass. 64 records are complete, 61 have dated OpenAlex snapshots, 3 retain unknown counts. A second review found and fixed inconsistent venue-series filtering while preserving original proceedings titles.

Backend progress: the new Free project is healthy. Migration `0001` is applied;
the live database has 64 model IDs, forced RLS for personal progress, and the
expected owner/guest permissions. Anonymous read/write calls return 401 and the
private schema returns 406. The Before User Created hook and exact production/
local redirect URLs are configured. A NeuralBank GitHub OAuth App is registered;
the user must generate its client secret and save it in Supabase before live
OAuth testing. Frontend provider flags remain disabled. SMTP is not connected;
the reviewed 17-domain initial manifest is prepared but not yet imported.
