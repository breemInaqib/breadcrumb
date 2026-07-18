import type { Breadcrumb, Workspace } from './types'

export function getEligiblePredecessors(
  breadcrumbs: Breadcrumb[],
  breadcrumbId: string | undefined,
  occurredAt: string,
): Breadcrumb[] {
  const byId = new Map(breadcrumbs.map((breadcrumb) => [breadcrumb.id, breadcrumb]))

  return [...breadcrumbs]
    .filter((candidate) => {
      if (candidate.id === breadcrumbId || candidate.occurredAt > occurredAt) {
        return false
      }

      if (!breadcrumbId) return true

      const visited = new Set<string>()
      let cursor: Breadcrumb | undefined = candidate

      while (cursor?.buildsOnId && !visited.has(cursor.id)) {
        if (cursor.buildsOnId === breadcrumbId) return false
        visited.add(cursor.id)
        cursor = byId.get(cursor.buildsOnId)
      }

      return true
    })
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
}

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

export function updateBreadcrumb(
  workspace: Workspace,
  breadcrumb: Breadcrumb,
): Workspace {
  if (!workspace.breadcrumbs.some(({ id }) => id === breadcrumb.id)) {
    return workspace
  }

  const breadcrumbs = workspace.breadcrumbs.map((existing) =>
    existing.id === breadcrumb.id ? breadcrumb : existing,
  )
  const latestGoal = [...breadcrumbs]
    .filter(({ nextGoal }) => Boolean(nextGoal))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0]
    ?.nextGoal

  return {
    ...workspace,
    project: latestGoal
      ? { ...workspace.project, currentGoal: latestGoal }
      : workspace.project,
    breadcrumbs,
  }
}
