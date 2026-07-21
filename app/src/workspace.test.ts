import { describe, expect, it } from 'vitest'
import { seedWorkspace } from './data'
import type { Breadcrumb } from './types'
import {
  createProject,
  getEligiblePredecessors,
  openProject,
  recordBreadcrumb,
  requiresGoalForEdit,
  updateProjectGitHubRepository,
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

  it('keeps every evidence form on the breadcrumb and its project', () => {
    const breadcrumb = makeBreadcrumb({
      projectId: 'patchwork',
      evidence: [
        { id: 'manual', projectId: 'elsewhere', breadcrumbId: 'elsewhere', kind: 'Manual note', source: 'Research session', title: 'Observed five participants', capturedAt: '2026-07-18T12:00:00.000Z', note: 'All hesitated at the same step.' },
        { id: 'link', projectId: 'elsewhere', breadcrumbId: 'elsewhere', kind: 'Link', source: 'Research archive', title: 'Session recording', capturedAt: '2026-07-18T12:00:00.000Z', url: 'https://example.com/session' },
        { id: 'commit', projectId: 'elsewhere', breadcrumbId: 'elsewhere', kind: 'GitHub commit', source: 'acme/patchwork', repository: 'acme/patchwork', title: 'Add preview state', capturedAt: '2026-07-18T12:00:00.000Z', sourceTimestamp: '2026-07-17T12:00:00.000Z', url: 'https://github.com/acme/patchwork/commit/a1b2c3d', commitSha: 'a1b2c3d', author: 'Ada' },
        { id: 'file', projectId: 'elsewhere', breadcrumbId: 'elsewhere', kind: 'File upload', source: 'Local file', title: 'Pilot results', capturedAt: '2026-07-18T12:00:00.000Z', filename: 'pilot.csv', mimeType: 'text/csv', sizeBytes: 30, fileDataUrl: 'data:text/csv;base64,YSxi' },
      ],
    })
    const workspaceWithRepository = {
      ...seedWorkspace,
      project: { ...seedWorkspace.project, githubRepository: 'acme/patchwork' },
      projects: [{ ...seedWorkspace.project, githubRepository: 'acme/patchwork' }],
    }
    const updated = recordBreadcrumb(workspaceWithRepository, breadcrumb)
    const saved = updated.breadcrumbs.at(-1)

    expect(saved?.projectId).toBe('patchwork')
    expect(saved?.evidence.map(({ kind }) => kind)).toEqual(['Manual note', 'Link', 'GitHub commit', 'File upload'])
    expect(saved?.evidence.every((evidence) => evidence.projectId === 'patchwork' && evidence.breadcrumbId === breadcrumb.id)).toBe(true)
    expect(updated.breadcrumbs).toHaveLength(seedWorkspace.breadcrumbs.length + 1)
  })

  it('updates the current goal through the breadcrumb that explains it', () => {
    const nextGoal = 'Validate transition guidance with the next pilot group.'
    const breadcrumb = makeBreadcrumb({ nextGoal })
    const updated = recordBreadcrumb(seedWorkspace, breadcrumb)

    expect(updated.project.currentGoal).toBe(nextGoal)
    expect(updated.breadcrumbs.at(-1)).toMatchObject({
      id: breadcrumb.id,
      evidence: [{ projectId: 'patchwork', breadcrumbId: breadcrumb.id }],
    })
    expect(updated.breadcrumbs.at(-1)?.nextGoal).toBe(nextGoal)
  })

  it('does not let an evidence payload or breadcrumb cross project boundaries', () => {
    const foreign = makeBreadcrumb({ projectId: 'another-project' })

    expect(recordBreadcrumb(seedWorkspace, foreign)).toBe(seedWorkspace)
    expect(updateBreadcrumb(seedWorkspace, { ...seedWorkspace.breadcrumbs[0], projectId: 'another-project' })).toBe(seedWorkspace)
  })

  it('keeps the project repository stable once selected commit evidence exists', () => {
    const configured = updateProjectGitHubRepository(seedWorkspace, 'patchwork', 'acme/patchwork')
    const withCommit = recordBreadcrumb(configured, makeBreadcrumb({
      evidence: [{
        id: 'commit',
        projectId: 'wrong',
        breadcrumbId: 'wrong',
        kind: 'GitHub commit',
        source: 'acme/patchwork',
        repository: 'acme/patchwork',
        title: 'Add evidence capture',
        capturedAt: '2026-07-20T12:00:00.000Z',
        url: 'https://github.com/acme/patchwork/commit/ab12cd34ef56',
        commitSha: 'ab12cd3',
      }],
    }))

    expect(updateProjectGitHubRepository(withCommit, 'patchwork', 'other/project')).toBe(withCommit)
    expect(withCommit.project.githubRepository).toBe('acme/patchwork')
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
