# DevFactory Distributed v4.5

## 🦁 Beast Mode with Active Orchestration

**The key difference:** The orchestrator no longer goes golfing! 🏌️❌

### What's New in v4.5

| Feature | v4.4 | v4.5 |
|---------|------|------|
| Orchestrator | Spawn workers and check email | **Active polling every 30s** |
| Task Assignment | Workers self-serve | **Orchestrator pushes tasks** |
| Verification | Optional/inconsistent | **Build → Verify → Complete enforced** |
| Subagents | Sometimes used | **Always required for implementation** |
| Checkboxes | Often skipped | **No checkbox without verification** |
| Stuck Detection | Manual | **Automatic with nudges** |
| Dashboard | Stale data | **Real-time WebSocket updates** |
| File Locking | Race conditions | **Proper locking on state.json** |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ACTIVE ORCHESTRATOR (No Golfing!)                │
│                                                                      │
│   Polls every 30 seconds:                                           │
│   • Assigns tasks to idle workers                                   │
│   • Monitors worker health                                          │
│   • Detects and nudges stuck workers                               │
│   • Updates queues as dependencies unlock                          │
│                                                                      │
│         ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│         │df-database│  │df-backend│  │df-frontend│ │df-testing│     │
│         │          │  │          │  │          │  │          │     │
│         │ Spawns   │  │ Spawns   │  │ Spawns   │  │ Spawns   │     │
│         │ Subagents│  │ Subagents│  │ Subagents│  │ Subagents│     │
│         │ Verifies │  │ Verifies │  │ Verifies │  │ Verifies │     │
│         └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## The Build → Verify → Complete Cycle

Every task MUST go through this cycle:

```
┌─────────────────────────────────────────┐
│           PHASE 1: BUILD                │
│                                         │
│  1. Receive task from orchestrator      │
│  2. Update state: "in_progress"         │
│  3. Spawn subagent to implement         │
│  4. Wait for completion                 │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          PHASE 2: VERIFY                │
│                                         │
│  1. Update state: "verifying"           │
│  2. Run layer-specific checks           │
│  3. Retry if failed (max 2x)            │
│  4. Mark stuck if still failing         │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         PHASE 3: COMPLETE               │
│                                         │
│  1. Mark checkbox in tasks.md           │
│  2. Update state: "complete"            │
│  3. Report files changed                │
│  4. Wait for next assignment            │
└─────────────────────────────────────────┘
```

## Installation

```bash
# Clone to your plugins directory
cd ~/.claude/plugins
git clone https://github.com/JohnNorquay/devfactory-distributed.git
cd devfactory-distributed
git checkout v4.5

# Install dependencies
npm install

# Build
npm run build

# Link globally
npm link
```

## Usage

### Initialize a Project

```bash
cd ~/projects/my-project
devfactory init --name "My Project"
```

### Release the Beast

```bash
# Make sure you have specs in .devfactory/specs/
devfactory release-the-beast --verbose
```

### Monitor Progress

```bash
# Terminal-based status
devfactory status

# Real-time watch mode
devfactory watch

# Web dashboard
devfactory dashboard
# Open http://localhost:5555
```

### Other Commands

```bash
# Show stuck tasks
devfactory stuck

# Pause orchestrator
devfactory pause

# Resume orchestrator
devfactory resume
```

## Worker Rules

Workers are **coordinators**, not implementers:

1. **Never implement code directly** - Always spawn subagents
2. **Never skip verification** - Build → Verify → Complete
3. **Always update state.json** - The orchestrator is watching
4. **Respond to orchestrator** - Don't ignore check-ins

## State Management

State is stored in `.devfactory/beast/state.json` with proper file locking:

```json
{
  "version": "4.5.0",
  "status": "running",
  "orchestrator": {
    "status": "active",
    "lastPoll": "2024-01-15T10:30:00Z",
    "totalPolls": 42
  },
  "workers": {
    "df-database": {
      "status": "working",
      "currentTask": "spec1-3"
    }
  },
  "tasks": {
    "spec1-3": {
      "status": "in_progress",
      "layer": "database"
    }
  },
  "queues": {
    "database": [],
    "backend": ["spec1-5", "spec1-6"],
    "frontend": [],
    "testing": []
  },
  "activity": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "type": "task_completed",
      "message": "Task completed"
    }
  ]
}
```

## Troubleshooting

### Worker not receiving tasks
1. Check if orchestrator is active: `devfactory status`
2. Check queue has tasks: Look at state.json queues
3. Verify tmux session exists: `tmux list-sessions`

### Tasks stuck
1. Run `devfactory stuck` to see reasons
2. Check worker session: `tmux attach -t df-<layer>`
3. Look at state.json for stuck_reason

### Dashboard not updating
1. Ensure state.json exists
2. Check WebSocket connection in browser console
3. Restart dashboard: `devfactory dashboard`

## Version History

- **v4.5.0** - Active orchestration, enforced Build→Verify→Complete
- **v4.4.0** - Parallel subagent batching
- **v4.3.1** - Oracle system for stuck workers
- **v4.0.0** - Initial beast mode
- **v3.x** - Interactive orchestration (you + Claude)

## Philosophy

> "Between mine and your consciousness filtering methods, we are going to make something great!" - Johnny5

DevFactory v4.5 combines the **magic of active orchestration** from v3 with the **parallelism of beast mode**. The orchestrator stays engaged, workers stay accountable, and together we build amazing things.

🦁 No golfing. No shortcuts. Just shipping code.
