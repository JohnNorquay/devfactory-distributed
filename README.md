# DevFactory Distributed v3.1

Autonomous parallel development system for DevFactory using a 4-stage pipeline architecture.

## Quick Install

```bash
# Clone or copy to your plugins
cd ~/.claude/plugins
git clone https://github.com/JohnNorquay/devfactory-distributed.git

# Install
cd devfactory-distributed
npm install
npm run build
npm link  # Makes 'devfactory' command available globally
```

## Usage

### Initialize in Your Project

```bash
cd ~/projects/your-project
devfactory init --name "YourProject"
```

### Setup GitHub Orchestrator

```bash
devfactory setup-github
```

Then add this secret to your GitHub repo:
- `ANTHROPIC_API_KEY` - Your Anthropic API key

### Start Workers

```bash
# Start the system
devfactory start

# Create all 4 pipeline workers:
tmux new-session -d -s database
tmux new-session -d -s backend
tmux new-session -d -s frontend
tmux new-session -d -s testing

# Bootstrap each (attach, run claude, paste bootstrap prompt):
devfactory bootstrap session-1  # Database worker
devfactory bootstrap session-2  # Backend worker
devfactory bootstrap session-3  # Frontend worker
devfactory bootstrap session-4  # Testing worker
```

### Monitor Progress

```bash
devfactory status      # See overall progress
devfactory stuck       # See what needs help
devfactory stop        # Pause execution
```

## 4-Stage Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  YOUR LAPTOP (4 tmux sessions)                                           │
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ database │ →  │ backend  │ →  │ frontend │ →  │ testing  │          │
│  │ worker   │    │ worker   │    │ worker   │    │ worker   │          │
│  ├──────────┤    ├──────────┤    ├──────────┤    ├──────────┤          │
│  │migrations│    │   APIs   │    │   UI     │    │   E2E    │          │
│  │ schemas  │    │ services │    │  pages   │    │  tests   │          │
│  │   RLS    │    │  routes  │    │  forms   │    │  specs   │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │               │               │               │                 │
│       └───────────────┴───────────────┴───────────────┘                 │
│                               │                                          │
│                          git push                                        │
└──────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                     ┌──────────────────┐
                     │ GitHub Actions   │
                     │ Orchestrator     │
                     │                  │
                     │ • Reviews code   │
                     │ • Auto-merges    │
                     │ • Claude Strat.  │
                     │ • GitHub Issues  │
                     └──────────────────┘
```

### Pipeline Flow (5 specs example)

```
TIME →     T1    T2    T3    T4    T5    T6    T7    T8
           ─────────────────────────────────────────────
DB         [S1]  [S2]  [S3]  [S4]  [S5]  done   ·     ·
Backend     ·    [S1]  [S2]  [S3]  [S4]  [S5]  done   ·
Frontend    ·     ·    [S1]  [S2]  [S3]  [S4]  [S5]  done
Testing     ·     ·     ·    [S1]  [S2]  [S3]  [S4]  [S5]
           ─────────────────────────────────────────────
                 └─── ALL 4 WORKERS BUSY ───┘

[S1] = Spec 1's tasks for that layer
```

**After initial ramp-up (T4), all 4 workers run at 100% utilization!**

### Why Pipeline?

| Approach | Workers Busy | Efficiency |
|----------|--------------|------------|
| Sequential (v3.0) | 1 of 1 | 100% but slow |
| Wave-based (3 workers) | Often waiting | ~60% |
| **Pipeline (4 workers)** | **All 4 continuously** | **~95%** |

## How It Works

1. **DB Worker** completes Spec N migrations → unlocks Spec N for Backend
2. **Backend Worker** completes Spec N APIs → unlocks Spec N for Frontend
3. **Frontend Worker** completes Spec N UI → unlocks Spec N for Testing
4. **Testing Worker** validates Spec N → marks complete
5. **Orchestrator** reviews, merges, handles issues automatically
6. **You** watch GitHub Issues, sip coffee ☕

## Commands

| Command | Description |
|---------|-------------|
| `devfactory init` | Initialize in current project |
| `devfactory status` | Show execution status |
| `devfactory bootstrap <session>` | Generate session bootstrap prompt |
| `devfactory setup-github` | Install GitHub orchestrator |
| `devfactory start` | Start distributed execution |
| `devfactory stop` | Pause execution |
| `devfactory stuck` | Show stuck tasks |

## Session Profiles

| Profile | Focus | Agents |
|---------|-------|--------|
| **database** | Migrations, schemas, RLS | database-engineer, database-debugger |
| **backend** | APIs, services, routes | api-engineer, backend-debugger |
| **frontend** | UI, components, pages | ui-designer, frontend-debugger |
| **testing** | E2E, integration tests | testing-engineer, browser-automation |

## Requirements

- Node.js 18+
- Git
- tmux
- Claude Code CLI (`claude`)
- GitHub repository
- Anthropic API key (for orchestrator)

## Notifications

DevFactory uses **GitHub Issues** for notifications - no email setup required!

- ❓ **Need Your Input** - When Claude Strategist can't resolve something
- ✅ **Progress Update** - When a batch of tasks is merged  
- 🎉 **Project Complete** - When everything is done

## Integration with DevFactory v3.0

This works alongside your existing DevFactory setup:

1. Use `/plan-product`, `/shape-spec`, `/create-spec` as normal (in Claude Code)
2. Use `/orchestrate-tasks` to generate orchestration.yml per spec
3. Run `devfactory start` to execute in parallel (4-stage pipeline)
4. Use `/debug-verify` to validate when complete

## License

MIT
