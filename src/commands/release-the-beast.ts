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
import { reconcileState } from '../reconciler/reconciler';

interface ReleaseOptions {
  skipOrchestrator?: boolean;
  skipReconcile?: boolean;
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
║              DevFactory v4.2 - Brownfield Ready                  ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`;

// Model configuration - v4.1
const MODELS = {
  workers: 'claude-sonnet-4-5-20250929',      // Fast & efficient for execution
  orchestrator: 'claude-opus-4-5-20251101',   // Strategic for reviews
  oracle: 'claude-opus-4-5-20251101',         // Wise for helping stuck workers
};

const SESSIONS = [
  { name: 'df-orchestrator', profile: 'orchestrator', session: 'orchestrator', description: 'The Brain - Reviews, merges, coordinates', model: MODELS.orchestrator },
  { name: 'df-oracle', profile: 'oracle', session: 'oracle', description: 'The Oracle - Helps stuck workers', model: MODELS.oracle },
  { name: 'df-database', profile: 'database', session: 'session-1', description: 'DB migrations & schemas', model: MODELS.workers },
  { name: 'df-backend', profile: 'backend', session: 'session-2', description: 'APIs & services', model: MODELS.workers },
  { name: 'df-frontend', profile: 'frontend', session: 'session-3', description: 'UI components & pages', model: MODELS.workers },
  { name: 'df-testing', profile: 'testing', session: 'session-4', description: 'E2E & integration tests', model: MODELS.workers },
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
  
  // ========== RECONCILIATION (v4.2) ==========
  
  if (!options.skipReconcile) {
    const reconcileResult = await reconcileState(cwd, options.verbose || false);
    
    if (reconcileResult.updatedState && reconcileResult.completedTasks > 0) {
      console.log('━'.repeat(70));
      console.log(`   📊 Reconciliation complete: ${reconcileResult.completedTasks}/${reconcileResult.totalTasks} tasks already done`);
      console.log(`   📋 ${reconcileResult.remainingTasks} tasks will be distributed to workers`);
      console.log('━'.repeat(70));
      console.log('');
    }
  } else {
    console.log('   ⏭️  Skipping reconciliation (--skip-reconcile)\n');
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
  
  // Start orchestrator (uses Opus via API)
  if (!options.skipOrchestrator) {
    console.log('\n🧠 Starting Local Orchestrator (Opus 4.5)...\n');
    
    const interval = parseInt(options.interval || '30');
    const orchestratorCmd = `devfactory orchestrate --interval ${interval}${options.verbose ? ' --verbose' : ''}`;
    
    execSync(`tmux send-keys -t df-orchestrator "${orchestratorCmd}" Enter`, { stdio: 'pipe' });
    console.log(`   ✓ Orchestrator running in df-orchestrator (checking every ${interval}s)`);
    
    // Start Oracle (uses Opus via API)
    console.log('\n🔮 Starting The Oracle (Opus 4.5)...\n');
    const oracleCmd = `devfactory oracle${options.verbose ? ' --verbose' : ''}`;
    execSync(`tmux send-keys -t df-oracle "${oracleCmd}" Enter`, { stdio: 'pipe' });
    console.log(`   ✓ Oracle watching for stuck workers in df-oracle`);
  }
  
  // Bootstrap workers (uses Claude Code CLI - model determined by user's plan)
  // Skip orchestrator (index 0) and oracle (index 1)
  const workerSessions = SESSIONS.filter(s => !['orchestrator', 'oracle'].includes(s.profile));
  console.log('\n🤖 Bootstrapping workers (Sonnet 4.5 via Claude Code)...\n');
  
  for (const session of workerSessions) {
    const bootstrapPrompt = generateBootstrapPrompt(session, cwd);
    
    // Start claude in the session
    // Note: Model is determined by user's Claude Code plan settings
    execSync(`tmux send-keys -t ${session.name} "claude --dangerously-skip-permissions" Enter`, { stdio: 'pipe' });
    
    // Wait longer for claude to fully start (v4.1: increased from 2s to 5s)
    await sleep(5000);
    
    // Send the bootstrap prompt - use file-based approach for complex prompts
    const promptFile = `/tmp/bootstrap-${session.profile}.txt`;
    fs.writeFileSync(promptFile, bootstrapPrompt);
    
    // Send prompt via file to avoid escaping issues
    execSync(`tmux send-keys -t ${session.name} "cat ${promptFile}" Enter`, { stdio: 'pipe' });
    await sleep(500);
    execSync(`tmux send-keys -t ${session.name} Enter`, { stdio: 'pipe' });
    
    console.log(`   ✓ ${session.name} bootstrapped`);
  }
  
  // Print status
  console.log('\n' + '━'.repeat(70));
  console.log('');
  console.log('   🎉 THE BEAST IS LOOSE!');
  console.log('');
  console.log('━'.repeat(70));
  
  console.log('\n📺 Sessions created:\n');
  console.log('   tmux attach -t df-orchestrator  # Watch the brain (Opus)');
  console.log('   tmux attach -t df-oracle        # Watch the oracle (Opus)');
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
  
  // Start the dashboard
  console.log('\n🖥️  Starting Beast Dashboard...\n');
  
  const dashboardPort = 5555;
  execSync(`tmux send-keys -t df-orchestrator "# Dashboard will be available at http://localhost:${dashboardPort}" Enter`, { stdio: 'pipe' });
  
  // Try to open dashboard in browser
  const dashboardUrl = `http://localhost:${dashboardPort}`;
  try {
    const openCmd = process.platform === 'darwin' ? 'open' :
                    process.platform === 'win32' ? 'start' : 
                    'xdg-open';
    execSync(`${openCmd} ${dashboardUrl}`, { stdio: 'ignore' });
    console.log(`   ✓ Dashboard opened at ${dashboardUrl}`);
  } catch {
    console.log(`   Dashboard available at: ${dashboardUrl}`);
  }
  
  // Try to open the app preview
  const appUrl = 'http://localhost:3000';
  console.log(`   App preview will be at: ${appUrl}`);
  
  console.log('\n' + '━'.repeat(70));
  console.log('');
  console.log('   🦁 THE BEAST IS WORKING!');
  console.log('');
  console.log('   Watch the dashboard, sip your coffee ☕');
  console.log('   I\'ll handle everything from here.');
  console.log('');
  console.log('━'.repeat(70));
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
  // v4.1: Use subagent pattern with auto-polling and state updates
  
  const basePrompt = `Read the file .devfactory/beast/bootstrap-${session.profile}.md and follow those instructions exactly.

You are the ${session.profile.toUpperCase()} WORKER in the DevFactory Beast Mode pipeline.

CRITICAL REQUIREMENTS (v4.1):
1. Use SUBAGENTS for each task - spawn a subagent, let it complete, context gets freed
2. UPDATE state.json after EVERY task completion
3. POLL every 30 seconds - never stop until told
4. Send HEARTBEAT every 60 seconds even when idle

Your queue is in: .devfactory/beast/state.json → queue.${session.profile}
Your status goes in: .devfactory/beast/state.json → pipeline.${session.profile}

START YOUR POLLING LOOP NOW. DO NOT STOP.`;

  // Add profile-specific notes
  const profileNotes: Record<string, string> = {
    database: `
SPECIAL: You are FIRST in the pipeline. Your work unblocks everyone else.
Focus on: migrations, schemas, RLS policies, indexes.`,
    
    backend: `
SPECIAL: Pull latest code before each task (need DB migrations).
Focus on: API routes, server actions, services.`,
    
    frontend: `
SPECIAL: Start dev server on first task: npm run dev &
Focus on: components, pages, forms, layouts.`,
    
    testing: `
SPECIAL: Actually RUN the tests, don't just write them.
Report test pass/fail counts in state.json.`,
  };

  return basePrompt + (profileNotes[session.profile] || '');
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
