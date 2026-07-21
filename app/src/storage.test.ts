import { describe, expect, it } from 'vitest'
import { loadWorkspace, normalizeWorkspace, saveWorkspace } from './storage'
import { seedWorkspace } from './data'

describe('workspace evidence persistence', () => {
  it('migrates saved source links into traceable evidence without losing the workspace', () => {
    const legacy = {
      ...seedWorkspace,
      breadcrumbs: [{
        ...seedWorkspace.breadcrumbs[0],
        evidence: undefined,
        sourceLinks: ['https://example.com/original-work'],
      }],
    }
    const normalized = normalizeWorkspace(legacy as unknown as typeof seedWorkspace)

    expect(normalized.breadcrumbs[0].evidence[0]).toMatchObject({
      kind: 'Link',
      source: 'Web link',
      url: 'https://example.com/original-work',
      projectId: 'patchwork',
      breadcrumbId: 'b1',
    })
  })

  it('keeps file-backed evidence serializable for browser-local reloads', () => {
    const serialized = JSON.stringify(seedWorkspace)
    expect(normalizeWorkspace(JSON.parse(serialized)).breadcrumbs[0].evidence[0].capturedAt).toBe(seedWorkspace.breadcrumbs[0].evidence[0].capturedAt)
  })

  it('recovers usable legacy records while dropping malformed evidence and associations', () => {
    const workspace = normalizeWorkspace({
      project: seedWorkspace.project,
      projects: [seedWorkspace.project, null],
      breadcrumbs: [
        {
          ...seedWorkspace.breadcrumbs[0],
          buildsOnId: 'missing-breadcrumb',
          evidence: [
            { id: 'manual', kind: 'Manual note', title: 'Interview note', source: 'Research', capturedAt: '2026-07-20T12:00:00.000Z' },
            { id: 'broken-link', kind: 'Link', title: 'Broken', source: 'Research', capturedAt: 'not-a-date', url: 'mailto:team@example.com' },
            { id: 'broken-file', kind: 'File upload', title: 'Too large', source: 'Local file', capturedAt: '2026-07-20T12:00:00.000Z', filename: 'report.txt', fileDataUrl: `data:text/plain,${'x'.repeat(2_100_001)}` },
          ],
        },
        null,
        { ...seedWorkspace.breadcrumbs[1], id: 'foreign', projectId: 'missing-project' },
      ],
    })

    expect(workspace.breadcrumbs).toHaveLength(1)
    expect(workspace.breadcrumbs[0]).toMatchObject({ buildsOnId: undefined })
    expect(workspace.breadcrumbs[0].evidence).toEqual([
      expect.objectContaining({ id: 'manual', projectId: 'patchwork', breadcrumbId: 'b1' }),
    ])
  })

  it('falls back safely when browser storage is unavailable', () => {
    expect(loadWorkspace().project.id).toBe(seedWorkspace.project.id)
    expect(saveWorkspace(seedWorkspace)).toBe(false)
  })

  it('recovers a legacy project repository from one consistent commit source', () => {
    const workspace = normalizeWorkspace({
      project: seedWorkspace.project,
      projects: [seedWorkspace.project],
      breadcrumbs: [{
        ...seedWorkspace.breadcrumbs[0],
        evidence: [{
          id: 'commit',
          kind: 'GitHub commit',
          source: 'acme/patchwork',
          repository: 'acme/patchwork',
          title: 'Add evidence capture',
          capturedAt: '2026-07-20T12:00:00.000Z',
          url: 'https://github.com/acme/patchwork/commit/ab12cd34ef56',
          commitSha: 'ab12cd3',
        }],
      }],
    })

    expect(workspace.project.githubRepository).toBe('acme/patchwork')
    expect(workspace.breadcrumbs[0].evidence[0]).toMatchObject({
      projectId: 'patchwork',
      breadcrumbId: 'b1',
      repository: 'acme/patchwork',
    })
  })
})
