import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  GitCommit,
  History,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import {
  breadcrumbTypes,
  type Breadcrumb,
  type BreadcrumbType,
  evidenceKinds,
  type Evidence,
  type EvidenceDraft,
  type EvidenceKind,
  type Project,
} from './types'
import { loadWorkspace, saveWorkspace } from './storage'
import {
  deriveStory,
  sortChronologically,
  type StorySection,
} from './story'
import { attachEvidenceToBreadcrumb, evidenceLabel, validateEvidence } from './evidence'
import { fetchRecentCommits, isGitHubRepository, type GitHubCommit } from './github'
import {
  createProject,
  getEligiblePredecessors,
  openProject,
  recordBreadcrumb,
  requiresGoalForEdit,
  updateProjectGitHubRepository,
  updateBreadcrumb,
} from './workspace'
import { deriveOpenThreads, type OpenThread } from './home'

type View = 'overview' | 'history' | 'story'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const inputDate = new Date().toISOString().slice(0, 10)

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

function formatMonthYear(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}

function useDialogFocus(initialFocusSelector?: string) {
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previouslyFocused = document.activeElement
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')
    const initialFocus = initialFocusSelector
      ? dialog.querySelector<HTMLElement>(initialFocusSelector)
      : dialog
    const frame = window.requestAnimationFrame(() => initialFocus?.focus())

    function keepFocusInside(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        dialog!.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog!.focus()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    dialog.addEventListener('keydown', keepFocusInside)
    return () => {
      window.cancelAnimationFrame(frame)
      dialog.removeEventListener('keydown', keepFocusInside)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [initialFocusSelector])

  return dialogRef
}

function TypeLabel({ type }: { type: BreadcrumbType }) {
  return <span className={`type-label type-${type.toLowerCase()}`}>{type}</span>
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) return null

  return (
    <div className="evidence-list" aria-label="Supporting evidence">
      <div className="evidence-list-heading">
        <span>Evidence</span>
        <small>{evidence.length} recorded {evidence.length === 1 ? 'source' : 'sources'}</small>
      </div>
      <ul>
        {evidence.map((item) => (
          <li key={item.id}>
            <div className="evidence-kind">
              {item.kind === 'GitHub commit' && <GitCommit size={13} aria-hidden="true" />}
              <span>{item.kind}</span>
            </div>
            <div className="evidence-copy">
              {item.fileDataUrl ? (
                <a download={item.filename} href={item.fileDataUrl} title={item.filename}>
                  {item.title} <span className="sr-only">(downloads file)</span>
                </a>
              ) : item.url ? (
                <a href={item.url} rel="noreferrer" target="_blank" title={item.url}>
                  {evidenceLabel(item)} <ExternalLink size={12} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <strong>{evidenceLabel(item)}</strong>
              )}
              <small>
                {item.repository ?? item.source} · <time dateTime={item.capturedAt}>{formatDate(item.capturedAt)}</time>
                {item.sourceTimestamp && <> · source dated {formatDate(item.sourceTimestamp)}</>}
                {item.author && <> · {item.author}</>}
                {item.filename && <> · {item.filename}{item.sizeBytes !== undefined ? ` (${Math.ceil(item.sizeBytes / 1024)} KB)` : ''}</>}
              </small>
              {item.note && <p>{item.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface TimelineProps {
  breadcrumbs: Breadcrumb[]
  highlightedId?: string
  limit?: number
  onEdit?: (breadcrumb: Breadcrumb) => void
  onTrace?: (breadcrumbId: string) => void
}

export function Timeline({
  breadcrumbs,
  highlightedId,
  limit,
  onEdit,
  onTrace,
}: TimelineProps) {
  const ordered = sortChronologically(breadcrumbs)
  const visible = limit ? ordered.slice(-limit) : ordered

  return (
    <ol className="timeline" aria-label="Project history">
      {visible.map((breadcrumb) => {
        const buildsOn = breadcrumbs.find(({ id }) => id === breadcrumb.buildsOnId)
        const isHighlighted = breadcrumb.id === highlightedId

        return (
          <li
            aria-current={isHighlighted ? 'true' : undefined}
            className={`timeline-entry ${isHighlighted ? 'is-traced' : ''}`}
            id={`breadcrumb-${breadcrumb.id}`}
            key={breadcrumb.id}
            tabIndex={isHighlighted ? -1 : undefined}
          >
            <div className="timeline-date">
              <time dateTime={breadcrumb.occurredAt}>{formatDate(breadcrumb.occurredAt)}</time>
            </div>
            <div className="timeline-marker" aria-hidden="true" />
            <article className="timeline-content">
              {isHighlighted && <p className="trace-arrival">Traced source</p>}
              <div className="entry-heading">
                <div className="entry-title">
                  <TypeLabel type={breadcrumb.type} />
                  <h3>{breadcrumb.title}</h3>
                </div>
                {onEdit && (
                  <button
                    aria-label={`Edit ${breadcrumb.title}`}
                    className="entry-edit"
                    onClick={() => onEdit(breadcrumb)}
                    type="button"
                  >
                    <Pencil size={13} aria-hidden="true" />
                    Edit
                  </button>
                )}
              </div>
              {buildsOn && onTrace && (
                <button
                  aria-label={`Builds on ${buildsOn.title}; trace earlier breadcrumb`}
                  className="causal-link"
                  onClick={() => onTrace(buildsOn.id)}
                  type="button"
                >
                  <span>Builds on</span>
                  <TypeLabel type={buildsOn.type} />
                  <strong>{buildsOn.title}</strong>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
              {breadcrumb.nextGoal && (
                <div className="goal-transition">
                  <h4>Current goal became</h4>
                  <p>{breadcrumb.nextGoal}</p>
                </div>
              )}
              <div className="entry-details">
                <div>
                  <h4>What happened</h4>
                  <p>{breadcrumb.whatHappened}</p>
                </div>
                <div>
                  <h4>Why it mattered</h4>
                  <p>{breadcrumb.why}</p>
                </div>
                {breadcrumb.outcome && (
                  <div>
                    <h4>Outcome</h4>
                    <p>{breadcrumb.outcome}</p>
                  </div>
                )}
              </div>
              <EvidenceList evidence={breadcrumb.evidence} />
            </article>
          </li>
        )
      })}
    </ol>
  )
}

interface StoryEvidenceProps {
  breadcrumbs: Breadcrumb[]
  onTrace: (breadcrumbId: string) => void
  sourceIds: string[]
}

export function StoryEvidence({
  breadcrumbs,
  onTrace,
  sourceIds,
}: StoryEvidenceProps) {
  return (
    <div className="citations">
      <span>Supported by the project record</span>
      <ul aria-label="Supporting breadcrumbs">
        {sourceIds.map((sourceId) => {
          const source = breadcrumbs.find(({ id }) => id === sourceId)
          if (!source) return null
          const predecessor = breadcrumbs.find(
            ({ id }) => id === source.buildsOnId,
          )

          return (
            <li key={sourceId}>
              <button
                className="citation-source"
                onClick={() => onTrace(sourceId)}
              >
                <TypeLabel type={source.type} />
                {source.title}
                {source.evidence.length > 0 && (
                  <small>{source.evidence.length} evidence {source.evidence.length === 1 ? 'source' : 'sources'}</small>
                )}
                <ArrowRight size={13} aria-hidden="true" />
              </button>
              {predecessor && (
                <button
                  aria-label={`Builds on ${predecessor.title}; trace earlier breadcrumb`}
                  className="causal-link citation-predecessor"
                  onClick={() => onTrace(predecessor.id)}
                  type="button"
                >
                  <span>Builds on</span>
                  <TypeLabel type={predecessor.type} />
                  <strong>{predecessor.title}</strong>
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface StorySequenceProps {
  breadcrumbs: Breadcrumb[]
  onTrace: (breadcrumbId: string) => void
  section: StorySection
}

export function StorySequence({
  breadcrumbs,
  onTrace,
  section,
}: StorySequenceProps) {
  if (!section.beats) return null
  const labelId = `story-sequence-${section.id}`
  const sequenceLabel = section.sequenceLabel ?? 'Project sequence'

  return (
    <>
      <p
        className="story-sequence-provenance"
        data-sequence-kind={section.sequenceKind}
        id={labelId}
      >
        <span>Sequence basis</span>
        <strong>{sequenceLabel}</strong>
      </p>
      <ol aria-labelledby={labelId} className="story-beats">
        {section.beats.map((beat) => {
          const source = breadcrumbs.find(({ id }) => id === beat.sourceId)
          if (!source) return null
          return (
            <li className="story-beat" key={beat.sourceId}>
              <div className="story-beat-relation">{beat.relation}</div>
              <div>
                <div className="story-beat-heading">
                  <TypeLabel type={source.type} />
                  <h3>{source.title}</h3>
                </div>
                <p>{beat.summary}</p>
                {source.evidence.length > 0 && <small className="story-beat-evidence">{source.evidence.length} supporting {source.evidence.length === 1 ? 'source' : 'sources'} in History</small>}
                <button
                  aria-label={`Trace ${source.title} in project history`}
                  onClick={() => onTrace(source.id)}
                >
                  Trace source
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

interface OpenThreadsProps {
  onEdit?: (breadcrumb: Breadcrumb) => void
  onTrace: (breadcrumbId: string) => void
  threads: OpenThread[]
  breadcrumbs: Breadcrumb[]
}

function OpenThreads({
  onEdit,
  onTrace,
  threads,
  breadcrumbs,
}: OpenThreadsProps) {
  return (
    <section className="open-threads" aria-labelledby="open-threads-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Context that has not closed yet</p>
          <h2 id="open-threads-heading">Open threads</h2>
        </div>
        <p className="section-note">
          Derived from the current goal and moments without a recorded outcome.
        </p>
      </div>
      <div className="thread-list">
        {threads.map((thread) => {
          const source = thread.sourceId
            ? breadcrumbs.find(({ id }) => id === thread.sourceId)
            : undefined

          return (
            <article className="thread-card" key={thread.id}>
              <p className="eyebrow">{thread.label}</p>
              <h3>{thread.title}</h3>
              <p>{thread.detail}</p>
              {source && (
                <button
                  className="text-button"
                  onClick={() => {
                    if (thread.label === 'Needs an outcome' && onEdit) {
                      onEdit(source)
                      return
                    }
                    onTrace(source.id)
                  }}
                >
                  {thread.label === 'Needs an outcome'
                    ? 'Record the outcome'
                    : 'Review the source'}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

interface RecentProgressProps {
  breadcrumbs: Breadcrumb[]
  onTrace: (breadcrumbId: string) => void
}

function RecentProgress({ breadcrumbs, onTrace }: RecentProgressProps) {
  const recent = sortChronologically(breadcrumbs).slice(-3).reverse()

  return (
    <ol className="recent-progress-list" aria-label="Recent progress">
      {recent.map((breadcrumb) => (
        <li className="recent-progress-item" key={breadcrumb.id}>
          <div className="recent-progress-meta">
            <TypeLabel type={breadcrumb.type} />
            <time dateTime={breadcrumb.occurredAt}>{formatDate(breadcrumb.occurredAt)}</time>
          </div>
          <div className="recent-progress-copy">
            <h3>{breadcrumb.title}</h3>
            <p>{breadcrumb.outcome || breadcrumb.whatHappened}</p>
          </div>
          <button
            aria-label={`Review ${breadcrumb.title}`}
            className="text-button"
            onClick={() => onTrace(breadcrumb.id)}
          >
            Review <ArrowRight size={15} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>
  )
}

interface EmptyMemoryProps {
  actionLabel?: string
  description: string
  eyebrow: string
  id: string
  onAdd: () => void
  showAction?: boolean
  title: string
}

function EmptyMemory({
  actionLabel = 'Add first breadcrumb',
  description,
  eyebrow,
  id,
  onAdd,
  showAction = true,
  title,
}: EmptyMemoryProps) {
  return (
    <section className="empty-memory" aria-labelledby={id}>
      <div className="empty-memory-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h3 id={id}>{title}</h3>
        <p>{description}</p>
      </div>
      {showAction && (
        <button className="button-primary" onClick={onAdd} type="button">
          <Plus size={17} aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </section>
  )
}

interface ProjectChooserProps {
  currentProject: Project
  onClose: () => void
  onCreate: (project: Project) => void
  onOpen: (projectId: string) => void
  onUpdateRepository: (repository: string) => string | undefined
  projects: Project[]
}

function ProjectChooser({
  currentProject,
  onClose,
  onCreate,
  onOpen,
  onUpdateRepository,
  projects,
}: ProjectChooserProps) {
  const dialogRef = useDialogFocus()
  const [repository, setRepository] = useState(currentProject.githubRepository ?? '')
  const [repositoryError, setRepositoryError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onCreate({
      id: crypto.randomUUID(),
      name: String(form.get('name')).trim(),
      description: String(form.get('description')).trim(),
      currentGoal: String(form.get('currentGoal')).trim(),
      createdAt: new Date().toISOString(),
      githubRepository: String(form.get('githubRepository') ?? '').trim() || undefined,
    })
  }

  function handleRepositorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = onUpdateRepository(repository)
    setRepositoryError(error ?? '')
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="project-chooser-title"
        aria-modal="true"
        className="project-chooser"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Your project memories</p>
            <h2 id="project-chooser-title">Projects</h2>
            <p>Each project keeps its own record of decisions, evidence, and the story those moments support.</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            <X size={19} aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="project-chooser-body">
          <section aria-labelledby="open-project-heading" className="project-list">
            <div className="project-section-heading">
              <p className="eyebrow">Continue a project memory</p>
              <h3 id="open-project-heading">Return to a project</h3>
            </div>
            {projects.map((project) => (
              <button
                aria-current={project.id === currentProject.id ? 'true' : undefined}
                className="project-choice"
                key={project.id}
                onClick={() => onOpen(project.id)}
                type="button"
              >
                <span className="project-choice-heading flex min-w-0 items-center justify-between gap-3">
                  <span>{project.id === currentProject.id ? 'Current' : 'Project'}</span>
                  {project.id !== currentProject.id && (
                    <ArrowUpRight
                      className="project-choice-affordance shrink-0"
                      size={15}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <strong>{project.name}</strong>
                <small>{project.currentGoal}</small>
              </button>
            ))}
          </section>

          <div className="project-actions">
            <form className="repository-form" onSubmit={handleRepositorySubmit}>
              <p className="eyebrow">Connected evidence</p>
              <h3>GitHub repository</h3>
              <p>One optional public repository can supply commit evidence for {currentProject.name}. Loading activity never creates a breadcrumb.</p>
              <label>
                <span>Repository <small>Optional</small></span>
                <input
                  aria-describedby="repository-helper"
                  onChange={(event) => { setRepository(event.target.value); setRepositoryError('') }}
                  pattern="[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"
                  placeholder="owner/repository"
                  value={repository}
                />
              </label>
              <small id="repository-helper">After a commit is attached, this association is kept to preserve its provenance.</small>
              {repositoryError && <p className="field-error" role="alert">{repositoryError}</p>}
              <button className="button-secondary" type="submit">Save repository</button>
            </form>

            <form className="project-form" onSubmit={handleSubmit}>
              <p className="eyebrow">Start a project memory</p>
              <h3>Create a project</h3>
              <label>
                <span>Project name</span>
                <input name="name" placeholder="e.g. First-run guide" required />
              </label>
              <label>
                <span>What is this work about?</span>
                <textarea name="description" placeholder="A concise description of the work" required rows={2} />
              </label>
              <label>
                <span>Where should it go next?</span>
                <textarea name="currentGoal" placeholder="The outcome this project is working toward" required rows={2} />
              </label>
              <label>
                <span>GitHub repository <small>Optional</small></span>
                <input name="githubRepository" pattern="[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+" placeholder="owner/repository" />
              </label>
              <button className="button-primary" type="submit">
                <Plus size={17} aria-hidden="true" />
                Create project
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

interface CaptureFormProps {
  breadcrumbs: Breadcrumb[]
  currentGoal: string
  editingBreadcrumb?: Breadcrumb
  onClose: () => void
  onSave: (breadcrumb: Breadcrumb) => void
  projectId: string
  githubRepository?: string
  requiresGoal: boolean
}

function CaptureForm({
  breadcrumbs,
  currentGoal,
  editingBreadcrumb,
  onClose,
  onSave,
  projectId,
  githubRepository,
  requiresGoal,
}: CaptureFormProps) {
  const dialogRef = useDialogFocus('[data-dialog-autofocus]')
  const [type, setType] = useState<BreadcrumbType>(
    editingBreadcrumb?.type ?? 'Decision',
  )
  const [buildsOnId, setBuildsOnId] = useState(
    editingBreadcrumb?.buildsOnId ?? '',
  )
  const [occurredAt, setOccurredAt] = useState(
    editingBreadcrumb?.occurredAt.slice(0, 10) ?? inputDate,
  )
  const [evidence, setEvidence] = useState<EvidenceDraft[]>(editingBreadcrumb?.evidence ?? [])
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('Manual note')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceSource, setEvidenceSource] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceCommitSha, setEvidenceCommitSha] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [evidenceCapturedAt, setEvidenceCapturedAt] = useState(
    editingBreadcrumb?.occurredAt.slice(0, 10) ?? inputDate,
  )
  const [evidenceSourceTimestamp, setEvidenceSourceTimestamp] = useState('')
  const [evidenceAuthor, setEvidenceAuthor] = useState('')
  const [evidenceError, setEvidenceError] = useState('')
  const [fileEvidence, setFileEvidence] = useState<Pick<Evidence, 'filename' | 'mimeType' | 'sizeBytes' | 'fileDataUrl'>>()
  const [recentCommits, setRecentCommits] = useState<GitHubCommit[]>([])
  const [githubError, setGithubError] = useState('')
  const [loadingCommits, setLoadingCommits] = useState(false)
  const isEditing = Boolean(editingBreadcrumb)
  const priorBreadcrumbs = occurredAt
    ? getEligiblePredecessors(
      breadcrumbs,
      editingBreadcrumb?.id,
      new Date(`${occurredAt}T23:59:59`).toISOString(),
    )
    : []

  function changeDate(nextDate: string) {
    setOccurredAt(nextDate)
    if (!nextDate) {
      setBuildsOnId('')
      return
    }
    if (!buildsOnId) return
    const nextLimit = new Date(`${nextDate}T23:59:59`).toISOString()
    const predecessorStillAvailable = getEligiblePredecessors(
      breadcrumbs,
      editingBreadcrumb?.id,
      nextLimit,
    ).some(({ id }) => id === buildsOnId)
    if (!predecessorStillAvailable) setBuildsOnId('')
  }

  function addEvidence() {
    if (!evidenceCapturedAt) {
      setEvidenceError('Choose when this evidence was recorded.')
      return
    }
    const error = validateEvidence(
      evidenceKind,
      evidenceTitle,
      evidenceUrl,
      evidenceCommitSha,
      Boolean(fileEvidence?.fileDataUrl),
      githubRepository,
    )
    if (error) {
      setEvidenceError(error)
      return
    }
    setEvidence((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind: evidenceKind,
        source: evidenceSource.trim() || (evidenceKind === 'GitHub commit' ? 'GitHub' : evidenceKind === 'Link' ? 'Web link' : 'Manual record'),
        title: evidenceTitle.trim(),
        capturedAt: new Date(`${evidenceCapturedAt}T12:00:00`).toISOString(),
        url: evidenceKind === 'Manual note' ? undefined : evidenceUrl.trim(),
        commitSha: evidenceKind === 'GitHub commit' ? evidenceCommitSha.trim() : undefined,
        note: evidenceNote.trim() || undefined,
        filename: evidenceKind === 'File upload' ? fileEvidence?.filename : undefined,
        mimeType: evidenceKind === 'File upload' ? fileEvidence?.mimeType : undefined,
        sizeBytes: evidenceKind === 'File upload' ? fileEvidence?.sizeBytes : undefined,
        fileDataUrl: evidenceKind === 'File upload' ? fileEvidence?.fileDataUrl : undefined,
        repository: evidenceKind === 'GitHub commit' ? githubRepository : undefined,
        author: evidenceKind === 'GitHub commit' ? evidenceAuthor.trim() || undefined : undefined,
        sourceTimestamp: evidenceSourceTimestamp
          ? new Date(`${evidenceSourceTimestamp}T12:00:00`).toISOString()
          : undefined,
      },
    ])
    setEvidenceTitle('')
    setEvidenceSource('')
    setEvidenceUrl('')
    setEvidenceCommitSha('')
    setEvidenceNote('')
    setFileEvidence(undefined)
    setEvidenceCapturedAt(occurredAt)
    setEvidenceSourceTimestamp('')
    setEvidenceAuthor('')
    setEvidenceError('')
  }

  async function selectFile(file?: File) {
    if (!file) return
    if (file.size > 1_500_000) {
      setEvidenceError('Files must be 1.5 MB or smaller in this local-first prototype.')
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject()
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    }).catch(() => '')
    if (!dataUrl) {
      setEvidenceError('This file could not be read. Choose another file and try again.')
      return
    }
    setEvidenceKind('File upload')
    setEvidenceTitle(file.name)
    setEvidenceSource('Local file')
    setFileEvidence({ filename: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, fileDataUrl: dataUrl })
    setEvidenceError('')
  }

  async function loadRecentCommits() {
    if (!githubRepository) {
      setGithubError('Associate this project with a GitHub repository when creating it before loading commits.')
      return
    }
    setLoadingCommits(true)
    setGithubError('')
    try {
      setRecentCommits(await fetchRecentCommits(githubRepository))
    } catch (error) {
      setGithubError(error instanceof Error ? error.message : 'GitHub could not load commits.')
    } finally {
      setLoadingCommits(false)
    }
  }

  function selectCommit(commit: GitHubCommit) {
    setEvidenceKind('GitHub commit')
    setEvidenceTitle(commit.message)
    setEvidenceSource(githubRepository ?? 'GitHub')
    setEvidenceUrl(commit.url)
    setEvidenceCommitSha(commit.sha)
    setEvidenceAuthor(commit.author)
    setEvidenceSourceTimestamp(commit.timestamp.slice(0, 10))
    setEvidenceError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      evidenceTitle.trim() || evidenceSource.trim() || evidenceUrl.trim() ||
      evidenceCommitSha.trim() || evidenceNote.trim() || fileEvidence
    ) {
      setEvidenceError('Add this evidence or clear the draft before saving the breadcrumb.')
      return
    }
    const form = new FormData(event.currentTarget)
    const date = String(form.get('occurredAt'))
    const breadcrumbId = editingBreadcrumb?.id ?? crypto.randomUUID()
    onSave({
      id: breadcrumbId,
      projectId,
      buildsOnId: String(form.get('buildsOnId') ?? '') || undefined,
      nextGoal: String(form.get('nextGoal') ?? '').trim() || undefined,
      type,
      title: String(form.get('title')).trim(),
      whatHappened: String(form.get('whatHappened')).trim(),
      why: String(form.get('why')).trim(),
      outcome: String(form.get('outcome') ?? '').trim(),
      occurredAt: new Date(`${date}T12:00:00`).toISOString(),
      evidence: attachEvidenceToBreadcrumb(evidence, projectId, breadcrumbId),
    })
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="capture-title"
        aria-modal="true"
        className="capture-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">
              {isEditing ? 'Correct the record' : 'Capture a moment worth returning to'}
            </p>
            <h2 id="capture-title">
              {isEditing ? 'Edit breadcrumb' : 'Add a breadcrumb'}
            </h2>
            <p>
              {isEditing
                ? 'Update this moment while keeping its place in the project’s history.'
                : 'Record what changed, why it mattered, and the evidence that can help someone trace it later.'}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            <X size={19} aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <form className="capture-form" onSubmit={handleSubmit}>
          <div className="capture-fields">
            <fieldset>
              <legend>Type</legend>
              <div className="type-options">
                {breadcrumbTypes.map((item) => (
                  <label className={type === item ? 'selected' : ''} key={item}>
                    <input
                      checked={type === item}
                      name="type"
                      onChange={() => setType(item)}
                      type="radio"
                      value={item}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              <span>Short title</span>
              <input
                data-dialog-autofocus
                defaultValue={editingBreadcrumb?.title}
                name="title"
                placeholder="Name the meaningful moment"
                required
              />
            </label>

            <div className="capture-field">
              <label>
                <span>Builds on <small>Optional</small></span>
                <select
                  aria-describedby="builds-on-helper"
                  name="buildsOnId"
                  onChange={(event) => setBuildsOnId(event.target.value)}
                  value={buildsOnId}
                >
                  <option value="">No earlier breadcrumb</option>
                  {priorBreadcrumbs.map((breadcrumb) => (
                    <option key={breadcrumb.id} value={breadcrumb.id}>
                      {breadcrumb.type} — {breadcrumb.title}
                    </option>
                  ))}
                </select>
              </label>
              <small className="capture-helper" id="builds-on-helper">
                Connect this moment to the earlier breadcrumb that prompted it.
              </small>
            </div>

            <label>
              <span>What happened</span>
              <textarea
                name="whatHappened"
                defaultValue={editingBreadcrumb?.whatHappened}
                placeholder="Describe the meaningful change, decision, or learning."
                required
                rows={3}
              />
            </label>

            <label>
              <span>Why it mattered</span>
              <textarea
                name="why"
                defaultValue={editingBreadcrumb?.why}
                placeholder="Preserve the reasoning, context, or evidence behind it."
                required
                rows={3}
              />
            </label>

            <label>
              <span>Outcome or consequence <small>Optional</small></span>
              <textarea
                name="outcome"
                defaultValue={editingBreadcrumb?.outcome}
                placeholder="What did this lead to?"
                rows={2}
              />
            </label>

            <div className="capture-field">
              <label>
                <span>
                  New current goal {!requiresGoal && <small>Optional</small>}
                </span>
                <input
                  aria-describedby="next-goal-helper"
                  defaultValue={editingBreadcrumb?.nextGoal}
                  name="nextGoal"
                  placeholder={currentGoal}
                  required={requiresGoal}
                  type="text"
                />
              </label>
              <small className="capture-helper" id="next-goal-helper">
                {requiresGoal
                  ? 'This moment supports the current goal. Keep a goal here so it remains traceable.'
                  : 'Use only if this moment changes what the project is working toward.'}
              </small>
            </div>

            <div className="form-row">
              <label>
                <span>Date</span>
                <input
                  name="occurredAt"
                  onChange={(event) => changeDate(event.target.value)}
                  required
                  type="date"
                  value={occurredAt}
                />
              </label>
            </div>

            <fieldset className="evidence-capture">
              <legend>Supporting evidence <small>Optional</small></legend>
              <p className="capture-helper">Evidence supports this explanation. It never creates a breadcrumb or changes the project story on its own.</p>
              {evidence.length > 0 && (
                <ul className="evidence-draft-list" aria-label="Evidence attached to this breadcrumb">
                  {evidence.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.kind} · {item.source} · recorded {formatDate(item.capturedAt)}</small>
                      </div>
                      <button aria-label={`Remove ${item.title}`} onClick={() => setEvidence((current) => current.filter(({ id }) => id !== item.id))} type="button">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="evidence-fields">
                <label>
                  <span>Kind</span>
                  <select onChange={(event) => { setEvidenceKind(event.target.value as EvidenceKind); setEvidenceError('') }} value={evidenceKind}>
                    {evidenceKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                  </select>
                </label>
                {evidenceKind === 'File upload' && (
                  <label>
                    <span>Choose file</span>
                    <input accept="*/*" onChange={(event) => selectFile(event.target.files?.[0])} type="file" />
                    {fileEvidence && <small className="capture-helper">{fileEvidence.filename} · {Math.ceil((fileEvidence.sizeBytes ?? 0) / 1024)} KB</small>}
                  </label>
                )}
                <label>
                  <span>Title</span>
                  <input onChange={(event) => { setEvidenceTitle(event.target.value); setEvidenceError('') }} placeholder={evidenceKind === 'GitHub commit' ? 'Commit message' : 'What should this source be called?'} type="text" value={evidenceTitle} />
                </label>
                <label>
                  <span>Source <small>Optional</small></span>
                  <input onChange={(event) => setEvidenceSource(event.target.value)} placeholder={evidenceKind === 'GitHub commit' ? 'owner/repository' : 'Where this came from'} type="text" value={evidenceSource} />
                </label>
                <label>
                  <span>Recorded on</span>
                  <input onChange={(event) => setEvidenceCapturedAt(event.target.value)} required type="date" value={evidenceCapturedAt} />
                </label>
                {evidenceKind !== 'Manual note' && (
                  <label>
                    <span>{evidenceKind === 'GitHub commit' ? 'Commit URL' : 'URL'}</span>
                    <input onChange={(event) => { setEvidenceUrl(event.target.value); setEvidenceError('') }} placeholder="https://…" type="url" value={evidenceUrl} />
                  </label>
                )}
                {evidenceKind === 'GitHub commit' && (
                  <>
                    <label>
                      <span>Commit SHA</span>
                      <input onChange={(event) => { setEvidenceCommitSha(event.target.value); setEvidenceError('') }} placeholder="e.g. a1b2c3d" type="text" value={evidenceCommitSha} />
                    </label>
                    <label>
                      <span>Author <small>Optional</small></span>
                      <input onChange={(event) => setEvidenceAuthor(event.target.value)} placeholder="Commit author" type="text" value={evidenceAuthor} />
                    </label>
                    <label>
                      <span>Commit timestamp <small>Optional</small></span>
                      <input onChange={(event) => setEvidenceSourceTimestamp(event.target.value)} type="date" value={evidenceSourceTimestamp} />
                    </label>
                  </>
                )}
                <label className="evidence-note-field">
                  <span>Context <small>Optional</small></span>
                  <textarea onChange={(event) => setEvidenceNote(event.target.value)} placeholder="A brief note that helps someone interpret this evidence." rows={2} value={evidenceNote} />
                </label>
              </div>
              {evidenceKind === 'GitHub commit' && (
                <div className="github-picker">
                  <div>
                    <strong>Recent commits{githubRepository ? ` from ${githubRepository}` : ''}</strong>
                    <small>Choose one to prefill this evidence; it still needs to support this breadcrumb’s explanation.</small>
                  </div>
                  <button className="button-secondary" disabled={loadingCommits || !githubRepository} onClick={loadRecentCommits} type="button">
                    {loadingCommits ? 'Loading commits…' : 'Load recent commits'}
                  </button>
                  {githubError && <p className="field-error" role="alert">{githubError}</p>}
                  {recentCommits.length > 0 && <ul>{recentCommits.map((commit) => <li key={commit.sha}><button onClick={() => selectCommit(commit)} type="button"><strong>{commit.message}</strong><small>{commit.author} · {commit.sha.slice(0, 7)} · {formatDate(commit.timestamp)}</small></button></li>)}</ul>}
                  {!loadingCommits && !githubError && recentCommits.length === 0 && githubRepository && <p className="capture-helper">Load a small recent list, then deliberately choose the commit that supports this breadcrumb.</p>}
                </div>
              )}
              {evidenceError && <p className="field-error" role="alert">{evidenceError}</p>}
              <button className="button-secondary add-evidence-button" onClick={addEvidence} type="button">Add evidence</button>
            </fieldset>
          </div>

          <div className="drawer-actions">
            <button className="button-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="button-primary" type="submit">
              {isEditing ? 'Save changes' : 'Save breadcrumb'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function App() {
  const [workspace, setWorkspace] = useState(loadWorkspace)
  const [view, setView] = useState<View>('overview')
  const [captureOpen, setCaptureOpen] = useState(false)
  const [editingBreadcrumb, setEditingBreadcrumb] = useState<Breadcrumb>()
  const [savedMessage, setSavedMessage] = useState('')
  const [storageIssue, setStorageIssue] = useState('')
  const [tracedBreadcrumbId, setTracedBreadcrumbId] = useState<string>()
  const [projectChooserOpen, setProjectChooserOpen] = useState(false)

  const projectBreadcrumbs = useMemo(
    () => workspace.breadcrumbs.filter(({ projectId }) => projectId === workspace.project.id),
    [workspace.breadcrumbs, workspace.project.id],
  )

  const ordered = useMemo(
    () => sortChronologically(projectBreadcrumbs),
    [projectBreadcrumbs],
  )
  const hasHistory = ordered.length > 0
  const latestBreadcrumb = ordered.at(-1)
  const currentGoalSource = useMemo(
    () => [...ordered]
      .reverse()
      .find(({ nextGoal }) => nextGoal === workspace.project.currentGoal),
    [ordered, workspace.project.currentGoal],
  )
  const story = useMemo(
    () => deriveStory(workspace.project, projectBreadcrumbs),
    [workspace.project, projectBreadcrumbs],
  )
  const openThreads = useMemo(
    () => deriveOpenThreads(workspace.project, projectBreadcrumbs),
    [workspace.project, projectBreadcrumbs],
  )

  useEffect(() => {
    setStorageIssue(
      saveWorkspace(workspace)
        ? ''
        : 'Changes could not be stored in this browser. Keep this tab open or free local storage before reloading.',
    )
  }, [workspace])

  useEffect(() => {
    if (!captureOpen && !projectChooserOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCaptureOpen(false)
        setEditingBreadcrumb(undefined)
        setProjectChooserOpen(false)
      }
    }
    document.body.classList.add('drawer-open')
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.classList.remove('drawer-open')
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [captureOpen, projectChooserOpen])

  function changeView(nextView: View) {
    setView(nextView)
    setTracedBreadcrumbId(undefined)
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() })
  }

  function showSource(sourceId: string) {
    setView('history')
    setTracedBreadcrumbId(sourceId)
    window.setTimeout(() => {
      const source = document.getElementById(`breadcrumb-${sourceId}`)
      source?.focus({ preventScroll: true })
      source?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: 'center',
      })
    }, 60)
  }

  function addBreadcrumb(breadcrumb: Breadcrumb) {
    const goalChanged = Boolean(
      breadcrumb.nextGoal && breadcrumb.nextGoal !== workspace.project.currentGoal,
    )
    setWorkspace((current) => recordBreadcrumb(current, breadcrumb))
    setTracedBreadcrumbId(undefined)
    setCaptureOpen(false)
    setSavedMessage(
      goalChanged
        ? 'Breadcrumb added and current goal updated'
        : 'Breadcrumb added to the project history',
    )
    window.setTimeout(() => setSavedMessage(''), 3000)
  }

  function closeBreadcrumbForm() {
    setCaptureOpen(false)
    setEditingBreadcrumb(undefined)
  }

  function openBreadcrumbForm(breadcrumb?: Breadcrumb) {
    setEditingBreadcrumb(breadcrumb)
    setCaptureOpen(true)
  }

  function selectProject(projectId: string) {
    const nextProject = workspace.projects.find(({ id }) => id === projectId)
    setWorkspace((current) => openProject(current, projectId))
    setProjectChooserOpen(false)
    setView('overview')
    setTracedBreadcrumbId(undefined)
    if (nextProject && nextProject.id !== workspace.project.id) {
      setSavedMessage(`${nextProject.name} opened`)
      window.setTimeout(() => setSavedMessage(''), 3000)
    }
  }

  function addProject(project: Project) {
    setWorkspace((current) => createProject(current, project))
    setProjectChooserOpen(false)
    setView('overview')
    setTracedBreadcrumbId(undefined)
    setSavedMessage('New project created — ready for its first breadcrumb')
    window.setTimeout(() => setSavedMessage(''), 3000)
  }

  function saveBreadcrumb(breadcrumb: Breadcrumb) {
    if (!editingBreadcrumb) {
      addBreadcrumb(breadcrumb)
      return
    }

    const updatedWorkspace = updateBreadcrumb(workspace, breadcrumb)
    const goalChanged =
      updatedWorkspace.project.currentGoal !== workspace.project.currentGoal
    setWorkspace(updatedWorkspace)
    setTracedBreadcrumbId(breadcrumb.id)
    closeBreadcrumbForm()
    setSavedMessage(
      goalChanged
        ? 'Breadcrumb corrected and current goal updated'
        : 'Breadcrumb corrected in the project history',
    )
    window.setTimeout(() => setSavedMessage(''), 3000)
    window.setTimeout(() => {
      const corrected = document.getElementById(`breadcrumb-${breadcrumb.id}`)
      corrected?.focus({ preventScroll: true })
      corrected?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: 'center',
      })
    }, 60)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="wordmark" href="#top" onClick={() => changeView('overview')}>
          Breadcrumb
        </a>
        <button
          aria-expanded={projectChooserOpen}
          aria-haspopup="dialog"
          className="sidebar-project group min-w-0"
          onClick={() => setProjectChooserOpen(true)}
          type="button"
        >
          <span className="sidebar-project-label">Current project</span>
          <span className="sidebar-project-name-row flex min-w-0 items-start justify-between gap-3">
            <strong className="min-w-0">{workspace.project.name}</strong>
            <ArrowUpRight
              className="sidebar-project-affordance shrink-0"
              size={15}
              aria-hidden="true"
            />
          </span>
          <small className="sidebar-project-action">Switch or create</small>
        </button>
        <nav aria-label="Project navigation">
          <button
            aria-current={view === 'overview' ? 'page' : undefined}
            onClick={() => changeView('overview')}
          >
            <BookOpen size={17} aria-hidden="true" />
            Overview
            <span className="nav-purpose">Where are we now?</span>
          </button>
          <button
            aria-current={view === 'history' ? 'page' : undefined}
            onClick={() => changeView('history')}
          >
            <History size={17} aria-hidden="true" />
            History
            <span className="nav-purpose">What happened?</span>
          </button>
          <button
            aria-current={view === 'story' ? 'page' : undefined}
            onClick={() => changeView('story')}
          >
            <FileText size={17} aria-hidden="true" />
            Story
            <span className="nav-purpose">How did we get here?</span>
          </button>
        </nav>
        <p className="sidebar-note">
          Meaningful moments, preserved with their context.
        </p>
      </aside>

      <main id="top">
      {view === 'overview' && (
        <>
          <picture className="project-banner">
            <source
              media="(max-width: 720px), (orientation: portrait)"
              srcSet="/dreamy-path-to-a-stary-flag.png"
            />
            <img alt="" src="/serene-pastel-path-to-the-flag.png" />
          </picture>
          <header className="project-header">
              <div className="project-intro">
                <p className="eyebrow">Overview · Where are we now?</p>
                <h1>{workspace.project.name}</h1>
                <p className="project-description">{workspace.project.description}</p>
                <dl className="project-memory-meta" aria-label="Project memory details">
                  <div>
                    <dt>Memory began</dt>
                    <dd>{formatMonthYear(workspace.project.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Recorded moments</dt>
                    <dd>{ordered.length}</dd>
                  </div>
                  {latestBreadcrumb && (
                    <div>
                      <dt>Last recorded</dt>
                      <dd>{formatDate(latestBreadcrumb.occurredAt)}</dd>
                    </div>
                  )}
                </dl>
                <div className="current-goal">
                  <span>What the project is working toward</span>
                  <p>{workspace.project.currentGoal}</p>
                  {currentGoalSource && (
                    <button
                      className="text-button"
                      onClick={() => showSource(currentGoalSource.id)}
                    >
                      Trace goal change <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <aside className="continue-panel" aria-labelledby="continue-heading">
                <p className="eyebrow">Continue from here</p>
                <h2 id="continue-heading">Pick up the thread</h2>
                <button className="button-primary" onClick={() => openBreadcrumbForm()}>
                  <Plus size={17} aria-hidden="true" />
                  {hasHistory ? 'Add the next breadcrumb' : 'Add first breadcrumb'}
                </button>
                <p className="continue-helper">
                  Record a decision, change, experiment, discovery, or milestone when it changes the project’s understanding or direction.
                </p>
                <div className="continue-links">
                  {latestBreadcrumb && (
                    <button
                      className="text-button"
                      onClick={() => showSource(latestBreadcrumb.id)}
                    >
                      Revisit the latest moment
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )}
                  {hasHistory && (
                    <button className="text-button" onClick={() => changeView('story')}>
                      Read the story so far <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {latestBreadcrumb && (
                  <aside className="resume-context" aria-labelledby="resume-heading">
                    <div className="resume-meta">
                      <span id="resume-heading">Latest recorded moment</span>
                      <time dateTime={latestBreadcrumb.occurredAt}>
                        {formatDate(latestBreadcrumb.occurredAt)}
                      </time>
                    </div>
                    <TypeLabel type={latestBreadcrumb.type} />
                    <h2>{latestBreadcrumb.title}</h2>
                    <p>
                      {latestBreadcrumb.outcome || latestBreadcrumb.whatHappened}
                    </p>
                    <button
                      className="text-button"
                      onClick={() => showSource(latestBreadcrumb.id)}
                    >
                      Trace this moment <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </aside>
                )}
              </aside>
            </header>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recent record</p>
                  <h2>What changed lately</h2>
                </div>
                <button className="text-button" onClick={() => changeView('history')}>
                  View full history <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
              {hasHistory ? (
                <RecentProgress breadcrumbs={ordered} onTrace={showSource} />
              ) : (
                <EmptyMemory
                  description="A breadcrumb records a meaningful change with the context behind it. Start with one decision, discovery, experiment, change, or milestone that this project should not lose."
                  eyebrow="This project has no recorded moments yet"
                  id="overview-empty-memory"
                  onAdd={() => openBreadcrumbForm()}
                  showAction={false}
                  title="Give this project a memory to build on"
                />
              )}
            </section>

            {openThreads.length > 0 && (
              <OpenThreads
                breadcrumbs={projectBreadcrumbs}
                onEdit={openBreadcrumbForm}
                onTrace={showSource}
                threads={openThreads}
              />
            )}

            <section className="story-preview">
              <div>
                <p className="eyebrow">
                  {hasHistory
                    ? `Derived from ${ordered.length} ${ordered.length === 1 ? 'breadcrumb' : 'breadcrumbs'}`
                  : 'The project record is waiting to begin'}
                </p>
                <h2>The story so far</h2>
                <p>
                  {!hasHistory
                    ? 'The project’s Story will take shape once its first meaningful moment is recorded.'
                    : ordered.length === 1
                    ? 'One meaningful moment starts this project’s recorded story.'
                    : `Follow the recorded path from “${ordered[0]?.title}” to “${latestBreadcrumb?.title}.”`}
                </p>
              </div>
              {hasHistory ? (
                <button className="text-button" onClick={() => changeView('story')}>
                  Read the story <ArrowRight size={15} aria-hidden="true" />
                </button>
              ) : null}
            </section>
          </>
        )}

        {view === 'history' && (
          <section className="page-view">
            <header className="page-header">
              <div>
                <p className="eyebrow">
                  {hasHistory
                  ? `History · ${ordered.length} recorded ${ordered.length === 1 ? 'moment' : 'moments'}`
                    : 'History · no recorded moments yet'}
                </p>
                <h1>What happened</h1>
                <p>
                  A chronological record of the decisions, changes, experiments, discoveries, and milestones that shaped {workspace.project.name}. Open any moment to revisit its explanation and supporting evidence.
                </p>
              </div>
              {hasHistory && (
                <button className="button-primary" onClick={() => openBreadcrumbForm()}>
                  <Plus size={17} aria-hidden="true" />
                  Add breadcrumb
                </button>
              )}
            </header>
            {hasHistory ? (
              <Timeline
                breadcrumbs={ordered}
                highlightedId={tracedBreadcrumbId}
                onEdit={openBreadcrumbForm}
                onTrace={showSource}
              />
            ) : (
              <EmptyMemory
                description="A history begins with one meaningful moment. Record what changed, why it mattered, and any evidence that will help future readers understand it."
                eyebrow="History is the project’s record of what happened"
                id="history-empty-memory"
                onAdd={() => openBreadcrumbForm()}
                title="Record the first moment worth tracing"
              />
            )}
          </section>
        )}

        {view === 'story' && (
          <section className="page-view story-view">
            <header className="story-header">
              <div>
                <p className="eyebrow">Story · How did we get here?</p>
                <h1>The story so far</h1>
                <p>
                  {hasHistory
                    ? `A concise account derived from ${ordered.length} recorded ${ordered.length === 1 ? 'moment' : 'moments'}. Every section points to supporting breadcrumbs, whose evidence remains reviewable in History.`
                    : 'The story begins when the project records its first meaningful moment and the context behind it.'}
                </p>
              </div>
              {hasHistory && (
                <button className="button-secondary" onClick={() => changeView('history')}>
                  View full history
                </button>
              )}
            </header>

            {hasHistory ? (
              <div className="story-sections">
                {story.map((section, sectionIndex) => (
                  <article className="story-section" key={section.id}>
                    <div className="story-section-number">0{sectionIndex + 1}</div>
                    <div>
                      <p className="eyebrow">{section.eyebrow}</p>
                      <h2>{section.title}</h2>
                      <p className="story-body">{section.body}</p>
                      {section.beats && (
                        <StorySequence
                          breadcrumbs={projectBreadcrumbs}
                          onTrace={showSource}
                          section={section}
                        />
                      )}
                      {!section.beats && (
                        <StoryEvidence
                          breadcrumbs={projectBreadcrumbs}
                          onTrace={showSource}
                          sourceIds={section.sourceIds}
                        />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyMemory
                description="Story turns the project’s recorded moments into a concise, traceable account. It begins after the first breadcrumb captures what happened and why it mattered."
                eyebrow="Story is built from the project record"
                id="story-empty-memory"
                onAdd={() => openBreadcrumbForm()}
                title="Give the story its first source"
              />
            )}
          </section>
        )}
      </main>

      {captureOpen && (
        <CaptureForm
          breadcrumbs={projectBreadcrumbs}
          currentGoal={workspace.project.currentGoal}
          editingBreadcrumb={editingBreadcrumb}
          onClose={closeBreadcrumbForm}
          onSave={saveBreadcrumb}
          projectId={workspace.project.id}
          githubRepository={workspace.project.githubRepository}
          requiresGoal={requiresGoalForEdit(editingBreadcrumb?.id, currentGoalSource?.id)}
        />
      )}

      {projectChooserOpen && (
        <ProjectChooser
          currentProject={workspace.project}
          onClose={() => setProjectChooserOpen(false)}
          onCreate={addProject}
          onOpen={selectProject}
          onUpdateRepository={(repository) => {
            const nextRepository = repository.trim()
            if (nextRepository && !isGitHubRepository(nextRepository)) {
              return 'Enter a repository as owner/repository.'
            }
            const updated = updateProjectGitHubRepository(
              workspace,
              workspace.project.id,
              nextRepository,
            )
            if (updated === workspace) {
              return 'This project already has commit evidence from its configured repository, so that provenance cannot be changed.'
            }
            setWorkspace(updated)
            setSavedMessage(nextRepository ? 'GitHub repository saved for this project' : 'GitHub repository removed from this project')
            window.setTimeout(() => setSavedMessage(''), 3000)
            return undefined
          }}
          projects={workspace.projects}
        />
      )}

      <div
        aria-live={storageIssue ? 'assertive' : 'polite'}
        className={`toast ${savedMessage || storageIssue ? 'visible' : ''} ${storageIssue ? 'warning' : ''}`}
        role={storageIssue ? 'alert' : 'status'}
      >
        {storageIssue ? <AlertTriangle size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
        {storageIssue || savedMessage}
      </div>
    </div>
  )
}
