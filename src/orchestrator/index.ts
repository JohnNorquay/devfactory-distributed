/**
 * LOCAL ORCHESTRATOR
 * 
 * The 5th tmux session - the brain of DevFactory Distributed.
 * 
 * Instead of GitHub Actions, this runs locally and:
 * - Watches filesystem for completed tasks
 * - Reviews code via Anthropic API
 * - Merges branches locally (no PRs!)
 * - Handles stuck tasks with Claude Strategist
 * - Auto-backs up to GitHub after each spec passes
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { reviewTask, ReviewResult } from './reviewer';
import { callStrategist, StrategistDecision } from './strategist';

interface OrchestratorConfig {
  projectPath: string;
  checkIntervalMs: number;
  anthropicApiKey: string;
  autoBackup: boolean;
  verbose: boolean;
}

interface TaskInfo {
  id: string;
  name: string;
  spec_id: string;
  branch: string;
  status: string;
  session: string;
  stage: string;
  files_touched: string[];
}

const PIPELINE_ORDER = ['database', 'backend', 'frontend', 'testing'];

export class LocalOrchestrator {
  private config: OrchestratorConfig;
  private devfactoryDir: string;
  private running: boolean = false;
  private lastCheck: Date = new Date();
  
  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.devfactoryDir = path.join(config.projectPath, '.devfactory');
  }
  
  async start(): Promise<void> {
    this.running = true;
    this.log('🧠 LOCAL ORCHESTRATOR STARTED');
    this.log('━'.repeat(60));
    this.log(`📁 Project: ${this.config.projectPath}`);
    this.log(`⏱️  Check interval: ${this.config.checkIntervalMs / 1000}s`);
    this.log(`💾 Auto-backup: ${this.config.autoBackup ? 'ON' : 'OFF'}`);
    this.log('━'.repeat(60));
    this.log('');
    this.log('Watching for completed tasks...\n');
    
    while (this.running) {
      try {
        await this.checkCycle();
      } catch (error) {
        this.log(`❌ Error in check cycle: ${error}`);
      }
      
      await this.sleep(this.config.checkIntervalMs);
    }
  }
  
  stop(): void {
    this.running = false;
    this.log('🛑 Orchestrator stopping...');
  }
  
  private async checkCycle(): Promise<void> {
    const state = this.loadState();
    if (!state.is_running) {
      return;
    }
    
    // 1. Check for completed tasks needing review
    const completedTasks = await this.findCompletedTasks();
    
    for (const task of completedTasks) {
      this.log(`\n📋 Reviewing: ${task.name} (${task.stage})`);
      
      const review = await reviewTask(task, this.config.anthropicApiKey, this.config.projectPath);
      
      if (review.approved) {
        this.log(`   ✅ Approved - merging branch ${task.branch}`);
        await this.mergeTask(task);
        this.updateTaskStatus(task.id, 'merged');
        
        // Unlock downstream pipeline stages
        await this.unlockDownstreamTasks(task);
      } else {
        this.log(`   ⚠️  Issues found (attempt ${review.attemptNumber}/${review.maxAttempts})`);
        
        if (review.attemptNumber >= review.maxAttempts) {
          // Escalate to strategist
          this.log(`   🧠 Escalating to Claude Strategist...`);
          const decision = await this.escalateToStrategist(task, review);
          await this.handleStrategistDecision(task, decision);
        } else {
          // Send back to worker
          this.updateTaskStatus(task.id, 'in_progress', {
            review_issues: review.issues,
            review_attempts: review.attemptNumber,
          });
          this.log(`   📤 Sent back to ${task.session} for fixes`);
        }
      }
    }
    
    // 2. Check for spec completion
    const completedSpecs = await this.checkSpecCompletion();
    
    for (const specId of completedSpecs) {
      this.log(`\n🎉 Spec completed: ${specId}`);
      
      if (this.config.autoBackup) {
        await this.backupToGitHub(specId);
      }
    }
    
    // 3. Check for stuck tasks
    await this.checkStuckTasks();
    
    // 4. Update overall status
    this.updateOverallProgress();
    this.lastCheck = new Date();
  }
  
  private async findCompletedTasks(): Promise<TaskInfo[]> {
    const tasksDir = path.join(this.devfactoryDir, 'tasks');
    const completedTasks: TaskInfo[] = [];
    
    if (!fs.existsSync(tasksDir)) {
      return completedTasks;
    }
    
    const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const taskPath = path.join(tasksDir, file);
      const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
      
      if (task.status === 'completed') {
        completedTasks.push({
          id: task.id,
          name: task.name,
          spec_id: task.spec_id,
          branch: task.branch,
          status: task.status,
          session: task.assigned_session,
          stage: this.getStageFromSession(task.assigned_session),
          files_touched: task.files_touched || [],
        });
      }
    }
    
    return completedTasks;
  }
  
  private getStageFromSession(sessionId: string): string {
    const mapping: Record<string, string> = {
      'session-1': 'database',
      'session-2': 'backend',
      'session-3': 'frontend',
      'session-4': 'testing',
    };
    return mapping[sessionId] || 'unknown';
  }
  
  private async mergeTask(task: TaskInfo): Promise<void> {
    const cwd = this.config.projectPath;
    
    try {
      // Ensure we're on main
      execSync('git checkout main', { cwd, stdio: 'pipe' });
      
      // Merge the task branch
      execSync(`git merge ${task.branch} --no-ff -m "✅ ${task.name}"`, { cwd, stdio: 'pipe' });
      
      // Delete the branch locally
      execSync(`git branch -d ${task.branch}`, { cwd, stdio: 'pipe' });
      
      this.log(`   🔀 Merged ${task.branch} → main`);
    } catch (error) {
      this.log(`   ❌ Merge failed: ${error}`);
      throw error;
    }
  }
  
  private async unlockDownstreamTasks(completedTask: TaskInfo): Promise<void> {
    const currentStageIndex = PIPELINE_ORDER.indexOf(completedTask.stage);
    
    if (currentStageIndex < 0 || currentStageIndex >= PIPELINE_ORDER.length - 1) {
      return;
    }
    
    // Find tasks in next stage that depend on this spec
    const nextStage = PIPELINE_ORDER[currentStageIndex + 1];
    const tasksDir = path.join(this.devfactoryDir, 'tasks');
    
    if (!fs.existsSync(tasksDir)) {
      return;
    }
    
    const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const taskPath = path.join(tasksDir, file);
      const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
      
      // If this task is waiting and belongs to the same spec + next stage
      if (task.spec_id === completedTask.spec_id && 
          task.status === 'waiting_dependency' &&
          this.getStageFromSession(task.assigned_session) === nextStage) {
        
        task.status = 'pending';
        task.unlocked_at = new Date().toISOString();
        fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
        
        this.log(`   🔓 Unlocked: ${task.name} (${nextStage})`);
      }
    }
  }
  
  private async escalateToStrategist(task: TaskInfo, review: ReviewResult): Promise<StrategistDecision> {
    return await callStrategist({
      task,
      review,
      projectPath: this.config.projectPath,
      apiKey: this.config.anthropicApiKey,
    });
  }
  
  private async handleStrategistDecision(task: TaskInfo, decision: StrategistDecision): Promise<void> {
    switch (decision.decision) {
      case 'DIFFERENT_APPROACH':
        this.log(`   🔄 Strategist: Try different approach`);
        this.updateTaskStatus(task.id, 'in_progress', {
          strategist_guidance: decision.action.solution,
          review_attempts: 0, // Reset attempts
        });
        break;
        
      case 'SKIP_TASK':
        this.log(`   ⏭️  Strategist: Skip task - ${decision.action.impact}`);
        this.updateTaskStatus(task.id, 'skipped', {
          skip_reason: decision.reasoning,
          backlog_note: decision.action.backlog_note,
        });
        // Still unlock downstream
        await this.unlockDownstreamTasks(task);
        break;
        
      case 'MODIFY_SPEC':
        this.log(`   📝 Strategist: Spec needs modification`);
        this.updateTaskStatus(task.id, 'needs_human', {
          human_needed: 'Spec modification required',
          strategist_notes: decision.action.spec_changes,
        });
        this.createGitHubIssue('Spec Modification Needed', task, decision);
        break;
        
      case 'NEED_HUMAN':
        this.log(`   👤 Strategist: Human intervention needed`);
        this.updateTaskStatus(task.id, 'needs_human', {
          human_needed: decision.action.what_is_needed,
          options: decision.action.options_for_human,
        });
        this.createGitHubIssue('Human Input Needed', task, decision);
        break;
    }
    
    this.logIntervention(task.id, decision.decision, decision.reasoning);
  }
  
  private updateTaskStatus(taskId: string, status: string, extra: Record<string, any> = {}): void {
    const taskPath = path.join(this.devfactoryDir, 'tasks', `${taskId}.json`);
    
    if (fs.existsSync(taskPath)) {
      const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
      task.status = status;
      task.last_updated = new Date().toISOString();
      
      if (status === 'merged') {
        task.merged_at = new Date().toISOString();
      }
      
      Object.assign(task, extra);
      fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
    }
  }
  
  private async checkSpecCompletion(): Promise<string[]> {
    const state = this.loadState();
    const completedSpecs: string[] = [];
    
    for (const [specId, spec] of Object.entries(state.specs || {})) {
      const specState = spec as any;
      
      // Check if all tasks are merged or skipped
      if (specState.status === 'in_progress') {
        const allTasksMerged = specState.tasks_merged + specState.tasks_skipped >= specState.tasks_total;
        
        if (allTasksMerged && specState.tasks_total > 0) {
          specState.status = 'completed';
          specState.completed_at = new Date().toISOString();
          completedSpecs.push(specId);
        }
      }
    }
    
    if (completedSpecs.length > 0) {
      this.saveState(state);
    }
    
    return completedSpecs;
  }
  
  private async backupToGitHub(specId: string): Promise<void> {
    const cwd = this.config.projectPath;
    
    try {
      this.log(`   💾 Backing up to GitHub...`);
      
      // Stage all changes
      execSync('git add -A', { cwd, stdio: 'pipe' });
      
      // Commit with spec completion message
      execSync(`git commit -m "✅ Spec complete: ${specId}" --allow-empty`, { cwd, stdio: 'pipe' });
      
      // Push to origin
      execSync('git push origin main', { cwd, stdio: 'pipe' });
      
      this.log(`   ✅ Backed up to GitHub: ${specId}`);
    } catch (error) {
      this.log(`   ⚠️  Backup failed (will retry): ${error}`);
    }
  }
  
  private async checkStuckTasks(): Promise<void> {
    const tasksDir = path.join(this.devfactoryDir, 'tasks');
    
    if (!fs.existsSync(tasksDir)) {
      return;
    }
    
    const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
    const now = Date.now();
    const stuckThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const file of files) {
      const taskPath = path.join(tasksDir, file);
      const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
      
      if (task.status === 'in_progress' && task.started_at) {
        const elapsed = now - new Date(task.started_at).getTime();
        
        if (elapsed > stuckThreshold) {
          this.log(`   ⚠️  Task stuck: ${task.name} (${Math.round(elapsed / 60000)} min)`);
          task.status = 'stuck';
          fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
        }
      }
    }
  }
  
  private updateOverallProgress(): void {
    const state = this.loadState();
    const tasksDir = path.join(this.devfactoryDir, 'tasks');
    
    let completed = 0, merged = 0, skipped = 0, stuck = 0, total = 0;
    
    if (fs.existsSync(tasksDir)) {
      const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
      total = files.length;
      
      for (const file of files) {
        const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf-8'));
        
        switch (task.status) {
          case 'completed': completed++; break;
          case 'merged': merged++; break;
          case 'skipped': skipped++; break;
          case 'stuck': stuck++; break;
        }
      }
    }
    
    state.overall.tasks_completed = completed;
    state.overall.tasks_merged = merged;
    state.overall.tasks_skipped = skipped;
    state.overall.tasks_stuck = stuck;
    state.overall.tasks_total = total;
    state.overall.last_updated = new Date().toISOString();
    
    this.saveState(state);
    
    if (this.config.verbose) {
      const progress = total > 0 ? Math.round(((merged + skipped) / total) * 100) : 0;
      process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Progress: ${progress}% (${merged + skipped}/${total} tasks)`);
    }
  }
  
  private createGitHubIssue(title: string, task: TaskInfo, decision: StrategistDecision): void {
    // Create a local issue file for now - can integrate with GitHub API later
    const issuesDir = path.join(this.devfactoryDir, 'issues');
    
    if (!fs.existsSync(issuesDir)) {
      fs.mkdirSync(issuesDir, { recursive: true });
    }
    
    const issue = {
      title: `[DevFactory] ${title}: ${task.name}`,
      task_id: task.id,
      spec_id: task.spec_id,
      created_at: new Date().toISOString(),
      decision: decision.decision,
      reasoning: decision.reasoning,
      action: decision.action,
    };
    
    const issuePath = path.join(issuesDir, `${task.id}-${Date.now()}.json`);
    fs.writeFileSync(issuePath, JSON.stringify(issue, null, 2));
    
    this.log(`   📝 Issue created: ${issuePath}`);
  }
  
  private logIntervention(taskId: string, type: string, description: string): void {
    const state = this.loadState();
    
    state.interventions = state.interventions || [];
    state.interventions.push({
      timestamp: new Date().toISOString(),
      task_id: taskId,
      type,
      description,
    });
    
    this.saveState(state);
  }
  
  private loadState(): any {
    const statePath = path.join(this.devfactoryDir, 'state.json');
    
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
    
    return { is_running: false };
  }
  
  private saveState(state: any): void {
    const statePath = path.join(this.devfactoryDir, 'state.json');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }
  
  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI entry point for running orchestrator standalone
export async function runOrchestrator(projectPath: string, options: {
  interval?: number;
  verbose?: boolean;
  noBackup?: boolean;
}): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable required');
    process.exit(1);
  }
  
  const orchestrator = new LocalOrchestrator({
    projectPath,
    checkIntervalMs: (options.interval || 30) * 1000,
    anthropicApiKey: apiKey,
    autoBackup: !options.noBackup,
    verbose: options.verbose || false,
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n');
    orchestrator.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    orchestrator.stop();
    process.exit(0);
  });
  
  await orchestrator.start();
}
