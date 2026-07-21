export const breadcrumbTypes = [
  'Decision',
  'Change',
  'Experiment',
  'Discovery',
  'Milestone',
] as const

export type BreadcrumbType = (typeof breadcrumbTypes)[number]

export const evidenceKinds = ['Manual note', 'Link', 'GitHub commit', 'File upload'] as const

export type EvidenceKind = (typeof evidenceKinds)[number]

export interface Evidence {
  id: string
  /** The project record this source belongs to. */
  projectId: string
  /** The meaningful moment this source supports. */
  breadcrumbId: string
  kind: EvidenceKind
  source: string
  title: string
  capturedAt: string
  sourceTimestamp?: string
  url?: string
  filename?: string
  mimeType?: string
  sizeBytes?: number
  fileDataUrl?: string
  repository?: string
  commitSha?: string
  author?: string
  note?: string
}

/** Evidence before it is deliberately attached to a saved breadcrumb. */
export type EvidenceDraft = Omit<Evidence, 'projectId' | 'breadcrumbId'>

export interface Project {
  id: string
  name: string
  description: string
  currentGoal: string
  createdAt: string
  githubRepository?: string
}

export interface Breadcrumb {
  id: string
  projectId: string
  buildsOnId?: string
  nextGoal?: string
  type: BreadcrumbType
  title: string
  whatHappened: string
  why: string
  outcome: string
  occurredAt: string
  evidence: Evidence[]
  /** @deprecated Read only for migration from saved V1 workspaces. */
  sourceLinks?: string[]
}

export interface Workspace {
  project: Project
  projects: Project[]
  breadcrumbs: Breadcrumb[]
}
