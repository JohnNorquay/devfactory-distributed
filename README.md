# DevFactory v4.2 - Release The Beast 🦁

Autonomous parallel development system with **local orchestration**, **The Oracle**, and **brownfield reconciliation**.

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
devfactory --version  # Should show 4.2.0
```

---

## The Big Picture (v4.2)

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

## v4.2 Features

| Feature | Description |
|---------|-------------|
| 🔄 **Reconciliation** | Pre-flight scans codebase, matches to specs, updates state.json |
| 🏗️ **Brownfield Ready** | Recognizes existing code - only builds what's missing |
| ⏸️ **Resumable** | Interrupted? Just run again - picks up where you left off |
| 🔮 **The Oracle** | Opus-powered helper that auto-assists stuck workers |
| 📊 **Model Tiers** | Workers use Sonnet (fast), Orchestrator/Oracle use Opus (smart) |
| 🔄 **Subagent Pattern** | Workers spawn subagents per task - no context bloat |
| 💓 **Heartbeats** | Workers report every 60s - detect dead sessions |

## Pre-Flight Reconciliation (NEW in v4.2)

When you run `release-the-beast`, it now:

```
🔍 Pre-flight checks...
   ✓ DevFactory initialized
   ✓ tmux available
   ✓ claude CLI available
   ✓ ANTHROPIC_API_KEY configured
   ✓ No conflicting sessions

🔄 Reconciling state with codebase...

   Scanning existing files...
   Found 30 relevant files
   
   Loading specs...
   Found 8 specs
   
   Matching against specs (Opus)...
   ├── Foundation           34/43 tasks (79%)
   ├── Tax Debt Core        0/28 tasks (0%)
   ├── Bank Integration     0/31 tasks (0%)
   └── ...
   
   ✓ state.json updated
   ✓ 34 tasks marked complete
   ✓ 218 tasks remaining

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🦁 RELEASING THE BEAST...
```

Workers only get the **remaining** tasks in their queues!

## Commands

### The Main Event

| Command | Description |
|---------|-------------|
| `devfactory release-the-beast` | 🦁 Reconcile + create sessions + start everything |
| `devfactory kill-beast` | 🔪 Terminate all DevFactory sessions |

### Monitoring

| Command | Description |
|---------|-------------|
| `devfactory status` | Show execution progress |
| `devfactory dashboard` | Start web dashboard on :5555 |
| `devfactory stuck` | Show blocked tasks |
| `devfactory reconcile` | Run reconciliation standalone |
| `devfactory oracle` | Run Oracle manually |
| `devfactory orchestrate` | Run orchestrator manually |

### Options for release-the-beast

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed output |
| `--skip-reconcile` | Skip the reconciliation step |
| `--skip-orchestrator` | Don't start orchestrator/oracle |
| `--dry-run` | Show what would happen |
| `--interval <seconds>` | Orchestrator check interval |

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

**Interrupted?** Just run `release-the-beast` again - reconciliation handles it!

## Requirements

- Node.js 18+
- tmux
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- Anthropic API key (for Orchestrator/Oracle/Reconciler)

## License

MIT
