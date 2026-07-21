import { describe, expect, it } from 'vitest'
import { seedWorkspace } from './data'
import { deriveStory, selectStoryThread, sortChronologically } from './story'

describe('project story', () => {
  it('orders breadcrumbs by their occurrence time', () => {
    const reversed = [...seedWorkspace.breadcrumbs].reverse()
    expect(sortChronologically(reversed)[0].id).toBe('b1')
    expect(sortChronologically(reversed).at(-1)?.id).toBe('b7')
  })

  it('orders matching timestamps by ID so citations remain deterministic', () => {
    const first = { ...seedWorkspace.breadcrumbs[0], id: 'b-z', occurredAt: '2026-07-20T12:00:00.000Z' }
    const second = { ...seedWorkspace.breadcrumbs[1], id: 'b-a', occurredAt: '2026-07-20T12:00:00.000Z' }

    expect(sortChronologically([first, second]).map(({ id }) => id)).toEqual(['b-a', 'b-z'])
  })

  it('derives traceable sections from existing breadcrumbs', () => {
    const story = deriveStory(seedWorkspace.project, seedWorkspace.breadcrumbs)

    expect(story).toHaveLength(4)
    expect(story.every((section) => section.sourceIds.length > 0)).toBe(true)
    expect(story[1].beats?.map(({ relation }) => relation)).toEqual([
      'Learned',
      'Changed',
      'Tried',
    ])
    expect(story[1].beats?.map(({ sourceId }) => sourceId)).toEqual(
      story[1].sourceIds,
    )
    expect(story.at(-1)?.title).toBe(seedWorkspace.project.currentGoal)
    expect(story[2]).toMatchObject({
      id: 'unresolved',
      sourceIds: ['b7'],
    })
  })

  it('keeps a one-moment history to one honest story section', () => {
    const first = {
      ...seedWorkspace.breadcrumbs[0],
      nextGoal: 'Validate the initial direction with three pilot teams.',
    }
    const project = { ...seedWorkspace.project, currentGoal: first.nextGoal }
    const story = deriveStory(project, [first])

    expect(story).toHaveLength(1)
    expect(story[0]).toMatchObject({
      id: 'current-state',
      eyebrow: 'The story begins here',
      title: project.currentGoal,
      sourceIds: [first.id],
    })
    expect(story[0].body).toContain(first.whatHappened)
    expect(story[0].body).toContain(first.why)
    expect(story[0].body).toContain(first.outcome)
  })

  it('turns two moments into two distinct story sections', () => {
    const breadcrumbs = seedWorkspace.breadcrumbs.slice(0, 2)
    const story = deriveStory(seedWorkspace.project, breadcrumbs)

    expect(story).toHaveLength(2)
    expect(story.map(({ id }) => id)).toEqual(['origin', 'current-state'])
    expect(story[0].sourceIds).toEqual(['b1'])
    expect(story[1].sourceIds).toEqual(['b2'])
    expect(story.some(({ beats }) => Boolean(beats))).toBe(false)
  })

  it('includes a newly recorded turning point in the story', () => {
    const newBreadcrumb = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b8',
      type: 'Discovery' as const,
      title: 'Pilot users revisit previews before publishing',
      occurredAt: '2026-07-18T12:00:00.000Z',
    }
    const story = deriveStory(seedWorkspace.project, [
      ...seedWorkspace.breadcrumbs,
      newBreadcrumb,
    ])

    expect(story.some((section) => section.sourceIds.includes('b8'))).toBe(true)
  })

  it('does not let supporting evidence create or reorder story memory by itself', () => {
    const withMoreEvidence = seedWorkspace.breadcrumbs.map((breadcrumb) =>
      breadcrumb.id === 'b6'
        ? {
          ...breadcrumb,
          evidence: [...breadcrumb.evidence, {
            id: 'commit-evidence',
            projectId: 'patchwork',
            breadcrumbId: 'b6',
            kind: 'GitHub commit' as const,
            source: 'acme/patchwork',
            repository: 'acme/patchwork',
            title: 'Add pilot instrumentation',
            capturedAt: '2026-07-18T12:00:00.000Z',
            url: 'https://github.com/acme/patchwork/commit/ab12cd34ef56',
            commitSha: 'ab12cd3',
          }],
        }
        : breadcrumb,
    )

    expect(deriveStory(seedWorkspace.project, withMoreEvidence).map((section) => section.sourceIds))
      .toEqual(deriveStory(seedWorkspace.project, seedWorkspace.breadcrumbs).map((section) => section.sourceIds))
  })

  it('follows the latest explicit causal thread as history grows', () => {
    const laterDiscovery = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b8',
      buildsOnId: 'b6',
      type: 'Discovery' as const,
      title: 'Preview reveals unclear transitions',
      occurredAt: '2026-07-18T12:00:00.000Z',
    }
    const laterChange = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b9',
      buildsOnId: 'b8',
      type: 'Change' as const,
      title: 'Add transition guidance to the composer',
      occurredAt: '2026-07-18T13:00:00.000Z',
    }
    const breadcrumbs = [
      ...seedWorkspace.breadcrumbs,
      laterDiscovery,
      laterChange,
    ]
    const story = deriveStory(seedWorkspace.project, breadcrumbs)

    expect(story[1].sourceIds).toEqual(['b3', 'b4', 'b5'])
    expect(story[1].beats?.map(({ relation }) => relation)).toEqual([
      'Learned',
      'Changed',
      'Tried',
    ])
    expect(story[1].sequenceLabel).toBe('Recorded causal thread')
    expect(story[1].sequenceKind).toBe('recorded')
    expect(story.at(-1)?.sourceIds).toEqual(['b6', 'b8', 'b9'])
  })

  it('keeps the current goal supported by the breadcrumb that set it', () => {
    const nextGoal = 'Validate transition guidance with the next pilot group.'
    const goalChange = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b8',
      buildsOnId: 'b6',
      nextGoal,
      type: 'Change' as const,
      occurredAt: '2026-07-18T12:00:00.000Z',
    }
    const laterExperiment = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b9',
      buildsOnId: 'b8',
      type: 'Experiment' as const,
      occurredAt: '2026-07-19T12:00:00.000Z',
    }
    const laterDiscovery = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b10',
      buildsOnId: 'b9',
      type: 'Discovery' as const,
      occurredAt: '2026-07-20T12:00:00.000Z',
    }
    const project = { ...seedWorkspace.project, currentGoal: nextGoal }
    const story = deriveStory(project, [
      ...seedWorkspace.breadcrumbs,
      goalChange,
      laterExperiment,
      laterDiscovery,
    ])

    expect(story.at(-1)?.sourceIds).toEqual(['b8', 'b9', 'b10'])
  })

  it('uses recent chronology when explicit links are unavailable', () => {
    const legacyBreadcrumbs = seedWorkspace.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      buildsOnId: undefined,
    }))
    const currentSourceIds = ['b5', 'b6']
    const thread = selectStoryThread(legacyBreadcrumbs, currentSourceIds)

    expect(thread.connected).toBe(false)
    expect(thread.breadcrumbs.map(({ id }) => id)).toEqual(['b3', 'b4', 'b7'])

    const story = deriveStory(seedWorkspace.project, legacyBreadcrumbs)
    expect(story[1].sequenceLabel).toBe('Chronological context')
    expect(story[1].sequenceKind).toBe('chronological')
  })

  it('falls back safely when causal links form a cycle', () => {
    const breadcrumbs = seedWorkspace.breadcrumbs.map((breadcrumb) => {
      if (breadcrumb.id === 'b5') return { ...breadcrumb, buildsOnId: 'b6' }
      if (breadcrumb.id === 'b6') return { ...breadcrumb, buildsOnId: 'b5' }
      return breadcrumb
    })
    const thread = selectStoryThread(breadcrumbs, ['b5', 'b6'])

    expect(thread.connected).toBe(false)
    expect(thread.breadcrumbs.map(({ id }) => id)).toEqual(['b3', 'b4', 'b7'])
  })

  it('keeps explicit causal links resolvable and chronological', () => {
    const byId = new Map(seedWorkspace.breadcrumbs.map((breadcrumb) => [breadcrumb.id, breadcrumb]))

    seedWorkspace.breadcrumbs.forEach((breadcrumb) => {
      if (!breadcrumb.buildsOnId) return
      const predecessor = byId.get(breadcrumb.buildsOnId)

      expect(predecessor).toBeDefined()
      expect(new Date(predecessor!.occurredAt).getTime()).toBeLessThanOrEqual(
        new Date(breadcrumb.occurredAt).getTime(),
      )
    })
  })
})
