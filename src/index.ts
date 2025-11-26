#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { statusCommand } from './commands/status';
import { bootstrapCommand } from './commands/bootstrap';
import { setupGithubCommand } from './commands/setup-github';
import { stuckCommand } from './commands/stuck';
import { startCommand } from './commands/start';
import { stopCommand } from './commands/stop';

const program = new Command();

program
  .name('devfactory')
  .description('DevFactory Distributed v3.1 - Autonomous parallel development')
  .version('3.1.0');

program
  .command('init')
  .description('Initialize DevFactory in current project')
  .option('-n, --name <name>', 'Project name')
  .action(initCommand);

program
  .command('status')
  .description('Show current execution status')
  .option('-v, --verbose', 'Show detailed status')
  .action(statusCommand);

program
  .command('bootstrap <session>')
  .description('Generate bootstrap prompt for a session')
  .option('-p, --profile <profile>', 'Session profile (backend, frontend, testing)')
  .action(bootstrapCommand);

program
  .command('setup-github')
  .description('Install GitHub Actions orchestrator workflow')
  .action(setupGithubCommand);

program
  .command('stuck')
  .description('Show tasks that are stuck and need attention')
  .action(stuckCommand);

program
  .command('start')
  .description('Start distributed execution')
  .option('-w, --workers <n>', 'Number of worker sessions', '3')
  .action(startCommand);

program
  .command('stop')
  .description('Pause distributed execution')
  .action(stopCommand);

program.parse();
