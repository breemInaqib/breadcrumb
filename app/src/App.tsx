import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  History,
  Plus,
  X,
} from 'lucide-react'
import { breadcrumbTypes, type Breadcrumb, type BreadcrumbType } from './types'
import { loadWorkspace, saveWorkspace } from './storage'
import { deriveStory, sortChronologically } from './story'

type View = 'overview' | 'history' | 'story'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const inputDate = new Date().toISOString().slice(0, 10)

function parseSourceLinks(value: string) {
  return value
    .split(/[\n,]/)
    .map((link) => link.trim())
    .filter((link) => {
      try {
        const url = new URL(link)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    })
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

function TypeLabel({ type }: { type: BreadcrumbType }) {
  return <span className={`type-label type-${type.toLowerCase()}`}>{type}</span>
}

interface TimelineProps {
  breadcrumbs: Breadcrumb[]
  limit?: number
}

function Timeline({ breadcrumbs, limit }: TimelineProps) {
  const ordered = sortChronologically(breadcrumbs)
  const visible = limit ? ordered.slice(-limit) : ordered

  return (
    <ol className="timeline" aria-label="Project history">
      {visible.map((breadcrumb) => (
        <li className="timeline-entry" id={`breadcrumb-${breadcrumb.id}`} key={breadcrumb.id}>
          <div className="timeline-date">
            <time dateTime={breadcrumb.occurredAt}>{formatDate(breadcrumb.occurredAt)}</time>
          </div>
          <div className="timeline-marker" aria-hidden="true" />
          <article className="timeline-content">
            <div className="entry-heading">
              <TypeLabel type={breadcrumb.type} />
              <h3>{breadcrumb.title}</h3>
            </div>
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
                {breadcrumb.sourceLinks.map((link, index) => (
                  <a href={link} key={link} rel="noreferrer" target="_blank">
                    Source {index + 1}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </article>
        </li>
      ))}
    </ol>
  )
}

interface CaptureFormProps {
  onClose: () => void
  onSave: (breadcrumb: Breadcrumb) => void
  projectId: string
}

function CaptureForm({ onClose, onSave, projectId }: CaptureFormProps) {
  const [type, setType] = useState<BreadcrumbType>('Decision')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('occurredAt'))
    const sourceLinks = parseSourceLinks(String(form.get('sourceLinks') ?? ''))

    onSave({
      id: crypto.randomUUID(),
      projectId,
      type,
      title: String(form.get('title')).trim(),
      whatHappened: String(form.get('whatHappened')).trim(),
      why: String(form.get('why')).trim(),
      outcome: String(form.get('outcome') ?? '').trim(),
      occurredAt: new Date(`${date}T12:00:00`).toISOString(),
      sourceLinks,
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
            <p className="eyebrow">Capture significance, not activity</p>
            <h2 id="capture-title">Add a breadcrumb</h2>
            <p>Record a moment that changed the project’s understanding or direction.</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            <X size={19} aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <form className="capture-form" onSubmit={handleSubmit}>
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
            <input autoFocus name="title" placeholder="Name the turning point" required />
          </label>

          <label>
            <span>What happened</span>
            <textarea
              name="whatHappened"
              placeholder="Describe the meaningful change, decision, or learning."
              required
              rows={3}
            />
          </label>

          <label>
            <span>Why it happened</span>
            <textarea
              name="why"
              placeholder="Preserve the reasoning or evidence behind it."
              required
              rows={3}
            />
          </label>

          <label>
            <span>Outcome or consequence <small>Optional</small></span>
            <textarea
              name="outcome"
              placeholder="What did this lead to?"
              rows={2}
            />
          </label>

          <div className="form-row">
            <label>
              <span>Date</span>
              <input defaultValue={inputDate} name="occurredAt" required type="date" />
            </label>
            <label>
              <span>Source links <small>Optional</small></span>
              <input name="sourceLinks" placeholder="Paste links, separated by commas" type="text" />
            </label>
          </div>

          <div className="drawer-actions">
            <button className="button-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="button-primary" type="submit">
              Save breadcrumb
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
  const [savedMessage, setSavedMessage] = useState(false)

  const ordered = useMemo(
    () => sortChronologically(workspace.breadcrumbs),
    [workspace.breadcrumbs],
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
      if (event.key === 'Escape') setCaptureOpen(false)
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showSource(sourceId: string) {
    setView('history')
    window.setTimeout(() => {
      document.getElementById(`breadcrumb-${sourceId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 60)
  }

  function addBreadcrumb(breadcrumb: Breadcrumb) {
    setWorkspace((current) => ({
      ...current,
      breadcrumbs: [...current.breadcrumbs, breadcrumb],
    }))
    setCaptureOpen(false)
    setSavedMessage(true)
    window.setTimeout(() => setSavedMessage(false), 3000)
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
                </div>
              </div>
              <div className="capture-callout">
                <button className="button-primary" onClick={() => setCaptureOpen(true)}>
                  <Plus size={17} aria-hidden="true" />
                  Add breadcrumb
                </button>
                <p>Capture a decision, change, experiment, discovery, or milestone.</p>
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
              <Timeline breadcrumbs={ordered} limit={4} />
            </section>

            <section className="story-preview">
              <div>
                <p className="eyebrow">Derived from {ordered.length} breadcrumbs</p>
                <h2>Story so far</h2>
                <p>
                  Follow the path from the original template idea to the section composer now in pilot.
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
              <button className="button-primary" onClick={() => setCaptureOpen(true)}>
                <Plus size={17} aria-hidden="true" />
                Add breadcrumb
              </button>
            </header>
            <Timeline breadcrumbs={ordered} />
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
                    <div className="citations" aria-label="Supporting breadcrumbs">
                      <span>Supported by</span>
                      {section.sourceIds.map((sourceId) => {
                        const source = workspace.breadcrumbs.find(({ id }) => id === sourceId)
                        if (!source) return null
                        return (
                          <button key={sourceId} onClick={() => showSource(sourceId)}>
                            <TypeLabel type={source.type} />
                            {source.title}
                            <ArrowRight size={13} aria-hidden="true" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {captureOpen && (
        <CaptureForm
          onClose={() => setCaptureOpen(false)}
          onSave={addBreadcrumb}
          projectId={workspace.project.id}
        />
      )}

      <div aria-live="polite" className={`toast ${savedMessage ? 'visible' : ''}`}>
        <Check size={16} aria-hidden="true" />
        Breadcrumb added to the project history
      </div>
    </div>
  )
}
