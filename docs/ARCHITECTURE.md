# DevFactory Distributed v3.1
## Master Architecture Design

**Version**: 3.1.0 (Distributed Edition)
**Author**: Johnny5 + Claude
**Date**: November 2025
**Status**: Design Complete, Ready for Implementation

---

## Executive Summary

DevFactory v3.1 extends the existing v3.0 system with a **distributed execution model** that enables autonomous, parallel development across multiple Claude Code sessions. The system leverages your Max subscription for workers (free) and lightweight API calls for orchestration (~$2-3 per project).

**Key Innovations**: 

1. **Batch all specs upfront** during the human-interactive phase, then let the system execute autonomously for hours or days

2. **Claude-in-the-loop escalation** - When tasks get stuck, Claude Strategist reviews with full context (mission, specs, code) and makes decisions. You only hear about things that genuinely require human action (credentials, business decisions).

**The result**: You spend 3 hours on planning/specs, then get emails when waves complete. You never debug code. You never see error messages. Claude handles it all.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVFACTORY v3.1 DISTRIBUTED                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: HUMAN-INTERACTIVE (You + Claude)                                  │
│  ═══════════════════════════════════════════                                │
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ /plan-product │───▶│ /shape-spec  │───▶│ /create-spec │                   │
│  │              │    │  (×N specs)  │    │  (×N specs)  │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                                        │                          │
│         ▼                                        ▼                          │
│  ┌──────────────────┐              ┌─────────────────────────────┐         │
│  │ product/         │              │ specs/                       │         │
│  │   mission.md     │              │   2025-11-26-feature-1/     │         │
│  │   roadmap.md     │              │   2025-11-26-feature-2/     │         │
│  │   tech-stack.md  │              │   2025-11-27-feature-3/     │         │
│  └──────────────────┘              │   ...                       │         │
│                                    │   2025-11-27-feature-8/     │         │
│                                    └─────────────────────────────┘         │
│                                                                              │
│  YOUR TIME: ~2-4 hours for 8-feature project                                │
│  OUTPUT: Complete specs for entire roadmap                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: DISTRIBUTED PLANNING (Claude generates execution plan)            │
│  ══════════════════════════════════════════════════════════════             │
│                                                                              │
│  ┌────────────────────┐                                                     │
│  │ /plan-execution    │  NEW COMMAND                                        │
│  │                    │                                                     │
│  │ Reads all specs,   │                                                     │
│  │ builds master plan │                                                     │
│  └─────────┬──────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ .devfactory/execution-plan.yml                                       │   │
│  │                                                                      │   │
│  │ spec_waves:                                                          │   │
│  │   - wave: 1                                                          │   │
│  │     name: "Foundation"                                               │   │
│  │     specs: [feature-1, feature-2]                                    │   │
│  │     parallel: true                                                   │   │
│  │                                                                      │   │
│  │   - wave: 2                                                          │   │
│  │     name: "Core Experience"                                          │   │
│  │     specs: [feature-3, feature-4, feature-5]                         │   │
│  │     parallel: true                                                   │   │
│  │     depends_on: [wave-1]                                             │   │
│  │                                                                      │   │
│  │   - wave: 3                                                          │   │
│  │     name: "Enhancement"                                              │   │
│  │     specs: [feature-6, feature-7, feature-8]                         │   │
│  │     parallel: true                                                   │   │
│  │     depends_on: [wave-2]                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: AUTONOMOUS EXECUTION (System runs, you watch)                     │
│  ══════════════════════════════════════════════════════                     │
│                                                                              │
│  ┌────────────────────┐                                                     │
│  │ /execute-plan      │  NEW COMMAND (or automatic trigger)                 │
│  └─────────┬──────────┘                                                     │
│            │                                                                 │
│            ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SPEC WAVE 1: Foundation                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ Spec: feature-1 (User Auth)                                  │    │   │
│  │  │ /orchestrate-tasks generates orchestration.yml               │    │   │
│  │  │                                                              │    │   │
│  │  │ Task Waves:                                                  │    │   │
│  │  │   [database] → [api, cache] → [frontend] → [testing]        │    │   │
│  │  │                                                              │    │   │
│  │  │ Distributed Sessions:                                        │    │   │
│  │  │   Session 1 (Backend)  ──┐                                   │    │   │
│  │  │   Session 2 (Frontend) ──┼──▶ Work in parallel               │    │   │
│  │  │   Session 3 (Testing)  ──┘    Coordinate via Git             │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                              ║                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ Spec: feature-2 (User Profiles)  ← PARALLEL WITH feature-1  │    │   │
│  │  │ Same distributed execution model                            │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                              ║                                       │   │
│  │                              ▼                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ GitHub Orchestrator (Action)                                 │    │   │
│  │  │   • Reviews completed task PRs via Claude API (~$0.02/task) │    │   │
│  │  │   • Auto-merges approved work                               │    │   │
│  │  │   • Spawns fix agents for rejections (up to 3 retries)      │    │   │
│  │  │   • Updates .devfactory/ state                              │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                              ║                                       │   │
│  │                              ▼                                       │   │
│  │              📧 "Spec Wave 1 Complete! 2 specs, 18 tasks merged"    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ║                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SPEC WAVE 2: Core Experience                     │   │
│  │  [feature-3, feature-4, feature-5 execute in parallel]              │   │
│  │                              ...                                     │   │
│  │              📧 "Spec Wave 2 Complete! 3 specs, 31 tasks merged"    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ║                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SPEC WAVE 3: Enhancement                         │   │
│  │  [feature-6, feature-7, feature-8 execute in parallel]              │   │
│  │                              ...                                     │   │
│  │         📧 "🎉 Project Complete! 8 specs, 58 tasks, all merged"     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Complete Pipeline

### Phase 1: Product Planning (Human + Claude)

**Command**: `/plan-product`

**What Happens**:
- Interactive conversation about your product vision
- Creates foundational documents that guide everything

**Output**:
```
.devfactory/product/
├── mission.md          # Vision, users, problems, differentiators
├── mission-lite.md     # Condensed version for AI context
├── roadmap.md          # 6-12 features in phases
└── tech-stack.md       # Technical architecture
```

**Time**: 30-60 minutes
**Your Role**: Active conversation partner

---

### Phase 2: Spec Shaping (Human + Claude, per feature)

**Command**: `/shape-spec "Feature from roadmap"`

**What Happens**:
- Deep Q&A about users, workflows, edge cases
- Collect visual assets (mockups, wireframes)
- Create structured requirements

**Output** (per feature):
```
.devfactory/specs/YYYY-MM-DD-feature-name/
└── planning/
    ├── initialization.md    # Raw user input
    ├── requirements.md      # Complete Q&A + requirements
    └── visuals/             # Mockups, wireframes
```

**Time**: 15-30 minutes per feature
**Your Role**: Answer questions, provide mockups

**BATCHING STRATEGY**: Do ALL features from roadmap before moving to Phase 3.

```bash
# Example: 8-feature roadmap
/shape-spec "User authentication with OAuth"
/shape-spec "User profiles and settings"
/shape-spec "Dashboard with analytics"
/shape-spec "Team management"
/shape-spec "Notification system"
/shape-spec "Billing integration"
/shape-spec "Admin panel"
/shape-spec "Mobile responsive polish"
```

---

### Phase 3: Spec Creation (Human + Claude, per feature)

**Command**: `/create-spec`

**What Happens**:
- Uses requirements.md + stack patterns
- Subagents help build comprehensive specs
- Creates formal technical documentation

**Output** (per feature):
```
.devfactory/specs/YYYY-MM-DD-feature-name/
├── planning/            # (from shape-spec)
├── srd.md              # Software Requirements Document
├── specs.md            # Technical specifications
└── tasks.md            # Task breakdown with groups
```

**Time**: 10-20 minutes per feature (mostly automated)
**Your Role**: Review and approve specs

**BATCHING STRATEGY**: Create ALL specs before execution.

---

### Phase 4: Execution Planning (Claude, NEW)

**Command**: `/plan-execution` (NEW)

**What Happens**:
- Reads all specs in `.devfactory/specs/`
- Analyzes cross-spec dependencies
- Groups specs into execution waves
- Creates master execution plan

**Output**:
```yaml
# .devfactory/execution-plan.yml
version: "1.0"
project: "My SaaS Platform"
created_at: "2025-11-26T10:00:00Z"

total_specs: 8
total_estimated_tasks: 58

spec_waves:
  - wave: 1
    name: "Foundation"
    description: "Core infrastructure and auth"
    specs:
      - id: "2025-11-26-user-authentication"
        estimated_tasks: 12
        priority: critical
      - id: "2025-11-26-user-profiles"
        estimated_tasks: 8
        priority: high
    parallel: true
    estimated_duration: "4-6 hours"
    
  - wave: 2
    name: "Core Experience"
    description: "Primary user-facing features"
    depends_on: [1]
    specs:
      - id: "2025-11-26-dashboard"
        estimated_tasks: 10
      - id: "2025-11-27-team-management"
        estimated_tasks: 9
      - id: "2025-11-27-notifications"
        estimated_tasks: 7
    parallel: true
    estimated_duration: "6-8 hours"
    
  - wave: 3
    name: "Enhancement & Polish"
    description: "Advanced features and refinement"
    depends_on: [2]
    specs:
      - id: "2025-11-27-billing"
        estimated_tasks: 6
      - id: "2025-11-27-admin-panel"
        estimated_tasks: 4
      - id: "2025-11-27-mobile-polish"
        estimated_tasks: 2
    parallel: true
    estimated_duration: "3-4 hours"

session_profiles:
  backend:
    agents: [api-engineer, backend-debugger, database-engineer]
    skills: [fastapi-patterns, supabase-rls-development, supabase-mcp]
    focus: [api, database, backend, models, migrations]
    
  frontend:
    agents: [ui-designer, frontend-debugger, frontend-verifier]
    skills: [nextjs-app-router, slack-integration]
    focus: [components, pages, ui, styling, responsive]
    
  testing:
    agents: [testing-engineer, browser-automation-agent, implementation-verifier]
    skills: []
    focus: [tests, e2e, integration, verification]

notifications:
  email: "john.norquay@gmail.com"
  notify_on:
    - spec_wave_complete
    - spec_stuck
    - project_complete
```

**Time**: 2-5 minutes (automated)
**Your Role**: Review plan, approve to proceed

---

### Phase 5: Distributed Execution (Autonomous)

**Command**: `/execute-plan` (NEW) or automatic trigger

**What Happens**:
For each spec wave:
1. For each spec in the wave:
   - Run `/orchestrate-tasks` to generate orchestration.yml
   - Spawn distributed Claude Code sessions with profiles
   - Sessions work in parallel, coordinate via Git
2. GitHub Action orchestrator:
   - Monitors for completed tasks
   - Reviews PRs via Claude API
   - Auto-merges approved work
   - Spawns fix agents for rejections
   - Advances to next task wave
3. When all specs in wave complete:
   - Send summary email
   - Advance to next spec wave
4. When all spec waves complete:
   - Send completion email
   - Project done!

**Time**: Hours to days (depending on project size)
**Your Role**: Go live your life. Check email occasionally.

---

## Detailed Execution Flow

### Within a Single Spec

```
/orchestrate-tasks reads srd.md, specs.md, tasks.md
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ orchestration.yml                                                │
│                                                                  │
│ task_groups:                                                     │
│   - id: database-layer                                           │
│     assigned_agent: database-engineer                            │
│     tasks: [1.1, 1.2, 1.3]                                      │
│     dependencies: []                                             │
│                                                                  │
│   - id: api-layer                                                │
│     assigned_agent: api-engineer                                 │
│     tasks: [2.1, 2.2, 2.3, 2.4]                                 │
│     dependencies: [database-layer]                               │
│                                                                  │
│   - id: frontend-layer                                           │
│     assigned_agent: ui-designer                                  │
│     tasks: [3.1, 3.2, 3.3]                                      │
│     dependencies: [api-layer]                                    │
│                                                                  │
│   - id: testing-layer                                            │
│     assigned_agent: testing-engineer                             │
│     tasks: [4.1, 4.2, 4.3]                                      │
│     dependencies: [database-layer, api-layer, frontend-layer]   │
│                                                                  │
│ parallel_groups:                                                 │
│   - [database-layer]           # Task Wave 1                     │
│   - [api-layer]                # Task Wave 2                     │
│   - [frontend-layer]           # Task Wave 3                     │
│   - [testing-layer]            # Task Wave 4                     │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DISTRIBUTED EXECUTION                                            │
│                                                                  │
│ Task Wave 1: database-layer                                      │
│   └── Session 1 (Backend Profile) claims and executes           │
│       └── Commits to branch, updates .devfactory/               │
│           └── GitHub Action triggers                            │
│               └── Claude API reviews (~$0.02)                   │
│                   └── Approved? Merge. Next task.               │
│                   └── Rejected? Spawn fix agent. Retry.         │
│                                                                  │
│ Task Wave 2: api-layer                                           │
│   └── Session 1 (Backend Profile) claims and executes           │
│       └── Same flow...                                          │
│                                                                  │
│ Task Wave 3: frontend-layer                                      │
│   └── Session 2 (Frontend Profile) claims and executes          │
│       └── Same flow...                                          │
│                                                                  │
│ Task Wave 4: testing-layer                                       │
│   └── Session 3 (Testing Profile) claims and executes           │
│       └── Same flow...                                          │
│                                                                  │
│ ALL TASK GROUPS COMPLETE                                         │
│   └── Spec marked complete                                       │
│   └── Move to next spec in wave (or next wave)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Across Multiple Specs (Parallel)

```
SPEC WAVE 1: Foundation
━━━━━━━━━━━━━━━━━━━━━━━

Spec: user-authentication          Spec: user-profiles
┌─────────────────────┐            ┌─────────────────────┐
│ Task Wave 1         │            │ Task Wave 1         │
│ Task Wave 2         │ PARALLEL   │ Task Wave 2         │
│ Task Wave 3         │◄──────────▶│ Task Wave 3         │
│ Task Wave 4         │            │                     │
└─────────────────────┘            └─────────────────────┘
         │                                  │
         └──────────────┬──────────────────┘
                        ▼
              Both specs complete
                        │
                        ▼
         📧 "Spec Wave 1 Complete!"
                        │
                        ▼
              SPEC WAVE 2: Core Experience
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Session Profiles

Sessions are specialized workers with focused capabilities:

### Backend Profile
```yaml
profile: backend
agents:
  - api-engineer
  - backend-debugger
  - backend-verifier
  - database-debugger
  - database-engineer
skills:
  - fastapi-patterns
  - supabase-rls-development
  - supabase-mcp
  - vessey-api-integration  # Your custom skill
focus_keywords:
  - api
  - endpoint
  - database
  - model
  - migration
  - backend
  - server
  - query
  - schema
```

### Frontend Profile
```yaml
profile: frontend
agents:
  - ui-designer
  - frontend-debugger
  - frontend-verifier
skills:
  - nextjs-app-router
  - slack-integration
focus_keywords:
  - component
  - page
  - ui
  - frontend
  - styling
  - responsive
  - form
  - layout
```

### Testing Profile
```yaml
profile: testing
agents:
  - testing-engineer
  - browser-automation-agent
  - test-scenario-loader
  - error-classifier
  - implementation-verifier
skills: []
focus_keywords:
  - test
  - e2e
  - integration
  - unit
  - verification
  - assertion
  - mock
```

### How Profiles Are Used

The bootstrap prompt for each session includes only its profile's agents and skills:

```markdown
# DevFactory Session: Backend Worker

You are **session-1** with the **backend** profile.

## Your Agents
You can invoke these specialized agents:
- api-engineer: Build and test API endpoints
- backend-debugger: Fix backend bugs
- database-engineer: Design schemas and migrations

## Your Skills
These patterns are loaded:
- fastapi-patterns
- supabase-rls-development

## Your Focus
You handle task groups related to:
- API endpoints
- Database operations
- Backend logic

## Current Assignment
Check .devfactory/sessions/session-1.json for your task.
```

---

## State Management

All state lives in `.devfactory/` and is coordinated via Git:

```
.devfactory/
├── config.yml                    # Project config
├── execution-plan.yml            # Master execution plan (NEW)
├── state.json                    # Current execution state (NEW)
│
├── product/                      # From /plan-product
│   ├── mission.md
│   ├── mission-lite.md
│   ├── roadmap.md
│   └── tech-stack.md
│
├── specs/                        # From /shape-spec + /create-spec
│   ├── 2025-11-26-user-auth/
│   │   ├── planning/
│   │   │   ├── initialization.md
│   │   │   ├── requirements.md
│   │   │   └── visuals/
│   │   ├── srd.md
│   │   ├── specs.md
│   │   ├── tasks.md
│   │   ├── orchestration.yml     # From /orchestrate-tasks
│   │   ├── implementation/       # Created during execution
│   │   │   ├── 01-database-layer.md
│   │   │   ├── 02-api-layer.md
│   │   │   └── ...
│   │   └── verification/
│   │       └── integration-check.md
│   │
│   ├── 2025-11-26-user-profiles/
│   │   └── ...
│   └── ...
│
├── sessions/                     # Session state (NEW)
│   ├── session-1.json
│   ├── session-2.json
│   └── session-3.json
│
└── profiles/                     # Session profiles (NEW)
    ├── backend.yml
    ├── frontend.yml
    └── testing.yml
```

### state.json (Master State)

```json
{
  "version": "1.0",
  "project": "My SaaS Platform",
  
  "current_spec_wave": 1,
  "total_spec_waves": 3,
  
  "specs": {
    "2025-11-26-user-auth": {
      "wave": 1,
      "status": "in_progress",
      "current_task_wave": 2,
      "total_task_waves": 4,
      "tasks_completed": 3,
      "tasks_total": 12,
      "tasks_merged": 3,
      "tasks_stuck": 0
    },
    "2025-11-26-user-profiles": {
      "wave": 1,
      "status": "in_progress",
      "current_task_wave": 1,
      "total_task_waves": 3,
      "tasks_completed": 1,
      "tasks_total": 8,
      "tasks_merged": 1,
      "tasks_stuck": 0
    }
  },
  
  "overall": {
    "specs_completed": 0,
    "specs_total": 8,
    "tasks_completed": 4,
    "tasks_total": 58,
    "started_at": "2025-11-26T10:30:00Z",
    "last_updated": "2025-11-26T11:45:00Z"
  },
  
  "is_running": true
}
```

---

## Intelligent Escalation Model (Claude-in-the-Loop)

The secret sauce: When something gets stuck, we don't bother you. We ask Claude.

### Escalation Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LEVEL 1: Fix Agent (Automatic)                                             │
│  ════════════════════════════════                                           │
│                                                                              │
│  Task fails review                                                           │
│       ↓                                                                      │
│  Spawn fix agent with specific issues                                       │
│       ↓                                                                      │
│  Retry (up to 3 attempts)                                                   │
│       ↓                                                                      │
│  Cost: ~$0.05 per attempt                                                   │
│  Success rate: ~90% of issues resolved here                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ Still stuck after 3 attempts
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LEVEL 2: Claude Strategist (NEW - The Magic)                               │
│  ════════════════════════════════════════════                               │
│                                                                              │
│  Call Claude API with FULL CONTEXT:                                         │
│    • mission.md - What are we building and why?                             │
│    • roadmap.md - Where does this fit?                                      │
│    • tech-stack.md - What are our constraints?                              │
│    • srd.md + specs.md - What exactly should this do?                       │
│    • tasks.md - What's the task breakdown?                                  │
│    • orchestration.yml - What's the execution plan?                         │
│    • error_log - What went wrong?                                           │
│    • previous_attempts - What did we already try?                           │
│    • relevant_code_files - Current state of the code                        │
│                                                                              │
│  Claude analyzes and decides:                                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION A: "Try different approach"                                │   │
│  │   → Provides specific technical solution                            │   │
│  │   → Fix agent applies it                                            │   │
│  │   → Retry task                                                      │   │
│  │   → Continue execution                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION B: "Skip and continue"                                     │   │
│  │   → Task is non-blocking                                            │   │
│  │   → Mark as skipped, add to backlog                                 │   │
│  │   → Continue with other tasks                                       │   │
│  │   → Include in final summary                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION C: "Modify the spec"                                       │   │
│  │   → Requirements were wrong or unclear                              │   │
│  │   → Update specs.md or tasks.md                                     │   │
│  │   → Regenerate affected orchestration                               │   │
│  │   → Retry with corrected spec                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DECISION D: "Needs human input" (RARE)                              │   │
│  │   → Only for things Claude literally cannot do:                     │   │
│  │     • Missing API keys/credentials                                  │   │
│  │     • Business decisions (feature scope, priorities)                │   │
│  │     • External vendor issues                                        │   │
│  │     • Legal/compliance questions                                    │   │
│  │   → Escalate to Level 3                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Cost: ~$0.10-0.20 per escalation                                           │
│  Success rate: ~95% of remaining issues resolved here                       │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ Only if Claude says "needs human"
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LEVEL 3: Human Escalation (Rare)                                           │
│  ════════════════════════════════                                           │
│                                                                              │
│  📧 Email to Johnny5:                                                        │
│                                                                              │
│  "DevFactory needs your input                                               │
│                                                                              │
│   I reviewed a stuck task and determined it needs your input.               │
│                                                                              │
│   Task: Stripe webhook integration                                          │
│   Issue: Missing Stripe test API key                                        │
│                                                                              │
│   What I need from you:                                                     │
│   → Provide STRIPE_TEST_KEY                                                 │
│                                                                              │
│   Options:                                                                  │
│   1. Reply with the key                                                     │
│   2. Add it to GitHub secrets and tell me                                   │
│   3. Skip this feature for now                                              │
│                                                                              │
│   Everything else is continuing in parallel."                               │
│                                                                              │
│  Frequency: Maybe 1-2 times per project (or never)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What Claude Strategist Sees

When a task escalates to Level 2, Claude receives:

```markdown
# Strategic Review Request

## Stuck Task
- Spec: 2025-11-26-billing-integration
- Task Group: payment-processing
- Task: 3.2 - Implement Stripe webhook handler
- Attempts: 3 (all failed)

## Error Summary
```
TypeError: Cannot read property 'type' of undefined
  at handleWebhook (stripe-webhook.ts:45)
  
Previous attempts:
1. Added null check → Still failed (different error)
2. Changed to optional chaining → Type error
3. Rewrote handler → Same original error
```

## Full Context

### Mission (from mission.md)
[Full mission document]

### This Spec (from srd.md)
[Full SRD for billing integration]

### Technical Specs (from specs.md)
[Full technical specifications]

### Task Details (from tasks.md)
[The specific task and its context]

### Current Code State
```typescript
// stripe-webhook.ts (current state)
[Full file contents]
```

### Related Files
```typescript
// billing-service.ts
[Relevant code]
```

## Your Decision

Analyze this situation and decide:

1. **DIFFERENT_APPROACH**: Provide a specific technical solution to try
2. **SKIP_TASK**: This is non-blocking, continue without it
3. **MODIFY_SPEC**: The spec is wrong, here's what to change
4. **NEED_HUMAN**: I cannot resolve this, here's what the human needs to provide

Respond with JSON:
```json
{
  "decision": "DIFFERENT_APPROACH|SKIP_TASK|MODIFY_SPEC|NEED_HUMAN",
  "reasoning": "Why this decision",
  "action": {
    // For DIFFERENT_APPROACH:
    "solution": "Detailed technical solution",
    "files_to_change": ["file1.ts", "file2.ts"],
    "code_changes": "Specific code to implement"
    
    // For SKIP_TASK:
    "impact": "What functionality will be missing",
    "backlog_note": "What to revisit later"
    
    // For MODIFY_SPEC:
    "spec_changes": "What to update in specs.md",
    "task_changes": "What to update in tasks.md"
    
    // For NEED_HUMAN:
    "what_is_needed": "Specific thing human must provide",
    "options_for_human": ["Option 1", "Option 2"]
  }
}
```
```

### Example Claude Strategist Decisions

**Example 1: Technical Fix**
```json
{
  "decision": "DIFFERENT_APPROACH",
  "reasoning": "The webhook handler assumes synchronous event delivery, but Stripe sends events asynchronously. The 'type' is undefined because we're not awaiting the event construction.",
  "action": {
    "solution": "Refactor to use Stripe's constructEvent with proper async/await pattern and add event type validation before processing.",
    "files_to_change": ["src/api/stripe-webhook.ts"],
    "code_changes": "export async function handleWebhook(req: Request) {\n  const sig = req.headers['stripe-signature'];\n  let event;\n  \n  try {\n    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);\n  } catch (err) {\n    console.error('Webhook signature verification failed');\n    return { status: 400 };\n  }\n  \n  if (!event?.type) {\n    console.error('Invalid event structure');\n    return { status: 400 };\n  }\n  \n  // Now safely handle event.type\n  switch (event.type) {\n    case 'payment_intent.succeeded':\n      await handlePaymentSuccess(event.data.object);\n      break;\n    // ... other cases\n  }\n  \n  return { status: 200 };\n}"
  }
}
```

**Example 2: Skip Non-Blocking**
```json
{
  "decision": "SKIP_TASK",
  "reasoning": "The animated chart transitions are purely cosmetic. The dashboard functions fully without them. This is causing delays in a non-critical feature.",
  "action": {
    "impact": "Charts will render without smooth transitions. Functional but less polished.",
    "backlog_note": "Add chart animations - consider using Framer Motion for consistent animation patterns across the app."
  }
}
```

**Example 3: Spec Modification**
```json
{
  "decision": "MODIFY_SPEC",
  "reasoning": "The spec requires real-time sync with external calendar, but the external API only supports polling every 5 minutes. The spec is technically impossible as written.",
  "action": {
    "spec_changes": "Update specs.md section 3.2: Change 'real-time calendar sync' to 'near-real-time sync with 5-minute polling interval'. Add note about API limitation.",
    "task_changes": "Update task 3.2.1: Remove WebSocket requirement, implement polling-based sync instead."
  }
}
```

**Example 4: Human Needed**
```json
{
  "decision": "NEED_HUMAN",
  "reasoning": "The Stripe integration requires API keys that are not present in the environment. This is a credentials issue that requires human action.",
  "action": {
    "what_is_needed": "Stripe API keys (test mode)",
    "options_for_human": [
      "Provide STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET",
      "Add keys to GitHub Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
      "Skip Stripe integration for now and use mock payment flow"
    ]
  }
}
```

### Notification Matrix

| Situation | Who Gets Notified | Why |
|-----------|-------------------|-----|
| Task completed | Nobody | Just continue |
| Task failed, fix agent resolved | Nobody | Self-healed |
| Task failed, Claude strategist resolved | Nobody | Self-healed |
| Task skipped by Claude | Summary at wave end | FYI only |
| Spec modified by Claude | Summary at wave end | FYI only |
| Claude says needs human | Johnny5 immediately | Blocking issue |
| Wave complete | Johnny5 | Milestone update |
| Project complete | Johnny5 | 🎉 |

### Cost Model (Updated)

```
58-task project:

Level 1 (Fix agents):
  - 10% of tasks need fixes: 6 tasks
  - Average 1.5 attempts each: 9 fix calls
  - Cost: 9 × $0.05 = $0.45

Level 2 (Claude Strategist):
  - 5% of tasks escalate: 3 tasks
  - Full context review: 3 calls
  - Cost: 3 × $0.15 = $0.45

Level 3 (Human):
  - Maybe 1 task needs human: 0-1 emails
  - Cost: $0 (just email)

Orchestrator reviews:
  - 58 tasks × $0.02 = $1.16

TOTAL: ~$2-3 per project

And you probably never hear about any problems while it's running.
```

---

## GitHub Orchestrator (Enhanced with Claude Strategist)

The GitHub Action handles multi-spec execution with intelligent escalation:

```yaml
# .github/workflows/devfactory-orchestrator.yml

name: DevFactory Distributed Orchestrator

on:
  push:
    paths:
      - '.devfactory/**'
  workflow_dispatch:
  schedule:
    - cron: '*/15 * * * *'  # Check every 15 min for progress

env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Setup
        run: |
          git config user.name "DevFactory Bot"
          git config user.email "devfactory@automated.local"
          
      - name: Load Execution State
        id: state
        run: |
          STATE=$(cat .devfactory/state.json)
          echo "current_wave=$(echo "$STATE" | jq -r '.current_spec_wave')" >> $GITHUB_OUTPUT
          echo "is_running=$(echo "$STATE" | jq -r '.is_running')" >> $GITHUB_OUTPUT
          
      - name: Process Tasks with Intelligent Escalation
        if: steps.state.outputs.is_running == 'true'
        id: process
        run: |
          MERGED=0
          SKIPPED=0
          STUCK_FOR_HUMAN=""
          INTERVENTIONS=""
          
          # Process each task...
          for TASK_FILE in .devfactory/tasks/*.json; do
            # ... [task processing logic]
            
            # Level 1: Fix agent (up to 3 attempts)
            # Level 2: Claude Strategist (full context review)
            # Level 3: Human escalation (only if Claude says needed)
            
            # Claude Strategist call with full context:
            # - mission.md, tech-stack.md
            # - srd.md, specs.md, tasks.md
            # - error log, previous attempts
            # - current code diff
            #
            # Decisions:
            # - DIFFERENT_APPROACH → Apply fix, retry
            # - SKIP_TASK → Mark skipped, continue
            # - MODIFY_SPEC → Update spec, retry
            # - NEED_HUMAN → Escalate to Level 3
            
          done
          
          echo "merged=$MERGED" >> $GITHUB_OUTPUT
          echo "skipped=$SKIPPED" >> $GITHUB_OUTPUT
          echo "interventions=$INTERVENTIONS" >> $GITHUB_OUTPUT
          echo "stuck_for_human=$STUCK_FOR_HUMAN" >> $GITHUB_OUTPUT
          
      - name: Update State & Push
        run: |
          git add .
          git commit -m "devfactory: orchestrator update" || true
          git push || true
          
      - name: Check Completion
        id: completion
        run: |
          # Check wave/project completion status
          
      # Level 3 notifications (rare - only when Claude says NEED_HUMAN)
      - name: Notify - Human Needed
        if: steps.process.outputs.stuck_for_human != ''
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.sendgrid.net
          server_port: 587
          username: apikey
          password: ${{ secrets.SENDGRID_API_KEY }}
          subject: "❓ DevFactory: Need Your Input"
          to: ${{ secrets.NOTIFY_EMAIL }}
          from: DevFactory <devfactory@automated.local>
          body: |
            DevFactory needs your input.
            
            Claude reviewed these and determined they need human action:
            ${{ steps.process.outputs.stuck_for_human }}
            
            Everything else continues in parallel.
            
      - name: Notify - Wave Complete
        if: steps.completion.outputs.wave_complete == 'true'
        uses: dawidd6/action-send-mail@v3
        with:
          subject: "✅ DevFactory: Wave ${{ steps.state.outputs.current_wave }} Complete!"
          to: ${{ secrets.NOTIFY_EMAIL }}
          from: DevFactory <devfactory@automated.local>
          body: |
            Wave ${{ steps.state.outputs.current_wave }} complete!
            
            - Merged: ${{ steps.process.outputs.merged }}
            - Skipped: ${{ steps.process.outputs.skipped }}
            
            Claude Interventions:
            ${{ steps.process.outputs.interventions }}
            
            Next wave starting...
            
      - name: Notify - Project Complete
        if: steps.completion.outputs.project_complete == 'true'
        uses: dawidd6/action-send-mail@v3
        with:
          subject: "🎉 DevFactory: Project Complete!"
          to: ${{ secrets.NOTIFY_EMAIL }}
          from: DevFactory <devfactory@automated.local>
          body: |
            🎉 Your project is complete!
            
            Claude Interventions During Build:
            ${{ steps.process.outputs.interventions }}
            
            Your code is ready on main!
```

---

## Cost Model

### DevFactoryMVP (API-based workers)
```
58 tasks × 60 iterations = 3,480 API calls
Cost: $25-50 per project execution
```

### DevFactory Distributed v3.1 (Max + lightweight API orchestration)
```
Workers: Claude Code sessions on Max = $0
Orchestrator:
  - 58 tasks × $0.02 review = $1.16
  - ~10% need fixes × 2 retries × $0.05 = $0.58
  - Total: ~$2-3 per project

That's 10-20x cheaper!
```

---

## New Commands Summary

### Existing Commands (v3.0)
- `/plan-product` - Create product foundation
- `/shape-spec` - Shape feature requirements  
- `/create-spec` - Create formal specification
- `/orchestrate-tasks` - Plan parallel task execution
- `/execute-task` - Execute single task
- `/implement-tasks` - Implement tasks (simple features)
- `/debug-verify` - Debug and verify

### New Commands (v3.1)
- `/plan-execution` - Generate master execution plan from all specs
- `/execute-plan` - Start distributed autonomous execution
- `/execution-status` - Check current execution status

### New CLI Tool
```bash
devfactory init              # Initialize .devfactory/
devfactory status            # Show execution status
devfactory bootstrap <N>     # Generate session bootstrap prompt
devfactory setup-github      # Install GitHub orchestrator
devfactory stuck             # Show stuck tasks
devfactory pause             # Pause execution
devfactory resume            # Resume execution
```

---

## Your Experience (What It Actually Feels Like)

### Day 1 Morning: Planning (2-3 hours)

```
You: "I want to build a SaaS for dairy farm payroll management"

Claude: "Let's plan this out..."
        /plan-product
        [Interactive conversation about mission, users, roadmap]
        
        "I've created your product foundation with 8 features.
         Ready to shape the specs?"

You: "Let's do them all"

Claude: /shape-spec "User authentication with OAuth"
        [Q&A about auth requirements]
        
        /shape-spec "Producer management"
        [Q&A about producer requirements]
        
        ... [continue for all 8 features]
        
        /create-spec (for each)
        
        "All 8 specs created. Ready to plan execution?"

You: "Yes"

Claude: /plan-execution
        
        "Execution plan ready:
         - Wave 1 (Foundation): 2 specs, ~5 hours
         - Wave 2 (Core): 3 specs, ~7 hours  
         - Wave 3 (Polish): 3 specs, ~4 hours
         
         Total: ~16 hours of autonomous execution
         Estimated API cost: ~$3
         
         Start now?"

You: "Go for it"

Claude: /execute-plan
        
        "Execution started. I'll handle any issues that come up.
         You'll only hear from me when waves complete or if I
         need something only you can provide (like API keys).
         
         Go enjoy your day!"
```

### Day 1 Afternoon: You're at lunch

Your phone buzzes:

```
📧 "✅ DevFactory: Wave 1 Complete!

    Specs completed:
    - User authentication: 12 tasks merged
    - Producer management: 8 tasks merged
    
    Claude Interventions:
    - ✅ Auth token refresh: Fixed race condition with mutex
    - ⏭️ Remember me checkbox: Skipped (cosmetic, added to backlog)
    
    Wave 2 starting automatically..."
```

You glance at it, smile, go back to your burger.

### Day 1 Evening: You're watching TV

```
📧 "✅ DevFactory: Wave 2 Complete!

    Specs completed:
    - Dashboard: 10 tasks merged
    - Reporting: 9 tasks merged  
    - Notifications: 7 tasks merged
    
    Claude Interventions:
    - ✅ Chart rendering: Changed from Canvas to SVG for accessibility
    - ✅ PDF export: Simplified to async job pattern
    - 📝 Report filters: Modified spec (date range was ambiguous)
    
    Wave 3 starting automatically..."
```

You don't even pick up your phone. It's handled.

### Day 2 Morning: You wake up

```
📧 "🎉 DevFactory: Project Complete!

    8 specs, 58 tasks, all merged to main.
    
    Build Summary:
    - Tasks merged: 55
    - Tasks skipped: 3 (added to backlog)
    - Specs modified: 1 (clarified date range in reporting)
    
    Claude Interventions During Build:
    - ✅ 6 tasks fixed with different approach
    - ⏭️ 3 non-blocking tasks skipped
    - 📝 1 spec clarified
    - ❓ 0 required your input
    
    Your FarmPayroll MVP is ready on main!"
```

**You never had to debug a single thing.**
**You never got woken up at 2am.**
**You never had to make a technical decision.**

### The Rare Case: When You ARE Needed

Maybe once per project (or never):

```
📧 "❓ DevFactory: Need Your Input

    I reviewed a stuck task and determined it needs your action.
    
    Task: Stripe webhook integration
    Issue: Missing Stripe API credentials
    
    I need you to:
    → Provide STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
    
    Options:
    1. Reply with the keys
    2. Add them to GitHub Secrets
    3. Tell me to skip Stripe for now (I'll use mock payments)
    
    Everything else is continuing in parallel.
    This one task is paused until I hear from you."

You: [add keys to GitHub]
     "Added the keys to GitHub secrets"

Claude: "Got it. Resuming Stripe integration.
         You'll see it in the next wave summary."
```

### What You DON'T Experience

❌ "Task 3.2 failed with TypeError..."
❌ "Merge conflict in auth-service.ts..."  
❌ "Test suite failing, 3 tests red..."
❌ "Database migration error..."
❌ "API endpoint returning 500..."

Claude handles ALL of that. You only hear about outcomes, not problems.

---

## Hardware Setup (Laptop-First)

The original assumption was that parallel Claude Code sessions would overload your machine. **Wrong.** VS Code was the problem, not Claude Code.

### The Truth About Resource Usage

```
VS Code (per window):
├── Electron runtime:     ~500MB
├── Extensions:           ~200-500MB  
├── Language servers:     ~200MB
├── File watchers:        ~100MB
├── Git integration:      ~50MB
└── TOTAL:                ~1-1.5GB each

3 VS Code windows = 3-4.5GB just for the UI

Claude Code CLI (per instance):
├── Node.js process:      ~100-150MB
├── Network I/O:          minimal
├── File operations:      minimal
└── TOTAL:                ~150MB each

3 Claude CLI sessions = ~450MB total
```

### Your Setup

```
Johnny5's "Laptop":
├── Intel i9-11900H (8 cores / 16 threads @ 4.9GHz boost)
├── 24GB RAM
└── Classification: Absolute unit

DevFactory Distributed needs:
├── 3 Claude CLI sessions: ~450MB
├── 1 VS Code (reviewing only): ~1GB
├── Chrome with Claude.ai: ~500MB
└── TOTAL: ~2GB

Remaining: 22GB for whatever else you want
```

### The Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  YOUR GAMING LAPTOP                                                          │
│                                                                              │
│  ┌──────────────────┐    ┌────────────────────────────────────────────────┐ │
│  │  Chrome          │    │  tmux (Terminal Multiplexer)                   │ │
│  │  └── Claude.ai   │    │                                                │ │
│  │                  │    │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  • Planning      │    │  │ backend  │ │ frontend │ │ testing  │       │ │
│  │  • Specs         │    │  │          │ │          │ │          │       │ │
│  │  • Conversation  │    │  │ claude   │ │ claude   │ │ claude   │       │ │
│  │  • Status checks │    │  │ CLI      │ │ CLI      │ │ CLI      │       │ │
│  │                  │    │  └──────────┘ └──────────┘ └──────────┘       │ │
│  └──────────────────┘    │                                                │ │
│                          │  All running in background                     │ │
│  ┌──────────────────┐    │  Total RAM: ~450MB                            │ │
│  │  VS Code         │    │  CPU: Minimal (mostly waiting on API)         │ │
│  │  (ONE instance)  │    └────────────────────────────────────────────────┘ │
│  │                  │                                                       │
│  │  • Code review   │                                                       │
│  │  • Git diffs     │                                                       │
│  │  • NOT running   │                                                       │
│  │    Claude Code   │                                                       │
│  └──────────────────┘                                                       │
│                                                                              │
│  RAM Budget: 24GB - 2GB used = 22GB free                                    │
│  Your laptop: "Is that all you got?"                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │   GitHub     │
                               │   Actions    │
                               │              │
                               │ Orchestrator │
                               │ Claude Strat │
                               └──────────────┘
```

### Quick Start: Running Workers

```bash
# === ONE-TIME SETUP ===

# Install tmux (WSL/Linux)
sudo apt install tmux

# === STARTING A DEVFACTORY RUN ===

# Create worker sessions (10 seconds)
tmux new-session -d -s backend -c ~/YourProject
tmux new-session -d -s frontend -c ~/YourProject
tmux new-session -d -s testing -c ~/YourProject

# Start Claude in each and paste bootstrap prompt
tmux attach -t backend     # type: claude, paste prompt, Ctrl+B D
tmux attach -t frontend    # type: claude, paste prompt, Ctrl+B D
tmux attach -t testing     # type: claude, paste prompt, Ctrl+B D

# === MONITORING ===

# Check what's running
tmux list-sessions

# Peek at a worker
tmux attach -t backend
# Detach without stopping: Ctrl+B, then D

# === CLEANUP ===

# Kill all sessions when done
tmux kill-server
```

### When You WOULD Use a Second Machine

The beast on your network becomes "overflow" for special cases:

| Scenario | Where to Run |
|----------|--------------|
| Normal project (3-5 sessions) | All on laptop |
| Big project (6+ sessions) | Overflow to beast |
| Overnight runs | Beast (laptop can sleep) |
| Traveling | Beast (laptop offline) |
| Want laptop free for gaming | Beast |

### Optional: Beast Setup (When Needed)

```bash
# SSH config for easy access
cat >> ~/.ssh/config << 'EOF'
Host beast
    HostName 192.168.1.XXX  # Your beast's IP
    User youruser
EOF

# Start workers on beast remotely
ssh beast 'tmux new-session -d -s backend -c ~/Project'
ssh beast 'tmux new-session -d -s frontend -c ~/Project'

# Attach to beast worker from laptop
ssh beast -t 'tmux attach -t backend'
```

### The Point

**You don't need the second computer for DevFactory to work.** Your gaming laptop handles it easily once VS Code is out of the equation. The beast is nice to have for overflow, overnight runs, or when you want your laptop free.

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] CLI tool: `init`, `status`, `bootstrap`, `setup-github`
- [ ] Session profile definitions
- [ ] GitHub orchestrator (single spec)
- [ ] State management schemas

### Phase 2: Multi-Spec (Week 2)
- [ ] `/plan-execution` command
- [ ] execution-plan.yml schema
- [ ] Multi-spec orchestrator logic
- [ ] Spec wave advancement

### Phase 3: Full Automation (Week 3)
- [ ] `/execute-plan` command
- [ ] Automatic session spawning guidance
- [ ] Cross-spec dependency detection
- [ ] Comprehensive notifications
- [ ] Pause/resume functionality

### Phase 4: Polish (Week 4)
- [ ] Dashboard (optional, Claude.ai is the UI)
- [ ] Analytics/reporting
- [ ] Error recovery improvements
- [ ] Documentation

---

## Summary

DevFactory v3.1 Distributed transforms your development workflow:

**Before (v3.0)**:
- One spec at a time
- You involved at every step
- Sequential execution
- Problems interrupt you constantly
- VS Code eating all your RAM

**After (v3.1)**:
- Batch all specs upfront
- Front-load human work, then hands-off
- Parallel execution across specs AND tasks
- **Claude handles problems, not you**
- **tmux + Claude CLI = lightweight workers**
- Check email occasionally, that's it

**The formula**:
```
Your time: ~3 hours (planning + specs)
System time: ~16 hours (autonomous execution)
Your cost: ~$3 (API orchestration)
Your interruptions: ~0 (Claude handles issues)
Your RAM usage: ~450MB (not 6GB)
Output: Complete project, all merged to main
```

**The magic ingredients**: 

1. **Claude Strategist** - When tasks get stuck, Claude reviews with full context and makes decisions. You only hear about things that genuinely require human action.

2. **tmux + CLI** - Run Claude Code directly without VS Code overhead. Your i9 + 24GB laughs at 3 parallel sessions.

**You only hear about:**
- 🎉 Waves completing (celebration)
- 📋 What Claude fixed along the way (FYI)
- ❓ Things only you can provide (rare)

**You never hear about:**
- ❌ TypeErrors
- ❌ Test failures  
- ❌ Merge conflicts
- ❌ Architecture issues
- ❌ Any technical problem Claude can solve

---

You've already built the hard parts in v3.0. This adds:
1. Batched spec workflow
2. Distributed session execution (tmux, not VS Code)
3. GitHub-based autonomous orchestration
4. Multi-spec coordination
5. **Claude-in-the-loop escalation** ← The killer feature

Ready to build this?
