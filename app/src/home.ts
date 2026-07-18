import type { Breadcrumb, Project } from './types'
import { sortChronologically } from './story'

export interface OpenThread {
  id: string
  label: string
  title: string
  detail: string
  sourceId?: string
}

/**
 * Keep Home grounded in the workspace's existing memory. The current goal is
 * always an open thread; breadcrumbs without an outcome are additional
 * unresolved context worth returning to.
 */
export function deriveOpenThreads(
  project: Project,
  breadcrumbs: Breadcrumb[],
): OpenThread[] {
  const ordered = sortChronologically(breadcrumbs)
  const goalSource = [...ordered]
    .reverse()
    .find(({ nextGoal }) => nextGoal === project.currentGoal)

  const threads: OpenThread[] = project.currentGoal
    ? [{
        id: 'current-goal',
        label: 'Focus in progress',
        title: project.currentGoal,
        detail: goalSource
          ? `Set by “${goalSource.title}” and still in progress.`
          : 'No breadcrumb explains when this focus became the priority yet.',
        sourceId: goalSource?.id,
      }]
    : []

  const unresolved = ordered
    .filter(({ outcome }) => !outcome.trim())
    .reverse()
    .filter(({ id }) => id !== goalSource?.id)
    .slice(0, 2)

  return [
    ...threads,
    ...unresolved.map((breadcrumb) => ({
      id: `outcome-${breadcrumb.id}`,
      label: 'Needs an outcome',
      title: breadcrumb.title,
      detail: 'This moment is recorded, but its consequence has not been captured yet.',
      sourceId: breadcrumb.id,
    })),
  ]
}
