# Breadcrumb

Breadcrumb is a focused project-memory prototype. It records consequential project moments—decisions, changes, experiments, discoveries, and milestones—and uses them to explain how a project reached its current state.

This repository deliberately does not contain task management, analytics, assignments, chat, integrations, or a general-purpose AI assistant.

## Prototype

The runnable application lives in `app/` and demonstrates one complete project-memory loop:

1. Open the seeded Patchwork project or create a separate local project memory.
2. Browse meaningful moments in chronological order.
3. Add a breadcrumb that preserves what happened, why, its outcome, and supporting evidence.
4. Connect a later breadcrumb to the earlier moment that prompted it.
5. Read a derived “Story so far,” including explicitly incomplete threads.
6. Follow each narrative citation back to its supporting breadcrumb.

The story is derived locally from the project’s breadcrumbs. It does not require an API key or expose a model-generated claim without source references.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
cd app
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Verify

From `app/`:

```bash
npm test
npm run typecheck
npm run build
npm run lint
```

## Implementation

- React, TypeScript, and Vite
- locally persisted project switching and creation, with each project’s history kept separate
- one seeded `Patchwork` project with seven believable `Breadcrumb` records
- browser `localStorage` under `breadcrumb.project-workspace.v1`
- one shared evidence model for manual notes, external links, GitHub commits, and small direct file uploads; every saved source carries its project and breadcrumb IDs
- optional one-repository GitHub association per project; a small public commit list can be loaded and a person must explicitly select the one that supports a breadcrumb
- defensive local-storage normalization that migrates legacy source links, preserves usable records, and drops malformed sources or invalid associations safely
- deterministic story derivation with breadcrumb citations; Story cites breadcrumbs and History exposes their supporting evidence
- responsive, keyboard-accessible project workspace and capture drawer

## Evidence and GitHub behavior

Evidence is deliberately subordinate to a breadcrumb. Adding a source to the capture drawer creates only an unsaved draft; it persists only when a person saves the meaningful breadcrumb it supports. Evidence never creates a breadcrumb, changes the current goal, or changes the derived Story by itself.

Each saved evidence item retains a source kind, title, capture time, source metadata, and exact project/breadcrumb association. Link and commit URLs are HTTP(S); file uploads retain name, MIME type, byte count, and browser-local data. Existing `sourceLinks` arrays migrate to link evidence during load.

GitHub is intentionally narrow: configure one `owner/repository` in the project chooser, load up to eight recent commits from GitHub’s public API, choose one explicitly, and save it as evidence. Commit URLs and SHAs must belong to the configured repository. Once commit evidence exists, the repository association is locked so its provenance remains true. Loading, authentication, rate-limit, private-repository, malformed-response, and network failures are shown without creating any project activity.

## Prototype limits

- projects are browser-local; there is no remote join, collaboration, or cross-device sync
- deterministic narrative synthesis rather than model-backed generation
- files are stored as browser-local data URLs and are limited to 1.5 MB; there is no server-side file store or cross-device sync
- GitHub uses the public commits endpoint only. Private repositories, authenticated access, syncing, webhooks, pull requests, and issues are intentionally out of scope
- external links are not scraped or interpreted; no evidence is automatically promoted into a breadcrumb

The product definition and V1 boundaries are documented in `docs/product.md`.
