# DevFactory v4.0 - Release The Beast 🦁

Autonomous parallel development system with **local orchestration** - no GitHub Actions required.

## The Big Picture

```
╔════════════════════════════════════════════════════════════════════════╗
║  YOUR LAPTOP (5 tmux sessions - ALL LOCAL)                             ║
║                                                                        ║
║  ┌──────────────┐                                                      ║
║  │ ORCHESTRATOR │  ← The brain - reviews, merges, coordinates          ║
║  │  (df-orch)   │                                                      ║
║  └──────┬───────┘                                                      ║
║         │ watches filesystem                                           ║
║         ▼                                                              ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  ║
║  │ DATABASE │→│ BACKEND  │→│ FRONTEND │→│ TESTING  │                  ║
║  │  worker  │ │  worker  │ │  worker  │ │  worker  │                  ║
║  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  ║
║       │            │            │            │                         ║
║       └────────────┴────────────┴────────────┘                         ║
║                         │                                              ║
║              .devfactory/state.json                                    ║
║              .devfactory/tasks/                                        ║
║                         │                                              ║
║              git push (backup only, after specs complete)              ║
╚════════════════════════════════════════════════════════════════════════╝
```

## Quick Start

```bash
# Install
cd ~/.claude/plugins
git clone https://github.com/JohnNorquay/devfactory-distributed.git
cd devfactory-distributed
npm install
npm run build
npm link

# In your project
cd ~/projects/your-project
devfactory init --name "YourProject"

# Plan and create specs using DevFactory v3.0 commands
# /plan-product, /shape-spec, /create-spec, /orchestrate-tasks

# Then...
export ANTHROPIC_API_KEY=your-key

# 🦁 RELEASE THE BEAST
devfactory release-the-beast
```

## Commands

### The Main Event

| Command | Description |
|---------|-------------|
| `devfactory release-the-beast` | 🦁 One command to rule them all - creates tmux sessions, starts orchestrator, bootstraps workers |
| `devfactory kill-beast` | 🔪 Terminate all DevFactory sessions |

### Monitoring

| Command | Description |
|---------|-------------|
| `devfactory status` | Show execution progress |
| `devfactory stuck` | Show blocked tasks |
| `devfactory orchestrate` | Run orchestrator manually (for debugging) |

### Manual Control

| Command | Description |
|---------|-------------|
| `devfactory init` | Initialize in current project |
| `devfactory bootstrap <session>` | Generate bootstrap prompt for a session |
| `devfactory start` | Legacy start (use release-the-beast instead) |
| `devfactory stop` | Pause execution |
| `devfactory setup-github` | Install GitHub Actions (optional, for remote) |

## The 4-Stage Pipeline

```
TIME →  T1     T2     T3     T4     T5     T6     T7     T8
───────────────────────────────────────────────────────────
DB      [S1]   [S2]   [S3]   [S4]   [S5]   done    ·      ·
Backend  ·     [S1]   [S2]   [S3]   [S4]   [S5]   done    ·
Frontend ·      ·     [S1]   [S2]   [S3]   [S4]   [S5]   done
Testing  ·      ·      ·     [S1]   [S2]   [S3]   [S4]   [S5]
───────────────────────────────────────────────────────────
                └─── ALL 4 WORKERS BUSY ───┘
```

After the pipeline fills (T4), all 4 workers run at ~95% utilization!

## Architecture v4.0 vs v3.1

| Feature | v3.1 (GitHub Actions) | v4.0 (Local) |
|---------|----------------------|--------------|
| Orchestrator | GitHub Actions | Local tmux session |
| Code Review | GitHub Actions + API | Local Anthropic API |
| Merging | GitHub PRs | Local git merge |
| Coordination | GitHub API | Filesystem |
| Network Required | Always | Only for backup |
| Latency | Seconds | Instant |
| Debugging | GitHub Actions logs | tmux attach |
| Cost | API + GitHub minutes | API only |

## How It Works

### 1. Release the Beast

```bash
devfactory release-the-beast
```

This single command:
- Creates 5 tmux sessions (1 orchestrator + 4 workers)
- Starts the local orchestrator watching `.devfactory/`
- Bootstraps each worker with Claude Code
- Begins the 4-stage pipeline

### 2. Workers Claim Tasks

Each worker:
1. Checks `.devfactory/tasks/` for pending tasks matching their profile
2. Claims a task (atomic update to task file)
3. Creates a branch: `devfactory/<task-id>`
4. Completes the work
5. Updates status to "completed"

### 3. Orchestrator Reviews & Merges

The orchestrator (running locally):
1. Watches for completed tasks
2. Reviews code via Anthropic API
3. If approved: merges branch locally
4. If rejected: sends back to worker (up to 3 attempts)
5. If stuck: escalates to Claude Strategist
6. Updates downstream task dependencies

### 4. Auto-Backup

When a spec completes:
```bash
git add -A
git commit -m "✅ Spec complete: <spec-id>"
git push origin main
```

## Monitoring

### Watch the Orchestrator
```bash
tmux attach -t df-orchestrator
```

### Check Individual Workers
```bash
tmux attach -t df-database   # DB worker
tmux attach -t df-backend    # Backend worker
tmux attach -t df-frontend   # Frontend worker
tmux attach -t df-testing    # Testing worker

# Detach without stopping: Ctrl+B, then D
```

### Check Progress
```bash
devfactory status
```

### See Stuck Tasks
```bash
devfactory stuck
```

## Session Profiles

| Profile | Focus | Agents |
|---------|-------|--------|
| database | Migrations, schemas, RLS | database-engineer, database-debugger |
| backend | APIs, services, routes | api-engineer, backend-debugger |
| frontend | UI, components, pages | ui-designer, frontend-debugger |
| testing | E2E, integration tests | testing-engineer, browser-automation |

## Requirements

- Node.js 18+
- Git
- tmux
- Claude Code CLI (`claude`)
- Anthropic API key (`ANTHROPIC_API_KEY` env var)

## Integration with DevFactory v3.0

This works alongside your existing DevFactory plugin:

1. Use `/plan-product`, `/shape-spec`, `/create-spec` as normal
2. Use `/orchestrate-tasks` to generate orchestration.yml
3. Run `devfactory release-the-beast` 🦁
4. Go have coffee ☕

## Notifications

Check `.devfactory/issues/` for items needing your attention:
- Tasks that need human input
- Specs requiring modification
- Strategic decisions

## Why Local?

For a single developer on a single machine, GitHub orchestration is overengineered:

| Local-Only | GitHub-Based |
|------------|--------------|
| Instant coordination | Network latency |
| No PR ceremony | PR creation/merge |
| Works offline | Needs internet |
| Simple debugging | GitHub Actions logs |
| Just files | Cloud complexity |
| ~$2 API costs | Same + GitHub overhead |

GitHub integration is still available via `setup-github` for:
- Multi-machine setups
- Team collaboration
- CI/CD integration

## License

MIT
