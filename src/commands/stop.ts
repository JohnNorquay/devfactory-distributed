import * as fs from 'fs';
import * as path from 'path';

export async function stopCommand() {
  const cwd = process.cwd();
  const statePath = path.join(cwd, '.devfactory', 'state.json');
  
  if (!fs.existsSync(statePath)) {
    console.log('❌ DevFactory not initialized. Run: devfactory init\n');
    return;
  }
  
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  
  if (!state.is_running) {
    console.log('⚪ DevFactory is not running.\n');
    return;
  }
  
  // Update state
  state.is_running = false;
  state.overall.last_updated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  
  console.log('\n⏸️  DevFactory PAUSED\n');
  console.log('The orchestrator will not process new tasks.');
  console.log('Workers can continue their current tasks but won\'t claim new ones.');
  console.log('');
  console.log('To resume: devfactory start');
  console.log('');
}
