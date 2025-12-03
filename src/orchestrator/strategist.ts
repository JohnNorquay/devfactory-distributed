/**
 * CLAUDE STRATEGIST
 * 
 * The strategic brain that handles tasks that can't be resolved through normal review.
 * Makes intelligent decisions about:
 * - Different approaches to solving problems
 * - Skipping tasks that aren't essential
 * - Modifying specs when requirements are unclear
 * - Escalating to human when truly needed
 */

import * as fs from 'fs';
import * as path from 'path';
import { ReviewResult } from './reviewer';

export type StrategistDecisionType = 
  | 'DIFFERENT_APPROACH'
  | 'SKIP_TASK'
  | 'MODIFY_SPEC'
  | 'NEED_HUMAN';

export interface StrategistDecision {
  decision: StrategistDecisionType;
  reasoning: string;
  action: {
    // For DIFFERENT_APPROACH
    solution?: string;
    files_to_change?: string[];
    code_changes?: string;
    
    // For SKIP_TASK
    impact?: string;
    backlog_note?: string;
    
    // For MODIFY_SPEC
    spec_changes?: string;
    task_changes?: string;
    
    // For NEED_HUMAN
    what_is_needed?: string;
    options_for_human?: string[];
  };
}

interface StrategistInput {
  task: {
    id: string;
    name: string;
    spec_id: string;
    branch: string;
    stage: string;
    files_touched: string[];
  };
  review: ReviewResult;
  projectPath: string;
  apiKey: string;
}

export async function callStrategist(input: StrategistInput): Promise<StrategistDecision> {
  const { task, review, projectPath, apiKey } = input;
  
  // Gather context
  const specContext = getSpecContext(task.spec_id, projectPath);
  const codeContext = getRelevantCode(task.files_touched, projectPath);
  const previousAttempts = getPreviousAttempts(task.id, projectPath);
  
  // Build strategist prompt
  const prompt = buildStrategistPrompt(task, review, specContext, codeContext, previousAttempts);
  
  // Call Claude with strategist role
  const response = await callClaudeStrategist(prompt, apiKey);
  
  // Parse and validate decision
  return parseStrategistResponse(response);
}

function getSpecContext(specId: string, projectPath: string): string {
  // Look for spec file in common locations
  const possiblePaths = [
    path.join(projectPath, 'specs', `${specId}.md`),
    path.join(projectPath, '.devfactory', 'specs', `${specId}.md`),
    path.join(projectPath, 'docs', 'specs', `${specId}.md`),
  ];
  
  for (const specPath of possiblePaths) {
    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf-8');
      // Truncate if too long
      return content.length > 10000 ? content.substring(0, 10000) + '\n\n[truncated]' : content;
    }
  }
  
  return '[Spec file not found]';
}

function getRelevantCode(files: string[], projectPath: string): string {
  const codeSnippets: string[] = [];
  
  for (const file of files.slice(0, 5)) { // Limit to 5 files
    const filePath = path.join(projectPath, file);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const truncated = content.length > 5000 ? content.substring(0, 5000) + '\n[truncated]' : content;
      codeSnippets.push(`### ${file}\n\`\`\`\n${truncated}\n\`\`\``);
    }
  }
  
  return codeSnippets.join('\n\n');
}

function getPreviousAttempts(taskId: string, projectPath: string): any[] {
  const taskPath = path.join(projectPath, '.devfactory', 'tasks', `${taskId}.json`);
  
  if (fs.existsSync(taskPath)) {
    const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    return task.previous_attempts || [];
  }
  
  return [];
}

function buildStrategistPrompt(
  task: any,
  review: ReviewResult,
  specContext: string,
  codeContext: string,
  previousAttempts: any[]
): string {
  return `You are the Claude Strategist for DevFactory, an autonomous development system.

A task has failed review ${review.maxAttempts} times and needs strategic intervention.

## Task Information

**Task:** ${task.name}
**Stage:** ${task.stage}
**Spec:** ${task.spec_id}

## Review Issues (after ${review.attemptNumber} attempts)

${review.issues.map((issue: string, i: number) => `${i + 1}. ${issue}`).join('\n')}

## Spec Context

${specContext}

## Current Code

${codeContext}

${previousAttempts.length > 0 ? `
## Previous Attempts

${previousAttempts.map((attempt: any, i: number) => `
### Attempt ${i + 1}
- Approach: ${attempt.approach}
- Result: ${attempt.result}
`).join('\n')}
` : ''}

## Your Decision

You must decide how to handle this blocked task. Your options are:

### 1. DIFFERENT_APPROACH
The task can be completed with a different implementation strategy.
Use this when: The issues are solvable with a different code approach.

### 2. SKIP_TASK
The task should be skipped for now and added to a backlog.
Use this when: The task is not critical and blocking progress on other work.
Be careful: Only skip if downstream tasks won't break.

### 3. MODIFY_SPEC
The spec itself needs clarification or changes.
Use this when: The requirements are unclear or contradictory.

### 4. NEED_HUMAN
Human intervention is genuinely required.
Use this when: There's a business decision, credential needed, or architectural choice only a human can make.
Be conservative: Only use this for truly blocking issues.

## Response Format

Respond with a JSON object:
{
  "decision": "DIFFERENT_APPROACH" | "SKIP_TASK" | "MODIFY_SPEC" | "NEED_HUMAN",
  "reasoning": "Your explanation for this decision",
  "action": {
    // Include relevant fields based on decision:
    
    // For DIFFERENT_APPROACH:
    "solution": "Description of the different approach to try",
    "files_to_change": ["list", "of", "files"],
    "code_changes": "Specific code guidance",
    
    // For SKIP_TASK:
    "impact": "What functionality will be missing",
    "backlog_note": "Note for future implementation",
    
    // For MODIFY_SPEC:
    "spec_changes": "What needs to change in the spec",
    "task_changes": "How tasks should be adjusted",
    
    // For NEED_HUMAN:
    "what_is_needed": "Clear description of what human must do",
    "options_for_human": ["option 1", "option 2", "..."]
  }
}

Be pragmatic and action-oriented. DevFactory's goal is shipping working software, not perfection.`;
}

async function callClaudeStrategist(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are the Claude Strategist - a senior technical decision-maker for an autonomous development system.

Your role is to unblock development when tasks fail repeatedly. You make pragmatic decisions that keep the project moving forward.

Key principles:
- Ship working software over perfect code
- Only escalate to humans when truly necessary
- Consider downstream dependencies when skipping tasks
- Provide actionable, specific guidance`,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as { content: Array<{ text: string }> };
  return data.content[0].text;
}

function parseStrategistResponse(response: string): StrategistDecision {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return {
        decision: 'NEED_HUMAN',
        reasoning: 'Failed to parse strategist response',
        action: {
          what_is_needed: 'Manual review of blocked task required',
          options_for_human: ['Review code manually', 'Adjust task requirements'],
        },
      };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate decision type
    const validDecisions: StrategistDecisionType[] = [
      'DIFFERENT_APPROACH',
      'SKIP_TASK',
      'MODIFY_SPEC',
      'NEED_HUMAN',
    ];
    
    if (!validDecisions.includes(parsed.decision)) {
      parsed.decision = 'NEED_HUMAN';
    }
    
    return {
      decision: parsed.decision,
      reasoning: parsed.reasoning || 'No reasoning provided',
      action: parsed.action || {},
    };
  } catch (error) {
    return {
      decision: 'NEED_HUMAN',
      reasoning: `Failed to parse strategist response: ${error}`,
      action: {
        what_is_needed: 'Manual review of blocked task required',
        options_for_human: ['Review code manually', 'Adjust task requirements'],
      },
    };
  }
}
