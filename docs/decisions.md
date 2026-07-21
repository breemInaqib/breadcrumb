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

Link evidence retains its original HTTP(S) URL, title, source, and capture time. The capture drawer checks only that a provided URL is a complete HTTP(S) address; it does not scrape, extract, or reinterpret the linked work.

## Keep evidence subordinate to the breadcrumb

Evidence is stored on a breadcrumb using one local model with a source kind and small provenance fields. Manual notes, links, files, and GitHub commits all enter through the existing capture drawer; none creates a breadcrumb or changes the Story by itself. A draft is bound to the saved breadcrumb and its project at save time, so a source cannot be silently reassigned. Story continues to cite breadcrumbs, and History exposes the evidence that supports each cited moment.

## Make direct files local and bounded

Direct uploads are encoded as browser-local data URLs so that a saved workspace can reload without a server. The prototype limits uploads to 1.5 MB and retains name, MIME type, size, and capture time. It deliberately performs no OCR, content extraction, analysis, or remote upload.

## Keep GitHub connected evidence narrow

A project may have one optional `owner/repository` association, configurable from the project chooser. The capture drawer uses GitHub's public recent-commits endpoint to help select one commit, preserving repository, SHA, message, author, timestamp, and URL. Commit URLs and SHAs must match that repository, and the association remains fixed after commit evidence is saved. There is no authentication, background sync, webhook, pull request, issue, or automatic breadcrumb path.

## Normalize browser-local workspaces at the boundary

Saved browser data is untrusted input. Loading normalizes projects, breadcrumbs, evidence, dates, source URLs, file payload bounds, and causal links before the workspace reaches the interface. Legacy `sourceLinks` migrate into typed link evidence; malformed sources and impossible associations are ignored while the usable project record stays available. Saving uses the same normalization path and reports failure without crashing the workspace.

## Name sources from their destination

History labels each saved source with its hostname and readable path instead of a generic number. Query strings and fragments stay out of the visible label, the full URL remains the link target and title, and long destinations truncate visually. Evidence becomes recognizable without fetching metadata or expanding the stored source model.

## Correct the original moment in place

History offers a quiet edit action on each breadcrumb and reuses the capture drawer with the recorded values prefilled. Saving replaces that moment under the same ID, so citations and downstream causal links remain intact. Causal predecessor choices exclude the edited moment and its descendants, and changing a goal-setting breadcrumb recomputes the current goal from the latest recorded transition. This keeps project memory repairable without introducing revisions, comments, or another persistent entity.

## Keep causal links visible in Story evidence

Story citations show a supporting breadcrumb’s recorded predecessor directly beneath it and make that relationship traceable to History. This preserves the immediate “builds on” context at section boundaries and inside the current state without inventing links between otherwise unrelated moments or adding a separate graph view.

## Name the basis of every Story sequence

The middle Story section visibly identifies its sequence as either a **Recorded causal thread** or **Chronological context**. The same text names the sequence for assistive technology. This keeps chronological fallback useful while preventing nearby moments from being mistaken for relationships the team actually recorded.
