# Breadcrumb

Breadcrumb is a focused project-memory prototype. It records consequential project moments—decisions, changes, experiments, discoveries, and milestones—and uses them to explain how a project reached its current state.

This repository deliberately does not contain task management, analytics, assignments, chat, integrations, or a general-purpose AI assistant.

## Prototype

The runnable application lives in `app/` and demonstrates one complete project-memory loop:

1. Open the seeded Patchwork project or create a separate local project memory.
2. Browse meaningful moments in chronological order.
3. Add a breadcrumb that preserves what happened, why, its outcome, and supporting links.
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
```

## Implementation

- React, TypeScript, and Vite
- locally persisted project switching and creation, with each project’s history kept separate
- one seeded `Patchwork` project with seven believable `Breadcrumb` records
- browser `localStorage` under `breadcrumb.project-workspace.v1`
- deterministic story derivation with breadcrumb citations
- responsive, keyboard-accessible project workspace and capture drawer

## Prototype limits

- projects are browser-local; there is no remote join, collaboration, or cross-device sync
- deterministic narrative synthesis rather than model-backed generation
- external source links can be captured but are not fetched or validated beyond allowing HTTP(S) URLs
- no authentication, permissions, integrations, or automatic ingestion

The product definition and V1 boundaries are documented in `docs/product.md`.
