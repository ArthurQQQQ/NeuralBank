# Agent catalog and login implementation plan

**Goal:** Provide a real read-only MCP architecture catalog and prepare GitHub/institutional email accounts with private progress synchronization.

**Architecture:** Shared taxonomy/query modules power UI and public exports; an isolated package runs the official MCP SDK. An official Supabase client adapts to the existing revisioned learning library, backed by eligibility checks and RLS SQL.

**Tech stack:** Existing vanilla JavaScript/SVG app, Node built-in tests, isolated MCP/auth tool packages, Supabase Auth/Postgres, existing GitHub Pages workflow.

**Spec:** `docs/superpowers/specs/2026-11-26-agent-catalog-and-login-design.md`.

- [x] Add complete, scoped metadata and validated catalog queries for all 64 entries; test filters, constraints, pagination, references, and graph relations.
- [x] Implement official-SDK MCP tools/resources with real-client protocol tests and connection instructions.
- [x] Publish catalog/taxonomy JSON, agent discovery metadata, and llms.txt from the shared data in both builds and local preview.
- [x] Add task/type filters and selection guidance to the existing UI.
- [x] Implement official-SDK GitHub PKCE/email-code login, strict public configuration, private progress adaptation, RLS/CAS SQL, and academic-domain import instructions.
- [ ] Connect the owner's backend when available; otherwise retain an honest unavailable status and identify the missing setup precisely.
- [x] Run relevant tests and both builds, review security/selection semantics, and prepare the verified update for publication. Verify the deployment and public catalog before reporting it live.

## Verification and activation boundary

- 105 Node tests passed, including strict catalog queries, private public-export boundaries, actual official-SDK Auth with controlled HTTP, issuer/account isolation and revisioned sync.
- Five real stdio-client tests passed for current discovery and legacy initialization, five tools, all 64 model resources, pagination, sources and invalid/private operations.
- The SQL migration ran in a fresh local PostgreSQL cluster with simulated Supabase roles; trusted eligibility, verified email/domain boundaries, RLS, persistence and concurrent CAS assertions passed. This does not substitute for hosted OAuth/SMTP acceptance.
- Browser QA confirmed task filtering (including cross-family matches), the selection-guidance tab, and disabled login controls with an honest unavailable message. No real OAuth or verification email was sent.
- Worker and static builds passed; static publication contains public catalog/taxonomy/manifest/llms data.
- Supabase is not connected, repository public Auth variables are empty, and production login remains disabled. Hosted activation still needs the owner’s project, OAuth application, public email delivery, reviewed academic domains, migration/hook configuration and real-account acceptance.
