# TaskFlow Todo List Multi-Agent Development Pipeline Design Spec

**Document Date:** 2026-06-26  
**Project:** TaskFlow Todo List Web App  
**Status:** Design Specification

---

## 1. Overview

The TaskFlow Todo List web app will be developed using a multi-agent development pipeline that simulates a software development team using Claude Code custom agents. Four specialized agents collaborate asynchronously via Linear (project management) and GitHub (code hosting) to design, implement, review, and test features.

**Pipeline Goal:** Fully automate the development cycle from requirements → implementation → code review → QA, with human intervention only at critical merge points.

**Orchestration:** A JavaScript-based coordinator workflow in `.claude/workflows/taskflow-pipeline.js` manages agent sequencing, state transitions, and resumption logic.

---

## 2. Agent Definitions

### 2.1 PM Agent (Project Manager)

**Role:** Senior Product Manager / Requirements Analyst

**Trigger:** Run once at project bootstrap

**Responsibilities:**
- Read the product requirements document from `Taskflow-todo.docx`
- Create a Linear project named "TaskFlow"
- Create 15 feature tickets (F-01 to F-15) with:
  - Descriptive titles reflecting feature scope
  - Full descriptions extracted from PRD sections
  - Priority mapping:
    - Must Have features → **Urgent** priority
    - Should Have features → **Medium** priority
    - Could Have features → **Low** priority
  - Initial status: `Backlog`
  - Acceptance criteria from PRD
  - Links to related tickets where applicable
- Document feature dependencies and prerequisites

**Allowed Tools:**
- Linear MCP (create project, create issues, list issues, get project)
- Read (access PRD document)

**Success Criteria:**
- All 15 tickets created with complete information
- Priorities correctly mapped from PRD
- Tickets ordered in Linear by priority (Urgent first)
- No duplicate tickets

**Output:** Linear project "TaskFlow" with all feature tickets in Backlog status

---

### 2.2 Dev Agent (Developer)

**Role:** Senior Next.js / Framer Motion / Tailwind CSS Developer

**Trigger:** Runs per ticket when status is `Backlog` or `In Progress`

**Responsibilities:**
- Poll Linear for next available ticket (highest priority)
- Read ticket details and acceptance criteria
- Create feature branch named `feature/<ticket-id>-<slug>` (e.g., `feature/F-01-task-creation`)
  - Branch off main or from previous feature branch if dependent
- Implement feature per PRD specifications:
  - **Framework:** Next.js App Router with TypeScript
  - **Styling:** Tailwind CSS utility classes
  - **Animation Library:** Framer Motion for all motion design
  - **Performance:** 60fps animations using CSS transforms (translate, scale) and opacity only — no layout thrashing
  - **Accessibility:** WCAG 2.1 AA compliance (keyboard navigation, ARIA labels, focus management)
  - **Code Quality:** ESLint + Prettier compliance
- Write unit and integration tests (Jest, React Testing Library)
  - Target coverage: >80% per ticket
  - Tests verify animation timing, accessibility, and business logic
- Commit changes with clear, ticket-scoped messages
- Push branch to GitHub
- Update Linear ticket status to `In Progress` during implementation, then `In Review` when ready for code review

**Allowed Tools:**
- Bash (git, npm, file operations)
- Read (ticket details, existing code)
- Write (new files)
- Edit (modify existing files)
- Linear MCP (read issue, update issue status, add comments)

**Success Criteria:**
- Feature branch created and pushed
- Code compiles with zero errors
- All tests pass locally (`npm test`)
- Tests cover >80% of new code
- Animations meet 60fps spec
- No accessibility warnings in testing tools
- Ticket moved to `In Review`

**Output:** Feature branch with working code, tests, and related commits; ticket in `In Review` status

---

### 2.3 Code Review Agent (Code Reviewer)

**Role:** Senior Code Reviewer / Architecture Reviewer

**Trigger:** Runs per ticket when status is `In Review`

**Responsibilities:**
- Retrieve Linear ticket ID and feature branch name
- Fetch the feature branch and check out the tip commit
- Generate diff against main: `git diff main...HEAD`
- Review for:
  - **Correctness:** No bugs, logic errors, or edge cases missed
  - **Animation Spec Compliance:** Verify Framer Motion usage, transform/opacity only, 60fps target
  - **Accessibility:** ARIA labels, keyboard navigation, focus traps, contrast ratios
  - **Test Coverage:** >80% coverage, test quality, edge case testing
  - **Performance:** No unnecessary re-renders, bundle size impact, CSS performance
  - **Code Style:** ESLint compliance, naming conventions, documentation
  - **Security:** No hardcoded secrets, input validation, XSS prevention
- Create a GitHub pull request using `gh pr create` with:
  - Title: `[F-xx] Feature Title`
  - Body: Structured markdown with sections:
    - **Summary:** 1-2 sentence overview
    - **Changes:** Bullet list of changes
    - **Tests:** Coverage report and test summary
    - **Review Notes:** Any implementation notes or edge cases
    - **Checklist:** Verification checklist for reviewer
- Move Linear ticket to `In Review (PR Open)` status
- Add PR link in Linear ticket as a comment/attachment

**Allowed Tools:**
- Bash (git, GitHub CLI `gh pr create`, diff generation)
- Read (review code files, PR templates)
- Linear MCP (read issue, update status, add comments)

**Success Criteria:**
- GitHub PR created with structured body
- PR review completed and documented
- Ticket moved to `In Review (PR Open)`
- PR link added to Linear ticket

**Output:** GitHub PR open; ticket in `In Review (PR Open)` status

---

### 2.4 QA Agent (QA Engineer)

**Role:** QA Engineer / Quality Assurance Specialist

**Trigger:** Runs per ticket after PR is merged to main (checked via coordinator)

**Responsibilities:**
- Pull latest main branch
- Retrieve Linear ticket and read acceptance criteria
- Run full test suite: `npm test`
- Start development server: `npm run dev`
- Manually verify feature behavior against acceptance criteria:
  - Feature functionality works as specified
  - Animations play smoothly (visual inspection, no janky frames)
  - Accessibility features work (keyboard nav, screen reader compat)
  - UI responsiveness across breakpoints
  - No console errors or warnings
- If issues found:
  - Create bug ticket(s) on Linear linked to parent ticket (Feature)
  - Set bug ticket to `Backlog` for dev-agent pickup
  - Move feature ticket to `Bug Found`
  - Log issue details in ticket comments
- If all tests pass and verification succeeds:
  - Move feature ticket to `Done`
  - Log verification summary in ticket comments
- Shut down dev server cleanly

**Allowed Tools:**
- Bash (git, npm test/dev, process management)
- Read (acceptance criteria, feature code)
- Linear MCP (read issue, create issue for bugs, update status, add comments)

**Success Criteria:**
- Test suite passes
- Feature verified against acceptance criteria
- No console errors
- Ticket moved to `Done` OR bug tickets created and feature moved to `Bug Found`
- Verification summary logged

**Output:** Ticket in `Done` status, or bug tickets created and ticket in `Bug Found` status

---

## 3. Coordinator Workflow

**File:** `.claude/workflows/taskflow-pipeline.js`

**Purpose:** Orchestrate agent sequencing, manage ticket state transitions, and handle resumption logic.

### 3.1 Workflow States and Transitions

```
Backlog / In Progress
    ↓ (dev-agent)
    → In Review
      ↓ (code-review-agent creates PR)
      → In Review (PR Open)
        ↓ (check if PR merged)
        ├─ NOT merged: wait, exit, resume later
        └─ merged: In QA (implicit)
          ↓ (qa-agent)
          ├─ All pass: Done
          └─ Issues: Bug Found
            ↓ (new bug tickets created)
            → dev-agent picks up linked bugs
```

### 3.2 Workflow Logic (Pseudocode)

```javascript
// taskflow-pipeline.js

async function runPipeline() {
  // BOOTSTRAP PHASE
  console.log("[BOOTSTRAP] Checking for TaskFlow Linear project...");
  const project = await linear.getProject("TaskFlow");
  
  if (!project) {
    console.log("[BOOTSTRAP] Project not found. Running pm-agent...");
    await runAgent("pm-agent");
    console.log("[BOOTSTRAP] PM Agent complete. TaskFlow project created.");
  } else {
    console.log("[BOOTSTRAP] TaskFlow project exists. Skipping pm-agent.");
  }

  // DEVELOPMENT LOOP
  const tickets = await linear.listIssues(projectId, {
    orderBy: "priority DESC, createdAt ASC"
  });

  for (const ticket of tickets) {
    const ticketId = ticket.identifier; // e.g., F-01
    const status = ticket.status;

    console.log(`[TICKET: ${ticketId}] Status: ${status}`);

    switch (status) {
      case "Backlog":
      case "In Progress":
        console.log(`[TICKET: ${ticketId}] Running dev-agent...`);
        await runAgent("dev-agent", { ticketId });
        break;

      case "In Review":
        console.log(`[TICKET: ${ticketId}] Running code-review-agent...`);
        await runAgent("code-review-agent", { ticketId });
        console.log(
          `[TICKET: ${ticketId}] PR created. Awaiting manual merge on GitHub.`
        );
        console.log(`[TICKET: ${ticketId}] Re-run workflow after merge.`);
        process.exit(0); // Exit to await merge
        break;

      case "In Review (PR Open)":
        console.log(`[TICKET: ${ticketId}] Checking if PR merged...`);
        const prMerged = await checkPRMerged(ticketId);
        
        if (!prMerged) {
          console.log(
            `[TICKET: ${ticketId}] PR not yet merged. Waiting. Re-run workflow when ready.`
          );
          process.exit(0);
        } else {
          console.log(`[TICKET: ${ticketId}] PR merged. Running qa-agent...`);
          await runAgent("qa-agent", { ticketId });
        }
        break;

      case "Bug Found":
        // Bug tickets linked to this feature were created by qa-agent
        // Skip feature, but allow dev-agent to pick up linked bugs separately
        console.log(`[TICKET: ${ticketId}] Bugs found. Skipping feature.`);
        break;

      case "Done":
        console.log(`[TICKET: ${ticketId}] Already done. Skipping.`);
        break;

      default:
        console.log(`[TICKET: ${ticketId}] Unknown status: ${status}. Skipping.`);
    }
  }

  // COMPLETION
  const doneCount = tickets.filter(t => t.status === "Done").length;
  console.log(
    `[COMPLETION] Pipeline complete. ${doneCount}/${tickets.length} tickets done.`
  );

  if (doneCount === tickets.length) {
    console.log("[COMPLETION] All tickets done! Pipeline succeeded.");
    process.exit(0);
  } else {
    console.log(
      "[COMPLETION] Some tickets pending. Re-run workflow to continue."
    );
    process.exit(0);
  }
}

async function checkPRMerged(ticketId) {
  // Query GitHub for PR with ticket ID in title, check if merged
  const result = await bash(
    `gh pr list --search "${ticketId}" --state merged --json number,title`
  );
  return result.length > 0;
}

async function runAgent(agentName, params = {}) {
  // Spawn custom agent with appropriate prompt and context
  // Agents defined in .claude/agents/<name>.md
  console.log(`[AGENT] Launching ${agentName}...`);
  // Implementation calls Claude Agent API with agent definition
  // Returns when agent completes
}

// Main entry
runPipeline().catch(err => {
  console.error("[ERROR]", err.message);
  process.exit(1);
});
```

### 3.3 Coordinator Behavior

**Bootstrap Phase:**
- Check if Linear project "TaskFlow" exists
- If not, launch pm-agent to create it
- If exists, proceed to development loop

**Development Loop:**
- Iterate through tickets ordered by priority (Urgent → Medium → Low)
- Per ticket:
  - If `Backlog` or `In Progress`: Run dev-agent
  - If `In Review`: Run code-review-agent, then exit (awaiting manual merge)
  - If `In Review (PR Open)`: Check if PR merged on GitHub
    - If not merged: Log waiting message and exit
    - If merged: Run qa-agent
  - If `Bug Found`: Skip feature ticket; bugs will be picked up as separate tickets
  - If `Done`: Skip

**Resumption:**
- After human merges a PR, re-run the coordinator
- Coordinator detects `In Review (PR Open)` status, finds merged PR, and runs qa-agent
- Coordinator continues iterating through remaining tickets without re-processing done tickets

**Completion:**
- When all tickets reach `Done` status, log completion summary
- Exit cleanly

---

## 4. Linear Ticket States

Linear project will use a custom workflow with the following states:

| State | Description | Assigned To | Transition |
|-------|-------------|-------------|-----------|
| `Backlog` | Ticket created, waiting for dev-agent | - | Dev-agent picks up |
| `In Progress` | Dev-agent actively implementing | dev-agent | After code ready |
| `In Review` | Code written, ready for review | dev-agent → code-review-agent | After code-review-agent runs |
| `In Review (PR Open)` | PR created on GitHub, awaiting merge | dev/review team | After PR merged |
| `In QA` | PR merged, in QA testing (implicit) | qa-agent | After test results |
| `Done` | Feature complete and verified | - | Pipeline end |
| `Bug Found` | QA found issues; bugs created | dev-agent (bugs) | Dev-agent fixes bugs |

---

## 5. File Structure

```
todo-list-linear/
├── .claude/
│   ├── agents/
│   │   ├── pm-agent.md          # PM agent definition with prompt
│   │   ├── dev-agent.md         # Dev agent definition with prompt
│   │   ├── code-review-agent.md # Code review agent definition
│   │   └── qa-agent.md          # QA agent definition
│   └── workflows/
│       └── taskflow-pipeline.js # Coordinator workflow
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-06-26-taskflow-multiagent-design.md # This file
│
├── .github/
│   └── workflows/               # GitHub Actions (optional, for automation)
│
├── src/                         # Created by dev-agent on first ticket
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   └── lib/
│
├── tests/                       # Created by dev-agent
│   ├── unit/
│   └── integration/
│
├── package.json                 # Created by dev-agent
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── jest.config.ts
│
└── Taskflow-todo.docx          # PRD document (external, read by pm-agent)
```

---

## 6. Human Intervention Points

### 6.1 PR Merge (Critical)

**When:** After code-review-agent creates a PR and moves ticket to `In Review (PR Open)`

**What:** Human (or GitHub Actions bot) merges the PR on GitHub into main

**Why:** Ensures code quality gate before automated QA; allows for manual review of PRs if desired

**Action:**
1. Go to GitHub repository
2. Find PR titled `[F-xx] Feature Title`
3. Review changes (code-review-agent already did detailed review)
4. Click "Merge pull request" and "Confirm merge"
5. Delete branch (optional)

**Resumption:** Re-run coordinator workflow; it detects merged PR and runs qa-agent

### 6.2 Bug Triage (Optional)

**When:** qa-agent finds issues and creates bug tickets (status `Backlog`)

**What:** Human reviews bug tickets and optionally adjusts priority, adds notes, or closes if not valid

**Why:** Bugs may be minor or environmental; human judgment ensures valid issues are fixed

**Action:**
1. Go to Linear project "TaskFlow"
2. Find bug tickets (linked to parent feature, marked as bugs)
3. Triage: adjust priority, add notes, or close if not valid
4. Dev-agent will pick up bugs from `Backlog` on next coordinator run

---

## 7. One-time Setup Requirements

### 7.1 Environment Setup

**Required Tools:**
- Node.js 18+ (for Next.js App Router)
- npm or yarn package manager
- Git (initialized locally)
- GitHub CLI (`gh`) version 2.x+

**Authentication:**
```bash
# Authenticate GitHub CLI
gh auth login
# Follow prompts to authorize

# Verify GitHub auth
gh repo list

# Verify Linear MCP is connected
# (Already configured in Claude Code)
```

### 7.2 Git Repository Setup

```bash
# Initialize git (if not already)
cd /home/ruturaj/personal/projects/todo-list-linear
git init
git config user.name "TaskFlow Bot"
git config user.email "taskflow@localhost"

# Create initial commit
echo "# TaskFlow Todo List" > README.md
git add README.md
git commit -m "Initial commit"

# Create remote repository on GitHub
gh repo create TaskFlow-todo-list --public --source=. --remote=origin --push
# or existing repo:
# git remote add origin https://github.com/<user>/TaskFlow-todo-list.git
# git push -u origin main
```

### 7.3 Linear Project Setup

**Preconditions:**
- Linear workspace created
- Linear MCP server configured and authenticated in Claude Code
- User has appropriate Linear permissions (admin or project lead)

**Coordinator will handle:**
- Creating "TaskFlow" project via pm-agent
- Creating 15 feature tickets with priorities and descriptions
- Setting up Linear workflow states (Backlog, In Progress, In Review, etc.)

---

## 8. Acceptance Criteria (for the Pipeline)

### 8.1 PM Agent Acceptance Criteria

- [ ] **All 15 tickets created:** Linear project contains exactly 15 feature tickets (F-01 through F-15)
- [ ] **Correct priorities mapped:** Urgent (Must Have), Medium (Should Have), Low (Could Have)
- [ ] **Complete descriptions:** Each ticket includes:
  - Feature title
  - Full description from PRD
  - Acceptance criteria
  - Related dependencies (if any)
- [ ] **Status initialized:** All tickets start in `Backlog` status
- [ ] **No duplicates:** No duplicate tickets in project
- [ ] **Proper ordering:** Tickets ordered by priority in Linear backlog

### 8.2 Dev Agent Acceptance Criteria

- [ ] **Branch created:** Feature branch named `feature/F-xx-slug` exists and pushed to GitHub
- [ ] **Code compiles:** `npm run build` succeeds with zero errors
- [ ] **Tests written:** Unit and integration tests exist for feature
- [ ] **Test coverage:** >80% code coverage for implemented feature (measured via Jest coverage report)
- [ ] **Tests pass:** `npm test` passes all tests locally with zero failures
- [ ] **Animation compliance:** All animations use Framer Motion with CSS transforms/opacity only; no layout thrashing
- [ ] **Accessibility:** No WCAG 2.1 AA violations (tested via axe DevTools, WAVE, or similar)
- [ ] **Commits pushed:** Feature branch pushed to GitHub with clear commit messages
- [ ] **Ticket updated:** Linear ticket status changed from `Backlog` to `In Review`

### 8.3 Code Review Agent Acceptance Criteria

- [ ] **PR created:** GitHub PR exists with:
  - Title: `[F-xx] Feature Title`
  - Structured body with Summary, Changes, Tests, Review Notes, Checklist
  - Linked to correct branch
- [ ] **Review completed:** Code review documented in PR comments or body
- [ ] **Ticket updated:** Linear ticket status changed to `In Review (PR Open)`
- [ ] **PR linked:** PR URL added to Linear ticket as comment or custom field

### 8.4 QA Agent Acceptance Criteria

- [ ] **Tests pass:** `npm test` exits with zero failures
- [ ] **Dev server runs:** `npm run dev` starts successfully
- [ ] **Feature verified:** Manual verification against acceptance criteria completed:
  - Functionality works as specified
  - Animations play smoothly (no janking)
  - Keyboard navigation works
  - UI responsive across breakpoints
  - No console errors/warnings
- [ ] **Ticket transitioned correctly:**
  - If all verifications pass: Ticket moved to `Done`
  - If issues found: Bug ticket(s) created and linked; feature ticket moved to `Bug Found`
- [ ] **Verification logged:** QA summary/notes added to Linear ticket comments

### 8.5 Pipeline Acceptance Criteria (End-to-End)

- [ ] **Coordinator runs without errors:** `.claude/workflows/taskflow-pipeline.js` executes and completes without uncaught exceptions
- [ ] **Bootstrap works:** First run creates Linear project and all tickets
- [ ] **Agent sequencing correct:** Agents run in order (PM → Dev → Review → QA) per ticket
- [ ] **State transitions correct:** Tickets move through states (Backlog → In Progress → In Review → In Review (PR Open) → Done) without skipping
- [ ] **PR merge resumption:** After manual PR merge, re-running coordinator resumes correctly without re-processing done tickets
- [ ] **No re-processing:** `Done` tickets skipped on subsequent runs
- [ ] **Bug handling:** If QA finds issues, bug tickets created and picked up by dev-agent; feature ticket moved to `Bug Found`
- [ ] **Clean exit:** Coordinator exits cleanly with appropriate log messages (not in error state) when awaiting manual intervention (PR merge, human triage)

---

## 9. Agent Definition Files

Each agent will have a dedicated definition file in `.claude/agents/` that contains:

1. **Agent Prompt:** Clear instructions for the agent's role and responsibilities
2. **Context:** Links to relevant docs, PRD, ticket templates
3. **Tools:** Allowed tools and usage examples
4. **Success Criteria:** How to know the agent completed successfully
5. **Error Handling:** What to do if issues occur

### 9.1 Structure (Example: dev-agent.md)

```markdown
# Dev Agent Definition

## Role
Senior Next.js / Framer Motion / Tailwind CSS Developer

## Responsibilities
- Read assigned Linear ticket
- Create feature branch (feature/<ticket-id>-<slug>)
- Implement feature per PRD specs
- Write >80% coverage tests
- Push branch and update ticket to In Review

## Tools
- Bash (git, npm, file ops)
- Read, Write, Edit
- Linear MCP

## Prompt
[Full detailed prompt with specific instructions]

## Success Criteria
- Branch created and pushed
- Code compiles
- Tests pass
- Coverage >80%
- Ticket in In Review status
```

---

## 10. Implementation Phases

### Phase 1: Setup (1 session)
- Create directory structure (`.claude/agents/`, `.claude/workflows/`)
- Initialize git repo and GitHub remote
- Create Linear project manually (or via pm-agent in Phase 2)
- Write agent definition files (.md)

### Phase 2: Bootstrap (1 session)
- Run pm-agent to create TaskFlow Linear project
- Verify 15 tickets created with correct priorities
- Confirm tickets in Backlog status

### Phase 3: First Feature (2-3 sessions)
- Run coordinator; dev-agent picks up F-01 (highest priority)
- Dev-agent implements feature, writes tests, creates branch
- Code-review-agent reviews and creates PR
- Human merges PR
- QA-agent verifies and moves to Done

### Phase 4: Full Pipeline (N sessions)
- Run coordinator repeatedly
- Iterate through all 15 tickets
- Handle any bugs found (create new bug tickets, loop back)
- Final status: All tickets Done

---

## 11. Configuration Files (Template)

### `.claude/agents/pm-agent.md`
- PM role definition and prompt
- Instructions for reading PRD and creating Linear tickets
- Feature list template with priority mapping

### `.claude/agents/dev-agent.md`
- Dev role definition and prompt
- Next.js app structure template
- Testing best practices and coverage requirements
- Framer Motion animation guidelines (60fps, transforms/opacity only)
- WCAG 2.1 AA checklist

### `.claude/agents/code-review-agent.md`
- Code reviewer role definition and prompt
- PR template with structured sections
- Review checklist (correctness, performance, accessibility, tests)
- GitHub CLI `gh pr create` usage examples

### `.claude/agents/qa-agent.md`
- QA role definition and prompt
- Acceptance criteria verification checklist
- Bug ticket creation template
- Manual testing procedures

### `.claude/workflows/taskflow-pipeline.js`
- Coordinator logic (Bootstrap, Development Loop, Completion)
- State machine for ticket transitions
- Agent invocation logic
- Error handling and logging

---

## 12. Known Constraints & Future Work

### Current Constraints
1. **Manual PR Merge:** PRs must be manually merged on GitHub (security/quality gate)
2. **Async Coordination:** Coordinator designed for serial execution; parallel agent runs would require additional orchestration
3. **Error Recovery:** Agents should implement retry logic or clear error logging for human investigation
4. **Ticketing Precision:** Linear ticket IDs and titles must match exactly between Linear and coordinator for PR/branch mapping

### Future Enhancements
1. **GitHub Actions Integration:** Auto-merge PRs if CI passes and review conditions met
2. **Slack Notifications:** Alert humans when PR ready for merge or bugs found
3. **Performance Dashboard:** Real-time pipeline status and metrics
4. **Rollback Capability:** Revert a ticket to Backlog if QA finds blockers
5. **Dependency Management:** Auto-order tickets by feature dependencies

---

## 13. Success Metrics

**Pipeline Success is defined as:**
- All 15 feature tickets created and moved to Done
- >1200 lines of functional code (avg ~80 per feature)
- >80% test coverage across codebase
- Zero WCAG 2.1 AA violations in final UI
- Zero console errors in production build
- All Framer Motion animations at 60fps
- Average ticket cycle time (Backlog → Done): < 1 hour of agent runtime per ticket

**Code Quality:**
- ESLint: zero errors
- TypeScript: strict mode, zero `any` types
- Prettier: all code formatted
- Test quality: meaningful assertions, edge case coverage

---

## 14. References & Links

- **Product Requirements Document:** `Taskflow-todo.docx`
- **GitHub Repository:** `https://github.com/<user>/TaskFlow-todo-list`
- **Linear Project:** `https://linear.app/TaskFlow`
- **Next.js Documentation:** `https://nextjs.org/docs`
- **Framer Motion Guide:** `https://www.framer.com/motion/`
- **WCAG 2.1 Guidelines:** `https://www.w3.org/WAI/WCAG21/quickref/`
- **Jest Documentation:** `https://jestjs.io/docs/getting-started`

---

**Document Prepared By:** Claude Code Multi-Agent Specification  
**Last Updated:** 2026-06-26  
**Version:** 1.0
