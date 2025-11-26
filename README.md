# DevFactory Distributed v3.1

Autonomous parallel development system for DevFactory.

## Quick Install

```bash
# Clone or copy to your plugins
cd ~/.claude/plugins
git clone [this-repo] devfactory-distributed

# Install
cd devfactory-distributed
npm install
npm run build
npm link  # Makes 'devfactory' command available globally
```

## Usage

### Initialize in Your Project

```bash
cd ~/projects/farmpayroll  # Your project
devfactory init --name "FarmPayroll" --email "your@email.com"
```

### Setup GitHub Orchestrator

```bash
devfactory setup-github
```

Then add these secrets to your GitHub repo:
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `SENDGRID_API_KEY` - For email notifications  
- `NOTIFY_EMAIL` - Where to send notifications

### Start Workers

```bash
# Start the system
devfactory start

# Open 3 terminals and start Claude Code in each:
tmux new-session -d -s backend
tmux new-session -d -s frontend
tmux new-session -d -s testing

# Get bootstrap prompt for each
devfactory bootstrap session-1  # Copy and paste into backend session
devfactory bootstrap session-2  # Copy and paste into frontend session
devfactory bootstrap session-3  # Copy and paste into testing session
```

### Monitor Progress

```bash
devfactory status      # See overall progress
devfactory stuck       # See what needs help
devfactory stop        # Pause execution
```

## How It Works

1. **Workers** (Claude Code sessions) run in tmux
2. **Workers** claim tasks, code, and commit to Git
3. **Orchestrator** (GitHub Action) reviews and merges
4. **Claude Strategist** handles stuck tasks intelligently
5. **You** get emails only when waves complete or help is needed

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

## Architecture

```
Your Laptop (tmux sessions)
├── session-1 (backend)  → claude CLI
├── session-2 (frontend) → claude CLI
└── session-3 (testing)  → claude CLI
         │
         ▼ (git push)
    GitHub Repository
         │
         ▼ (triggers)
    GitHub Action Orchestrator
    ├── Reviews completed tasks
    ├── Auto-merges approved work
    ├── Claude Strategist handles stuck
    └── Emails you (rarely)
```

## Session Profiles

- **backend**: API, database, backend logic
- **frontend**: UI, components, styling
- **testing**: Tests, E2E, verification

## Requirements

- Node.js 18+
- Git
- tmux
- Claude Code CLI (`claude`)
- GitHub repository
- Anthropic API key (for orchestrator)

## Notifications

DevFactory uses **GitHub Issues** for notifications - no email setup required!

You'll see issues created for:
- ❓ **Need Your Input** - When Claude Strategist can't resolve something
- ✅ **Progress Update** - When a batch of tasks is merged  
- 🎉 **Project Complete** - When everything is done

Just watch your GitHub notifications!

## Integration with DevFactory v3.0

This works alongside your existing DevFactory setup:

1. Use `/plan-product`, `/shape-spec`, `/create-spec` as normal
2. Use `/orchestrate-tasks` to generate orchestration.yml
3. Run `devfactory start` to execute in parallel
4. Use `/debug-verify` to validate when complete

## License

MIT
