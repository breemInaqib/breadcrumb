import { seedWorkspace } from './data'
import type { Project, Workspace } from './types'

export const STORAGE_KEY = 'breadcrumb.project-workspace.v1'

function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Workspace>
  return Boolean(
    candidate.project &&
      typeof candidate.project.name === 'string' &&
      Array.isArray(candidate.breadcrumbs),
  )
}

function normalizeWorkspace(workspace: Workspace): Workspace {
  const savedProjects = (workspace as Workspace & { projects?: Project[] }).projects
  const projects = savedProjects?.some(({ id }) => id === workspace.project.id)
    ? savedProjects
    : [workspace.project, ...(savedProjects ?? []).filter(({ id }) => id !== workspace.project.id)]

  return { ...workspace, projects }
}

export function loadWorkspace(): Workspace {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return seedWorkspace
    const parsed: unknown = JSON.parse(saved)
    return isWorkspace(parsed) ? normalizeWorkspace(parsed) : seedWorkspace
  } catch {
    return seedWorkspace
  }
}

export function saveWorkspace(workspace: Workspace) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}
