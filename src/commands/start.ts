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
  console.log('━━━ Start Your Workers ━━━\n');
  
  const numWorkers = parseInt(options.workers || '3');
  const profiles = ['backend', 'frontend', 'testing'];
  
  for (let i = 1; i <= numWorkers; i++) {
    const profile = profiles[(i - 1) % profiles.length];
    console.log(`Terminal ${i}:`);
    console.log(`  tmux new-session -d -s session-${i}`);
    console.log(`  tmux send-keys -t session-${i} 'cd ${cwd} && claude' Enter`);
    console.log(`  tmux attach -t session-${i}`);
    console.log(`  # Then paste: devfactory bootstrap session-${i}`);
    console.log('');
  }
  
  console.log('━━━ Quick Start ━━━\n');
  console.log('# Run this to start all 3 workers:');
  console.log('');
  console.log(`tmux new-session -d -s backend -c ${cwd}`);
  console.log(`tmux new-session -d -s frontend -c ${cwd}`);
  console.log(`tmux new-session -d -s testing -c ${cwd}`);
  console.log('');
  console.log('# Then attach and start claude in each:');
  console.log('tmux attach -t backend  # type: claude, paste bootstrap');
  console.log('');
  console.log('━━━ Monitoring ━━━\n');
  console.log('  devfactory status   - Check progress');
  console.log('  devfactory stuck    - See stuck tasks');
  console.log('  devfactory stop     - Pause execution');
  console.log('');
  console.log('📧 You\'ll receive emails when waves complete or if help is needed.');
  console.log('');
}
