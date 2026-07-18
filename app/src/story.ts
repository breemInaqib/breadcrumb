import type { Breadcrumb, Project } from './types'

export interface StoryBeat {
  sourceId: string
  relation: 'Tried' | 'Learned' | 'Changed'
  summary: string
}

export interface StorySection {
  id: string
  eyebrow: string
  title: string
  body: string
  sourceIds: string[]
  beats?: StoryBeat[]
}

export function sortChronologically(breadcrumbs: Breadcrumb[]) {
  return [...breadcrumbs].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  )
}

export function deriveStory(
  project: Project,
  breadcrumbs: Breadcrumb[],
): StorySection[] {
  const ordered = sortChronologically(breadcrumbs)
  if (ordered.length === 0) return []

  const first = ordered[0]
  const turningPoints = ordered.filter(({ type }) =>
    ['Experiment', 'Discovery', 'Change'].includes(type),
  )
  const middle = turningPoints.slice(0, 3)
  const latest = ordered.slice(-2)

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
    const relationByType = {
      Experiment: 'Tried',
      Discovery: 'Learned',
      Change: 'Changed',
    } as const

    sections.push({
      id: 'turning-point',
      eyebrow: 'What changed',
      title: middle.at(-1)?.title ?? 'The direction evolved',
      body:
        'The project moved through a connected sequence of testing, learning, and changing direction.',
      sourceIds: middle.map(({ id }) => id),
      beats: middle.map((crumb) => ({
        sourceId: crumb.id,
        relation: relationByType[crumb.type as keyof typeof relationByType],
        summary: crumb.outcome || crumb.whatHappened,
      })),
    })
  }

  const latestUnique = latest.filter(
    ({ id }) => id !== first.id && !middle.some((crumb) => crumb.id === id),
  )
  const currentSources = latestUnique.length > 0 ? latestUnique : latest

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
