# DevFactory Unified System - The Simple Guide

Hey Johnny5! Here's how to use your complete project-building system.

## One-Time Setup

```bash
# Install the unified system
curl -sSL https://raw.githubusercontent.com/JohnNorquay/devfactory-distributed/main/install-unified.sh | bash

# Add your API key to ~/.bashrc or ~/.zshrc
export ANTHROPIC_API_KEY=your-key-here
```

---

## Building A New Project

### Step 1: Start a Project

```bash
mkdir my-awesome-app
cd my-awesome-app
claude
```

### Step 2: Design It With Me (Claude)

In our conversation, just tell me what you want to build:

```
You: "I want to build a dairy farm payroll system that handles 
     producer payments, QuickBooks integration, and generates 
     check stubs..."

Me:  "Let's plan this out. /plan-product"
     [I'll walk you through creating mission.md, roadmap.md, tech-stack.md]

Me:  "Now let's shape the first feature. /shape-spec"
     [We discuss Producer Onboarding together]

Me:  "/create-spec"
     [I create the detailed spec with all tasks]

     [Repeat /shape-spec and /create-spec for each feature]
```

### Step 3: Release The Beast

When all specs are planned:

```
You: "Okay, I think we've got everything. Let's build it!"

Me:  "/release-the-beast"
```

What happens next:
1. 🖥️ A **dashboard** opens in your browser showing progress
2. 🦁 Five tmux sessions spawn (orchestrator + 4 workers)
3. ⚙️ Workers start building: Database → Backend → Frontend → Testing
4. 🧪 Tests run automatically as specs complete
5. 🌐 Browser opens for you to **watch the app being built**
6. 💾 Each completed spec pushes to GitHub
7. ☕ You drink coffee

### Step 4: Watch & Refine

While the beast works:
- Watch the dashboard at http://localhost:5555
- See the live app at http://localhost:3000 (once frontend starts)
- Check progress: `devfactory status`
- If needed: `devfactory pause` / `devfactory resume`

When it's done:
```
Me:  "🎉 Complete! Here's what we built..."
     [Summary of everything]

You: "The producer form could be better, and I want to add 
     a dark mode option."

Me:  "Absolutely, let me refine those for you..."
```

---

## Quick Reference

### Planning Commands (in Claude Code)
| Command | What It Does |
|---------|--------------|
| `/plan-product` | Design mission, roadmap, tech stack |
| `/shape-spec` | Shape a feature interactively |
| `/create-spec` | Create detailed spec with tasks |
| `/release-the-beast` | 🦁 BUILD EVERYTHING |

### Beast Commands (terminal or Claude Code)
| Command | What It Does |
|---------|--------------|
| `devfactory status` | Check progress |
| `devfactory dashboard` | Open dashboard in browser |
| `devfactory pause` | Pause the beast |
| `devfactory resume` | Resume the beast |
| `devfactory kill-beast` | Stop everything |

### Watching Tmux Sessions
```bash
tmux attach -t df-orchestrator  # The brain
tmux attach -t df-database      # Database worker
tmux attach -t df-backend       # Backend worker
tmux attach -t df-frontend      # Frontend worker
tmux attach -t df-testing       # Testing worker

# Detach without stopping: Ctrl+B, then D
```

---

## The Flow Visualized

```
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   YOU + CLAUDE                    THE BEAST                           ║
║   ───────────                     ─────────                           ║
║                                                                       ║
║   "I want to build..."            ┌─────────────┐                     ║
║         │                         │ Orchestrator│ ← Reviews & merges  ║
║         ▼                         └──────┬──────┘                     ║
║   /plan-product                          │                            ║
║   /shape-spec ×N      ─────────►  ┌──────┴──────┐                     ║
║   /create-spec ×N                 │   Pipeline   │                    ║
║         │                         │ DB→API→UI→QA │                    ║
║         ▼                         └──────┬──────┘                     ║
║   /release-the-beast                     │                            ║
║         │                         ┌──────┴──────┐                     ║
║         │                         │  Dashboard  │ ← You watch here    ║
║   ☕ Coffee time                  │  localhost  │                     ║
║         │                         └──────┬──────┘                     ║
║         ▼                                │                            ║
║   "🎉 It's done!"     ◄──────────────────┘                            ║
║         │                                                             ║
║         ▼                                                             ║
║   "Let's refine..."                                                   ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## What Gets Created

```
your-project/
├── .devfactory/
│   ├── product/
│   │   ├── mission.md        ← Your vision
│   │   ├── roadmap.md        ← Feature priorities
│   │   └── tech-stack.md     ← Technical decisions
│   ├── specs/
│   │   ├── 2025-01-feature-1/
│   │   │   ├── srd.md        ← Feature requirements
│   │   │   ├── specs.md      ← Technical spec
│   │   │   ├── tasks.md      ← All tasks
│   │   │   └── orchestration.yml
│   │   └── 2025-01-feature-2/
│   │       └── ...
│   ├── beast/
│   │   ├── state.json        ← Live progress
│   │   └── logs/             ← Activity history
│   └── issues/               ← Things needing your input
├── src/                      ← Your actual app code
├── tests/                    ← Generated tests
└── package.json
```

---

## When Things Need Your Input

Sometimes the beast needs a human decision. You'll see:

1. **In the dashboard**: A notification appears
2. **In .devfactory/issues/**: A file explaining what's needed
3. **In the orchestrator log**: Details about the decision

Just make the decision, and the beast continues!

---

## That's It!

The system is designed to be simple:

1. **Talk to Claude** about what you want
2. **Plan together** using /plan-product, /shape-spec, /create-spec
3. **Release the beast** and watch your app get built
4. **Refine together** once it's done

You're not a developer, and that's totally fine. That's what this system is for.

Now go build something awesome! 🦁
