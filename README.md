# DevFactory v4.3 - Release The Beast 🦁

Autonomous parallel development with **Build → Verify → Complete** pattern.

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
cd ~/.claude/plugins
git clone https://github.com/JohnNorquay/devfactory-distributed.git
cd devfactory-distributed
npm install && npm run build && npm link

export ANTHROPIC_API_KEY=your-key
devfactory --version  # Should show 4.3.0
```

---

## v4.3 Features

| Feature | Description |
|---------|-------------|
| ✅ **Build → Verify → Complete** | Every task verified by skeptical second subagent |
| 🔄 **Reconciliation** | Pre-flight scans codebase, matches to specs |
| 🏗️ **Brownfield Ready** | Recognizes existing code |
| 🔗 **Dependency Checking** | Workers wait for upstream stages per-spec |
| 🔮 **The Oracle** | Opus helps stuck workers automatically |
| 📊 **Model Tiers** | Workers=Sonnet, Orchestrator/Oracle=Opus |
| 🔄 **Subagent Pattern** | No context bloat |

---

## Build → Verify → Complete (NEW in v4.3)

Every task goes through **TWO subagents**:

```
┌─────────────────────────────────────────────────────────────┐
│  1. BUILDER SUBAGENT                                        │
│     → Does the work                                         │
│     → Optimistic mindset                                    │
│     → Returns: "Done! Created X, Y, Z"                      │
├─────────────────────────────────────────────────────────────┤
│  2. VERIFIER SUBAGENT (fresh context)                       │
│     → Skeptical mindset                                     │
│     → Checks: Files exist? Code compiles? Tests pass?       │
│     → Returns: "VERIFIED" or "FAILED: [reasons]"            │
├─────────────────────────────────────────────────────────────┤
│  3. DECISION                                                │
│     VERIFIED → Mark complete                                │
│     FAILED   → Retry once with notes, then stuck            │
└─────────────────────────────────────────────────────────────┘
```

**Why?** Builders are optimistic about their work. Verifiers with fresh context catch mistakes builders miss.

### Verification by Worker Type

| Worker | Verifier Checks |
|--------|-----------------|
| Database | Files exist, SQL valid, RLS policies present |
| Backend | Files exist, TypeScript compiles, imports valid |
| Frontend | Files exist, compiles, uses real APIs |
| Testing | Files exist, compiles, **tests actually run and pass** |

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
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  ║
║  │ DATABASE │→│ BACKEND  │→│ FRONTEND │→│ TESTING  │                  ║
║  │ (Sonnet) │ │ (Sonnet) │ │ (Sonnet) │ │ (Sonnet) │                  ║
║  │          │ │waits DB  │ │waits API │ │waits UI  │                  ║
║  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## Commands

| Command | Description |
|---------|-------------|
| `devfactory release-the-beast` | 🦁 Reconcile + create sessions + start |
| `devfactory kill-beast` | 🔪 Stop everything |
| `devfactory status` | Show progress |
| `devfactory dashboard` | Web UI on :5555 |
| `devfactory reconcile` | Match codebase to specs |
| `devfactory oracle` | Run Oracle manually |

---

## Workflow

1. **Plan**: `/plan-product`
2. **Shape**: `/shape-spec`  
3. **Create**: `/create-spec`
4. **Release**: `devfactory release-the-beast`
5. **Watch**: Dashboard + go touch grass 🌿

**Interrupted?** Just run again - reconciliation picks up where you left off.

---

## Version History

| Version | Features |
|---------|----------|
| 4.3 | Build → Verify → Complete pattern |
| 4.2 | Reconciliation, dependency checking |
| 4.1 | Oracle, subagent pattern, model tiers |
| 4.0 | Local orchestration, tmux sessions |

---

MIT License
