import { seedWorkspace } from './data'
import type { Workspace } from './types'

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

export function loadWorkspace(): Workspace {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return seedWorkspace
    const parsed: unknown = JSON.parse(saved)
    return isWorkspace(parsed) ? parsed : seedWorkspace
  } catch {
    return seedWorkspace
  }
}

export function saveWorkspace(workspace: Workspace) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}
