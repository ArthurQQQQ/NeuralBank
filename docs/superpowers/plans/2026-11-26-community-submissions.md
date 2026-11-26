# Community Submissions Implementation Plan

> **For agentic workers:** Use the current subagents for the independent schema, API and open-source workflow work; the root implements the interface and performs integration review.

**Goal:** Let contributors edit teaching content and submit self-reported benchmark metadata through the same strict checks used in source contributions.

**Architecture:** One versioned validator is shared by browser, API and CLI. Valid reports enter a persisted pending queue; only maintainers incorporate reviewed changes into the curated source catalog.

**Tech Stack:** Vanilla ES modules, Node 22+, Cloudflare Worker, D1; no added runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-26-community-submissions-design.md`

## Global Constraints

- Format validation is not reproduction; no remote code or submitted commands execute.
- Preserve the personal dashboard, existing progress and immutable database migrations.
- Hosted submission ownership comes from Sites identity, never a client owner field.
- Keep local submissions labeled local, and community results separate from published-paper values.

## Review Focus

- Server rejects unknown fields and forged approval/reproduction states even when client checks are bypassed.
- JSON edits during async validation cannot enable submission of a different, unchecked document.
- Missing reproducibility metadata, percent values over 100, metric mismatches and unsafe URLs produce precise field paths.
- Duplicate submissions do not create repeated records; failed writes retain the user's draft.
- Fork CI receives no production credentials and never deploys or invokes the production submission API.

## Tasks

- [x] Shared format: `src/submission-schema.js`, `schemas/`, CLI, labeled fictional fixtures and boundary tests.
- [x] Persisted API: validate/list/submit routes, D1 and local stores, new migration, HTTP/auth/storage tests.
- [x] Interface: contributor workspace, model edit/report links, JSON editing, field errors, stale-check protection, download and pending feed.
- [x] Open-source workflow: license, contributor docs and pull-request checks; public source publication after a source/privacy review.
- [x] Integration: run tests, content validators and build; browser-check invalid/valid/edit flows and preserve learning progress.
