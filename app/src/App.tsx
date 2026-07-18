import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  History,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { breadcrumbTypes, type Breadcrumb, type BreadcrumbType } from './types'
import { loadWorkspace, saveWorkspace } from './storage'
import { deriveStory, sortChronologically } from './story'
import { formatSourceLinkLabel, parseSourceLinks } from './source-links'
import {
  getEligiblePredecessors,
  recordBreadcrumb,
  updateBreadcrumb,
} from './workspace'

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

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
}

function TypeLabel({ type }: { type: BreadcrumbType }) {
  return <span className={`type-label type-${type.toLowerCase()}`}>{type}</span>
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
              {breadcrumb.sourceLinks.length > 0 && (
                <div className="source-links">
                  <span>Sources</span>
                  {breadcrumb.sourceLinks.map((link) => (
                    <a href={link} key={link} rel="noreferrer" target="_blank" title={link}>
                      <span className="source-link-label">
                        {formatSourceLinkLabel(link)}
                      </span>
                      <ExternalLink size={12} aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ))}
                </div>
              )}
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
      <span>Supported by</span>
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

interface CaptureFormProps {
  breadcrumbs: Breadcrumb[]
  currentGoal: string
  editingBreadcrumb?: Breadcrumb
  onClose: () => void
  onSave: (breadcrumb: Breadcrumb) => void
  projectId: string
  requiresGoal: boolean
}

function CaptureForm({
  breadcrumbs,
  currentGoal,
  editingBreadcrumb,
  onClose,
  onSave,
  projectId,
  requiresGoal,
}: CaptureFormProps) {
  const [type, setType] = useState<BreadcrumbType>(
    editingBreadcrumb?.type ?? 'Decision',
  )
  const [buildsOnId, setBuildsOnId] = useState(
    editingBreadcrumb?.buildsOnId ?? '',
  )
  const [occurredAt, setOccurredAt] = useState(
    editingBreadcrumb?.occurredAt.slice(0, 10) ?? inputDate,
  )
  const [sourceError, setSourceError] = useState('')
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('occurredAt'))
    const sourceResult = parseSourceLinks(String(form.get('sourceLinks') ?? ''))

    if (sourceResult.invalidLinks.length > 0) {
      const sourceInput = event.currentTarget.elements.namedItem('sourceLinks')
      setSourceError(
        sourceResult.invalidLinks.length === 1
          ? 'Enter a full link beginning with http:// or https://.'
          : `Fix all ${sourceResult.invalidLinks.length} links. Start each with http:// or https://.`,
      )
      if (sourceInput instanceof HTMLInputElement) sourceInput.focus()
      return
    }

    setSourceError('')

    onSave({
      id: editingBreadcrumb?.id ?? crypto.randomUUID(),
      projectId,
      buildsOnId: String(form.get('buildsOnId') ?? '') || undefined,
      nextGoal: String(form.get('nextGoal') ?? '').trim() || undefined,
      type,
      title: String(form.get('title')).trim(),
      whatHappened: String(form.get('whatHappened')).trim(),
      why: String(form.get('why')).trim(),
      outcome: String(form.get('outcome') ?? '').trim(),
      occurredAt: new Date(`${date}T12:00:00`).toISOString(),
      sourceLinks: sourceResult.links,
    })
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="capture-title"
        aria-modal="true"
        className="capture-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">
              {isEditing ? 'Correct the record' : 'Capture significance, not activity'}
            </p>
            <h2 id="capture-title">
              {isEditing ? 'Edit breadcrumb' : 'Add a breadcrumb'}
            </h2>
            <p>
              {isEditing
                ? 'Update this moment while keeping its place in the project’s history.'
                : 'Record a moment that changed the project’s understanding or direction.'}
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
                autoFocus
                defaultValue={editingBreadcrumb?.title}
                name="title"
                placeholder="Name the turning point"
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
              <span>Why it happened</span>
              <textarea
                name="why"
                defaultValue={editingBreadcrumb?.why}
                placeholder="Preserve the reasoning or evidence behind it."
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
              <div className="capture-field">
                <label>
                  <span>Source links <small>Optional</small></span>
                  <input
                    aria-describedby={sourceError
                      ? 'source-links-helper source-links-error'
                      : 'source-links-helper'}
                    aria-invalid={sourceError ? 'true' : undefined}
                    defaultValue={editingBreadcrumb?.sourceLinks.join(', ')}
                    name="sourceLinks"
                    onChange={() => setSourceError('')}
                    placeholder="https://example.com/research"
                    type="text"
                  />
                </label>
                <small className="capture-helper" id="source-links-helper">
                  Use full web links. Separate multiple links with commas.
                </small>
                {sourceError && (
                  <p className="field-error" id="source-links-error" role="alert">
                    {sourceError}
                  </p>
                )}
              </div>
            </div>
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
  const [tracedBreadcrumbId, setTracedBreadcrumbId] = useState<string>()

  const ordered = useMemo(
    () => sortChronologically(workspace.breadcrumbs),
    [workspace.breadcrumbs],
  )
  const latestBreadcrumb = ordered.at(-1)
  const currentGoalSource = useMemo(
    () => [...ordered]
      .reverse()
      .find(({ nextGoal }) => nextGoal === workspace.project.currentGoal),
    [ordered, workspace.project.currentGoal],
  )
  const story = useMemo(
    () => deriveStory(workspace.project, workspace.breadcrumbs),
    [workspace],
  )

  useEffect(() => {
    saveWorkspace(workspace)
  }, [workspace])

  useEffect(() => {
    if (!captureOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCaptureOpen(false)
        setEditingBreadcrumb(undefined)
      }
    }
    document.body.classList.add('drawer-open')
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.classList.remove('drawer-open')
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [captureOpen])

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
        <div className="sidebar-project">
          <span>Project</span>
          <strong>{workspace.project.name}</strong>
        </div>
        <nav aria-label="Project navigation">
          <button
            aria-current={view === 'overview' ? 'page' : undefined}
            onClick={() => changeView('overview')}
          >
            <BookOpen size={17} aria-hidden="true" />
            Overview
          </button>
          <button
            aria-current={view === 'history' ? 'page' : undefined}
            onClick={() => changeView('history')}
          >
            <History size={17} aria-hidden="true" />
            History
          </button>
          <button
            aria-current={view === 'story' ? 'page' : undefined}
            onClick={() => changeView('story')}
          >
            <FileText size={17} aria-hidden="true" />
            Story
          </button>
        </nav>
        <p className="sidebar-note">
          Consequential moments, preserved with their reasons.
        </p>
      </aside>

      <main id="top">
        {view === 'overview' && (
          <>
            <header className="project-header">
              <div className="project-intro">
                <p className="eyebrow">Project workspace</p>
                <h1>{workspace.project.name}</h1>
                <p className="project-description">{workspace.project.description}</p>
                <div className="current-goal">
                  <span>Current goal</span>
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
              <div className="capture-callout">
                <button className="button-primary" onClick={() => openBreadcrumbForm()}>
                  <Plus size={17} aria-hidden="true" />
                  Add breadcrumb
                </button>
                <p>Capture a decision, change, experiment, discovery, or milestone.</p>
                {latestBreadcrumb && (
                  <aside className="resume-context" aria-labelledby="resume-heading">
                    <div className="resume-meta">
                      <span id="resume-heading">Where things stand</span>
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
              </div>
            </header>

            <section className="content-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Latest turning points</p>
                  <h2>Recent history</h2>
                </div>
                <button className="text-button" onClick={() => changeView('history')}>
                  View full history <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
              <Timeline breadcrumbs={ordered} limit={4} onTrace={showSource} />
            </section>

            <section className="story-preview">
              <div>
                <p className="eyebrow">Derived from {ordered.length} breadcrumbs</p>
                <h2>Story so far</h2>
                <p>
                  Follow the recorded path from “{ordered[0]?.title}” to “{latestBreadcrumb?.title}.”
                </p>
              </div>
              <button className="text-button" onClick={() => changeView('story')}>
                Read the story <ArrowRight size={15} aria-hidden="true" />
              </button>
            </section>
          </>
        )}

        {view === 'history' && (
          <section className="page-view">
            <header className="page-header">
              <div>
                <p className="eyebrow">{ordered.length} meaningful moments</p>
                <h1>Project history</h1>
                <p>
                  The decisions, changes, experiments, discoveries, and milestones that shaped {workspace.project.name}.
                </p>
              </div>
              <button className="button-primary" onClick={() => openBreadcrumbForm()}>
                <Plus size={17} aria-hidden="true" />
                Add breadcrumb
              </button>
            </header>
            <Timeline
              breadcrumbs={ordered}
              highlightedId={tracedBreadcrumbId}
              onEdit={openBreadcrumbForm}
              onTrace={showSource}
            />
          </section>
        )}

        {view === 'story' && (
          <section className="page-view story-view">
            <header className="story-header">
              <div>
                <p className="eyebrow">How did this project get here?</p>
                <h1>Story so far</h1>
                <p>
                  A concise account derived from {ordered.length} recorded moments. Every section points back to its evidence.
                </p>
              </div>
              <button className="button-secondary" onClick={() => changeView('history')}>
                View full history
              </button>
            </header>

            <div className="story-sections">
              {story.map((section, sectionIndex) => (
                <article className="story-section" key={section.id}>
                  <div className="story-section-number">0{sectionIndex + 1}</div>
                  <div>
                    <p className="eyebrow">{section.eyebrow}</p>
                    <h2>{section.title}</h2>
                    <p className="story-body">{section.body}</p>
                    {section.beats && (
                      <ol
                        className="story-beats"
                        aria-label={section.sequenceLabel ?? 'Project sequence'}
                      >
                        {section.beats.map((beat) => {
                          const source = workspace.breadcrumbs.find(
                            ({ id }) => id === beat.sourceId,
                          )
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
                                <button
                                  aria-label={`Trace ${source.title} in project history`}
                                  onClick={() => showSource(source.id)}
                                >
                                  Trace source
                                  <ArrowRight size={13} aria-hidden="true" />
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                    {!section.beats && (
                      <StoryEvidence
                        breadcrumbs={workspace.breadcrumbs}
                        onTrace={showSource}
                        sourceIds={section.sourceIds}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {captureOpen && (
        <CaptureForm
          breadcrumbs={workspace.breadcrumbs}
          currentGoal={workspace.project.currentGoal}
          editingBreadcrumb={editingBreadcrumb}
          onClose={closeBreadcrumbForm}
          onSave={saveBreadcrumb}
          projectId={workspace.project.id}
          requiresGoal={editingBreadcrumb?.id === currentGoalSource?.id}
        />
      )}

      <div aria-live="polite" className={`toast ${savedMessage ? 'visible' : ''}`}>
        <Check size={16} aria-hidden="true" />
        {savedMessage}
      </div>
    </div>
  )
}
