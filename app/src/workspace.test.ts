import { describe, expect, it } from 'vitest'
import { seedWorkspace } from './data'
import type { Breadcrumb } from './types'
import {
  createProject,
  getEligiblePredecessors,
  openProject,
  recordBreadcrumb,
  requiresGoalForEdit,
  updateBreadcrumb,
} from './workspace'

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
  it('creates and opens a separate project without mixing its history', () => {
    const project = {
      id: 'field-notes',
      name: 'Field Notes',
      description: 'A small research memory.',
      currentGoal: 'Capture the first discovery.',
      createdAt: '2026-07-18T12:00:00.000Z',
    }
    const created = createProject(seedWorkspace, project)

    expect(created.project).toBe(project)
    expect(created.projects).toHaveLength(2)
    expect(openProject(created, 'patchwork').project.name).toBe('Patchwork')
    expect(openProject(created, 'field-notes').breadcrumbs).toEqual(seedWorkspace.breadcrumbs)
  })

  it('only requires a goal when editing the breadcrumb that set it', () => {
    expect(requiresGoalForEdit(undefined, undefined)).toBe(false)
    expect(requiresGoalForEdit(undefined, 'b6')).toBe(false)
    expect(requiresGoalForEdit('b6', 'b6')).toBe(true)
    expect(requiresGoalForEdit('b5', 'b6')).toBe(false)
  })

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

  it('corrects a breadcrumb in place so existing traces remain valid', () => {
    const original = seedWorkspace.breadcrumbs[4]
    const corrected = {
      ...original,
      title: 'Compare modal and persistent inline previews',
    }
    const updated = updateBreadcrumb(seedWorkspace, corrected)

    expect(updated.breadcrumbs).toHaveLength(seedWorkspace.breadcrumbs.length)
    expect(updated.breadcrumbs.find(({ id }) => id === original.id)?.title).toBe(
      corrected.title,
    )
    expect(updated.breadcrumbs.find(({ id }) => id === 'b6')?.buildsOnId).toBe(
      original.id,
    )
  })

  it('recomputes the current goal from the latest edited goal transition', () => {
    const goalSource = seedWorkspace.breadcrumbs[5]
    const nextGoal = 'Measure whether inline previews improve published flows.'
    const updated = updateBreadcrumb(seedWorkspace, {
      ...goalSource,
      nextGoal,
    })

    expect(updated.project.currentGoal).toBe(nextGoal)
    expect(updated.breadcrumbs.find(({ id }) => id === goalSource.id)?.nextGoal).toBe(
      nextGoal,
    )
  })

  it('keeps later goal transitions authoritative when older history is corrected', () => {
    const laterGoal = makeBreadcrumb({
      id: 'b8',
      nextGoal: 'Prepare the validated preview pattern for release.',
    })
    const withLaterGoal = recordBreadcrumb(seedWorkspace, laterGoal)
    const correctedEarlierGoal = {
      ...seedWorkspace.breadcrumbs[5],
      nextGoal: 'Validate preview quality in the active pilot.',
    }
    const updated = updateBreadcrumb(withLaterGoal, correctedEarlierGoal)

    expect(updated.project.currentGoal).toBe(laterGoal.nextGoal)
  })

  it('offers only causal predecessors that cannot create a cycle', () => {
    const eligible = getEligiblePredecessors(
      seedWorkspace.breadcrumbs,
      'b4',
      '2026-07-31T23:59:59.000Z',
    )

    expect(eligible.map(({ id }) => id)).toEqual(['b3', 'b2', 'b1'])
  })

  it('does not offer moments that occur after the selected date', () => {
    const eligible = getEligiblePredecessors(
      seedWorkspace.breadcrumbs,
      undefined,
      '2026-06-18T23:59:59.000Z',
    )

    expect(eligible.map(({ id }) => id)).toEqual(['b2', 'b1'])
  })
})
