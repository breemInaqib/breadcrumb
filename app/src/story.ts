import type { Breadcrumb, BreadcrumbType, Project } from './types'

export interface StoryBeat {
  sourceId: string
  relation: 'Decided' | 'Tried' | 'Learned' | 'Changed' | 'Reached'
  summary: string
}

export interface StorySection {
  id: string
  eyebrow: string
  title: string
  body: string
  sourceIds: string[]
  beats?: StoryBeat[]
  sequenceKind?: 'recorded' | 'chronological'
  sequenceLabel?: string
}

const relationByType: Record<BreadcrumbType, StoryBeat['relation']> = {
  Decision: 'Decided',
  Experiment: 'Tried',
  Discovery: 'Learned',
  Change: 'Changed',
  Milestone: 'Reached',
}

export function sortChronologically(breadcrumbs: Breadcrumb[]) {
  return [...breadcrumbs].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  )
}

export function selectStoryThread(
  breadcrumbs: Breadcrumb[],
  currentSourceIds: string[],
) {
  const ordered = sortChronologically(breadcrumbs)
  const first = ordered[0]
  const latest = ordered.at(-1)
  if (!first || !latest) return { breadcrumbs: [], connected: false }

  const byId = new Map(ordered.map((breadcrumb) => [breadcrumb.id, breadcrumb]))
  const excludedIds = new Set([first.id, ...currentSourceIds])
  const visitedIds = new Set<string>()
  const connectedAncestors: Breadcrumb[] = []
  let cursor: Breadcrumb | undefined = latest

  while (cursor?.buildsOnId && !visitedIds.has(cursor.id)) {
    visitedIds.add(cursor.id)
    const predecessor = byId.get(cursor.buildsOnId)
    if (!predecessor || visitedIds.has(predecessor.id)) break
    if (!excludedIds.has(predecessor.id)) connectedAncestors.unshift(predecessor)
    cursor = predecessor
  }

  if (connectedAncestors.length > 0) {
    return {
      breadcrumbs: connectedAncestors.slice(-3),
      connected: true,
    }
  }

  return {
    breadcrumbs: ordered
      .filter(({ id }) => !excludedIds.has(id))
      .slice(-3),
    connected: false,
  }
}

export function deriveStory(
  project: Project,
  breadcrumbs: Breadcrumb[],
): StorySection[] {
  const ordered = sortChronologically(breadcrumbs)
  if (ordered.length === 0) return []

  const first = ordered[0]
  if (ordered.length === 1) {
    return [
      {
        id: 'current-state',
        eyebrow: 'The story begins here',
        title: project.currentGoal,
        body: [first.whatHappened, first.why, first.outcome]
          .filter(Boolean)
          .join(' '),
        sourceIds: [first.id],
      },
    ]
  }

  const latest = ordered.slice(-2)
  const goalSource = [...ordered]
    .reverse()
    .find(({ nextGoal }) => nextGoal === project.currentGoal)
  const currentSourceCandidates = [goalSource, ...latest].filter(
    (breadcrumb): breadcrumb is Breadcrumb => Boolean(breadcrumb),
  )
  const currentSourcesWithoutOrigin = sortChronologically(
    Array.from(
      new Map(
        currentSourceCandidates.map((breadcrumb) => [breadcrumb.id, breadcrumb]),
      ).values(),
    ),
  ).filter(({ id }) => id !== first.id)
  const currentSources = currentSourcesWithoutOrigin.length > 0
    ? currentSourcesWithoutOrigin
    : currentSourceCandidates
  const storyThread = selectStoryThread(
    ordered,
    currentSources.map(({ id }) => id),
  )
  const middle = storyThread.breadcrumbs

  const sections: StorySection[] = [
    {
      id: 'origin',
      eyebrow: 'The starting point',
      title: first.title,
      body: `${first.whatHappened} ${first.why}`,
      sourceIds: [first.id],
    },
  ]

  if (middle.length > 0) {
    sections.push({
      id: 'turning-point',
      eyebrow: 'What led here',
      title: middle.at(-1)?.title ?? 'The direction evolved',
      body: storyThread.connected
        ? 'These recorded connections form the clearest path into the project’s current state.'
        : 'These recent turning points provide the clearest chronological context for the project’s current state.',
      sourceIds: middle.map(({ id }) => id),
      beats: middle.map((crumb) => ({
        sourceId: crumb.id,
        relation: relationByType[crumb.type],
        summary: crumb.outcome || crumb.whatHappened,
      })),
      sequenceLabel: storyThread.connected
        ? 'Recorded causal thread'
        : 'Chronological context',
      sequenceKind: storyThread.connected ? 'recorded' : 'chronological',
    })
  }

  sections.push({
    id: 'current-state',
    eyebrow: 'Where the project is now',
    title: project.currentGoal,
    body: currentSources
      .map((crumb) => crumb.outcome || crumb.whatHappened)
      .join(' '),
    sourceIds: currentSources.map(({ id }) => id),
  })

  return sections
}
