import * as fs from 'fs';
import * as path from 'path';

interface BootstrapOptions {
  profile?: string;
}

export async function bootstrapCommand(sessionId: string, options: BootstrapOptions) {
  const cwd = process.cwd();
  const devfactoryDir = path.join(cwd, '.devfactory');
  
  if (!fs.existsSync(devfactoryDir)) {
    console.log('❌ DevFactory not initialized. Run: devfactory init\n');
    return;
  }
  
  // Load session config
  const sessionPath = path.join(devfactoryDir, 'sessions', `${sessionId}.json`);
  if (!fs.existsSync(sessionPath)) {
    console.log(`❌ Session ${sessionId} not found.`);
    console.log('   Available sessions: session-1, session-2, session-3\n');
    return;
  }
  
  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
  const profileName = options.profile || session.profile;
  
  // Load profile
  const profilePath = path.join(devfactoryDir, 'profiles', `${profileName}.json`);
  if (!fs.existsSync(profilePath)) {
    console.log(`❌ Profile ${profileName} not found.\n`);
    return;
  }
  
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  
  // Load config
  const configPath = path.join(devfactoryDir, 'distributed-config.json');
  const config = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    : { project_name: path.basename(cwd), branch_prefix: 'devfactory/' };
  
  // Generate the bootstrap prompt
  const prompt = generateBootstrapPrompt(session, profile, config, cwd);
  
  console.log('\n' + '═'.repeat(70));
  console.log(' BOOTSTRAP PROMPT FOR: ' + session.name.toUpperCase());
  console.log('═'.repeat(70));
  console.log('\nCopy everything below this line and paste into your Claude Code session:\n');
  console.log('─'.repeat(70));
  console.log(prompt);
  console.log('─'.repeat(70));
  console.log('\nInstructions:');
  console.log('  1. Open a terminal (not VS Code)');
  console.log('  2. Run: tmux new-session -s ' + sessionId);
  console.log('  3. In tmux: cd ' + cwd);
  console.log('  4. In tmux: claude');
  console.log('  5. Paste the prompt above');
  console.log('  6. Detach: Ctrl+B, then D');
  console.log('');
}

function generateBootstrapPrompt(
  session: any, 
  profile: any, 
  config: any,
  projectPath: string
): string {
  const prompt = `
# DevFactory Distributed Worker Session

You are **${session.session_id}** (${session.name}) working on the **${config.project_name}** project.

## Your Identity

- **Session ID**: ${session.session_id}
- **Name**: ${session.name}
- **Profile**: ${session.profile}
- **Focus Areas**: ${profile.focus_keywords.join(', ')}

## Your Capabilities

### Agents You Can Invoke
${profile.agents.map((a: string) => `- ${a}`).join('\n')}

### Skills Loaded
${profile.skills.length > 0 ? profile.skills.map((s: string) => `- ${s}`).join('\n') : '- (general skills)'}

## Project Context

- **Project**: ${config.project_name}
- **Path**: ${projectPath}
- **Branch Prefix**: ${config.branch_prefix}

## Your Protocol

### 1. Check for Work

\`\`\`bash
# Pull latest state
git pull origin main

# Check your session file
cat .devfactory/sessions/${session.session_id}.json

# Find pending tasks for your profile
cat .devfactory/state.json | grep -A 20 "specs"
\`\`\`

### 2. Claim a Task

When you find a pending task that matches your focus areas:

\`\`\`bash
# Update your session file
# Set status to "working", current_task to task ID
# Commit and push to claim it

git add .devfactory/sessions/${session.session_id}.json
git commit -m "devfactory: ${session.session_id} claiming [task-id]"
git push
\`\`\`

### 3. Work on Task

1. Create a branch: \`git checkout -b ${config.branch_prefix}[task-id]\`
2. Read the task details from the spec
3. Implement the task
4. Commit frequently with clear messages
5. Update .devfactory/tasks/[task-id].json with progress

### 4. Complete Task

When done:

\`\`\`bash
# Update task status to "completed"
# Update session file
# Push your branch
git push origin ${config.branch_prefix}[task-id]

# Push state updates to main
git checkout main
git pull
# Update state files
git add .devfactory/
git commit -m "devfactory: ${session.session_id} completed [task-id]"
git push
\`\`\`

### 5. Handle Conflicts

If you encounter a conflict in .devfactory/ files:
1. Pull latest: \`git pull --rebase\`
2. Prefer the version with the latest timestamp
3. Re-push your changes

## Important Rules

1. **Only work on tasks matching your focus**: ${profile.focus_keywords.slice(0, 5).join(', ')}
2. **Commit to .devfactory/ frequently** - this is how we coordinate
3. **One task at a time** - finish before claiming another
4. **Don't modify other sessions' files**
5. **Push often** - the orchestrator needs to see your progress

## Getting Started

1. First, check the current state:
   \`\`\`bash
   cat .devfactory/state.json
   \`\`\`

2. Look for specs in progress:
   \`\`\`bash
   ls .devfactory/specs/
   \`\`\`

3. Check if there's an orchestration.yml for the current spec:
   \`\`\`bash
   cat .devfactory/specs/[current-spec]/orchestration.yml
   \`\`\`

4. Find task groups that match your profile and claim one.

## Ready!

You are now ${session.name}. Start by checking for available work.

If no work is available yet, say: "Session ${session.session_id} ready and waiting for tasks."
`;

  return prompt.trim();
}
