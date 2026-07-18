# Iteration 18 — Keep goal changes optional until they are real

## Scope

The capture drawer was checked in a normal project and an isolated zero-breadcrumb project.

## Evidence

1. `01-new-capture-before.png` — a new breadcrumb in Patchwork correctly presents a new current goal as optional.
2. `02-first-capture-before.png` — the empty-project fixture exposed a false required state because two absent IDs compared as equal.
3. `03-first-capture-after.png` — a first breadcrumb now keeps the goal optional and uses the existing project goal only as a placeholder.

## Outcome

The requirement is now guarded by the existence of both the edited breadcrumb ID and the current-goal source ID. Editing the actual source that set the goal remains protected; new breadcrumbs do not force a goal change.
