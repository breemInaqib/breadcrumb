import { isGitHubCommitReference } from './github'
import type { Evidence, EvidenceDraft, EvidenceKind } from './types'

export function attachEvidenceToBreadcrumb(
  evidence: EvidenceDraft[],
  projectId: string,
  breadcrumbId: string,
): Evidence[] {
  return evidence.map((item) => ({ ...item, projectId, breadcrumbId }))
}

export function evidenceLabel(evidence: Evidence): string {
  if (evidence.kind === 'GitHub commit' && evidence.commitSha) {
    return `${evidence.title} · ${evidence.source} · ${evidence.commitSha.slice(0, 7)}`
  }
  return evidence.title
}

export function validateEvidence(
  kind: EvidenceKind,
  title: string,
  url: string,
  commitSha: string,
  hasFile = false,
  repository?: string,
): string | undefined {
  if (!title.trim()) return 'Give this evidence a title.'
  if (kind === 'Manual note') return undefined
  if (kind === 'File upload') {
    return hasFile ? undefined : 'Choose a file to attach as evidence.'
  }
  if (!url.trim()) return 'Add the source URL for this evidence.'
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
  } catch {
    return 'Enter a full link beginning with http:// or https://.'
  }
  if (kind === 'GitHub commit' && !commitSha.trim()) {
    return 'Add the commit SHA so this change remains identifiable.'
  }
  if (kind === 'GitHub commit' && !repository) {
    return 'Associate this project with one GitHub repository before adding a commit.'
  }
  if (
    kind === 'GitHub commit' &&
    !isGitHubCommitReference(url, repository!, commitSha)
  ) {
    return 'Use a commit URL from this project’s configured GitHub repository.'
  }
  return undefined
}
