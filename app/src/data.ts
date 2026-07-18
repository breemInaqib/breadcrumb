import type { Workspace } from './types'

export const seedWorkspace: Workspace = {
  project: {
    id: 'patchwork',
    name: 'Patchwork',
    description:
      'A modular onboarding toolkit that helps small product teams guide new users to a meaningful first outcome.',
    currentGoal:
      'Validate that inline previews help teams publish effective onboarding flows without slowing down.',
    createdAt: '2026-06-03T09:00:00.000Z',
  },
  breadcrumbs: [
    {
      id: 'b1',
      projectId: 'patchwork',
      type: 'Decision',
      title: 'Start with reusable onboarding templates',
      whatHappened:
        'We chose a library of ready-made onboarding templates as the fastest route to a useful first release.',
      why:
        'Early interviews showed that small teams knew onboarding mattered but rarely had time to design a flow from scratch.',
      outcome:
        'We built six templates around activation moments common to early-stage products.',
      occurredAt: '2026-06-05T14:00:00.000Z',
      sourceLinks: [],
    },
    {
      id: 'b2',
      projectId: 'patchwork',
      buildsOnId: 'b1',
      type: 'Experiment',
      title: 'Test templates with five product teams',
      whatHappened:
        'Five teams used a clickable prototype to adapt a template to their own onboarding flow.',
      why:
        'We needed to learn whether a strong starting point actually reduced setup time without feeling generic.',
      outcome:
        'Teams started quickly, but every team needed to restructure the template before it matched their product.',
      occurredAt: '2026-06-16T16:30:00.000Z',
      sourceLinks: [],
    },
    {
      id: 'b3',
      projectId: 'patchwork',
      buildsOnId: 'b2',
      type: 'Discovery',
      title: 'Teams needed composition, not more templates',
      whatHappened:
        'The prototype sessions revealed that teams valued reusable sections but resisted the fixed structure around them.',
      why:
        'Their products had different activation paths, so rearranging the story mattered more than choosing a polished template.',
      outcome:
        'We reframed the product around composing steps from reusable sections.',
      occurredAt: '2026-06-19T11:00:00.000Z',
      sourceLinks: [],
    },
    {
      id: 'b4',
      projectId: 'patchwork',
      buildsOnId: 'b3',
      type: 'Change',
      title: 'Replace templates with a section composer',
      whatHappened:
        'We changed the core experience from selecting a full template to arranging small, reusable onboarding sections.',
      why:
        'A composable model preserved the speed of a starting point while letting each team reflect its real activation path.',
      outcome:
        'The new prototype cut structural workarounds and made changes easier to explain.',
      occurredAt: '2026-06-24T15:15:00.000Z',
      sourceLinks: [],
    },
    {
      id: 'b5',
      projectId: 'patchwork',
      buildsOnId: 'b4',
      type: 'Experiment',
      title: 'Compare modal and inline previews',
      whatHappened:
        'We tested a separate preview modal against a live preview embedded beside the section composer.',
      why:
        'Teams were losing their place when they moved between editing and previewing.',
      outcome:
        'Inline preview users completed revisions faster and described the flow with more confidence.',
      occurredAt: '2026-07-08T13:45:00.000Z',
      sourceLinks: [],
    },
    {
      id: 'b6',
      projectId: 'patchwork',
      buildsOnId: 'b5',
      type: 'Milestone',
      title: 'Launch the pilot with twelve makers',
      whatHappened:
        'Twelve independent product makers published their first onboarding flow with the section composer.',
      why:
        'A real pilot would show whether the new direction held up beyond moderated prototype sessions.',
      outcome:
        'Ten makers published without support; the next focus is validating whether inline preview improves the flows themselves.',
      occurredAt: '2026-07-14T17:00:00.000Z',
      sourceLinks: [],
    },
  ],
}
