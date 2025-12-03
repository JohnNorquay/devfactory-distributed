/**
 * RELEASE THE BEAST 🦁
 * 
 * The flagship command that transforms your planning session into a
 * fully autonomous development factory.
 * 
 * One command does it all:
 * - Creates all tmux sessions
 * - Starts the local orchestrator
 * - Bootstraps all workers
 * - Begins the 4-stage pipeline
 * 
 * From chaos to creation with a single invocation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn, ChildProcess } from 'child_process';

interface ReleaseOptions {
  skipOrchestrator?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  interval?: string;
}

const BANNER = `
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║     ██████╗ ███████╗██╗     ███████╗ █████╗ ███████╗███████╗        ║
║     ██╔══██╗██╔════╝██║     ██╔════╝██╔══██╗██╔════╝██╔════╝        ║
║     ██████╔╝█████╗  ██║     █████╗  ███████║███████╗█████╗          ║
║     ██╔══██╗██╔══╝  ██║     ██╔══╝  ██╔══██║╚════██║██╔══╝          ║
║     ██║  ██║███████╗███████╗███████╗██║  ██║███████║███████╗        ║
║     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝        ║
║                                                                      ║
║                     ████████╗██╗  ██╗███████╗                        ║
║                     ╚══██╔══╝██║  ██║██╔════╝                        ║
║                        ██║   ███████║█████╗                          ║
║                        ██║   ██╔══██║██╔══╝                          ║
║                        ██║   ██║  ██║███████╗                        ║
║                        ╚═╝   ╚═╝  ╚═╝╚══════╝                        ║
║                                                                      ║
║     ██████╗ ███████╗ █████╗ ███████╗████████╗    ██╗██╗██╗          ║
║     ██╔══██╗██╔════╝██╔══██╗██╔════╝╚══██╔══╝    ██║██║██║          ║
║     ██████╔╝█████╗  ███████║███████╗   ██║       ██║██║██║          ║
║     ██╔══██╗██╔══╝  ██╔══██║╚════██║   ██║       ╚═╝╚═╝╚═╝          ║
║     ██████╔╝███████╗██║  ██║███████║   ██║       ██╗██╗██╗          ║
║     ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝       ╚═╝╚═╝╚═╝          ║
║                                                                      ║
║              DevFactory v4.0 - Autonomous Development                ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`;

const SESSIONS = [
  { name: 'df-orchestrator', profile: 'orchestrator', description: 'The Brain - Reviews, merges, coordinates' },
  { name: 'df-database', profile: 'database', session: 'session-1', description: 'DB migrations & schemas' },
  { name: 'df-backend', profile: 'backend', session: 'session-2', description: 'APIs & services' },
  { name: 'df-frontend', profile: 'frontend', session: 'session-3', description: 'UI components & pages' },
  { name: 'df-testing', profile: 'testing', session: 'session-4', description: 'E2E & integration tests' },
];

export async function releaseTheBeastCommand(options: ReleaseOptions) {
  const cwd = process.cwd();
  const devfactoryDir = path.join(cwd, '.devfactory');
  const statePath = path.join(devfactoryDir, 'state.json');
  
  // Show the epic banner
  console.log(BANNER);
  
  // Validate environment
  console.log('🔍 Pre-flight checks...\n');
  
  // Check if devfactory is initialized
  if (!fs.existsSync(statePath)) {
    console.log('❌ DevFactory not initialized.');
    console.log('   Run: devfactory init --name "YourProject"\n');
    return;
  }
  
  // Check for tmux
  try {
    execSync('which tmux', { stdio: 'pipe' });
    console.log('   ✓ tmux available');
  } catch {
    console.log('❌ tmux not found. Install with: sudo apt install tmux');
    return;
  }
  
  // Check for claude CLI
  try {
    execSync('which claude', { stdio: 'pipe' });
    console.log('   ✓ claude CLI available');
  } catch {
    console.log('❌ claude CLI not found.');
    console.log('   Install: npm install -g @anthropic-ai/claude-cli');
    return;
  }
  
  // Check for ANTHROPIC_API_KEY
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set (needed for orchestrator)');
    console.log('   Set with: export ANTHROPIC_API_KEY=your-key');
    
    if (!options.skipOrchestrator) {
      console.log('   Or run with --skip-orchestrator\n');
      return;
    }
  } else {
    console.log('   ✓ ANTHROPIC_API_KEY configured');
  }
  
  // Check for existing sessions
  const existingSessions = getExistingTmuxSessions();
  const conflictingSessions = SESSIONS.filter(s => existingSessions.includes(s.name));
  
  if (conflictingSessions.length > 0) {
    console.log(`\n⚠️  Found existing DevFactory sessions: ${conflictingSessions.map(s => s.name).join(', ')}`);
    console.log('   Kill them first with: devfactory kill-beast\n');
    return;
  }
  
  console.log('   ✓ No conflicting sessions\n');
  
  // Check for specs/tasks
  const orchestrationPath = path.join(devfactoryDir, 'orchestration.yml');
  const tasksDir = path.join(devfactoryDir, 'tasks');
  
  if (!fs.existsSync(orchestrationPath) && !fs.existsSync(tasksDir)) {
    console.log('⚠️  No orchestration.yml or tasks found.');
    console.log('   Make sure you have run /orchestrate-tasks first.\n');
    console.log('   If you haven\'t created specs yet, run:');
    console.log('   - /plan-product');
    console.log('   - /shape-spec (for each feature)');
    console.log('   - /create-spec (for each feature)');
    console.log('   - /orchestrate-tasks\n');
  }
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN - Would create the following sessions:\n');
    for (const session of SESSIONS) {
      console.log(`   ${session.name}: ${session.description}`);
    }
    console.log('\n   Run without --dry-run to actually start.\n');
    return;
  }
  
  // ========== THE BEAST IS RELEASED ==========
  
  console.log('━'.repeat(70));
  console.log('');
  console.log('   🦁 RELEASING THE BEAST...');
  console.log('');
  console.log('━'.repeat(70));
  console.log('');
  
  // Update state to running
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  state.is_running = true;
  state.overall.started_at = new Date().toISOString();
  state.overall.last_updated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  
  // Create all tmux sessions
  console.log('📺 Creating tmux sessions...\n');
  
  for (const session of SESSIONS) {
    try {
      execSync(`tmux new-session -d -s ${session.name} -c ${cwd}`, { stdio: 'pipe' });
      console.log(`   ✓ ${session.name} (${session.description})`);
    } catch (error) {
      console.log(`   ❌ Failed to create ${session.name}: ${error}`);
    }
  }
  
  // Start orchestrator
  if (!options.skipOrchestrator) {
    console.log('\n🧠 Starting Local Orchestrator...\n');
    
    const interval = parseInt(options.interval || '30');
    const orchestratorCmd = `devfactory orchestrate --interval ${interval}${options.verbose ? ' --verbose' : ''}`;
    
    execSync(`tmux send-keys -t df-orchestrator "${orchestratorCmd}" Enter`, { stdio: 'pipe' });
    console.log(`   ✓ Orchestrator running in df-orchestrator (checking every ${interval}s)`);
  }
  
  // Bootstrap workers
  console.log('\n🤖 Bootstrapping workers...\n');
  
  for (const session of SESSIONS.slice(1)) { // Skip orchestrator
    const bootstrapPrompt = generateBootstrapPrompt(session, cwd);
    
    // Start claude in the session
    execSync(`tmux send-keys -t ${session.name} "claude --dangerously-skip-permissions" Enter`, { stdio: 'pipe' });
    
    // Wait a moment for claude to start
    await sleep(2000);
    
    // Send the bootstrap prompt
    // Escape special characters and send
    const escapedPrompt = bootstrapPrompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    execSync(`tmux send-keys -t ${session.name} "${escapedPrompt}" Enter`, { stdio: 'pipe' });
    
    console.log(`   ✓ ${session.name} bootstrapped`);
  }
  
  // Print status
  console.log('\n' + '━'.repeat(70));
  console.log('');
  console.log('   🎉 THE BEAST IS LOOSE!');
  console.log('');
  console.log('━'.repeat(70));
  
  console.log('\n📺 Sessions created:\n');
  console.log('   tmux attach -t df-orchestrator  # Watch the brain');
  console.log('   tmux attach -t df-database      # Database worker');
  console.log('   tmux attach -t df-backend       # Backend worker');
  console.log('   tmux attach -t df-frontend      # Frontend worker');
  console.log('   tmux attach -t df-testing       # Testing worker');
  
  console.log('\n🎮 Controls:\n');
  console.log('   devfactory status     # Check progress');
  console.log('   devfactory stuck      # See blocked tasks');
  console.log('   devfactory stop       # Pause the beast');
  console.log('   devfactory kill-beast # Terminate all sessions');
  
  console.log('\n📊 Pipeline Architecture:\n');
  console.log('   DB → Backend → Frontend → Testing');
  console.log('   ↓      ↓          ↓          ↓');
  console.log('   All workers run continuously once pipeline fills!');
  
  console.log('\n💾 Auto-backup:\n');
  console.log('   Completed specs automatically push to GitHub');
  
  console.log('\n🛎️  Notifications:\n');
  console.log('   Check .devfactory/issues/ for items needing attention');
  
  console.log('\n');
  console.log('   Now go have some coffee ☕ - the beast is working!');
  console.log('\n');
}

function getExistingTmuxSessions(): string[] {
  try {
    const output = execSync('tmux list-sessions -F "#{session_name}"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim().split('\n').filter(s => s);
  } catch {
    return [];
  }
}

function generateBootstrapPrompt(session: { name: string; profile: string; session: string; description: string }, cwd: string): string {
  return `You are a DevFactory ${session.profile.toUpperCase()} worker.

Your role: ${session.description}

Read your session config at: ${cwd}/.devfactory/sessions/${session.session}.json
Read your profile at: ${cwd}/.devfactory/profiles/${session.profile}.json

WORKFLOW:
1. Check .devfactory/tasks/ for tasks with status "pending" matching your profile
2. Claim a task by updating its status to "claimed"
3. Create a branch: git checkout -b devfactory/<task-id>
4. Complete the task following the spec
5. Commit your changes
6. Update task status to "completed"
7. The orchestrator will review and merge automatically
8. Repeat from step 1

PIPELINE RULES:
${session.profile === 'database' ? '- You work first. Your migrations unlock backend tasks.' : ''}
${session.profile === 'backend' ? '- Wait for database tasks on a spec before starting backend tasks for that spec.' : ''}
${session.profile === 'frontend' ? '- Wait for backend tasks on a spec before starting frontend tasks for that spec.' : ''}
${session.profile === 'testing' ? '- Wait for frontend tasks on a spec before starting testing tasks for that spec.' : ''}

IMPORTANT:
- Only claim tasks matching your profile keywords
- Update task files atomically
- Commit frequently with clear messages
- If stuck, set task status to "stuck" with notes

Start by checking for available tasks now.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Kill all DevFactory sessions
 */
export async function killTheBeastCommand() {
  console.log('\n🔪 Killing the beast...\n');
  
  let killed = 0;
  
  for (const session of SESSIONS) {
    try {
      execSync(`tmux kill-session -t ${session.name}`, { stdio: 'pipe' });
      console.log(`   ✓ Killed ${session.name}`);
      killed++;
    } catch {
      // Session doesn't exist, that's fine
    }
  }
  
  if (killed === 0) {
    console.log('   No DevFactory sessions found.\n');
  } else {
    console.log(`\n   Killed ${killed} session(s).\n`);
    
    // Update state
    const cwd = process.cwd();
    const statePath = path.join(cwd, '.devfactory', 'state.json');
    
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      state.is_running = false;
      state.overall.last_updated = new Date().toISOString();
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }
  }
}
