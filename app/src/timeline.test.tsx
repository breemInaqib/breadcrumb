import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Timeline } from './App'
import { seedWorkspace } from './data'

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

  it('renders an identifiable source while preserving its full destination', () => {
    const link = 'https://research.example.com/projects/patchwork/pilot-evidence'
    const breadcrumb = {
      ...seedWorkspace.breadcrumbs[0],
      sourceLinks: [link],
    }
    const html = renderToStaticMarkup(<Timeline breadcrumbs={[breadcrumb]} />)

    expect(html).toContain('research.example.com/projects/patchwork/pilot-evidence')
    expect(html).toContain(`href="${link}"`)
    expect(html).toContain('target="_blank"')
    expect(html).toContain('(opens in a new tab)')
  })
})
