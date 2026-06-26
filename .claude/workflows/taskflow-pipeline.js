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

const PR_MERGED_SCHEMA = {
  type: 'object',
  properties: {
    merged: { type: 'boolean' },
    prUrl: { type: 'string' },
  },
  required: ['merged'],
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

  // ── Backlog / Todo / In Progress → run dev-agent ─────────────────────────
  if (s === 'backlog' || s === 'todo' || s === 'in progress' || s === 'started') {
    phase('Develop')
    log(`Implementing ${ticket.linearId}: ${ticket.title}`)
    await agent(
      `Implement Linear ticket ${ticket.linearId}: "${ticket.title}". Follow the PRD specs exactly.`,
      { agentType: 'dev-agent', phase: 'Develop' }
    )
    log(`${ticket.linearId} implementation complete — proceeding to code review.`)

    // Fall through into Review phase immediately (status updated by dev-agent)
    phase('Review')
    log(`Reviewing ${ticket.linearId}: ${ticket.title}`)
    await agent(
      `Review the code and create a GitHub PR for Linear ticket ${ticket.linearId}: "${ticket.title}".`,
      { agentType: 'code-review-agent', phase: 'Review' }
    )
    log(`PR created for ${ticket.linearId}. ⏸  Merge it on GitHub, then re-run this workflow to continue.`)
    break // Pause for human PR merge
  }

  // ── In Review (no PR yet) → run code-review-agent ────────────────────────
  if (s === 'in review' || (s.includes('review') && !s.includes('pr'))) {
    phase('Review')
    log(`${ticket.linearId} is In Review — creating PR.`)
    await agent(
      `Review the code and create a GitHub PR for Linear ticket ${ticket.linearId}: "${ticket.title}".`,
      { agentType: 'code-review-agent', phase: 'Review' }
    )
    log(`PR created for ${ticket.linearId}. ⏸  Merge it on GitHub, then re-run this workflow to continue.`)
    break // Pause for human PR merge
  }

  // ── PR open — check if merged ─────────────────────────────────────────────
  if (s.includes('pr open') || s.includes('pr open')) {
    phase('QA')
    const prCheck = await agent(
      `Check if the GitHub PR for ticket ${ticket.linearId} has been merged to main. ` +
      `Run: gh pr list --search "${ticket.linearId}" --state merged --json number,state,mergedAt 2>/dev/null. ` +
      `Also try: gh pr list --state merged --json number,headRefName,state | grep -i "${ticket.linearId.toLowerCase()}". ` +
      `Return { merged: true/false, prUrl: "<url or empty string>" }`,
      { agentType: 'qa-agent', schema: PR_MERGED_SCHEMA, phase: 'QA' }
    )

    if (!prCheck.merged) {
      log(`⏸  PR for ${ticket.linearId} is not yet merged. Merge it on GitHub, then re-run this workflow.`)
      break
    }

    log(`PR merged! Running QA for ${ticket.linearId}: ${ticket.title}`)
    await agent(
      `QA test Linear ticket ${ticket.linearId}: "${ticket.title}" on the main branch after the PR was merged.`,
      { agentType: 'qa-agent', phase: 'QA' }
    )
    log(`QA complete for ${ticket.linearId}.`)
    // Continue to next ticket
    continue
  }

  // ── In QA (qa-agent running or re-running) ────────────────────────────────
  if (s === 'in qa') {
    phase('QA')
    log(`Re-running QA for ${ticket.linearId}: ${ticket.title}`)
    await agent(
      `QA test Linear ticket ${ticket.linearId}: "${ticket.title}" on the main branch.`,
      { agentType: 'qa-agent', phase: 'QA' }
    )
    continue
  }

  log(`Unknown status "${ticket.status}" for ${ticket.linearId} — skipping. Check Linear manually.`)
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
