# Prototype decisions

## Keep the first version browser-local

The prototype uses one seeded project and stores the workspace in `localStorage`. This makes the capture → history → story loop real without introducing a backend, authentication, or additional persistent entities.

## Derive the story from breadcrumbs

“Story so far” is calculated from the chronological breadcrumb list. Each section carries the IDs of its supporting breadcrumbs, and every citation navigates back to the source entry. There is no separately editable story record.

## Use deterministic synthesis for the hackathon slice

The repository had no existing AI integration or server boundary. Deterministic synthesis keeps the demo coherent and traceable without exposing secrets or weakening the rest of the workflow. A model-backed implementation can later replace the derivation function while preserving the same cited-output contract.

## Keep one reading-oriented workspace

The interface uses Overview, History, and Story views around one project. It intentionally avoids dashboard metrics, task surfaces, and other project-management patterns that would dilute the central product idea.

## Derive resumption context from the latest breadcrumb

The overview pairs the current goal with a compact “Where things stand” cue derived from the newest breadcrumb. It exposes the latest outcome above the fold and links back to the source moment, improving project resumption without introducing status fields or a separate progress model.

## Express the turning point as a causal sequence

The middle of Story so far derives a **Tried → Learned → Changed** sequence from experiment, discovery, and change breadcrumbs. Each beat retains its source ID. This makes causality legible without adding a relationship graph or storing a separate narrative model.

## Keep capture depth and completion visible

The capture drawer gives the context fields their own scroll area while keeping Cancel and Save visible. This preserves the meaningful “what / why / outcome” structure instead of shortening the form to fit a viewport, while making the completion point predictable.
