export const meta = {
  name: 'taskflow-pipeline',
  description: 'Orchestrate PM → Dev → Review → QA pipeline for TaskFlow. Re-run after each PR merge to continue.',
  phases: [
    { title: 'Bootstrap', detail: 'PM agent creates Linear project and tickets' },
    { title: 'Develop', detail: 'Dev agent implements next ticket' },
    { title: 'Review', detail: 'Code review agent creates PR' },
    { title: 'QA', detail: 'QA agent tests merged feature' },
  ],
}

// ── Schemas ────────────────────────────────────────────────────────────────

const PROJECT_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    exists: { type: 'boolean' },
    projectId: { type: 'string' },
  },
  required: ['exists'],
}

const TICKETS_SCHEMA = {
  type: 'object',
  properties: {
    tickets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          linearId: { type: 'string' },
          feature: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
        },
        required: ['linearId', 'title', 'status'],
      },
    },
  },
  required: ['tickets'],
}

// PR state is read from GitHub, not Linear — Linear has no "PR Open" status
const PR_STATE_SCHEMA = {
  type: 'object',
  properties: {
    hasPR: { type: 'boolean' },
    prMerged: { type: 'boolean' },
    prOpen: { type: 'boolean' },
    prUrl: { type: 'string' },
  },
  required: ['hasPR', 'prMerged', 'prOpen'],
}

// ── Phase 1: Bootstrap ─────────────────────────────────────────────────────

phase('Bootstrap')

const projectCheck = await agent(
  'Check if a Linear project named "TaskFlow" already exists. Return { exists: true/false, projectId: "<id or empty string>" }',
  { agentType: 'pm-agent', schema: PROJECT_STATUS_SCHEMA, phase: 'Bootstrap' }
)

if (!projectCheck.exists) {
  log('No TaskFlow project found — running PM agent to create it...')
  await agent(
    'Bootstrap: read the PRD at Taskflow-todo.docx and create the TaskFlow Linear project with all 15 feature tickets.',
    { agentType: 'pm-agent', phase: 'Bootstrap' }
  )
  log('Project and all 15 tickets created in Linear.')
} else {
  log(`TaskFlow project already exists (${projectCheck.projectId}) — skipping bootstrap.`)
}

// ── Phase 2: Development loop ──────────────────────────────────────────────

const ticketData = await agent(
  'List all tickets in the TaskFlow Linear project ordered by priority (Urgent first, then Medium, then Low). Return { tickets: [{linearId, feature, title, status, priority}] }',
  { agentType: 'pm-agent', schema: TICKETS_SCHEMA, phase: 'Bootstrap' }
)

const tickets = (ticketData.tickets || []).filter(Boolean)
log(`Pipeline has ${tickets.length} tickets to process.`)

for (const ticket of tickets) {
  const s = (ticket.status || '').toLowerCase().trim()

  // ── Already done ──────────────────────────────────────────────────────────
  if (s === 'done' || s === 'cancelled' || s === 'completed') {
    log(`✓ ${ticket.linearId} already Done — skipping.`)
    continue
  }

  // ── Bug found — dev-agent picks up the bug ticket, not this one ──────────
  if (s.includes('bug') || s === 'bug found') {
    log(`⚠ ${ticket.linearId} has bugs filed — a dev-agent will handle the bug tickets. Skipping parent.`)
    continue
  }

  // ── Backlog / Todo → run dev-agent first, then fall through to PR check ──
  if (s === 'backlog' || s === 'todo') {
    phase('Develop')
    log(`Implementing ${ticket.linearId}: ${ticket.title}`)
    await agent(
      `Implement Linear ticket ${ticket.linearId}: "${ticket.title}". Follow the PRD specs exactly.`,
      { agentType: 'dev-agent', phase: 'Develop' }
    )
    log(`${ticket.linearId} implementation complete — checking PR state.`)
    // Fall through to PR state check below
  }

  // ── In Progress (or just-developed) → check GitHub for PR state ──────────
  // Linear has no "In Review" / "PR Open" statuses, so GitHub is the source
  // of truth for where this ticket is in the review cycle.
  phase('Review')
  const prCheck = await agent(
    `Check the GitHub PR state for Linear ticket ${ticket.linearId}. ` +
    `Run: gh pr list --search "${ticket.linearId}" --state all --json number,state,mergedAt,headRefName,url 2>/dev/null ` +
    `A PR is "open" if state=="OPEN", "merged" if mergedAt is not null. ` +
    `Return { hasPR: true/false, prMerged: true/false, prOpen: true/false, prUrl: "<url or empty string>" }`,
    { agentType: 'qa-agent', schema: PR_STATE_SCHEMA, phase: 'Review' }
  )

  if (prCheck.prMerged) {
    // PR already merged — run QA
    phase('QA')
    log(`PR merged for ${ticket.linearId} — running QA.`)
    await agent(
      `QA test Linear ticket ${ticket.linearId}: "${ticket.title}" on the main branch after the PR was merged.`,
      { agentType: 'qa-agent', phase: 'QA' }
    )
    log(`QA complete for ${ticket.linearId}.`)
    continue
  }

  if (prCheck.prOpen) {
    // PR exists but not yet merged — pause and wait
    log(`⏸  PR for ${ticket.linearId} is open at ${prCheck.prUrl || 'GitHub'}. Merge it, then re-run this workflow.`)
    break
  }

  // No PR yet — run code-review-agent to create one
  log(`No PR found for ${ticket.linearId} — running code review.`)
  await agent(
    `Review the code and create a GitHub PR for Linear ticket ${ticket.linearId}: "${ticket.title}".`,
    { agentType: 'code-review-agent', phase: 'Review' }
  )
  log(`PR created for ${ticket.linearId}. ⏸  Merge it on GitHub, then re-run this workflow to continue.`)
  break
}

// ── Completion check ───────────────────────────────────────────────────────

const allDone = tickets.every(t => {
  const s = (t.status || '').toLowerCase()
  return s === 'done' || s === 'cancelled' || s === 'completed'
})

if (allDone && tickets.length > 0) {
  log('🎉 All tickets are Done! TaskFlow pipeline complete.')
  log('Next steps: run Lighthouse audit, WCAG check, and deploy to Vercel staging.')
}
