import { describe, expect, it } from 'vitest'
import { seedWorkspace } from './data'
import { deriveStory, selectStoryThread, sortChronologically } from './story'

describe('project story', () => {
  it('orders breadcrumbs by their occurrence time', () => {
    const reversed = [...seedWorkspace.breadcrumbs].reverse()
    expect(sortChronologically(reversed)[0].id).toBe('b1')
    expect(sortChronologically(reversed).at(-1)?.id).toBe('b6')
  })

  it('derives traceable sections from existing breadcrumbs', () => {
    const story = deriveStory(seedWorkspace.project, seedWorkspace.breadcrumbs)

    expect(story).toHaveLength(3)
    expect(story.every((section) => section.sourceIds.length > 0)).toBe(true)
    expect(story[1].beats?.map(({ relation }) => relation)).toEqual([
      'Tried',
      'Learned',
      'Changed',
    ])
    expect(story[1].beats?.map(({ sourceId }) => sourceId)).toEqual(
      story[1].sourceIds,
    )
    expect(story.at(-1)?.title).toBe(seedWorkspace.project.currentGoal)
  })

  it('includes a newly recorded turning point in the story', () => {
    const newBreadcrumb = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b7',
      type: 'Discovery' as const,
      title: 'Pilot users revisit previews before publishing',
      occurredAt: '2026-07-18T12:00:00.000Z',
    }
    const story = deriveStory(seedWorkspace.project, [
      ...seedWorkspace.breadcrumbs,
      newBreadcrumb,
    ])

    expect(story.some((section) => section.sourceIds.includes('b7'))).toBe(true)
  })

  it('follows the latest explicit causal thread as history grows', () => {
    const laterDiscovery = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b7',
      buildsOnId: 'b6',
      type: 'Discovery' as const,
      title: 'Preview reveals unclear transitions',
      occurredAt: '2026-07-18T12:00:00.000Z',
    }
    const laterChange = {
      ...seedWorkspace.breadcrumbs[0],
      id: 'b8',
      buildsOnId: 'b7',
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

    expect(story[1].sourceIds).toEqual(['b4', 'b5', 'b6'])
    expect(story[1].beats?.map(({ relation }) => relation)).toEqual([
      'Changed',
      'Tried',
      'Reached',
    ])
    expect(story[1].sequenceLabel).toBe('Recorded causal thread')
    expect(story.at(-1)?.sourceIds).toEqual(['b7', 'b8'])
  })

  it('uses recent chronology when explicit links are unavailable', () => {
    const legacyBreadcrumbs = seedWorkspace.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      buildsOnId: undefined,
    }))
    const currentSourceIds = ['b5', 'b6']
    const thread = selectStoryThread(legacyBreadcrumbs, currentSourceIds)

    expect(thread.connected).toBe(false)
    expect(thread.breadcrumbs.map(({ id }) => id)).toEqual(['b2', 'b3', 'b4'])
  })

  it('falls back safely when causal links form a cycle', () => {
    const breadcrumbs = seedWorkspace.breadcrumbs.map((breadcrumb) => {
      if (breadcrumb.id === 'b5') return { ...breadcrumb, buildsOnId: 'b6' }
      if (breadcrumb.id === 'b6') return { ...breadcrumb, buildsOnId: 'b5' }
      return breadcrumb
    })
    const thread = selectStoryThread(breadcrumbs, ['b5', 'b6'])

    expect(thread.connected).toBe(false)
    expect(thread.breadcrumbs.map(({ id }) => id)).toEqual(['b2', 'b3', 'b4'])
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
