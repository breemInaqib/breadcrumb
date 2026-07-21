import { describe, expect, it } from 'vitest'
import { attachEvidenceToBreadcrumb, evidenceLabel, validateEvidence } from './evidence'

describe('evidence', () => {
  it('keeps GitHub commit provenance readable in review', () => {
    expect(evidenceLabel({
      id: 'commit-1',
      projectId: 'breadcrumb',
      breadcrumbId: 'b1',
      kind: 'GitHub commit',
      source: 'acme/breadcrumb',
      title: 'Add evidence capture',
      capturedAt: '2026-07-20T12:00:00.000Z',
      commitSha: 'ab12cd34ef56',
    })).toBe('Add evidence capture · acme/breadcrumb · ab12cd3')
  })

  it('requires a verifiable URL for links and commits, but not manual evidence', () => {
    expect(validateEvidence('Manual note', 'Interview summary', '', '')).toBeUndefined()
    expect(validateEvidence('Link', 'Research', '', '')).toBe('Add the source URL for this evidence.')
    expect(validateEvidence('GitHub commit', 'Fix capture', 'https://github.com/acme/breadcrumb/commit/a1', '')).toBe('Add the commit SHA so this change remains identifiable.')
  })

  it('allows a local file only when its local payload is available', () => {
    expect(validateEvidence('File upload', 'Research report', '', '', false)).toBe('Choose a file to attach as evidence.')
    expect(validateEvidence('File upload', 'Research report', '', '', true)).toBeUndefined()
  })

  it('binds a draft source to the breadcrumb and project only when that breadcrumb is saved', () => {
    const [attached] = attachEvidenceToBreadcrumb([
      {
        id: 'note-1',
        kind: 'Manual note',
        source: 'Research session',
        title: 'Participant observation',
        capturedAt: '2026-07-20T12:00:00.000Z',
      },
    ], 'patchwork', 'b8')

    expect(attached).toMatchObject({ projectId: 'patchwork', breadcrumbId: 'b8' })
  })

  it('keeps GitHub commit evidence within the project’s single configured repository', () => {
    const url = 'https://github.com/acme/breadcrumb/commit/ab12cd34ef56'

    expect(validateEvidence('GitHub commit', 'Add evidence capture', url, 'ab12cd3', false, 'acme/breadcrumb')).toBeUndefined()
    expect(validateEvidence('GitHub commit', 'Add evidence capture', url, 'ab12cd3', false, 'other/project')).toBe('Use a commit URL from this project’s configured GitHub repository.')
  })
})
