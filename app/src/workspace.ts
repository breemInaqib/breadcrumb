import { attachEvidenceToBreadcrumb } from './evidence'
import { isGitHubCommitReference, isGitHubRepository } from './github'
import type { Breadcrumb, Project, Workspace } from './types'

function withActiveProject(workspace: Workspace, project: Project): Workspace {
  return {
    ...workspace,
    project,
    projects: workspace.projects.map((candidate) =>
      candidate.id === project.id ? project : candidate,
    ),
  }
}

function evidenceMatchesProject(breadcrumb: Breadcrumb, project: Project): boolean {
  return breadcrumb.evidence.every((evidence) => {
    if (evidence.kind !== 'GitHub commit') return true
    return Boolean(
      project.githubRepository &&
      evidence.repository === project.githubRepository &&
      evidence.commitSha &&
      evidence.url &&
      isGitHubCommitReference(
        evidence.url,
        project.githubRepository,
        evidence.commitSha,
      ),
    )
  })
}

export function createProject(workspace: Workspace, project: Project): Workspace {
  if (workspace.projects.some(({ id }) => id === project.id)) return workspace
  return {
    ...workspace,
    project,
    projects: [...workspace.projects, project],
  }
}

export function openProject(workspace: Workspace, projectId: string): Workspace {
  const project = workspace.projects.find((candidate) => candidate.id === projectId)
  return project ? { ...workspace, project } : workspace
}

export function updateProjectGitHubRepository(
  workspace: Workspace,
  projectId: string,
  repository: string,
): Workspace {
  const project = workspace.projects.find((candidate) => candidate.id === projectId)
  const nextRepository = repository.trim() || undefined
  if (!project || (nextRepository && !isGitHubRepository(nextRepository))) return workspace

  const recordedRepositories = new Set(
    workspace.breadcrumbs
      .filter((breadcrumb) => breadcrumb.projectId === projectId)
      .flatMap((breadcrumb) => breadcrumb.evidence)
      .filter((evidence) => evidence.kind === 'GitHub commit')
      .map((evidence) => evidence.repository)
      .filter((value): value is string => Boolean(value)),
  )
  if (
    recordedRepositories.size > 0 &&
    (recordedRepositories.size !== 1 || !recordedRepositories.has(nextRepository ?? ''))
  ) return workspace

  const updatedProject = { ...project, githubRepository: nextRepository }
  return {
    ...withActiveProject(workspace, updatedProject),
    project: workspace.project.id === projectId ? updatedProject : workspace.project,
  }
}

export function requiresGoalForEdit(
  editingBreadcrumbId: string | undefined,
  currentGoalSourceId: string | undefined,
) {
  return Boolean(
    editingBreadcrumbId &&
      currentGoalSourceId &&
      editingBreadcrumbId === currentGoalSourceId,
  )
}

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
  if (
    breadcrumb.projectId !== workspace.project.id ||
    workspace.breadcrumbs.some(({ id }) => id === breadcrumb.id) ||
    !evidenceMatchesProject(breadcrumb, workspace.project)
  ) return workspace

  const persistedBreadcrumb = {
    ...breadcrumb,
    evidence: attachEvidenceToBreadcrumb(
      breadcrumb.evidence,
      workspace.project.id,
      breadcrumb.id,
    ),
  }
  const nextGoal = persistedBreadcrumb.nextGoal
  const project = nextGoal && nextGoal !== workspace.project.currentGoal
    ? { ...workspace.project, currentGoal: nextGoal }
    : workspace.project

  return {
    ...withActiveProject(workspace, project),
    breadcrumbs: [...workspace.breadcrumbs, persistedBreadcrumb],
  }
}

export function updateBreadcrumb(
  workspace: Workspace,
  breadcrumb: Breadcrumb,
): Workspace {
  const existing = workspace.breadcrumbs.find(({ id }) => id === breadcrumb.id)
  if (
    !existing ||
    existing.projectId !== workspace.project.id ||
    breadcrumb.projectId !== existing.projectId ||
    !evidenceMatchesProject(breadcrumb, workspace.project)
  ) {
    return workspace
  }

  const persistedBreadcrumb = {
    ...breadcrumb,
    projectId: existing.projectId,
    evidence: attachEvidenceToBreadcrumb(
      breadcrumb.evidence,
      existing.projectId,
      existing.id,
    ),
  }

  const breadcrumbs = workspace.breadcrumbs.map((existing) =>
    existing.id === persistedBreadcrumb.id ? persistedBreadcrumb : existing,
  )
  const latestGoal = [...breadcrumbs]
    .filter(({ nextGoal }) => Boolean(nextGoal))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0]
    ?.nextGoal

  const project = latestGoal
    ? { ...workspace.project, currentGoal: latestGoal }
    : workspace.project

  return {
    ...withActiveProject(workspace, project),
    breadcrumbs,
  }
}
