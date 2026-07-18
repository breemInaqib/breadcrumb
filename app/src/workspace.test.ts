import { describe, expect, it } from 'vitest'
import { seedWorkspace } from './data'
import type { Breadcrumb } from './types'
import { recordBreadcrumb } from './workspace'

function makeBreadcrumb(overrides: Partial<Breadcrumb> = {}): Breadcrumb {
  return {
    ...seedWorkspace.breadcrumbs[0],
    id: 'new-breadcrumb',
    title: 'A new meaningful moment',
    occurredAt: '2026-07-18T12:00:00.000Z',
    ...overrides,
  }
}

describe('project workspace', () => {
  it('records a breadcrumb without changing the current goal by default', () => {
    const updated = recordBreadcrumb(seedWorkspace, makeBreadcrumb())

    expect(updated.project.currentGoal).toBe(seedWorkspace.project.currentGoal)
    expect(updated.breadcrumbs.at(-1)?.id).toBe('new-breadcrumb')
  })

  it('updates the current goal through the breadcrumb that explains it', () => {
    const nextGoal = 'Validate transition guidance with the next pilot group.'
    const breadcrumb = makeBreadcrumb({ nextGoal })
    const updated = recordBreadcrumb(seedWorkspace, breadcrumb)

    expect(updated.project.currentGoal).toBe(nextGoal)
    expect(updated.breadcrumbs.at(-1)).toBe(breadcrumb)
    expect(updated.breadcrumbs.at(-1)?.nextGoal).toBe(nextGoal)
  })
})
