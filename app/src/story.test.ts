import { describe, expect, it } from 'vitest'
import { seedWorkspace } from './data'
import { deriveStory, sortChronologically } from './story'

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
})
