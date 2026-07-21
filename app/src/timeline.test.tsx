import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StoryEvidence, StorySequence, Timeline } from './App'
import { seedWorkspace } from './data'
import { deriveStory } from './story'

describe('project timeline', () => {
  it('names the resulting goal on the breadcrumb that changed it', () => {
    const html = renderToStaticMarkup(
      <Timeline breadcrumbs={seedWorkspace.breadcrumbs} />,
    )

    expect(html).toContain('Current goal became')
    expect(html).toContain(seedWorkspace.project.currentGoal)
  })

  it('does not add a goal transition to an ordinary breadcrumb', () => {
    const html = renderToStaticMarkup(
      <Timeline breadcrumbs={[seedWorkspace.breadcrumbs[0]]} />,
    )

    expect(html).not.toContain('Current goal became')
  })

  it('marks the breadcrumb reached through a trace action', () => {
    const source = seedWorkspace.breadcrumbs[0]
    const html = renderToStaticMarkup(
      <Timeline
        breadcrumbs={seedWorkspace.breadcrumbs}
        highlightedId={source.id}
      />,
    )

    expect(html).toContain('aria-current="true"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('Traced source')
  })

  it('renders typed evidence while preserving its provenance and destination', () => {
    const link = 'https://research.example.com/projects/patchwork/pilot-evidence'
    const breadcrumb = {
      ...seedWorkspace.breadcrumbs[0],
      evidence: [{
        id: 'test-evidence',
        projectId: 'patchwork',
        breadcrumbId: 'b1',
        kind: 'GitHub commit' as const,
        source: 'acme/patchwork',
        title: 'Add inline preview',
        capturedAt: '2026-07-18T12:00:00.000Z',
        url: link,
        commitSha: 'a1b2c3d4',
      }],
    }
    const html = renderToStaticMarkup(<Timeline breadcrumbs={[breadcrumb]} />)

    expect(html).toContain('Add inline preview')
    expect(html).toContain('acme/patchwork')
    expect(html).toContain('a1b2c3d')
    expect(html).toContain(`href="${link}"`)
    expect(html).toContain('target="_blank"')
    expect(html).toContain('(opens in a new tab)')
  })

  it('offers a named correction action when editing is available', () => {
    const source = seedWorkspace.breadcrumbs[0]
    const html = renderToStaticMarkup(
      <Timeline breadcrumbs={[source]} onEdit={() => undefined} />,
    )

    expect(html).toContain(`aria-label="Edit ${source.title}"`)
    expect(html).toContain('Edit')
  })

  it('preserves each supporting breadcrumb’s recorded predecessor in Story', () => {
    const predecessor = seedWorkspace.breadcrumbs[4]
    const source = seedWorkspace.breadcrumbs[5]
    const html = renderToStaticMarkup(
      <StoryEvidence
        breadcrumbs={seedWorkspace.breadcrumbs}
        onTrace={() => undefined}
        sourceIds={[source.id]}
      />,
    )

    expect(html).toContain('Supported by')
    expect(html).toContain(source.title)
    expect(html).toContain('1 evidence source')
    expect(html).toContain('Builds on')
    expect(html).toContain(predecessor.title)
    expect(html).toContain(
      `aria-label="Builds on ${predecessor.title}; trace earlier breadcrumb"`,
    )
  })

  it('names the visible and accessible basis of a Story sequence', () => {
    const section = deriveStory(
      seedWorkspace.project,
      seedWorkspace.breadcrumbs,
    )[1]
    const html = renderToStaticMarkup(
      <StorySequence
        breadcrumbs={seedWorkspace.breadcrumbs}
        onTrace={() => undefined}
        section={section}
      />,
    )

    expect(html).toContain('Sequence basis')
    expect(html).toContain('Recorded causal thread')
    expect(html).toContain('data-sequence-kind="recorded"')
    expect(html).toContain('aria-labelledby="story-sequence-turning-point"')
  })
})
