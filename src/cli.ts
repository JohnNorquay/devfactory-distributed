#!/usr/bin/env node

/**
 * DevFactory v4.5 CLI
 * 
 * Beast Mode with Active Orchestration
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import StateManager, { SpecState, TaskState } from './state-manager';
import ActiveOrchestrator from './orchestrator';

const execAsync = promisify(exec);

const program = new Command();

program
  .name('devfactory')
  .description('DevFactory v4.5 - Beast Mode with Active Orchestration')
  .version('4.5.0');

// ═══════════════════════════════════════════════════════════════
// INIT Command
// ═══════════════════════════════════════════════════════════════
program
  .command('init')
  .description('Initialize DevFactory in current project')
  .option('-n, --name <name>', 'Project name')
  .action(async (options) => {
    console.log(chalk.yellow('🦁 DevFactory v4.5 - Initializing...'));
    
    const projectRoot = process.cwd();
    const devfactoryDir = path.join(projectRoot, '.devfactory');
    const beastDir = path.join(devfactoryDir, 'beast');
    
    // Create directories
    fs.mkdirSync(path.join(devfactoryDir, 'specs'), { recursive: true });
    fs.mkdirSync(path.join(devfactoryDir, 'product'), { recursive: true });
    fs.mkdirSync(beastDir, { recursive: true });
    
    // Create config
    const config = {
      version: '4.5.0',
      project: options.name || path.basename(projectRoot),
      created: new Date().toISOString(),
      orchestrator: {
        pollInterval: 30000,
        workerTimeout: 600000,
        maxRetries: 3
      },
      workers: {
        database: { session: 'df-database', enabled: true },
        backend: { session: 'df-backend', enabled: true },
        frontend: { session: 'df-frontend', enabled: true },
        testing: { session: 'df-testing', enabled: true }
      }
    };
    
    fs.writeFileSync(
      path.join(devfactoryDir, 'config.yml'),
      yaml.stringify(config)
    );
    
    console.log(chalk.green('✅ DevFactory v4.5 initialized!'));
    console.log('');
    console.log('Next steps:');
    console.log('  1. Create specs in .devfactory/specs/');
    console.log('  2. Run: devfactory release-the-beast');
    console.log('');
  });

// ═══════════════════════════════════════════════════════════════
// STATUS Command
// ═══════════════════════════════════════════════════════════════
program
  .command('status')
  .description('Show current beast mode status')
  .action(async () => {
    const projectRoot = process.cwd();
    const stateManager = new StateManager(projectRoot);
    const state = await stateManager.readState();
    
    if (!state) {
      console.log(chalk.yellow('No active beast mode session'));
      return;
    }
    
    console.log('');
    console.log(chalk.yellow('🦁 DevFactory v4.5 Status'));
    console.log('═'.repeat(50));
    console.log('');
    
    // Progress bar
    const completed = state.stats.completedTasks;
    const total = state.stats.totalTasks;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const bar = chalk.green('█'.repeat(Math.floor(percent / 5))) + 
                chalk.gray('░'.repeat(20 - Math.floor(percent / 5)));
    
    console.log(`Progress: [${bar}] ${percent}% (${completed}/${total})`);
    console.log('');
    
    // Workers
    console.log('Workers:');
    for (const [id, worker] of Object.entries(state.workers)) {
      const icon = worker.status === 'working' ? '🔨' :
                   worker.status === 'verifying' ? '🔍' :
                   worker.status === 'idle' ? '😴' :
                   worker.status === 'stuck' ? '🚨' : '💀';
      const task = worker.currentTask ? 
        chalk.dim(` → ${state.tasks[worker.currentTask]?.title || 'unknown'}`) : '';
      console.log(`  ${icon} ${id}: ${worker.status}${task}`);
    }
    console.log('');
    
    // Queues
    console.log('Queues:');
    console.log(`  Database: ${state.queues.database.length} pending`);
    console.log(`  Backend:  ${state.queues.backend.length} pending`);
    console.log(`  Frontend: ${state.queues.frontend.length} pending`);
    console.log(`  Testing:  ${state.queues.testing.length} pending`);
    console.log('');
    
    // Stats
    console.log('Stats:');
    console.log(`  Completed: ${state.stats.completedTasks}`);
    console.log(`  Failed:    ${state.stats.failedTasks}`);
    console.log(`  Stuck:     ${state.stats.stuckTasks}`);
    console.log(`  Specs:     ${state.stats.completedSpecs}/${state.stats.totalSpecs}`);
    console.log('');
    
    // Orchestrator
    console.log('Orchestrator:');
    console.log(`  Status: ${state.orchestrator.status}`);
    console.log(`  Polls:  ${state.orchestrator.totalPolls}`);
    console.log(`  Last:   ${state.orchestrator.lastPoll}`);
    console.log('');
  });

// ═══════════════════════════════════════════════════════════════
// RELEASE-THE-BEAST Command
// ═══════════════════════════════════════════════════════════════
program
  .command('release-the-beast')
  .description('Start beast mode with active orchestration')
  .option('-v, --verbose', 'Verbose output')
  .option('--dry-run', 'Show what would happen without starting')
  .action(async (options) => {
    console.log('');
    console.log(chalk.yellow('🦁🦁🦁 RELEASING THE BEAST v4.5 🦁🦁🦁'));
    console.log('');
    console.log(chalk.cyan('Active Orchestration Mode - NO GOLFING! 🏌️❌'));
    console.log('');
    
    const projectRoot = process.cwd();
    const specsDir = path.join(projectRoot, '.devfactory', 'specs');
    
    // Check for specs
    if (!fs.existsSync(specsDir)) {
      console.log(chalk.red('❌ No specs found. Create specs first with /create-spec'));
      return;
    }
    
    // Parse specs and tasks
    const { specs, tasks } = await parseSpecsAndTasks(specsDir);
    
    if (specs.length === 0) {
      console.log(chalk.red('❌ No specs found in .devfactory/specs/'));
      return;
    }
    
    console.log(`Found ${specs.length} specs with ${tasks.length} tasks`);
    console.log('');
    
    // Show plan
    console.log('Execution Plan:');
    for (const spec of specs) {
      console.log(`  📋 ${spec.name}`);
      const specTasks = tasks.filter(t => t.specId === spec.id);
      const byLayer = {
        database: specTasks.filter(t => t.layer === 'database').length,
        backend: specTasks.filter(t => t.layer === 'backend').length,
        frontend: specTasks.filter(t => t.layer === 'frontend').length,
        testing: specTasks.filter(t => t.layer === 'testing').length
      };
      console.log(`     DB: ${byLayer.database} | API: ${byLayer.backend} | UI: ${byLayer.frontend} | Test: ${byLayer.testing}`);
    }
    console.log('');
    
    if (options.dryRun) {
      console.log(chalk.yellow('DRY RUN - Not starting'));
      return;
    }
    
    // Initialize state
    const stateManager = new StateManager(projectRoot);
    await stateManager.initializeState(path.basename(projectRoot), specs, tasks);
    console.log(chalk.green('✅ State initialized'));
    
    // Create tmux sessions for workers
    console.log('');
    console.log('Starting worker sessions...');
    
    const sessions = ['df-orchestrator', 'df-database', 'df-backend', 'df-frontend', 'df-testing'];
    
    for (const session of sessions) {
      try {
        // Kill existing session if any
        await execAsync(`tmux kill-session -t ${session} 2>/dev/null || true`);
        // Create new session
        await execAsync(`tmux new-session -d -s ${session}`);
        console.log(`  ✅ ${session}`);
      } catch (error) {
        console.log(`  ⚠️  ${session} - ${error}`);
      }
    }
    
    console.log('');
    console.log('Bootstrapping workers...');
    
    // Bootstrap each worker
    const bootstrapDir = path.join(__dirname, '..', 'bootstraps');
    const workerBootstraps: Record<string, string> = {
      'df-database': 'database-worker.md',
      'df-backend': 'backend-worker.md',
      'df-frontend': 'frontend-worker.md',
      'df-testing': 'testing-worker.md'
    };
    
    for (const [session, bootstrapFile] of Object.entries(workerBootstraps)) {
      try {
        // Start Claude in the session
        await execAsync(`tmux send-keys -t ${session} "claude" Enter`);
        await new Promise(r => setTimeout(r, 2000));
        
        // Send bootstrap
        const bootstrapPath = path.join(bootstrapDir, bootstrapFile);
        if (fs.existsSync(bootstrapPath)) {
          const bootstrap = fs.readFileSync(bootstrapPath, 'utf-8')
            .replace(/\{\{PROJECT_ROOT\}\}/g, projectRoot);
          
          // Send first part of bootstrap
          const firstPart = bootstrap.substring(0, 1000);
          await execAsync(`tmux send-keys -t ${session} "${firstPart.replace(/"/g, '\\"').replace(/\n/g, ' ')}" Enter`);
        }
        
        console.log(`  ✅ ${session} bootstrapped`);
      } catch (error) {
        console.log(`  ⚠️  ${session} - ${error}`);
      }
    }
    
    console.log('');
    console.log(chalk.green('🦁 BEAST MODE ACTIVE!'));
    console.log('');
    console.log('Starting orchestrator...');
    
    // Start the orchestrator
    const orchestrator = new ActiveOrchestrator({
      projectRoot,
      pollInterval: 30000,
      workerTimeout: 600000,
      maxRetries: 3,
      verbose: options.verbose || false
    });
    
    await orchestrator.start();
  });

// ═══════════════════════════════════════════════════════════════
// WATCH Command - Real-time monitoring
// ═══════════════════════════════════════════════════════════════
program
  .command('watch')
  .description('Watch beast mode progress in real-time')
  .action(async () => {
    const projectRoot = process.cwd();
    const statePath = path.join(projectRoot, '.devfactory', 'beast', 'state.json');
    
    console.log(chalk.yellow('🦁 DevFactory v4.5 - Live Monitor'));
    console.log('Press Ctrl+C to exit');
    console.log('');
    
    const refresh = async () => {
      if (!fs.existsSync(statePath)) {
        console.log('Waiting for beast mode to start...');
        return;
      }
      
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      
      // Clear screen
      console.clear();
      console.log(chalk.yellow('🦁 DevFactory v4.5 - Live Monitor'));
      console.log('═'.repeat(60));
      console.log('');
      
      // Progress
      const completed = state.stats.completedTasks;
      const total = state.stats.totalTasks;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const bar = chalk.green('█'.repeat(Math.floor(percent / 2))) + 
                  chalk.gray('░'.repeat(50 - Math.floor(percent / 2)));
      
      console.log(`[${bar}] ${percent}%`);
      console.log(`${completed}/${total} tasks complete`);
      console.log('');
      
      // Workers
      console.log('Workers:');
      for (const [id, worker] of Object.entries(state.workers) as [string, any][]) {
        const icon = worker.status === 'working' ? '🔨' :
                     worker.status === 'verifying' ? '🔍' :
                     worker.status === 'idle' ? '😴' :
                     worker.status === 'stuck' ? '🚨' : '💀';
        const task = worker.currentTask ? 
          state.tasks[worker.currentTask]?.title?.substring(0, 40) || 'unknown' : '-';
        console.log(`  ${icon} ${id.padEnd(15)} ${worker.status.padEnd(10)} ${task}`);
      }
      console.log('');
      
      // Recent activity
      console.log('Recent Activity:');
      const recent = (state.activity || []).slice(-5);
      for (const entry of recent) {
        const time = entry.timestamp.substring(11, 19);
        console.log(`  [${time}] ${entry.message.substring(0, 60)}`);
      }
      console.log('');
      console.log(chalk.dim(`Last updated: ${state.lastUpdated}`));
    };
    
    // Initial refresh
    await refresh();
    
    // Watch for changes
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(statePath, { persistent: true });
    watcher.on('change', refresh);
  });

// ═══════════════════════════════════════════════════════════════
// STUCK Command - Show stuck tasks
// ═══════════════════════════════════════════════════════════════
program
  .command('stuck')
  .description('Show stuck tasks and reasons')
  .action(async () => {
    const projectRoot = process.cwd();
    const stateManager = new StateManager(projectRoot);
    const state = await stateManager.readState();
    
    if (!state) {
      console.log('No active beast mode session');
      return;
    }
    
    const stuck = Object.values(state.tasks).filter(t => t.status === 'stuck');
    
    if (stuck.length === 0) {
      console.log(chalk.green('✅ No stuck tasks!'));
      return;
    }
    
    console.log(chalk.red(`🚨 ${stuck.length} stuck tasks:`));
    console.log('');
    
    for (const task of stuck) {
      console.log(`Task: ${task.title}`);
      console.log(`Spec: ${task.specId}`);
      console.log(`Layer: ${task.layer}`);
      console.log(`Reason: ${task.stuckReason}`);
      console.log(`Retries: ${task.retryCount}`);
      console.log('');
    }
  });

// ═══════════════════════════════════════════════════════════════
// PAUSE/RESUME Commands
// ═══════════════════════════════════════════════════════════════
program
  .command('pause')
  .description('Pause the orchestrator')
  .action(async () => {
    const projectRoot = process.cwd();
    const stateManager = new StateManager(projectRoot);
    
    await stateManager.updateState(state => {
      state.orchestrator.status = 'paused';
      state.status = 'paused';
      return state;
    });
    
    console.log(chalk.yellow('⏸️  Orchestrator paused'));
  });

program
  .command('resume')
  .description('Resume the orchestrator')
  .action(async () => {
    const projectRoot = process.cwd();
    const stateManager = new StateManager(projectRoot);
    
    await stateManager.updateState(state => {
      state.orchestrator.status = 'active';
      state.status = 'running';
      return state;
    });
    
    console.log(chalk.green('▶️  Orchestrator resumed'));
  });

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

async function parseSpecsAndTasks(specsDir: string): Promise<{ specs: SpecState[], tasks: TaskState[] }> {
  const specs: SpecState[] = [];
  const tasks: TaskState[] = [];
  
  const specDirs = fs.readdirSync(specsDir).filter(d => 
    fs.statSync(path.join(specsDir, d)).isDirectory()
  );
  
  for (const specDir of specDirs) {
    const specPath = path.join(specsDir, specDir);
    const tasksPath = path.join(specPath, 'tasks.md');
    const srdPath = path.join(specPath, 'srd.md');
    
    // Get spec name from SRD or directory name
    let specName = specDir;
    if (fs.existsSync(srdPath)) {
      const srdContent = fs.readFileSync(srdPath, 'utf-8');
      const titleMatch = srdContent.match(/^#\s+(.+)/m);
      if (titleMatch) specName = titleMatch[1];
    }
    
    const spec: SpecState = {
      id: specDir,
      name: specName,
      path: specPath,
      layers: { database: false, backend: false, frontend: false, testing: false },
      status: 'pending',
      progress: {
        database: { total: 0, complete: 0 },
        backend: { total: 0, complete: 0 },
        frontend: { total: 0, complete: 0 },
        testing: { total: 0, complete: 0 }
      }
    };
    
    // Parse tasks from tasks.md
    if (fs.existsSync(tasksPath)) {
      const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
      const taskLines = tasksContent.match(/^- \[ \] .+/gm) || [];
      
      let currentLayer: 'database' | 'backend' | 'frontend' | 'testing' = 'database';
      let taskIndex = 0;
      
      for (const line of taskLines) {
        // Detect layer from task content or section headers
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('migration') || lowerLine.includes('schema') || lowerLine.includes('database') || lowerLine.includes('table')) {
          currentLayer = 'database';
        } else if (lowerLine.includes('api') || lowerLine.includes('endpoint') || lowerLine.includes('route') || lowerLine.includes('service')) {
          currentLayer = 'backend';
        } else if (lowerLine.includes('component') || lowerLine.includes('page') || lowerLine.includes('form') || lowerLine.includes('ui')) {
          currentLayer = 'frontend';
        } else if (lowerLine.includes('test') || lowerLine.includes('spec')) {
          currentLayer = 'testing';
        }
        
        const taskTitle = line.replace(/^- \[ \] /, '').trim();
        const taskId = `${specDir}-${taskIndex++}`;
        
        const task: TaskState = {
          id: taskId,
          specId: specDir,
          title: taskTitle,
          layer: currentLayer,
          status: 'pending',
          retryCount: 0,
          dependsOn: []
        };
        
        // Mark spec as having this layer
        spec.layers[currentLayer] = true;
        spec.progress[currentLayer].total++;
        
        tasks.push(task);
      }
    }
    
    specs.push(spec);
  }
  
  return { specs, tasks };
}

program.parse();
