import type { Breadcrumb, Workspace } from './types'

export function recordBreadcrumb(
  workspace: Workspace,
  breadcrumb: Breadcrumb,
): Workspace {
  const nextGoal = breadcrumb.nextGoal
  const project = nextGoal && nextGoal !== workspace.project.currentGoal
    ? { ...workspace.project, currentGoal: nextGoal }
    : workspace.project

  return {
    ...workspace,
    project,
    breadcrumbs: [...workspace.breadcrumbs, breadcrumb],
  }
}
