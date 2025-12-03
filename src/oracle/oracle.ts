/**
 * The Oracle - DevFactory v4.1
 * 
 * An Opus-powered helper that automatically assists stuck workers
 * instead of escalating to the human.
 * 
 * Flow:
 * 1. Worker gets stuck → sets status to "stuck" in state.json
 * 2. Oracle monitors state.json for stuck workers
 * 3. Oracle uses Opus to analyze the problem and provide guidance
 * 4. Guidance is written to .devfactory/oracle/guidance-{task-id}.md
 * 5. Worker reads guidance and continues
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const ORACLE_MODEL = 'claude-opus-4-5-20251101';
const CHECK_INTERVAL = 60000; // 60 seconds

interface StuckTask {
  id: string;
  worker: string;
  description: string;
  error?: string;
  context?: string;
  stuckAt: string;
}

interface OracleGuidance {
  taskId: string;
  analysis: string;
  suggestedFix: string;
  codeSnippets?: string[];
  shouldEscalateToHuman: boolean;
  createdAt: string;
}

export async function startOracle(options: { verbose?: boolean } = {}) {
  const cwd = process.cwd();
  const statePath = path.join(cwd, '.devfactory', 'beast', 'state.json');
  const oracleDir = path.join(cwd, '.devfactory', 'oracle');
  
  // Ensure oracle directory exists
  if (!fs.existsSync(oracleDir)) {
    fs.mkdirSync(oracleDir, { recursive: true });
  }
  
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║         🔮 THE ORACLE - DevFactory v4.1        ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`[${new Date().toLocaleTimeString()}] 🔮 ORACLE AWAKENED`);
  console.log(`[${new Date().toLocaleTimeString()}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${new Date().toLocaleTimeString()}] 📁 Project: ${cwd}`);
  console.log(`[${new Date().toLocaleTimeString()}] 🧠 Model: ${ORACLE_MODEL}`);
  console.log(`[${new Date().toLocaleTimeString()}] ⏱️  Check interval: ${CHECK_INTERVAL / 1000}s`);
  console.log(`[${new Date().toLocaleTimeString()}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('');
  console.log('Watching for stuck workers...');
  console.log('');
  
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set. Oracle cannot function.');
    process.exit(1);
  }
  
  const client = new Anthropic({ apiKey });
  
  // Main loop
  const checkForStuckWorkers = async () => {
    try {
      if (!fs.existsSync(statePath)) {
        if (options.verbose) {
          console.log(`[${new Date().toLocaleTimeString()}] State file not found, waiting...`);
        }
        return;
      }
      
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      const stuckTasks: StuckTask[] = [];
      
      // Check each pipeline worker for stuck status
      for (const [worker, data] of Object.entries(state.pipeline || {})) {
        const workerData = data as any;
        if (workerData.status === 'stuck') {
          stuckTasks.push({
            id: workerData.current_task || `${worker}-unknown`,
            worker,
            description: workerData.stuck_reason || 'Unknown issue',
            error: workerData.error_message,
            context: workerData.context,
            stuckAt: workerData.stuck_at || new Date().toISOString(),
          });
        }
      }
      
      // Also check stuck queue if it exists
      if (state.queue?.stuck) {
        for (const task of state.queue.stuck) {
          stuckTasks.push(task);
        }
      }
      
      if (stuckTasks.length === 0) {
        if (options.verbose) {
          console.log(`[${new Date().toLocaleTimeString()}] ✅ No stuck workers`);
        }
        return;
      }
      
      console.log(`[${new Date().toLocaleTimeString()}] ⚠️  Found ${stuckTasks.length} stuck task(s)`);
      
      // Process each stuck task
      for (const task of stuckTasks) {
        await provideGuidance(client, task, oracleDir, cwd, options.verbose);
      }
      
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString()}] ❌ Oracle error:`, error);
    }
  };
  
  // Initial check
  await checkForStuckWorkers();
  
  // Continuous monitoring
  setInterval(checkForStuckWorkers, CHECK_INTERVAL);
}

async function provideGuidance(
  client: Anthropic,
  task: StuckTask,
  oracleDir: string,
  cwd: string,
  verbose?: boolean
) {
  const guidancePath = path.join(oracleDir, `guidance-${task.id}.md`);
  
  // Skip if we already provided guidance for this task
  if (fs.existsSync(guidancePath)) {
    if (verbose) {
      console.log(`[${new Date().toLocaleTimeString()}] 📋 Already provided guidance for ${task.id}`);
    }
    return;
  }
  
  console.log(`[${new Date().toLocaleTimeString()}] 🔮 Consulting Oracle for: ${task.id}`);
  
  // Gather context
  const projectFiles = gatherProjectContext(cwd);
  
  const prompt = `You are The Oracle - a wise AI assistant helping a DevFactory worker that has become stuck.

## Stuck Worker Details
- **Worker**: ${task.worker}
- **Task ID**: ${task.id}
- **Problem**: ${task.description}
${task.error ? `- **Error**: ${task.error}` : ''}
${task.context ? `- **Context**: ${task.context}` : ''}

## Project Structure
${projectFiles}

## Your Mission
1. Analyze why the worker might be stuck
2. Provide clear, actionable guidance to resolve the issue
3. Include code snippets if helpful
4. Determine if this truly needs human escalation (only for things like missing API keys, unclear requirements, or architectural decisions)

## Response Format
Respond with:
1. **Analysis**: What's likely causing the issue
2. **Solution**: Step-by-step fix
3. **Code**: Any code snippets needed
4. **Escalate**: true/false - does this need human attention?

Be concise but thorough. The worker will read this and continue.`;

  try {
    const response = await client.messages.create({
      model: ORACLE_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const content = response.content[0];
    const guidanceText = content.type === 'text' ? content.text : 'No guidance generated';
    
    // Parse if escalation needed
    const shouldEscalate = guidanceText.toLowerCase().includes('escalate: true') ||
                          guidanceText.toLowerCase().includes('escalate**: true');
    
    const guidance: OracleGuidance = {
      taskId: task.id,
      analysis: guidanceText,
      suggestedFix: '', // Embedded in analysis
      shouldEscalateToHuman: shouldEscalate,
      createdAt: new Date().toISOString(),
    };
    
    // Write guidance file
    const guidanceContent = `# 🔮 Oracle Guidance for ${task.id}

**Generated**: ${new Date().toLocaleString()}
**Worker**: ${task.worker}
**Escalate to Human**: ${shouldEscalate ? 'YES' : 'No'}

---

${guidanceText}

---

*This guidance was automatically generated by The Oracle (${ORACLE_MODEL})*
*If this doesn't help, set status to "stuck" again with more context.*
`;
    
    fs.writeFileSync(guidancePath, guidanceContent);
    
    console.log(`[${new Date().toLocaleTimeString()}] ✨ Guidance written to: ${guidancePath}`);
    
    if (shouldEscalate) {
      console.log(`[${new Date().toLocaleTimeString()}] 🚨 HUMAN ATTENTION NEEDED for ${task.id}`);
    }
    
    // Update state to indicate guidance is available
    const statePath = path.join(cwd, '.devfactory', 'beast', 'state.json');
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      
      // Add to oracle_guidance tracking
      if (!state.oracle_guidance) {
        state.oracle_guidance = {};
      }
      state.oracle_guidance[task.id] = {
        provided_at: new Date().toISOString(),
        escalate: shouldEscalate,
        path: guidancePath,
      };
      
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }
    
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Failed to get Oracle guidance:`, error);
  }
}

function gatherProjectContext(cwd: string): string {
  const lines: string[] = [];
  
  // Get directory structure (limited depth)
  try {
    const items = fs.readdirSync(cwd);
    lines.push('```');
    for (const item of items) {
      if (item.startsWith('.') && item !== '.devfactory') continue;
      if (item === 'node_modules') continue;
      
      const itemPath = path.join(cwd, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        lines.push(`${item}/`);
        try {
          const subItems = fs.readdirSync(itemPath).slice(0, 10);
          for (const subItem of subItems) {
            lines.push(`  ${subItem}`);
          }
          if (fs.readdirSync(itemPath).length > 10) {
            lines.push('  ...');
          }
        } catch {}
      } else {
        lines.push(item);
      }
    }
    lines.push('```');
  } catch {}
  
  // Get recent state
  const statePath = path.join(cwd, '.devfactory', 'beast', 'state.json');
  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      lines.push('\n**Current Pipeline Status**:');
      lines.push('```json');
      lines.push(JSON.stringify(state.pipeline, null, 2));
      lines.push('```');
    } catch {}
  }
  
  return lines.join('\n');
}

// CLI command
export async function oracleCommand(options: { verbose?: boolean }) {
  await startOracle(options);
}
