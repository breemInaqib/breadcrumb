# Breadcrumb — Product Brief

## Product thesis

Breadcrumb is a project memory system that records consequential moments as a project evolves and turns them into a traceable explanation of how the project reached its current state.

Rather than attempting to manage every task and activity, Breadcrumb focuses on preserving the decisions, changes, experiments, discoveries, and milestones that explain the project's evolution.

Its central question is not simply:

> What is happening?

It is:

> How did we get here, and why?

## Problem

Projects accumulate history faster than teams preserve context.

Decisions are discussed in messages, changes appear in commits, experiments are recorded in scattered notes, and the reasoning behind important choices often remains in people's memories.

The current state of a project may be visible while the path that produced it becomes increasingly difficult to reconstruct.

This creates problems when someone:

* joins an existing project;
* returns after time away;
* questions an earlier decision;
* needs to understand why the current approach was chosen;
* wants to learn from previous experiments;
* needs to explain the project's evolution to someone else.

Breadcrumb gives the project a shared, persistent memory.

## Primary user

The initial user is a member of a small, fast-moving team working on a project whose direction evolves over time.

This may include software teams, product teams, designers, researchers, founders, students, or other collaborative groups.

The first version should optimise for small teams where important context is currently distributed across conversations, commits, notes, and people's memories.

## Core concept

The fundamental unit of Breadcrumb is the **breadcrumb**.

A breadcrumb represents a meaningful moment in the life of a project.

Examples include:

* a decision;
* a significant change;
* an experiment;
* a discovery or learning;
* a milestone.

Each breadcrumb records not only what happened, but why it happened and, when known, what happened as a result.

Over time, these breadcrumbs form a chronological project history.

Breadcrumb then uses this history to help users understand the larger narrative of the work: where the project began, what changed, what was tried, what was learned, and how those moments produced the project's current direction.

## Core product loop

1. A team starts or opens a project.
2. Someone records a meaningful decision, change, experiment, discovery, or milestone.
3. The breadcrumb becomes part of the project's chronological history.
4. More breadcrumbs accumulate as the project evolves.
5. A team member returns to the project and opens its story.
6. Breadcrumb reconstructs the important path from the project's earlier state to its current one.
7. The user can trace that explanation back to the original breadcrumbs.

The desired outcome is simple:

> A person should be able to open an unfamiliar or forgotten project and quickly understand how it got here.

## First version

The hackathon version should contain one complete project-memory workflow.

### Project overview

A simple project workspace showing:

* project name;
* short description;
* current goal;
* recent project history;
* access to the complete story so far.

### Breadcrumb capture

Users can create a breadcrumb with:

* type;
* title;
* what happened;
* why it happened;
* outcome or consequence, when known;
* date or time;
* optional source links.

Supported types:

* Decision
* Change
* Experiment
* Discovery
* Milestone

Capture should remain lightweight. Breadcrumb is not intended to make teams document every action.

### Project timeline

Breadcrumbs are presented chronologically as the meaningful history of the project.

The timeline should prioritise readability and narrative continuity rather than resembling a generic activity log.

A user should be able to scan it and recognise the project's major turning points.

### Story so far

Breadcrumb should produce a concise explanation of the project's evolution based on its recorded breadcrumbs.

The story should help answer:

* Where did the project begin?
* What were the important turning points?
* What approaches were tried?
* What was learned?
* Why did the direction change?
* What is the current state?

Generated or derived explanations should remain traceable to the breadcrumbs that support them.

## Smallest useful data model

### Project

* `id`
* `name`
* `description`
* `currentGoal`
* `createdAt`

### Breadcrumb

* `id`
* `projectId`
* `buildsOnId`, when the moment continues an earlier breadcrumb
* `type`
* `title`
* `whatHappened`
* `why`
* `outcome`
* `occurredAt`
* `sourceLinks`

The first version should avoid additional persistent entities unless implementation reveals a clear need for them.

The timeline and project narrative should initially be treated as views derived from the project's breadcrumbs.

## Product principles

### Capture significance, not activity

Breadcrumb should record consequential project moments rather than becoming a feed of every action performed by the team.

### Preserve the why

Knowing that something changed is less valuable than understanding why the change was made.

The product should encourage users to preserve reasoning alongside events.

### Chronology before complexity

A project's evolution should remain understandable as a sequence of meaningful moments.

Simple chronological understanding should take priority over complex visualisation.

### Keep understanding traceable

Any generated summary or narrative should remain connected to the original breadcrumbs from which it was derived.

Breadcrumb should increase trust in project memory rather than replacing evidence with unsupported summaries.

### Keep capture lightweight

Recording project context must not become another project-management obligation.

Adding a useful breadcrumb should be fast enough that teams will realistically continue doing it.

## Explicitly out of scope for V1

The first version should not include:

* Kanban boards;
* general task management;
* assignments and workload management;
* dashboards and analytics;
* calendars;
* notifications;
* team chat;
* comments and reactions;
* complex permissions;
* organisation management;
* real-time collaborative editing;
* external integrations;
* automatic activity ingestion;
* a full project wiki;
* complex dependency graphs;
* a general-purpose AI assistant.

These may eventually support the core product, but they should not define the initial implementation.

## Product differentiation

Most project-management software is optimised around future work:

* what needs doing;
* who owns it;
* when it is due;
* whether it is complete.

Breadcrumb is optimised around accumulated understanding:

* what changed;
* why it changed;
* what was tried;
* what was learned;
* how the current project emerged from those events.

A conventional activity feed records actions.

Breadcrumb records meaning.

A conventional archive tells users what happened.

Breadcrumb should help them understand how one important moment led to another.

## Hackathon success criteria

The prototype is successful if a user can:

1. open a project;
2. understand its current goal;
3. add a meaningful breadcrumb;
4. browse the project's chronological history;
5. see a clear "Story so far";
6. trace important claims in that story back to their source breadcrumbs.

The strongest demo should show a project with an existing history, add one new meaningful development, and demonstrate how the project's shared narrative evolves as a result.

## Longer-term opportunity

Breadcrumb may eventually become a memory layer that sits across the tools where work already happens.

Future versions could gather signals from code repositories, project boards, documents, meetings, and conversations while identifying the small number of moments worth preserving as project history.

However, the underlying product should remain the same:

> Breadcrumb helps people preserve and understand the path their work took, not merely observe its current state.
