import * as fs from 'fs';
import * as path from 'path';

interface InitOptions {
  name?: string;
  email?: string;
}

export async function initCommand(options: InitOptions) {
  const cwd = process.cwd();
  const devfactoryDir = path.join(cwd, '.devfactory');
  
  console.log('🚀 Initializing DevFactory Distributed v3.1\n');
  
  // Check if .devfactory already exists
  if (fs.existsSync(devfactoryDir)) {
    console.log('📁 .devfactory/ directory already exists');
    console.log('   Checking for v3.1 distributed components...\n');
  } else {
    fs.mkdirSync(devfactoryDir, { recursive: true });
    console.log('📁 Created .devfactory/ directory\n');
  }
  
  // Create directories
  const dirs = [
    'sessions',
    'profiles',
    'tasks',
    'execution',
  ];
  
  for (const dir of dirs) {
    const dirPath = path.join(devfactoryDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✓ Created ${dir}/`);
    }
  }
  
  // Create session profiles
  const profiles = {
    backend: {
      name: 'Backend Worker',
      agents: [
        'api-engineer',
        'backend-debugger',
        'backend-verifier',
        'database-debugger',
        'database-engineer',
      ],
      skills: [
        'fastapi-patterns',
        'supabase-rls-development',
        'supabase-mcp',
      ],
      focus_keywords: [
        'api', 'endpoint', 'database', 'model', 'migration',
        'backend', 'server', 'query', 'schema', 'route',
      ],
    },
    frontend: {
      name: 'Frontend Worker',
      agents: [
        'ui-designer',
        'frontend-debugger',
        'frontend-verifier',
      ],
      skills: [
        'nextjs-app-router',
      ],
      focus_keywords: [
        'component', 'page', 'ui', 'frontend', 'styling',
        'responsive', 'form', 'layout', 'css', 'react',
      ],
    },
    testing: {
      name: 'Testing Worker',
      agents: [
        'testing-engineer',
        'browser-automation-agent',
        'test-scenario-loader',
        'error-classifier',
        'implementation-verifier',
      ],
      skills: [],
      focus_keywords: [
        'test', 'e2e', 'integration', 'unit', 'verification',
        'assertion', 'mock', 'fixture', 'spec', 'coverage',
      ],
    },
  };
  
  const profilesDir = path.join(devfactoryDir, 'profiles');
  for (const [name, profile] of Object.entries(profiles)) {
    const profilePath = path.join(profilesDir, `${name}.json`);
    if (!fs.existsSync(profilePath)) {
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
      console.log(`   ✓ Created profiles/${name}.json`);
    }
  }
  
  // Create session files
  const sessionsDir = path.join(devfactoryDir, 'sessions');
  const sessionConfigs = [
    { id: 'session-1', name: 'Backend Worker', profile: 'backend' },
    { id: 'session-2', name: 'Frontend Worker', profile: 'frontend' },
    { id: 'session-3', name: 'Testing Worker', profile: 'testing' },
  ];
  
  for (const config of sessionConfigs) {
    const sessionPath = path.join(sessionsDir, `${config.id}.json`);
    if (!fs.existsSync(sessionPath)) {
      const session = {
        session_id: config.id,
        name: config.name,
        profile: config.profile,
        status: 'idle',
        current_task: null,
        current_branch: null,
        last_heartbeat: null,
        completed_tasks: [],
        failed_tasks: [],
      };
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
      console.log(`   ✓ Created sessions/${config.id}.json`);
    }
  }
  
  // Create or update distributed config
  const configPath = path.join(devfactoryDir, 'distributed-config.json');
  const projectName = options.name || path.basename(cwd);
  const email = options.email || 'your-email@example.com';
  
  const config = {
    project_name: projectName,
    branch_prefix: 'devfactory/',
    sessions: {
      count: 3,
      profiles: ['backend', 'frontend', 'testing'],
    },
    orchestrator: {
      model: 'claude-sonnet-4-20250514',
      strategist_model: 'claude-sonnet-4-20250514',
      max_review_attempts: 3,
    },
    notifications: {
      email: email,
      sendgrid_configured: false,
    },
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`   ✓ Created distributed-config.json`);
  
  // Create initial state
  const statePath = path.join(devfactoryDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    const state = {
      version: '1.0',
      project: projectName,
      is_running: false,
      current_spec_wave: 0,
      total_spec_waves: 0,
      specs: {},
      overall: {
        specs_pending: 0,
        specs_in_progress: 0,
        specs_completed: 0,
        specs_total: 0,
        tasks_completed: 0,
        tasks_merged: 0,
        tasks_skipped: 0,
        tasks_stuck: 0,
        tasks_total: 0,
        started_at: null,
        last_updated: new Date().toISOString(),
      },
      interventions: [],
    };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    console.log(`   ✓ Created state.json`);
  }
  
  console.log('\n✅ DevFactory Distributed v3.1 initialized!\n');
  console.log('Next steps:');
  console.log('  1. Run: devfactory setup-github');
  console.log('  2. Add GitHub secrets: ANTHROPIC_API_KEY, SENDGRID_API_KEY, NOTIFY_EMAIL');
  console.log('  3. Run: devfactory bootstrap session-1');
  console.log('  4. Paste the prompt into a tmux session running claude\n');
}
