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
})
