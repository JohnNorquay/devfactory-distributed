import * as fs from 'fs';
import * as path from 'path';

export async function stuckCommand() {
  const cwd = process.cwd();
  const tasksDir = path.join(cwd, '.devfactory', 'tasks');
  
  if (!fs.existsSync(tasksDir)) {
    console.log('❌ No tasks found. Run devfactory init first.\n');
    return;
  }
  
  console.log('\n🔍 Checking for stuck tasks...\n');
  
  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
  const stuckTasks: any[] = [];
  const humanNeeded: any[] = [];
  
  for (const file of taskFiles) {
    const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf-8'));
    
    if (task.status === 'stuck') {
      stuckTasks.push(task);
    } else if (task.status === 'needs_human') {
      humanNeeded.push(task);
    }
  }
  
  if (stuckTasks.length === 0 && humanNeeded.length === 0) {
    console.log('✅ No stuck tasks! Everything is flowing.\n');
    return;
  }
  
  if (humanNeeded.length > 0) {
    console.log('━━━ Needs Your Input ━━━\n');
    for (const task of humanNeeded) {
      console.log(`❓ ${task.id}: ${task.name}`);
      console.log(`   Reason: ${task.human_needed || 'Unknown'}`);
      console.log(`   Strategist said: ${task.strategist_decision || 'N/A'}`);
      console.log('');
    }
  }
  
  if (stuckTasks.length > 0) {
    console.log('━━━ Stuck After 3 Attempts ━━━\n');
    for (const task of stuckTasks) {
      console.log(`🔴 ${task.id}: ${task.name}`);
      console.log(`   Attempts: ${task.review_attempts}`);
      if (task.last_review_issues && task.last_review_issues.length > 0) {
        console.log(`   Issues:`);
        for (const issue of task.last_review_issues.slice(0, 3)) {
          console.log(`     • ${issue}`);
        }
      }
      console.log('');
    }
  }
  
  console.log('━━━ What To Do ━━━\n');
  console.log('Ask Claude.ai: "What\'s stuck in my devfactory project and how do we fix it?"');
  console.log('Claude will analyze the context and suggest solutions.\n');
}
