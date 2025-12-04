#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { statusCommand } from './commands/status';
import { bootstrapCommand } from './commands/bootstrap';
import { setupGithubCommand } from './commands/setup-github';
import { stuckCommand } from './commands/stuck';
import { startCommand } from './commands/start';
import { stopCommand } from './commands/stop';
import { releaseTheBeastCommand, killTheBeastCommand } from './commands/release-the-beast';
import { watchCommand } from './commands/watch';
import { orchestrateCommand } from './commands/orchestrate';
import { dashboardCommand } from './dashboard';
import { oracleCommand } from './oracle/oracle';

const program = new Command();

program
  .name('devfactory')
  .description('DevFactory v4.4.0 - Task-level parallel subagent execution')
  .version('4.4.0');

// ============================================================================
// INITIALIZATION
// ============================================================================

program
  .command('init')
  .description('Initialize DevFactory in current project')
  .option('-n, --name <n>', 'Project name')
  .action(initCommand);

// ============================================================================
// THE BEAST - One command to rule them all
// ============================================================================

program
  .command('release-the-beast')
  .description('🦁 Create all tmux sessions, start orchestrator, bootstrap workers - THE BIG ONE')
  .option('--skip-orchestrator', 'Skip starting the orchestrator (for manual control)')
  .option('--skip-reconcile', 'Skip reconciling state with existing codebase')
  .option('--dry-run', 'Show what would happen without actually doing it')
  .option('-v, --verbose', 'Verbose output')
  .option('-i, --interval <seconds>', 'Orchestrator check interval in seconds', '30')
  .action(releaseTheBeastCommand);

program
  .command('kill-beast')
  .description('🔪 Kill all DevFactory tmux sessions')
  .action(killTheBeastCommand);

program
  .command('watch')
  .description('👁️  Open a 6-pane view of all beast sessions')
  .option('-l, --layout <layout>', 'Layout style: grid or simple', 'grid')
  .action(watchCommand);

// ============================================================================
// LOCAL ORCHESTRATOR & ORACLE
// ============================================================================

program
  .command('orchestrate')
  .description('🧠 Run the local orchestrator (reviews, merges, coordinates)')
  .option('-i, --interval <seconds>', 'Check interval in seconds', '30')
  .option('-v, --verbose', 'Verbose output with progress bar')
  .option('--no-backup', 'Disable auto-backup to GitHub')
  .action(orchestrateCommand);

program
  .command('oracle')
  .description('🔮 Run the Oracle - helps stuck workers automatically (uses Opus)')
  .option('-v, --verbose', 'Verbose output')
  .action(oracleCommand);

program
  .command('dashboard')
  .description('🖥️  Open the Beast Dashboard in your browser')
  .option('-p, --port <port>', 'Dashboard port', '5555')
  .option('-a, --app-url <url>', 'App preview URL', 'http://localhost:3000')
  .action(dashboardCommand);

program
  .command('reconcile')
  .description('🔄 Reconcile state.json with existing codebase (runs automatically in release-the-beast)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const { reconcileState } = await import('./reconciler/reconciler');
    await reconcileState(process.cwd(), options.verbose || false);
  });

// ============================================================================
// STATUS & MONITORING
// ============================================================================

program
  .command('status')
  .description('Show current execution status')
  .option('-v, --verbose', 'Show detailed status')
  .action(statusCommand);

program
  .command('stuck')
  .description('Show tasks that are stuck and need attention')
  .action(stuckCommand);

// ============================================================================
// MANUAL CONTROL
// ============================================================================

program
  .command('bootstrap <session>')
  .description('Generate bootstrap prompt for a session')
  .option('-p, --profile <profile>', 'Session profile (database, backend, frontend, testing)')
  .action(bootstrapCommand);

program
  .command('start')
  .description('Start distributed execution (legacy - use release-the-beast instead)')
  .option('-w, --workers <n>', 'Number of worker sessions', '4')
  .action(startCommand);

program
  .command('stop')
  .description('Pause distributed execution')
  .action(stopCommand);

// ============================================================================
// GITHUB INTEGRATION (OPTIONAL)
// ============================================================================

program
  .command('setup-github')
  .description('Install GitHub Actions orchestrator workflow (optional, for remote orchestration)')
  .action(setupGithubCommand);

program.parse();
