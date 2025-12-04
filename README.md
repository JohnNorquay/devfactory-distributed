# DevFactory v4.4 - Release The Beast 🦁

Autonomous parallel development with **task-level parallel subagent execution**.

---

## 🚀 Quick Start

```bash
# SSH to beast machine
ssh beastmode@192.168.1.22
wsl
cd ~/projects/mycpa

# Release the beast!
devfactory release-the-beast --verbose
```

**Dashboard tunnel:**
```bash
ssh -L 5555:localhost:5555 beastmode@192.168.1.22 -t wsl
```

---

## 📦 Installation

```bash
cd ~/.claude/plugins
git clone https://github.com/JohnNorquay/devfactory-distributed.git
cd devfactory-distributed
npm install && npm run build && npm link

export ANTHROPIC_API_KEY=your-key
devfactory --version  # Should show 4.4.0
```

---

## v4.4: Task-Level Parallel Subagents 🚀

**Before (v4.3):** Tasks within a group ran sequentially
```
Task 1.1 → Task 1.2 → Task 1.3 → Task 1.4
(20 min total)
```

**After (v4.4):** Independent tasks run in parallel!
```
Task 1.1 (tests)
    ├──→ Task 1.2 (model)     ─┬──→ Task 1.4 (associations)
    └──→ Task 1.3 (migration) ─┘
         [PARALLEL!]
(12 min total - 40% faster!)
```

### How It Works

1. **task-list-creator** now outputs `depends_on` for each task:
```markdown
- [ ] 1.2 Create User model
  - **depends_on**: ["1.1"]
- [ ] 1.3 Create migration
  - **depends_on**: ["1.1"]
```

2. **Workers detect parallelism** and spawn multiple subagents:
```
Worker sees: 1.2 and 1.3 both only need 1.1 (done!)
Worker spawns: 2 parallel builder subagents
Worker waits: for both to complete
Worker verifies: both results
Worker marks: both complete
```

3. **Time savings compound** across the pipeline:
   - Database: 2-3 parallel migrations
   - Backend: 3-4 parallel API endpoints
   - Frontend: 4-5 parallel components
   - Testing: 3-4 parallel test suites

---

## Two Levels of Parallelism

| Level | What | How |
|-------|------|-----|
| **Group** | Database + Backend workers run simultaneously | `parallel_groups` in orchestration.yml |
| **Task** | Multiple tasks within a worker run simultaneously | `depends_on` in tasks.md |

---

## All Features (v4.0 → v4.4)

| Version | Feature |
|---------|---------|
| 4.4 | 🚀 Task-level parallel subagents |
| 4.3.1 | Auto-start workers (no manual enter) |
| 4.3 | Build → Verify → Complete |
| 4.2.1 | Dependency checking (UI waits for API) |
| 4.2 | Reconciliation (brownfield ready) |
| 4.1 | Oracle + subagent pattern |
| 4.0 | Local orchestration |

---

## Pipeline Architecture

```
╔════════════════════════════════════════════════════════════════════════╗
║  6 TMUX SESSIONS                                                       ║
║                                                                        ║
║  ┌──────────────┐  ┌──────────────┐                                   ║
║  │ ORCHESTRATOR │  │    ORACLE    │                                   ║
║  │    (Opus)    │  │    (Opus)    │                                   ║
║  └──────────────┘  └──────────────┘                                   ║
║                                                                        ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │ DATABASE WORKER                                                   │ ║
║  │ ├── Spawn parallel: Task 1.2, 1.3, 1.4                           │ ║
║  │ ├── Wait for all                                                  │ ║
║  │ └── Verify all → Complete all                                     │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                              ↓                                         ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │ BACKEND WORKER (parallel tasks within)                           │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                              ↓                                         ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │ FRONTEND WORKER (parallel tasks within)                          │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                              ↓                                         ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │ TESTING WORKER (parallel tasks within)                           │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## Required: Update task-list-creator

To enable v4.4 parallelism, update your `~/.claude/plugins/devFactory/agents/task-list-creator.md` to output `depends_on` for each task.

See: `/mnt/user-data/outputs/devfactory-v4.4/task-list-creator.md`

---

## Commands

| Command | Description |
|---------|-------------|
| `devfactory release-the-beast` | 🦁 Reconcile + start everything |
| `devfactory kill-beast` | 🔪 Stop all sessions |
| `devfactory status` | Show progress |
| `devfactory dashboard` | Web UI |
| `devfactory reconcile` | Match codebase to specs |

---

## Update Both Machines

```bash
# Dev laptop
cd ~/.claude/plugins/devfactory-distributed
git pull && npm run build
devfactory --version  # 4.4.0

# Beast machine
ssh beastmode@192.168.1.22
wsl
cd ~/.claude/plugins/devfactory-distributed
git pull && npm run build
devfactory --version  # 4.4.0
```

---

MIT License
