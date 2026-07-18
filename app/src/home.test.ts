import { describe, expect, it } from 'vitest'
import { seedWorkspace } from './data'
import { deriveOpenThreads } from './home'

describe('project home context', () => {
  it('keeps the current goal as an open thread and traces its source', () => {
    const threads = deriveOpenThreads(seedWorkspace.project, seedWorkspace.breadcrumbs)

    expect(threads[0]).toMatchObject({
      label: 'Focus in progress',
      title: seedWorkspace.project.currentGoal,
      sourceId: 'b6',
    })
  })

  it('surfaces recent breadcrumbs that have no recorded outcome', () => {
    const breadcrumbs = seedWorkspace.breadcrumbs.map((breadcrumb) =>
      breadcrumb.id === 'b5' ? { ...breadcrumb, outcome: '' } : breadcrumb,
    )

    const threads = deriveOpenThreads(seedWorkspace.project, breadcrumbs)

    expect(threads).toContainEqual(expect.objectContaining({
      label: 'Needs an outcome',
      title: 'Compare modal and inline previews',
      sourceId: 'b5',
    }))
  })
})
