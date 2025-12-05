/**
 * DevFactory v4.5 - State Manager
 * 
 * Handles all state.json operations with proper file locking
 * to prevent race conditions from parallel workers.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as lockfile from 'proper-lockfile';

export interface TaskState {
  id: string;
  specId: string;
  title: string;
  layer: 'database' | 'backend' | 'frontend' | 'testing';
  status: 'pending' | 'assigned' | 'in_progress' | 'verifying' | 'complete' | 'failed' | 'stuck';
  assignedTo?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  verificationResult?: 'passed' | 'failed';
  failureReason?: string;
  stuckReason?: string;
  retryCount: number;
  filesChanged?: string[];
  dependsOn: string[];
  parallelBatch?: number;
}

export interface WorkerState {
  id: string;
  session: string;
  layer: 'database' | 'backend' | 'frontend' | 'testing';
  status: 'idle' | 'working' | 'verifying' | 'stuck' | 'offline';
  currentTask?: string;
  currentSpec?: string;
  lastActivity: string;
  tasksCompleted: number;
  tasksFailed: number;
}

export interface SpecState {
  id: string;
  name: string;
  path: string;
  layers: {
    database: boolean;
    backend: boolean;
    frontend: boolean;
    testing: boolean;
  };
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  progress: {
    database: { total: number; complete: number };
    backend: { total: number; complete: number };
    frontend: { total: number; complete: number };
    testing: { total: number; complete: number };
  };
}

export interface BeastState {
  version: string;
  project: string;
  startedAt: string;
  lastUpdated: string;
  status: 'initializing' | 'running' | 'paused' | 'complete' | 'failed';
  
  orchestrator: {
    status: 'active' | 'paused' | 'stopped';
    lastPoll: string;
    pollInterval: number;
    totalPolls: number;
  };
  
  workers: Record<string, WorkerState>;
  specs: Record<string, SpecState>;
  tasks: Record<string, TaskState>;
  
  queues: {
    database: string[];
    backend: string[];
    frontend: string[];
    testing: string[];
  };
  
  activity: ActivityEntry[];
  
  stats: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    stuckTasks: number;
    totalSpecs: number;
    completedSpecs: number;
  };
}

export interface ActivityEntry {
  timestamp: string;
  type: 'task_assigned' | 'task_started' | 'task_completed' | 'task_failed' | 'task_stuck' | 
        'worker_idle' | 'worker_started' | 'spec_completed' | 'orchestrator_poll' | 'system';
  worker?: string;
  task?: string;
  spec?: string;
  message: string;
}

export class StateManager {
  private statePath: string;
  private lockPath: string;
  private maxActivityEntries = 100;

  constructor(projectRoot: string) {
    this.statePath = path.join(projectRoot, '.devfactory', 'beast', 'state.json');
    this.lockPath = this.statePath + '.lock';
  }

  /**
   * Initialize a fresh state for a new beast mode run
   */
  async initializeState(project: string, specs: SpecState[], tasks: TaskState[]): Promise<BeastState> {
    const state: BeastState = {
      version: '4.5.0',
      project,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: 'initializing',
      
      orchestrator: {
        status: 'active',
        lastPoll: new Date().toISOString(),
        pollInterval: 30000, // 30 seconds
        totalPolls: 0
      },
      
      workers: {
        'df-database': this.createWorkerState('df-database', 'database'),
        'df-backend': this.createWorkerState('df-backend', 'backend'),
        'df-frontend': this.createWorkerState('df-frontend', 'frontend'),
        'df-testing': this.createWorkerState('df-testing', 'testing')
      },
      
      specs: {},
      tasks: {},
      
      queues: {
        database: [],
        backend: [],
        frontend: [],
        testing: []
      },
      
      activity: [],
      
      stats: {
        totalTasks: tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        stuckTasks: 0,
        totalSpecs: specs.length,
        completedSpecs: 0
      }
    };

    // Populate specs
    for (const spec of specs) {
      state.specs[spec.id] = spec;
    }

    // Populate tasks and queues
    for (const task of tasks) {
      state.tasks[task.id] = task;
      
      // Add to appropriate queue if pending and dependencies met
      if (task.status === 'pending' && this.dependenciesMet(task, state)) {
        state.queues[task.layer].push(task.id);
      }
    }

    await this.writeState(state);
    return state;
  }

  private createWorkerState(session: string, layer: WorkerState['layer']): WorkerState {
    return {
      id: session,
      session,
      layer,
      status: 'idle',
      lastActivity: new Date().toISOString(),
      tasksCompleted: 0,
      tasksFailed: 0
    };
  }

  /**
   * Read state with file locking
   */
  async readState(): Promise<BeastState | null> {
    if (!fs.existsSync(this.statePath)) {
      return null;
    }

    let release: (() => Promise<void>) | null = null;
    try {
      release = await lockfile.lock(this.statePath, { 
        retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 }
      });
      const content = fs.readFileSync(this.statePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read state:', error);
      return null;
    } finally {
      if (release) await release();
    }
  }

  /**
   * Write state with file locking
   */
  async writeState(state: BeastState): Promise<void> {
    state.lastUpdated = new Date().toISOString();
    
    // Ensure directory exists
    const dir = path.dirname(this.statePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write without lock first if file doesn't exist
    if (!fs.existsSync(this.statePath)) {
      fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
      return;
    }

    let release: (() => Promise<void>) | null = null;
    try {
      release = await lockfile.lock(this.statePath, {
        retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 }
      });
      fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    } finally {
      if (release) await release();
    }
  }

  /**
   * Atomic state update with locking
   */
  async updateState(updater: (state: BeastState) => BeastState): Promise<BeastState> {
    let release: (() => Promise<void>) | null = null;
    try {
      if (fs.existsSync(this.statePath)) {
        release = await lockfile.lock(this.statePath, {
          retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 }
        });
      }
      
      const currentState = fs.existsSync(this.statePath) 
        ? JSON.parse(fs.readFileSync(this.statePath, 'utf-8'))
        : null;
      
      if (!currentState) {
        throw new Error('State not initialized');
      }

      const newState = updater(currentState);
      newState.lastUpdated = new Date().toISOString();
      
      // Trim activity log
      if (newState.activity.length > this.maxActivityEntries) {
        newState.activity = newState.activity.slice(-this.maxActivityEntries);
      }
      
      fs.writeFileSync(this.statePath, JSON.stringify(newState, null, 2));
      return newState;
    } finally {
      if (release) await release();
    }
  }

  /**
   * Add activity entry
   */
  async addActivity(entry: Omit<ActivityEntry, 'timestamp'>): Promise<void> {
    await this.updateState(state => {
      state.activity.push({
        ...entry,
        timestamp: new Date().toISOString()
      });
      return state;
    });
  }

  /**
   * Assign a task to a worker
   */
  async assignTask(taskId: string, workerId: string): Promise<TaskState | null> {
    let assignedTask: TaskState | null = null;
    
    await this.updateState(state => {
      const task = state.tasks[taskId];
      const worker = state.workers[workerId];
      
      if (!task || !worker) return state;
      if (task.status !== 'pending') return state;
      
      // Update task
      task.status = 'assigned';
      task.assignedTo = workerId;
      task.assignedAt = new Date().toISOString();
      
      // Update worker
      worker.status = 'working';
      worker.currentTask = taskId;
      worker.currentSpec = task.specId;
      worker.lastActivity = new Date().toISOString();
      
      // Remove from queue
      const queueIndex = state.queues[task.layer].indexOf(taskId);
      if (queueIndex > -1) {
        state.queues[task.layer].splice(queueIndex, 1);
      }
      
      // Add activity
      state.activity.push({
        timestamp: new Date().toISOString(),
        type: 'task_assigned',
        worker: workerId,
        task: taskId,
        spec: task.specId,
        message: `Task "${task.title}" assigned to ${workerId}`
      });
      
      assignedTask = task;
      return state;
    });
    
    return assignedTask;
  }

  /**
   * Mark task as in progress
   */
  async startTask(taskId: string): Promise<void> {
    await this.updateState(state => {
      const task = state.tasks[taskId];
      if (!task) return state;
      
      task.status = 'in_progress';
      task.startedAt = new Date().toISOString();
      
      state.activity.push({
        timestamp: new Date().toISOString(),
        type: 'task_started',
        task: taskId,
        spec: task.specId,
        worker: task.assignedTo,
        message: `Task "${task.title}" started`
      });
      
      return state;
    });
  }

  /**
   * Mark task as verifying
   */
  async verifyingTask(taskId: string): Promise<void> {
    await this.updateState(state => {
      const task = state.tasks[taskId];
      if (!task) return state;
      
      task.status = 'verifying';
      
      const worker = task.assignedTo ? state.workers[task.assignedTo] : null;
      if (worker) {
        worker.status = 'verifying';
        worker.lastActivity = new Date().toISOString();
      }
      
      return state;
    });
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, filesChanged: string[]): Promise<void> {
    await this.updateState(state => {
      const task = state.tasks[taskId];
      if (!task) return state;
      
      task.status = 'complete';
      task.completedAt = new Date().toISOString();
      task.verificationResult = 'passed';
      task.filesChanged = filesChanged;
      
      // Update worker
      const worker = task.assignedTo ? state.workers[task.assignedTo] : null;
      if (worker) {
        worker.status = 'idle';
        worker.currentTask = undefined;
        worker.lastActivity = new Date().toISOString();
        worker.tasksCompleted++;
      }
      
      // Update stats
      state.stats.completedTasks++;
      
      // Update spec progress
      const spec = state.specs[task.specId];
      if (spec) {
        spec.progress[task.layer].complete++;
        
        // Check if spec is complete
        const allLayersComplete = Object.entries(spec.progress).every(
          ([, progress]) => progress.complete >= progress.total
        );
        if (allLayersComplete) {
          spec.status = 'complete';
          state.stats.completedSpecs++;
          
          state.activity.push({
            timestamp: new Date().toISOString(),
            type: 'spec_completed',
            spec: task.specId,
            message: `Spec "${spec.name}" completed!`
          });
        }
      }
      
      // Unlock dependent tasks
      this.unlockDependentTasks(taskId, state);
      
      state.activity.push({
        timestamp: new Date().toISOString(),
        type: 'task_completed',
        task: taskId,
        spec: task.specId,
        worker: task.assignedTo,
        message: `Task "${task.title}" completed (${filesChanged.length} files changed)`
      });
      
      return state;
    });
  }

  /**
   * Fail a task
   */
  async failTask(taskId: string, reason: string): Promise<void> {
    await this.updateState(state => {
      const task = state.tasks[taskId];
      if (!task) return state;
      
      task.retryCount++;
      
      if (task.retryCount >= 3) {
        task.status = 'stuck';
        task.stuckReason = reason;
        state.stats.stuckTasks++;
        
        state.activity.push({
          timestamp: new Date().toISOString(),
          type: 'task_stuck',
          task: taskId,
          spec: task.specId,
          worker: task.assignedTo,
          message: `Task "${task.title}" is STUCK after 3 retries: ${reason}`
        });
      } else {
        task.status = 'pending';
        task.failureReason = reason;
        task.assignedTo = undefined;
        state.stats.failedTasks++;
        
        // Re-add to queue for retry
        state.queues[task.layer].push(taskId);
        
        state.activity.push({
          timestamp: new Date().toISOString(),
          type: 'task_failed',
          task: taskId,
          spec: task.specId,
          worker: task.assignedTo,
          message: `Task "${task.title}" failed (retry ${task.retryCount}/3): ${reason}`
        });
      }
      
      // Update worker
      const worker = task.assignedTo ? state.workers[task.assignedTo] : null;
      if (worker) {
        worker.status = 'idle';
        worker.currentTask = undefined;
        worker.lastActivity = new Date().toISOString();
        worker.tasksFailed++;
      }
      
      return state;
    });
  }

  /**
   * Check if a task's dependencies are met
   */
  dependenciesMet(task: TaskState, state: BeastState): boolean {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return true;
    }
    
    return task.dependsOn.every(depId => {
      const depTask = state.tasks[depId];
      return depTask && depTask.status === 'complete';
    });
  }

  /**
   * Unlock tasks that depend on the completed task
   */
  private unlockDependentTasks(completedTaskId: string, state: BeastState): void {
    for (const task of Object.values(state.tasks)) {
      if (task.status === 'pending' && 
          task.dependsOn.includes(completedTaskId) &&
          this.dependenciesMet(task, state) &&
          !state.queues[task.layer].includes(task.id)) {
        state.queues[task.layer].push(task.id);
      }
    }
  }

  /**
   * Get next task for a worker
   */
  async getNextTaskForWorker(workerId: string): Promise<string | null> {
    const state = await this.readState();
    if (!state) return null;
    
    const worker = state.workers[workerId];
    if (!worker) return null;
    
    const queue = state.queues[worker.layer];
    return queue.length > 0 ? queue[0] : null;
  }

  /**
   * Record orchestrator poll
   */
  async recordPoll(): Promise<void> {
    await this.updateState(state => {
      state.orchestrator.lastPoll = new Date().toISOString();
      state.orchestrator.totalPolls++;
      return state;
    });
  }

  /**
   * Check if all work is complete
   */
  async isComplete(): Promise<boolean> {
    const state = await this.readState();
    if (!state) return false;
    return state.stats.completedTasks + state.stats.stuckTasks >= state.stats.totalTasks;
  }
}

export default StateManager;
