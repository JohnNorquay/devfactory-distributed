import * as fs from 'fs';
import * as path from 'path';

interface StatusOptions {
  verbose?: boolean;
}

export async function statusCommand(options: StatusOptions) {
  const cwd = process.cwd();
  const devfactoryDir = path.join(cwd, '.devfactory');
  const statePath = path.join(devfactoryDir, 'state.json');
  
  if (!fs.existsSync(statePath)) {
    console.log('❌ DevFactory not initialized. Run: devfactory init\n');
    return;
  }
  
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  
  console.log('\n📊 DevFactory Distributed Status\n');
  console.log('━'.repeat(50));
  
  // Running state
  if (state.is_running) {
    console.log('🟢 Status: RUNNING');
  } else {
    console.log('⚪ Status: IDLE');
  }
  
  console.log(`📁 Project: ${state.project}`);
  console.log(`🕐 Last Updated: ${new Date(state.overall.last_updated).toLocaleString()}`);
  
  console.log('\n━━━ Overall Progress ━━━\n');
  
  const { overall } = state;
  
  // Specs progress
  const specProgress = overall.specs_total > 0 
    ? Math.round((overall.specs_completed / overall.specs_total) * 100)
    : 0;
  console.log(`📋 Specs: ${overall.specs_completed}/${overall.specs_total} (${specProgress}%)`);
  console.log(`   ├─ Pending: ${overall.specs_pending}`);
  console.log(`   ├─ In Progress: ${overall.specs_in_progress}`);
  console.log(`   └─ Completed: ${overall.specs_completed}`);
  
  // Tasks progress
  const taskProgress = overall.tasks_total > 0
    ? Math.round((overall.tasks_merged / overall.tasks_total) * 100)
    : 0;
  console.log(`\n✅ Tasks: ${overall.tasks_merged}/${overall.tasks_total} merged (${taskProgress}%)`);
  console.log(`   ├─ Completed: ${overall.tasks_completed}`);
  console.log(`   ├─ Merged: ${overall.tasks_merged}`);
  console.log(`   ├─ Skipped: ${overall.tasks_skipped}`);
  console.log(`   └─ Stuck: ${overall.tasks_stuck}`);
  
  // Wave progress
  if (state.total_spec_waves > 0) {
    console.log(`\n🌊 Spec Wave: ${state.current_spec_wave}/${state.total_spec_waves}`);
  }
  
  // Sessions
  console.log('\n━━━ Sessions ━━━\n');
  const sessionsDir = path.join(devfactoryDir, 'sessions');
  if (fs.existsSync(sessionsDir)) {
    const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    for (const file of sessionFiles) {
      const session = JSON.parse(fs.readFileSync(path.join(sessionsDir, file), 'utf-8'));
      const statusIcons: Record<string, string> = {
        'idle': '⚪',
        'working': '🟢',
        'waiting': '🟡',
        'completed': '✅',
        'error': '🔴',
      };
      const statusIcon = statusIcons[session.status] || '⚪';
      
      console.log(`${statusIcon} ${session.name} (${session.session_id})`);
      console.log(`   Profile: ${session.profile}`);
      if (session.current_task) {
        console.log(`   Current: ${session.current_task}`);
      }
      console.log(`   Completed: ${session.completed_tasks.length} tasks`);
    }
  }
  
  // Interventions (if any)
  if (state.interventions && state.interventions.length > 0 && options.verbose) {
    console.log('\n━━━ Recent Interventions ━━━\n');
    const recent = state.interventions.slice(-5);
    for (const intervention of recent) {
      const interventionIcons: Record<string, string> = {
        'fix_applied': '🔧',
        'skipped': '⏭️',
        'spec_modified': '📝',
        'human_needed': '❓',
      };
      const icon = interventionIcons[intervention.type] || '•';
      console.log(`${icon} ${intervention.description}`);
    }
  }
  
  // Stuck tasks
  if (overall.tasks_stuck > 0) {
    console.log('\n⚠️  Some tasks are stuck! Run: devfactory stuck');
  }
  
  console.log('\n');
}

