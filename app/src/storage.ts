import { seedWorkspace } from './data'
import { isGitHubCommitReference, isGitHubRepository } from './github'
import { breadcrumbTypes, evidenceKinds, type Breadcrumb, type Evidence, type EvidenceKind, type Project, type Workspace } from './types'

export const STORAGE_KEY = 'breadcrumb.project-workspace.v1'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function date(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) return fallback
  return new Date(value).toISOString()
}

function url(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : undefined
  } catch {
    return undefined
  }
}

function normalizeProject(value: unknown): Project | undefined {
  if (!isRecord(value)) return undefined
  const id = text(value.id)
  const name = text(value.name)
  const description = text(value.description)
  const currentGoal = text(value.currentGoal)
  const createdAt = date(value.createdAt, '')
  if (!id || !name || !description || !currentGoal || !createdAt) return undefined

  const repository = text(value.githubRepository)
  return {
    id,
    name,
    description,
    currentGoal,
    createdAt,
    githubRepository: repository && isGitHubRepository(repository) ? repository : undefined,
  }
}

function defaultSource(kind: EvidenceKind): string {
  if (kind === 'GitHub commit') return 'GitHub'
  if (kind === 'Link') return 'Web link'
  if (kind === 'File upload') return 'Local file'
  return 'Manual record'
}

function normalizeEvidence(
  value: unknown,
  projectId: string,
  breadcrumbId: string,
  occurredAt: string,
  index: number,
): Evidence | undefined {
  if (!isRecord(value) || !evidenceKinds.includes(value.kind as EvidenceKind)) return undefined

  const kind = value.kind as EvidenceKind
  const destination = url(value.url)
  const source = text(value.source) ?? defaultSource(kind)
  const repository = text(value.repository) ??
    (kind === 'GitHub commit' && isGitHubRepository(source) ? source : undefined)
  const commitSha = text(value.commitSha)
  const filename = text(value.filename)
  const fileDataUrl = typeof value.fileDataUrl === 'string' &&
    value.fileDataUrl.startsWith('data:') &&
    value.fileDataUrl.length <= 2_100_000
    ? value.fileDataUrl
    : undefined

  if (kind === 'Link' && !destination) return undefined
  if (
    kind === 'GitHub commit' &&
    (!destination || !repository || !commitSha ||
      !isGitHubCommitReference(destination, repository, commitSha))
  ) return undefined
  if (kind === 'File upload' && (!filename || !fileDataUrl)) return undefined

  const title = text(value.title) ?? (kind === 'Link' ? destination : filename)
  if (!title) return undefined

  const sizeBytes = typeof value.sizeBytes === 'number' &&
    Number.isFinite(value.sizeBytes) &&
    value.sizeBytes >= 0 &&
    value.sizeBytes <= 1_500_000
    ? value.sizeBytes
    : undefined

  return {
    id: text(value.id) ?? `recovered-evidence-${breadcrumbId}-${index}`,
    projectId,
    breadcrumbId,
    kind,
    source: kind === 'GitHub commit' ? repository! : source,
    title,
    capturedAt: date(value.capturedAt, occurredAt),
    sourceTimestamp: text(value.sourceTimestamp)
      ? date(value.sourceTimestamp, occurredAt)
      : undefined,
    url: kind === 'Manual note' || kind === 'File upload' ? undefined : destination,
    filename: kind === 'File upload' ? filename : undefined,
    mimeType: kind === 'File upload' ? text(value.mimeType) ?? 'application/octet-stream' : undefined,
    sizeBytes: kind === 'File upload' ? sizeBytes : undefined,
    fileDataUrl: kind === 'File upload' ? fileDataUrl : undefined,
    repository: kind === 'GitHub commit' ? repository : undefined,
    commitSha: kind === 'GitHub commit' ? commitSha : undefined,
    author: kind === 'GitHub commit' ? text(value.author) : undefined,
    note: text(value.note),
  }
}

function normalizeBreadcrumb(
  value: unknown,
  fallbackProjectId: string,
  knownProjectIds: Set<string>,
  index: number,
): Breadcrumb | undefined {
  if (!isRecord(value)) return undefined
  const projectId = text(value.projectId) ?? fallbackProjectId
  if (!knownProjectIds.has(projectId)) return undefined
  const id = text(value.id) ?? `recovered-breadcrumb-${index}`
  const occurredAt = date(value.occurredAt, new Date().toISOString())
  const rawEvidence = Array.isArray(value.evidence) ? value.evidence : []
  const evidence = rawEvidence
    .map((item, evidenceIndex) => normalizeEvidence(item, projectId, id, occurredAt, evidenceIndex))
    .filter((item): item is Evidence => Boolean(item))

  if (!Array.isArray(value.evidence) && Array.isArray(value.sourceLinks)) {
    value.sourceLinks.forEach((legacyLink, evidenceIndex) => {
      const destination = url(legacyLink)
      if (!destination) return
      evidence.push({
        id: `legacy-link-${id}-${evidenceIndex}`,
        projectId,
        breadcrumbId: id,
        kind: 'Link',
        source: 'Web link',
        title: destination,
        capturedAt: occurredAt,
        url: destination,
      })
    })
  }

  const type = breadcrumbTypes.includes(value.type as Breadcrumb['type'])
    ? value.type as Breadcrumb['type']
    : 'Discovery'

  return {
    id,
    projectId,
    buildsOnId: text(value.buildsOnId),
    nextGoal: text(value.nextGoal),
    type,
    title: text(value.title) ?? 'Untitled recorded moment',
    whatHappened: text(value.whatHappened) ?? 'This saved moment has incomplete details.',
    why: text(value.why) ?? 'The original reasoning was not available.',
    outcome: typeof value.outcome === 'string' ? value.outcome.trim() : '',
    occurredAt,
    evidence,
  }
}

function normalizeWorkspaceValue(value: unknown): Workspace | undefined {
  if (!isRecord(value)) return undefined
  const activeProject = normalizeProject(value.project)
  if (!activeProject) return undefined

  const projectCandidates = Array.isArray(value.projects)
    ? value.projects.map(normalizeProject)
    : []
  const projects = [activeProject, ...projectCandidates]
    .filter((project): project is Project => Boolean(project))
    .filter((project, index, all) => all.findIndex(({ id }) => id === project.id) === index)
  const activeProjectId = activeProject.id

  const knownProjectIds = new Set(projects.map(({ id }) => id))
  const breadcrumbs = (Array.isArray(value.breadcrumbs) ? value.breadcrumbs : [])
    .map((breadcrumb, index) => normalizeBreadcrumb(
      breadcrumb,
      activeProjectId,
      knownProjectIds,
      index,
    ))
    .filter((breadcrumb): breadcrumb is Breadcrumb => Boolean(breadcrumb))
    .filter((breadcrumb, index, all) => all.findIndex(({ id }) => id === breadcrumb.id) === index)

  const byId = new Map(breadcrumbs.map((breadcrumb) => [breadcrumb.id, breadcrumb]))
  const safeBreadcrumbs = breadcrumbs.map((breadcrumb) => {
    const predecessor = breadcrumb.buildsOnId ? byId.get(breadcrumb.buildsOnId) : undefined
    if (!predecessor || predecessor.projectId !== breadcrumb.projectId || predecessor.occurredAt > breadcrumb.occurredAt) {
      return { ...breadcrumb, buildsOnId: undefined }
    }

    const visited = new Set([breadcrumb.id])
    let cursor: Breadcrumb | undefined = predecessor
    while (cursor) {
      if (visited.has(cursor.id)) return { ...breadcrumb, buildsOnId: undefined }
      visited.add(cursor.id)
      cursor = cursor.buildsOnId ? byId.get(cursor.buildsOnId) : undefined
    }
    return breadcrumb
  })

  const repositoriesByProject = new Map<string, Set<string>>()
  safeBreadcrumbs.forEach((breadcrumb) => {
    breadcrumb.evidence.forEach((evidence) => {
      if (evidence.kind !== 'GitHub commit' || !evidence.repository) return
      const repositories = repositoriesByProject.get(breadcrumb.projectId) ?? new Set<string>()
      repositories.add(evidence.repository)
      repositoriesByProject.set(breadcrumb.projectId, repositories)
    })
  })
  const configuredProjects = projects.map((candidate) => {
    const repositories = repositoriesByProject.get(candidate.id)
    if (candidate.githubRepository || repositories?.size !== 1) return candidate
    return { ...candidate, githubRepository: [...repositories][0] }
  })
  const projectById = new Map(configuredProjects.map((candidate) => [candidate.id, candidate]))
  const breadcrumbsWithConsistentRepositories = safeBreadcrumbs.map((breadcrumb) => ({
    ...breadcrumb,
    evidence: breadcrumb.evidence.filter((evidence) =>
      evidence.kind !== 'GitHub commit' ||
      Boolean(
        projectById.get(breadcrumb.projectId)?.githubRepository &&
        evidence.repository?.toLowerCase() ===
          projectById.get(breadcrumb.projectId)?.githubRepository?.toLowerCase(),
      ),
    ),
  }))
  const project = projectById.get(activeProjectId) ?? configuredProjects[0]
  if (!project) return undefined

  return {
    project,
    projects: configuredProjects,
    breadcrumbs: breadcrumbsWithConsistentRepositories,
  }
}

export function normalizeWorkspace(value: unknown): Workspace {
  return normalizeWorkspaceValue(value) ?? normalizeWorkspaceValue(seedWorkspace)!
}

export function loadWorkspace(): Workspace {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? normalizeWorkspace(JSON.parse(saved)) : normalizeWorkspace(seedWorkspace)
  } catch {
    return normalizeWorkspace(seedWorkspace)
  }
}

export function saveWorkspace(workspace: Workspace): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeWorkspace(workspace)))
    return true
  } catch {
    return false
  }
}
