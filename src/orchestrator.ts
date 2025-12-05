/**
 * DevFactory v4.5 - Active Orchestrator
 * 
 * THE KEY DIFFERENCE: This orchestrator stays engaged!
 * - Polls every 30 seconds
 * - Actively assigns tasks to idle workers
 * - Monitors worker health
 * - Detects stuck workers
 * - Manages the Build → Verify → Complete cycle
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import StateManager, { BeastState, TaskState, WorkerState } from './state-manager';

const execAsync = promisify(exec);

export interface OrchestratorConfig {
  projectRoot: string;
  pollInterval: number;  // milliseconds
  workerTimeout: number; // milliseconds before considering worker stuck
  maxRetries: number;
  verbose: boolean;
}

export class ActiveOrchestrator {
  private stateManager: StateManager;
  private config: OrchestratorConfig;
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.stateManager = new StateManager(config.projectRoot);
  }

  /**
   * Start the orchestrator loop
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.log('🦁 BEAST MODE v4.5 - Active Orchestrator Starting!');
    this.log(`📍 Project: ${this.config.projectRoot}`);
    this.log(`⏱️  Poll interval: ${this.config.pollInterval / 1000}s`);
    this.log('');
    this.log('🚫 NO GOLFING - Orchestrator stays on the job!');
    this.log('');

    // Initial poll
    await this.poll();

    // Start the polling loop
    this.pollTimer = setInterval(() => this.poll(), this.config.pollInterval);
  }

  /**
   * Stop the orchestrator
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.log('🛑 Orchestrator stopped');
  }

  /**
   * Main polling loop - THE HEART OF v4.5
   */
  async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.stateManager.recordPoll();
      const state = await this.stateManager.readState();
      
      if (!state) {
        this.log('⚠️  No state found - waiting for initialization');
        return;
      }

      // Check if complete
      if (await this.stateManager.isComplete()) {
        this.log('🎉 ALL TASKS COMPLETE!');
        await this.handleCompletion(state);
        this.stop();
        return;
      }

      // Log current status
      this.logStatus(state);

      // ACTIVE MANAGEMENT STEPS:
      
      // 1. Check for idle workers and assign tasks
      await this.assignTasksToIdleWorkers(state);
      
      // 2. Check for stuck workers
      await this.checkForStuckWorkers(state);
      
      // 3. Update queues (unlock dependent tasks)
      await this.updateQueues(state);
      
      // 4. Check worker health
      await this.checkWorkerHealth(state);

    } catch (error) {
      this.log(`❌ Poll error: ${error}`);
    }
  }

  /**
   * Assign tasks to idle workers - NO WORKER SITS IDLE!
   */
  private async assignTasksToIdleWorkers(state: BeastState): Promise<void> {
    for (const [workerId, worker] of Object.entries(state.workers)) {
      if (worker.status === 'idle') {
        const queue = state.queues[worker.layer];
        
        if (queue.length > 0) {
          const taskId = queue[0];
          const task = state.tasks[taskId];
          
          if (task && this.stateManager.dependenciesMet(task, state)) {
            this.log(`📋 Assigning task "${task.title}" to ${workerId}`);
            
            // Assign the task
            await this.stateManager.assignTask(taskId, workerId);
            
            // Send assignment to worker session
            await this.sendTaskToWorker(workerId, task);
          }
        } else {
          // Check if there are pending tasks in other specs for this layer
          const pendingTask = this.findNextPendingTask(state, worker.layer);
          if (pendingTask) {
            this.log(`📋 Found pending task in another spec for ${workerId}`);
            await this.stateManager.assignTask(pendingTask.id, workerId);
            await this.sendTaskToWorker(workerId, pendingTask);
          } else {
            this.log(`😴 ${workerId} is idle - no tasks available`);
          }
        }
      }
    }
  }

  /**
   * Find next pending task for a layer across all specs
   */
  private findNextPendingTask(state: BeastState, layer: WorkerState['layer']): TaskState | null {
    for (const task of Object.values(state.tasks)) {
      if (task.layer === layer && 
          task.status === 'pending' && 
          this.stateManager.dependenciesMet(task, state)) {
        return task;
      }
    }
    return null;
  }

  /**
   * Send task assignment to worker via tmux
   */
  private async sendTaskToWorker(workerId: string, task: TaskState): Promise<void> {
    const specPath = path.join(this.config.projectRoot, '.devfactory', 'specs');
    
    const message = `
═══════════════════════════════════════════════════════════════
📋 NEW TASK ASSIGNMENT FROM ORCHESTRATOR
═══════════════════════════════════════════════════════════════

Task ID: ${task.id}
Title: ${task.title}
Spec: ${task.specId}
Layer: ${task.layer}

INSTRUCTIONS:
1. SPAWN a subagent to implement this task
2. VERIFY the work compiles and meets spec
3. REPORT completion by updating state.json

Spec path: ${specPath}/${task.specId}

DO NOT implement inline - SPAWN A SUBAGENT!

Begin now.
═══════════════════════════════════════════════════════════════
`;

    try {
      // Send to tmux session
      await execAsync(`tmux send-keys -t ${workerId} "${message.replace(/"/g, '\\"')}" Enter`);
      this.log(`✉️  Sent task to ${workerId}`);
    } catch (error) {
      this.log(`⚠️  Failed to send task to ${workerId}: ${error}`);
    }
  }

  /**
   * Check for workers that have been working too long
   */
  private async checkForStuckWorkers(state: BeastState): Promise<void> {
    const now = Date.now();
    
    for (const [workerId, worker] of Object.entries(state.workers)) {
      if (worker.status === 'working' || worker.status === 'verifying') {
        const lastActivity = new Date(worker.lastActivity).getTime();
        const elapsed = now - lastActivity;
        
        if (elapsed > this.config.workerTimeout) {
          this.log(`⚠️  ${workerId} appears stuck (${Math.round(elapsed / 60000)}min since last activity)`);
          
          // Check if task is actually stuck
          if (worker.currentTask) {
            const task = state.tasks[worker.currentTask];
            if (task) {
              await this.nudgeWorker(workerId, task);
            }
          }
        }
      }
    }
  }

  /**
   * Nudge a stuck worker
   */
  private async nudgeWorker(workerId: string, task: TaskState): Promise<void> {
    const message = `
⚠️  ORCHESTRATOR CHECK-IN ⚠️

You've been working on "${task.title}" for a while.

Status check:
- Are you stuck? Update state.json with status: "stuck" and reason
- Making progress? Continue, but update state.json soon
- Done? Run verification and mark complete

The orchestrator is actively monitoring. Report your status!
`;

    try {
      await execAsync(`tmux send-keys -t ${workerId} "${message.replace(/"/g, '\\"')}" Enter`);
      this.log(`📢 Nudged ${workerId}`);
    } catch (error) {
      this.log(`⚠️  Failed to nudge ${workerId}`);
    }
  }

  /**
   * Update queues with newly unlocked tasks
   */
  private async updateQueues(state: BeastState): Promise<void> {
    await this.stateManager.updateState(currentState => {
      // Find tasks that are pending but not in queues and have dependencies met
      for (const task of Object.values(currentState.tasks)) {
        if (task.status === 'pending' && 
            !currentState.queues[task.layer].includes(task.id) &&
            this.stateManager.dependenciesMet(task, currentState)) {
          currentState.queues[task.layer].push(task.id);
          this.log(`🔓 Unlocked task: ${task.title}`);
        }
      }
      return currentState;
    });
  }

  /**
   * Check if worker sessions are alive
   */
  private async checkWorkerHealth(state: BeastState): Promise<void> {
    for (const workerId of Object.keys(state.workers)) {
      try {
        await execAsync(`tmux has-session -t ${workerId} 2>/dev/null`);
      } catch {
        this.log(`💀 Worker session ${workerId} is dead!`);
        await this.stateManager.updateState(s => {
          s.workers[workerId].status = 'offline';
          return s;
        });
        
        // Attempt to restart
        await this.restartWorker(workerId, state.workers[workerId]);
      }
    }
  }

  /**
   * Restart a dead worker
   */
  private async restartWorker(workerId: string, worker: WorkerState): Promise<void> {
    this.log(`🔄 Attempting to restart ${workerId}...`);
    
    try {
      // Create new tmux session
      await execAsync(`tmux new-session -d -s ${workerId}`);
      
      // Bootstrap it
      const bootstrapPath = path.join(__dirname, '..', 'bootstraps', `${worker.layer}-worker.md`);
      if (fs.existsSync(bootstrapPath)) {
        const bootstrap = fs.readFileSync(bootstrapPath, 'utf-8');
        await execAsync(`tmux send-keys -t ${workerId} "claude" Enter`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await execAsync(`tmux send-keys -t ${workerId} "${bootstrap.substring(0, 500).replace(/"/g, '\\"')}" Enter`);
      }
      
      await this.stateManager.updateState(s => {
        s.workers[workerId].status = 'idle';
        return s;
      });
      
      this.log(`✅ ${workerId} restarted`);
    } catch (error) {
      this.log(`❌ Failed to restart ${workerId}: ${error}`);
    }
  }

  /**
   * Handle completion of all tasks
   */
  private async handleCompletion(state: BeastState): Promise<void> {
    const stuck = Object.values(state.tasks).filter(t => t.status === 'stuck');
    
    if (stuck.length > 0) {
      this.log('');
      this.log('⚠️  COMPLETED WITH STUCK TASKS:');
      for (const task of stuck) {
        this.log(`   - ${task.title}: ${task.stuckReason}`);
      }
    } else {
      this.log('');
      this.log('🎉🎉🎉 ALL TASKS COMPLETED SUCCESSFULLY! 🎉🎉🎉');
    }
    
    this.log('');
    this.log('📊 Final Stats:');
    this.log(`   Total tasks: ${state.stats.totalTasks}`);
    this.log(`   Completed: ${state.stats.completedTasks}`);
    this.log(`   Failed (retried): ${state.stats.failedTasks}`);
    this.log(`   Stuck: ${state.stats.stuckTasks}`);
    this.log(`   Specs completed: ${state.stats.completedSpecs}/${state.stats.totalSpecs}`);
  }

  /**
   * Log current status
   */
  private logStatus(state: BeastState): void {
    if (!this.config.verbose) return;
    
    const completed = state.stats.completedTasks;
    const total = state.stats.totalTasks;
    const percent = Math.round((completed / total) * 100);
    
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    
    console.log('');
    console.log(`📊 Progress: [${bar}] ${percent}% (${completed}/${total})`);
    console.log('');
    
    for (const [workerId, worker] of Object.entries(state.workers)) {
      const status = worker.status === 'working' ? '🔨' : 
                     worker.status === 'verifying' ? '🔍' :
                     worker.status === 'idle' ? '😴' :
                     worker.status === 'stuck' ? '🚨' : '💀';
      const task = worker.currentTask ? ` → ${state.tasks[worker.currentTask]?.title || 'unknown'}` : '';
      console.log(`   ${status} ${workerId}: ${worker.status}${task}`);
    }
    
    console.log('');
    console.log(`   Queues: DB(${state.queues.database.length}) API(${state.queues.backend.length}) UI(${state.queues.frontend.length}) TEST(${state.queues.testing.length})`);
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`[${timestamp}] ${message}`);
  }
}

export default ActiveOrchestrator;
