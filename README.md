# DevFactory v4.1 - Release The Beast 🦁

Autonomous parallel development system with **local orchestration** and **The Oracle**.

---

## 🚀 Quick Start (Remote Beast Machine)

```bash
# SSH to beast machine
ssh beastmode@192.168.1.22
wsl
cd ~/projects/mycpa

# Release the beast!
devfactory release-the-beast --verbose
```

**From your workstation, tunnel the dashboard:**
```bash
ssh -L 5555:localhost:5555 beastmode@192.168.1.22 -t wsl
```

Then open: http://localhost:5555

---

## 📦 Installation

```bash
# Install
cd ~/.claude/plugins
git clone https://github.com/JohnNorquay/devfactory-distributed.git
cd devfactory-distributed
npm install
npm run build
npm link

# Set API key
export ANTHROPIC_API_KEY=your-key

# Verify
devfactory --version  # Should show 4.1.0
```

---

## The Big Picture (v4.1)

```
╔════════════════════════════════════════════════════════════════════════╗
║  YOUR MACHINE (6 tmux sessions - ALL LOCAL)                            ║
║                                                                        ║
║  ┌──────────────┐  ┌──────────────┐                                   ║
║  │ ORCHESTRATOR │  │    ORACLE    │                                   ║
║  │    (Opus)    │  │    (Opus)    │  ← Helps stuck workers            ║
║  └──────┬───────┘  └──────┬───────┘                                   ║
║         │                 │                                            ║
║         └────────┬────────┘                                            ║
║                  │ watches state.json                                  ║
║                  ▼                                                     ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  ║
║  │ DATABASE │→│ BACKEND  │→│ FRONTEND │→│ TESTING  │                  ║
║  │ (Sonnet) │ │ (Sonnet) │ │ (Sonnet) │ │ (Sonnet) │                  ║
║  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  ║
║       │            │            │            │                         ║
║       └────────────┴────────────┴────────────┘                         ║
║                         │                                              ║
║              .devfactory/beast/state.json                              ║
║              .devfactory/oracle/guidance-*.md                          ║
╚════════════════════════════════════════════════════════════════════════╝
```

## v4.1 Features

| Feature | Description |
|---------|-------------|
| 🔮 **The Oracle** | Opus-powered helper that auto-assists stuck workers |
| 📊 **Model Tiers** | Workers use Sonnet (fast), Orchestrator/Oracle use Opus (smart) |
| 🔄 **Subagent Pattern** | Workers spawn subagents per task - no context bloat |
| 💓 **Heartbeats** | Workers report every 60s - detect dead sessions |
| 📡 **Auto-polling** | Workers poll every 30s, never stop |
| 📝 **State Updates** | Workers update state.json for live dashboard |

## Commands

### The Main Event

| Command | Description |
|---------|-------------|
| `devfactory release-the-beast` | 🦁 Creates 6 tmux sessions, starts everything |
| `devfactory kill-beast` | 🔪 Terminate all DevFactory sessions |

### Monitoring

| Command | Description |
|---------|-------------|
| `devfactory status` | Show execution progress |
| `devfactory dashboard` | Start web dashboard on :5555 |
| `devfactory stuck` | Show blocked tasks |
| `devfactory oracle` | Run Oracle manually |
| `devfactory orchestrate` | Run orchestrator manually |

### Setup

| Command | Description |
|---------|-------------|
| `devfactory init --name "Project"` | Initialize in current project |
| `devfactory bootstrap <session>` | Generate bootstrap prompt |

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

## Oracle Flow (v4.1)

```
Worker gets stuck
      ↓
Sets status: "stuck" in state.json
      ↓
Oracle detects (every 60s)
      ↓
Oracle consults Opus for guidance
      ↓
Writes .devfactory/oracle/guidance-{task}.md
      ↓
Worker reads guidance and continues
      ↓
Only escalates to human if Oracle says so
```

## Subagent Architecture (v4.1)

Workers don't do tasks directly - they spawn subagents:

```
Worker (lean orchestrator loop)
   │
   ├── Spawn subagent → Task 1 → Complete → Context freed
   ├── Spawn subagent → Task 2 → Complete → Context freed  
   ├── Spawn subagent → Task 3 → Complete → Context freed
   └── ... can run forever without context bloat
```

## Tmux Sessions

| Session | Role | Model |
|---------|------|-------|
| `df-orchestrator` | Reviews & merges code | Opus 4.5 |
| `df-oracle` | Helps stuck workers | Opus 4.5 |
| `df-database` | Migrations, schemas, RLS | Sonnet 4.5 |
| `df-backend` | APIs, server actions | Sonnet 4.5 |
| `df-frontend` | UI, pages, components | Sonnet 4.5 |
| `df-testing` | E2E tests | Sonnet 4.5 |

**Watch a session:**
```bash
tmux attach -t df-database
# Ctrl+B, D to detach
```

## Workflow

1. **Plan** with Claude Code: `/plan-product`
2. **Shape** the spec: `/shape-spec`
3. **Create** implementation spec: `/create-spec`
4. **Release the beast**: `devfactory release-the-beast`
5. **Watch** the dashboard and go touch grass 🌿

## Requirements

- Node.js 18+
- tmux
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- Anthropic API key (for Orchestrator/Oracle)

## License

MIT
