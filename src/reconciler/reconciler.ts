/**
 * Reconciler - DevFactory v4.2
 * 
 * Pre-flight intelligence that scans your codebase and matches
 * existing work against specs/tasks. Updates state.json to reflect
 * reality before workers start.
 * 
 * Makes DevFactory:
 * - Resumable (pick up where you left off)
 * - Brownfield-ready (recognizes existing code)
 * - Accurate (dashboard shows true progress)
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const RECONCILER_MODEL = 'claude-opus-4-5-20251101';

interface FileInventory {
  migrations: string[];
  apiRoutes: string[];
  components: string[];
  pages: string[];
  tests: string[];
  other: string[];
}

interface ReconcileResult {
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  tasksBySpec: Record<string, { total: number; completed: number }>;
  updatedState: boolean;
}

export async function reconcileState(cwd: string, verbose: boolean = false): Promise<ReconcileResult> {
  const specsDir = path.join(cwd, '.devfactory', 'specs');
  const beastDir = path.join(cwd, '.devfactory', 'beast');
  const statePath = path.join(beastDir, 'state.json');
  
  console.log('🔄 Reconciling state with codebase...\n');
  
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('   ⚠️  No ANTHROPIC_API_KEY - skipping intelligent reconciliation');
    console.log('   Using file-based heuristics instead\n');
    return reconcileWithHeuristics(cwd, statePath, verbose);
  }
  
  // Step 1: Inventory existing files
  console.log('   Scanning existing files...');
  const inventory = scanCodebase(cwd);
  
  if (verbose) {
    console.log(`   ├── supabase/migrations/  ${inventory.migrations.length} files`);
    console.log(`   ├── app/api/              ${inventory.apiRoutes.length} files`);
    console.log(`   ├── app/                  ${inventory.pages.length} pages`);
    console.log(`   ├── components/           ${inventory.components.length} files`);
    console.log(`   └── __tests__/            ${inventory.tests.length} files`);
  } else {
    const total = inventory.migrations.length + inventory.apiRoutes.length + 
                  inventory.pages.length + inventory.components.length + inventory.tests.length;
    console.log(`   Found ${total} relevant files`);
  }
  
  // Step 2: Load specs
  console.log('\n   Loading specs...');
  const specs = loadSpecs(specsDir);
  
  if (specs.length === 0) {
    console.log('   ⚠️  No specs found - nothing to reconcile\n');
    return {
      totalTasks: 0,
      completedTasks: 0,
      remainingTasks: 0,
      tasksBySpec: {},
      updatedState: false,
    };
  }
  
  console.log(`   Found ${specs.length} specs`);
  
  // Step 3: Use Opus to match files against tasks
  console.log('\n   Matching against specs (Opus)...');
  
  const client = new Anthropic({ apiKey });
  const matchResult = await matchFilesToTasks(client, inventory, specs, verbose);
  
  // Step 4: Update state.json
  console.log('\n   Updating state.json...');
  const state = loadOrCreateState(statePath);
  
  let completedCount = 0;
  let totalCount = 0;
  const tasksBySpec: Record<string, { total: number; completed: number }> = {};
  
  for (const [specName, tasks] of Object.entries(matchResult)) {
    const specTasks = tasks as { id: string; completed: boolean; reason?: string }[];
    tasksBySpec[specName] = { total: specTasks.length, completed: 0 };
    totalCount += specTasks.length;
    
    for (const task of specTasks) {
      if (task.completed) {
        completedCount++;
        tasksBySpec[specName].completed++;
        
        // Mark as completed in state
        if (!state.completed_tasks) {
          state.completed_tasks = [];
        }
        if (!state.completed_tasks.includes(task.id)) {
          state.completed_tasks.push(task.id);
        }
      }
    }
    
    // Show progress per spec
    const pct = Math.round((tasksBySpec[specName].completed / tasksBySpec[specName].total) * 100);
    const specDisplay = specName.length > 20 ? specName.substring(0, 17) + '...' : specName.padEnd(20);
    console.log(`   ├── ${specDisplay} ${tasksBySpec[specName].completed}/${tasksBySpec[specName].total} tasks (${pct}%)`);
  }
  
  // Update overall stats
  state.stats = state.stats || {};
  state.stats.tasks_total = totalCount;
  state.stats.tasks_completed = completedCount;
  state.stats.reconciled_at = new Date().toISOString();
  
  // Update pipeline status based on what's complete
  state.pipeline = state.pipeline || {};
  updatePipelineStatus(state, matchResult);
  
  // Write state
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  
  console.log(`\n   ✓ state.json updated`);
  console.log(`   ✓ ${completedCount} tasks marked complete`);
  console.log(`   ✓ ${totalCount - completedCount} tasks remaining\n`);
  
  return {
    totalTasks: totalCount,
    completedTasks: completedCount,
    remainingTasks: totalCount - completedCount,
    tasksBySpec,
    updatedState: true,
  };
}

function scanCodebase(cwd: string): FileInventory {
  const inventory: FileInventory = {
    migrations: [],
    apiRoutes: [],
    components: [],
    pages: [],
    tests: [],
    other: [],
  };
  
  // Scan migrations
  const migrationsDir = path.join(cwd, 'supabase', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    inventory.migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'));
  }
  
  // Scan API routes
  const apiDir = path.join(cwd, 'app', 'api');
  if (fs.existsSync(apiDir)) {
    inventory.apiRoutes = getAllFiles(apiDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
      .map(f => path.relative(cwd, f));
  }
  
  // Scan app directory for pages (but not api)
  const appDir = path.join(cwd, 'app');
  if (fs.existsSync(appDir)) {
    inventory.pages = getAllFiles(appDir)
      .filter(f => !f.includes('/api/'))
      .filter(f => f.endsWith('page.tsx') || f.endsWith('layout.tsx'))
      .map(f => path.relative(cwd, f));
  }
  
  // Scan components
  const componentsDir = path.join(cwd, 'components');
  if (fs.existsSync(componentsDir)) {
    inventory.components = getAllFiles(componentsDir)
      .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
      .map(f => path.relative(cwd, f));
  }
  
  // Scan tests
  const testsDir = path.join(cwd, '__tests__');
  if (fs.existsSync(testsDir)) {
    inventory.tests = getAllFiles(testsDir)
      .filter(f => f.includes('.test.') || f.includes('.spec.'))
      .map(f => path.relative(cwd, f));
  }
  
  // Also check for tests in src/__tests__ or app/__tests__
  const altTestDirs = [
    path.join(cwd, 'src', '__tests__'),
    path.join(cwd, 'tests'),
  ];
  for (const testDir of altTestDirs) {
    if (fs.existsSync(testDir)) {
      const files = getAllFiles(testDir)
        .filter(f => f.includes('.test.') || f.includes('.spec.'))
        .map(f => path.relative(cwd, f));
      inventory.tests.push(...files);
    }
  }
  
  return inventory;
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return files;
}

function loadSpecs(specsDir: string): any[] {
  const specs: any[] = [];
  
  if (!fs.existsSync(specsDir)) {
    return specs;
  }
  
  const files = fs.readdirSync(specsDir)
    .filter(f => f.endsWith('.md') || f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml'));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(specsDir, file), 'utf-8');
    specs.push({
      name: file.replace(/\.(md|json|ya?ml)$/, ''),
      content: content.substring(0, 10000), // Limit size for API
    });
  }
  
  return specs;
}

async function matchFilesToTasks(
  client: Anthropic,
  inventory: FileInventory,
  specs: any[],
  verbose: boolean
): Promise<Record<string, any[]>> {
  
  const prompt = `You are analyzing a codebase to determine which tasks from development specs have been completed.

## Existing Files

### Database Migrations
${inventory.migrations.map(f => `- ${f}`).join('\n') || '(none)'}

### API Routes
${inventory.apiRoutes.map(f => `- ${f}`).join('\n') || '(none)'}

### Pages
${inventory.pages.map(f => `- ${f}`).join('\n') || '(none)'}

### Components
${inventory.components.map(f => `- ${f}`).join('\n') || '(none)'}

### Tests
${inventory.tests.map(f => `- ${f}`).join('\n') || '(none)'}

## Specs to Analyze

${specs.map(s => `### ${s.name}\n${s.content.substring(0, 3000)}`).join('\n\n')}

## Your Task

For each spec, identify the tasks/requirements and determine which ones appear to be COMPLETED based on the existing files.

Respond with JSON only (no markdown):
{
  "spec-name": [
    { "id": "task-1", "description": "brief description", "completed": true, "reason": "migration 00001 exists" },
    { "id": "task-2", "description": "brief description", "completed": false }
  ]
}

Be conservative - only mark as complete if clear evidence exists.
Generate meaningful task IDs based on the spec structure.`;

  try {
    const response = await client.messages.create({
      model: RECONCILER_MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '{}';
    
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {};
  } catch (error) {
    console.log(`   ⚠️  Opus analysis failed: ${error}`);
    return {};
  }
}

function loadOrCreateState(statePath: string): any {
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  }
  
  // Ensure directory exists
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  return {
    is_running: false,
    pipeline: {
      database: { status: 'idle', completed_tasks: [] },
      backend: { status: 'idle', completed_tasks: [] },
      frontend: { status: 'idle', completed_tasks: [] },
      testing: { status: 'idle', completed_tasks: [] },
    },
    stats: {
      tasks_total: 0,
      tasks_completed: 0,
    },
    completed_tasks: [],
  };
}

function updatePipelineStatus(state: any, matchResult: Record<string, any[]>) {
  // Categorize completed tasks by pipeline stage
  const dbTasks: string[] = [];
  const backendTasks: string[] = [];
  const frontendTasks: string[] = [];
  const testTasks: string[] = [];
  
  for (const [specName, tasks] of Object.entries(matchResult)) {
    for (const task of tasks as any[]) {
      if (!task.completed) continue;
      
      const id = task.id.toLowerCase();
      const desc = (task.description || '').toLowerCase();
      
      if (id.includes('db') || id.includes('migration') || desc.includes('migration') || desc.includes('schema')) {
        dbTasks.push(task.id);
      } else if (id.includes('api') || id.includes('backend') || desc.includes('api') || desc.includes('route')) {
        backendTasks.push(task.id);
      } else if (id.includes('test') || desc.includes('test')) {
        testTasks.push(task.id);
      } else if (id.includes('ui') || id.includes('frontend') || id.includes('component') || id.includes('page')) {
        frontendTasks.push(task.id);
      }
    }
  }
  
  state.pipeline.database.completed_tasks = dbTasks;
  state.pipeline.backend.completed_tasks = backendTasks;
  state.pipeline.frontend.completed_tasks = frontendTasks;
  state.pipeline.testing.completed_tasks = testTasks;
}

// Fallback heuristics-based reconciliation (no API needed)
function reconcileWithHeuristics(cwd: string, statePath: string, verbose: boolean): ReconcileResult {
  const inventory = scanCodebase(cwd);
  const state = loadOrCreateState(statePath);
  
  // Simple heuristics: count files as completed tasks
  const dbComplete = inventory.migrations.length;
  const backendComplete = inventory.apiRoutes.length;
  const frontendComplete = inventory.pages.length + inventory.components.length;
  const testComplete = inventory.tests.length;
  
  const totalComplete = dbComplete + backendComplete + frontendComplete + testComplete;
  
  // Update state with basic info
  state.stats.files_found = totalComplete;
  state.stats.reconciled_at = new Date().toISOString();
  state.stats.reconcile_method = 'heuristics';
  
  state.pipeline.database.files_found = dbComplete;
  state.pipeline.backend.files_found = backendComplete;
  state.pipeline.frontend.files_found = frontendComplete;
  state.pipeline.testing.files_found = testComplete;
  
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  
  console.log(`   Found ${totalComplete} files (heuristic mode)`);
  console.log(`   ├── Database:  ${dbComplete} migrations`);
  console.log(`   ├── Backend:   ${backendComplete} API routes`);
  console.log(`   ├── Frontend:  ${frontendComplete} components/pages`);
  console.log(`   └── Testing:   ${testComplete} test files`);
  console.log('\n   ⚠️  For accurate task matching, set ANTHROPIC_API_KEY\n');
  
  return {
    totalTasks: 0, // Unknown without specs analysis
    completedTasks: 0,
    remainingTasks: 0,
    tasksBySpec: {},
    updatedState: true,
  };
}
