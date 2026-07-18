export const breadcrumbTypes = [
  'Decision',
  'Change',
  'Experiment',
  'Discovery',
  'Milestone',
] as const

export type BreadcrumbType = (typeof breadcrumbTypes)[number]

export interface Project {
  id: string
  name: string
  description: string
  currentGoal: string
  createdAt: string
}

export interface Breadcrumb {
  id: string
  projectId: string
  buildsOnId?: string
  type: BreadcrumbType
  title: string
  whatHappened: string
  why: string
  outcome: string
  occurredAt: string
  sourceLinks: string[]
}

export interface Workspace {
  project: Project
  breadcrumbs: Breadcrumb[]
}
