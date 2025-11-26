import * as fs from 'fs';
import * as path from 'path';

interface StartOptions {
  workers?: string;
}

export async function startCommand(options: StartOptions) {
  const cwd = process.cwd();
  const statePath = path.join(cwd, '.devfactory', 'state.json');
  
  if (!fs.existsSync(statePath)) {
    console.log('❌ DevFactory not initialized. Run: devfactory init\n');
    return;
  }
  
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  
  if (state.is_running) {
    console.log('⚠️  DevFactory is already running.\n');
    console.log('   Run: devfactory status  - to see progress');
    console.log('   Run: devfactory stop    - to pause execution\n');
    return;
  }
  
  // Update state
  state.is_running = true;
  state.overall.started_at = new Date().toISOString();
  state.overall.last_updated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  
  console.log('\n🚀 DevFactory Distributed STARTED!\n');
  console.log('━'.repeat(50));
  console.log('');
  console.log('The system is now active. The GitHub orchestrator');
  console.log('will process completed tasks automatically.');
  console.log('');
  console.log('━━━ 4-Stage Pipeline Architecture ━━━\n');
  console.log('  DB Worker → Backend Worker → Frontend Worker → Testing Worker');
  console.log('  (schemas)    (APIs)          (UI)              (E2E)');
  console.log('');
  console.log('━━━ Start Your Workers ━━━\n');
  
  const pipelineWorkers = [
    { session: 'session-1', name: 'database', desc: 'DB migrations & schemas' },
    { session: 'session-2', name: 'backend', desc: 'APIs & services' },
    { session: 'session-3', name: 'frontend', desc: 'UI components & pages' },
    { session: 'session-4', name: 'testing', desc: 'E2E & integration tests' },
  ];
  
  for (const worker of pipelineWorkers) {
    console.log(`${worker.name.toUpperCase()} (${worker.desc}):`);
    console.log(`  tmux new-session -d -s ${worker.name} -c ${cwd}`);
    console.log(`  tmux attach -t ${worker.name}`);
    console.log(`  # Then: claude → paste: devfactory bootstrap ${worker.session}`);
    console.log('');
  }
  
  console.log('━━━ Quick Start (copy/paste) ━━━\n');
  console.log(`# Create all 4 pipeline workers:`);
  console.log(`tmux new-session -d -s database -c ${cwd}`);
  console.log(`tmux new-session -d -s backend -c ${cwd}`);
  console.log(`tmux new-session -d -s frontend -c ${cwd}`);
  console.log(`tmux new-session -d -s testing -c ${cwd}`);
  console.log('');
  console.log('# Attach and bootstrap each:');
  console.log('tmux attach -t database  # → claude → devfactory bootstrap session-1');
  console.log('');
  console.log('━━━ Pipeline Flow ━━━\n');
  console.log('  Spec N DB done → unlocks Spec N for Backend');
  console.log('  Spec N API done → unlocks Spec N for Frontend');
  console.log('  Spec N UI done → unlocks Spec N for Testing');
  console.log('');
  console.log('  All 4 workers stay busy once pipeline fills! 🚀');
  console.log('');
  console.log('━━━ Monitoring ━━━\n');
  console.log('  devfactory status   - Check progress');
  console.log('  devfactory stuck    - See stuck tasks');
  console.log('  devfactory stop     - Pause execution');
  console.log('');
  console.log('📣 GitHub Issues will notify you of progress and completion.');
  console.log('');
}
