/**
 * LOCAL REVIEWER
 * 
 * Reviews completed tasks via Anthropic API locally.
 * No GitHub Actions, no cloud dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface ReviewResult {
  approved: boolean;
  issues: string[];
  suggestions: string[];
  attemptNumber: number;
  maxAttempts: number;
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

export async function reviewTask(
  task: TaskInfo,
  apiKey: string,
  projectPath: string
): Promise<ReviewResult> {
  // Get diff for the task branch
  const diff = getTaskDiff(task.branch, projectPath);
  
  // Get task details from file
  const taskDetails = getTaskDetails(task.id, projectPath);
  
  // Build review prompt
  const prompt = buildReviewPrompt(task, diff, taskDetails);
  
  // Call Claude API
  const response = await callClaudeAPI(prompt, apiKey);
  
  // Parse response
  return parseReviewResponse(response, taskDetails.review_attempts || 0);
}

function getTaskDiff(branch: string, projectPath: string): string {
  try {
    // Get diff between main and task branch
    const diff = execSync(`git diff main...${branch}`, {
      cwd: projectPath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    // Truncate if too long
    if (diff.length > 50000) {
      return diff.substring(0, 50000) + '\n\n... [diff truncated] ...';
    }
    
    return diff;
  } catch (error) {
    return `[Error getting diff: ${error}]`;
  }
}

function getTaskDetails(taskId: string, projectPath: string): any {
  const taskPath = path.join(projectPath, '.devfactory', 'tasks', `${taskId}.json`);
  
  if (fs.existsSync(taskPath)) {
    return JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  }
  
  return {};
}

function buildReviewPrompt(task: TaskInfo, diff: string, taskDetails: any): string {
  const previousIssues = taskDetails.last_review_issues || [];
  const attemptNumber = (taskDetails.review_attempts || 0) + 1;
  
  return `You are a senior code reviewer for the DevFactory automated development system.

## Task Being Reviewed

**Task:** ${task.name}
**Stage:** ${task.stage}
**Spec:** ${task.spec_id}
**Branch:** ${task.branch}
**Review Attempt:** ${attemptNumber}

${taskDetails.description ? `**Description:** ${taskDetails.description}` : ''}

${previousIssues.length > 0 ? `
## Previous Review Issues (should be fixed)
${previousIssues.map((issue: string, i: number) => `${i + 1}. ${issue}`).join('\n')}
` : ''}

## Code Changes (git diff)

\`\`\`diff
${diff}
\`\`\`

## Review Instructions

Please review this code for:

1. **Correctness**: Does the code do what the task requires?
2. **Best Practices**: Does it follow good coding patterns?
3. **Type Safety**: Are types properly defined and used?
4. **Error Handling**: Are errors handled appropriately?
5. **Security**: Any obvious security issues?
6. **Performance**: Any obvious performance problems?

${task.stage === 'database' ? `
### Database-specific checks:
- Are migrations reversible where possible?
- Are indexes added for frequently queried columns?
- Are foreign key constraints properly defined?
- Is RLS (Row Level Security) properly implemented?
` : ''}

${task.stage === 'backend' ? `
### Backend-specific checks:
- Are API endpoints properly validated?
- Is authentication/authorization handled correctly?
- Are database queries efficient (no N+1)?
- Is error handling returning appropriate status codes?
` : ''}

${task.stage === 'frontend' ? `
### Frontend-specific checks:
- Are components properly typed?
- Is state management appropriate?
- Are loading/error states handled?
- Is the UI accessible?
` : ''}

${task.stage === 'testing' ? `
### Testing-specific checks:
- Do tests cover the main use cases?
- Are edge cases tested?
- Are tests deterministic (no flaky tests)?
- Is test data properly isolated?
` : ''}

## Response Format

Respond with a JSON object in the following format:
{
  "approved": true/false,
  "issues": ["list of issues that MUST be fixed before merging"],
  "suggestions": ["list of optional improvements (don't block merge)"]
}

If the code is acceptable to merge (no critical issues), set approved to true.
Only add issues for things that genuinely need fixing, not style preferences.
Be pragmatic - perfect is the enemy of good in automated development.`;
}

async function callClaudeAPI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
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

function parseReviewResponse(response: string, currentAttempts: number): ReviewResult {
  try {
    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return {
        approved: false,
        issues: ['Failed to parse review response'],
        suggestions: [],
        attemptNumber: currentAttempts + 1,
        maxAttempts: 3,
      };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      approved: parsed.approved === true,
      issues: parsed.issues || [],
      suggestions: parsed.suggestions || [],
      attemptNumber: currentAttempts + 1,
      maxAttempts: 3,
    };
  } catch (error) {
    return {
      approved: false,
      issues: [`Failed to parse review response: ${error}`],
      suggestions: [],
      attemptNumber: currentAttempts + 1,
      maxAttempts: 3,
    };
  }
}
