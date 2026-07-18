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

## Record one causal predecessor

A breadcrumb may optionally name the earlier breadcrumb it builds on. The timeline exposes that one-hop connection as a trace action, making the path between consequential moments explicit without creating a dependency graph, a separate relationship entity, or an additional view.

## Follow recorded causality in Story

Story so far walks backward from the latest breadcrumb through its recorded predecessors, excludes the moments already used for the current state, and presents the three nearest remaining ancestors. Older browser-local workspaces without causal links fall back to the nearest chronological context. This keeps the narrative current without storing a second story model.

## Advance the current goal through a breadcrumb

Capture includes an optional new current goal. When present, saving the breadcrumb updates the project snapshot and preserves the same value on the moment that explains the change. Overview and Story infer the goal’s source from that breadcrumb, keeping present orientation traceable without adding a separate goal-history entity or an unaccountable settings edit.
History renders the resulting goal on that source moment, so following the trace explains the transition instead of landing on an otherwise ordinary entry.

## Mark traced History destinations

Following a citation, causal predecessor, current goal, or resumption cue temporarily marks the destination breadcrumb as **Traced source** and moves focus to it. Navigating to History directly clears the marker. This makes cross-view traceability perceptible without storing selection state or adding a separate detail view.

## Preserve source links explicitly

Capture accepts complete HTTP or HTTPS source links, normalizes equivalent URLs, and removes duplicates. If any entry is incomplete or unsupported, the breadcrumb remains unsaved and the form identifies the source field and explains how to repair it. Evidence is never discarded behind a success message.
