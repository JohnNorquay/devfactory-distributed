/**
 * ORCHESTRATE COMMAND
 * 
 * Runs the local orchestrator as a standalone process.
 * This is what runs in the df-orchestrator tmux session.
 */

import * as path from 'path';
import { runOrchestrator } from '../orchestrator';

interface OrchestrateOptions {
  interval?: string;
  verbose?: boolean;
  noBackup?: boolean;
}

export async function orchestrateCommand(options: OrchestrateOptions) {
  const cwd = process.cwd();
  
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║       LOCAL ORCHESTRATOR - DevFactory v4.0     ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  
  await runOrchestrator(cwd, {
    interval: parseInt(options.interval || '30'),
    verbose: options.verbose || false,
    noBackup: options.noBackup || false,
  });
}
