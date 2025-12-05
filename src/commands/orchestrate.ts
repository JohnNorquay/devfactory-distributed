import { ActiveOrchestrator } from '../orchestrator';

interface OrchestrateOptions {
  interval?: string;
  verbose?: boolean;
  noBackup?: boolean;
}

export async function orchestrateCommand(options: OrchestrateOptions) {
  const cwd = process.cwd();
  
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║       LOCAL ORCHESTRATOR - DevFactory v4.5     ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  const orchestrator = new ActiveOrchestrator({
    projectRoot: cwd,
    pollInterval: parseInt(options.interval || '30') * 1000,
    workerTimeout: 600000,
    maxRetries: 3,
    verbose: options.verbose || false,
  });

  await orchestrator.start();
}
