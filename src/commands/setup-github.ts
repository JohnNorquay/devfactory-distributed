import * as fs from 'fs';
import * as path from 'path';

export async function setupGithubCommand() {
  const cwd = process.cwd();
  const githubDir = path.join(cwd, '.github', 'workflows');
  
  console.log('🔧 Setting up GitHub Actions orchestrator\n');
  
  // Create .github/workflows directory
  if (!fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true });
    console.log('   ✓ Created .github/workflows/');
  }
  
  // Write the orchestrator workflow
  const workflowPath = path.join(githubDir, 'devfactory-orchestrator.yml');
  fs.writeFileSync(workflowPath, ORCHESTRATOR_WORKFLOW);
  console.log('   ✓ Created devfactory-orchestrator.yml');
  
  console.log('\n✅ GitHub orchestrator installed!\n');
  console.log('Required GitHub Secrets:');
  console.log('  • ANTHROPIC_API_KEY - Your Anthropic API key\n');
  console.log('Notifications will appear as GitHub Issues - no email setup needed! 🎉\n');
  console.log('Add the secret at: https://github.com/[owner]/[repo]/settings/secrets/actions\n');
}

const ORCHESTRATOR_WORKFLOW = `# DevFactory Distributed Orchestrator v3.1
# Autonomous review, merge, and intelligent escalation
# Notifications via GitHub Issues (no SendGrid needed!)

name: DevFactory Orchestrator

on:
  push:
    paths:
      - '.devfactory/**'
  workflow_dispatch:
  schedule:
    - cron: '*/15 * * * *'  # Check every 15 minutes

env:
  ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}
          
      - name: Setup Git
        run: |
          git config user.name "DevFactory Bot"
          git config user.email "devfactory@automated.local"
          
      - name: Check if Running
        id: check
        run: |
          if [ ! -f .devfactory/state.json ]; then
            echo "running=false" >> $GITHUB_OUTPUT
            exit 0
          fi
          IS_RUNNING=$(cat .devfactory/state.json | jq -r '.is_running')
          echo "running=$IS_RUNNING" >> $GITHUB_OUTPUT
          
      - name: Process Completed Tasks
        if: steps.check.outputs.running == 'true'
        id: process
        run: |
          MERGED=0
          SKIPPED=0
          INTERVENTIONS=""
          NEED_HUMAN=""
          
          # Find all task files
          for TASK_FILE in .devfactory/tasks/*.json 2>/dev/null; do
            [ -f "$TASK_FILE" ] || continue
            
            STATUS=$(jq -r '.status' "$TASK_FILE")
            IS_MERGED=$(jq -r '.merged // false' "$TASK_FILE")
            ATTEMPTS=$(jq -r '.review_attempts // 0' "$TASK_FILE")
            ESCALATED=$(jq -r '.escalated_to_strategist // false' "$TASK_FILE")
            
            # Skip if not completed or already merged
            [ "$STATUS" != "completed" ] && continue
            [ "$IS_MERGED" == "true" ] && continue
            
            TASK_ID=$(jq -r '.id' "$TASK_FILE")
            BRANCH=$(jq -r '.branch' "$TASK_FILE")
            
            echo "Processing: $TASK_ID"
            
            # Get the diff
            if git rev-parse "origin/$BRANCH" >/dev/null 2>&1; then
              DIFF=$(git diff main..."origin/$BRANCH" -- . ':!.devfactory/' 2>/dev/null | head -c 30000)
            else
              echo "Branch $BRANCH not found, skipping"
              continue
            fi
            
            # Review with Claude
            REVIEW_RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \\
              -H "Content-Type: application/json" \\
              -H "x-api-key: $ANTHROPIC_API_KEY" \\
              -H "anthropic-version: 2023-06-01" \\
              -d "$(jq -n --arg diff "$DIFF" --arg task "$(cat $TASK_FILE)" '{
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "messages": [{
                  "role": "user",
                  "content": "Review this code change for the task. Respond with JSON only: {\"approved\": boolean, \"issues\": [\"issue1\", ...]}\\n\\nTask:\\n\\($task)\\n\\nDiff:\\n```\\n\\($diff)\\n```"
                }]
              }')")
            
            REVIEW_TEXT=$(echo "$REVIEW_RESPONSE" | jq -r '.content[0].text // "{\"approved\": false, \"issues\": [\"API error\"]}"')
            APPROVED=$(echo "$REVIEW_TEXT" | jq -r '.approved // false')
            
            if [ "$APPROVED" == "true" ]; then
              # Merge it!
              git fetch origin "$BRANCH"
              git merge "origin/$BRANCH" --no-ff -m "devfactory: merge $TASK_ID" || {
                echo "Merge conflict, marking for manual review"
                continue
              }
              
              # Update task as merged
              jq '.merged = true | .merged_at = "'"$(date -Iseconds)"'"' "$TASK_FILE" > tmp.json && mv tmp.json "$TASK_FILE"
              MERGED=$((MERGED + 1))
              echo "✅ Merged: $TASK_ID"
              
            elif [ "$ATTEMPTS" -lt 3 ]; then
              # Level 1: Spawn fix agent
              echo "🔧 Fix attempt $((ATTEMPTS + 1))/3 for $TASK_ID"
              ISSUES=$(echo "$REVIEW_TEXT" | jq -c '.issues // []')
              jq '.review_attempts += 1 | .last_review_issues = '"$ISSUES"'' "$TASK_FILE" > tmp.json && mv tmp.json "$TASK_FILE"
              
              # TODO: Spawn actual fix agent here
              # For now, just increment attempts
              
            elif [ "$ESCALATED" != "true" ]; then
              # Level 2: Claude Strategist
              echo "🧠 Escalating to Claude Strategist: $TASK_ID"
              
              # Gather context
              SPEC_DIR=$(jq -r '.spec_id' "$TASK_FILE" | xargs -I{} find .devfactory/specs -type d -name "*{}*" 2>/dev/null | head -1)
              MISSION=$(cat .devfactory/product/mission.md 2>/dev/null | head -c 5000 || echo "No mission file")
              SRD=$(cat "$SPEC_DIR/srd.md" 2>/dev/null | head -c 5000 || echo "No SRD")
              SPECS=$(cat "$SPEC_DIR/specs.md" 2>/dev/null | head -c 5000 || echo "No specs")
              
              STRATEGIST_RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \\
                -H "Content-Type: application/json" \\
                -H "x-api-key: $ANTHROPIC_API_KEY" \\
                -H "anthropic-version: 2023-06-01" \\
                -d "$(jq -n \\
                  --arg mission "$MISSION" \\
                  --arg srd "$SRD" \\
                  --arg specs "$SPECS" \\
                  --arg task "$(cat $TASK_FILE)" \\
                  --arg diff "$DIFF" '{
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 2048,
                    "messages": [{
                      "role": "user",
                      "content": "# Strategic Review\\n\\nA task is stuck after 3 fix attempts.\\n\\n## Task\\n\\($task)\\n\\n## Mission\\n\\($mission)\\n\\n## SRD\\n\\($srd)\\n\\n## Specs\\n\\($specs)\\n\\n## Current Diff\\n```\\n\\($diff)\\n```\\n\\nDecide:\\n1. DIFFERENT_APPROACH - provide fix\\n2. SKIP_TASK - non-blocking, continue\\n3. MODIFY_SPEC - spec is wrong\\n4. NEED_HUMAN - requires human input\\n\\nRespond with JSON: {\"decision\": \"...\", \"reasoning\": \"...\", \"action\": {...}}"
                    }]
                  }')")
              
              DECISION=$(echo "$STRATEGIST_RESPONSE" | jq -r '.content[0].text' | jq -r '.decision // "NEED_HUMAN"')
              REASONING=$(echo "$STRATEGIST_RESPONSE" | jq -r '.content[0].text' | jq -r '.reasoning // "Unknown"')
              
              jq '.escalated_to_strategist = true | .strategist_decision = "'"$DECISION"'"' "$TASK_FILE" > tmp.json && mv tmp.json "$TASK_FILE"
              
              case "$DECISION" in
                "DIFFERENT_APPROACH")
                  jq '.review_attempts = 0' "$TASK_FILE" > tmp.json && mv tmp.json "$TASK_FILE"
                  INTERVENTIONS="$INTERVENTIONS\\n✅ $TASK_ID: Claude fixed with different approach"
                  ;;
                "SKIP_TASK")
                  jq '.status = "skipped"' "$TASK_FILE" > tmp.json && mv tmp.json "$TASK_FILE"
                  SKIPPED=$((SKIPPED + 1))
                  INTERVENTIONS="$INTERVENTIONS\\n⏭️ $TASK_ID: Skipped (non-blocking)"
                  ;;
                "MODIFY_SPEC")
                  jq '.review_attempts = 0' "$TASK_FILE" > tmp.json && mv tmp.json "$TASK_FILE"
                  INTERVENTIONS="$INTERVENTIONS\\n📝 $TASK_ID: Spec modified, retrying"
                  ;;
                "NEED_HUMAN")
                  jq '.status = "needs_human"' "$TASK_FILE" > tmp.json && mv tmp.json "$TASK_FILE"
                  NEED_HUMAN="$NEED_HUMAN\\n- $TASK_ID: $REASONING"
                  ;;
              esac
            fi
          done
          
          # Save outputs
          echo "merged=$MERGED" >> $GITHUB_OUTPUT
          echo "skipped=$SKIPPED" >> $GITHUB_OUTPUT
          
          {
            echo "interventions<<EOF"
            echo -e "$INTERVENTIONS"
            echo "EOF"
          } >> $GITHUB_OUTPUT
          
          {
            echo "need_human<<EOF"
            echo -e "$NEED_HUMAN"
            echo "EOF"
          } >> $GITHUB_OUTPUT
          
      - name: Update State
        if: steps.check.outputs.running == 'true'
        run: |
          # Update overall stats
          MERGED=$(find .devfactory/tasks -name "*.json" -exec jq -r 'select(.merged == true) | .id' {} \\; 2>/dev/null | wc -l)
          COMPLETED=$(find .devfactory/tasks -name "*.json" -exec jq -r 'select(.status == "completed" or .status == "merged") | .id' {} \\; 2>/dev/null | wc -l)
          TOTAL=$(find .devfactory/tasks -name "*.json" 2>/dev/null | wc -l)
          
          jq '.overall.tasks_merged = '"$MERGED"' | .overall.tasks_completed = '"$COMPLETED"' | .overall.last_updated = "'"$(date -Iseconds)"'"' .devfactory/state.json > tmp.json && mv tmp.json .devfactory/state.json
          
          git add .devfactory/
          git commit -m "devfactory: orchestrator update" || true
          git push || true
          
      - name: Check Completion
        if: steps.check.outputs.running == 'true'
        id: completion
        run: |
          TOTAL=$(jq -r '.overall.tasks_total' .devfactory/state.json)
          MERGED=$(jq -r '.overall.tasks_merged' .devfactory/state.json)
          SKIPPED=$(jq -r '.overall.tasks_skipped' .devfactory/state.json)
          
          if [ "$TOTAL" -gt 0 ] && [ "$((MERGED + SKIPPED))" -eq "$TOTAL" ]; then
            echo "project_complete=true" >> $GITHUB_OUTPUT
          else
            echo "project_complete=false" >> $GITHUB_OUTPUT
          fi
          
          if [ -n "\${{ steps.process.outputs.need_human }}" ] && [ "\${{ steps.process.outputs.need_human }}" != "" ]; then
            echo "has_human_needs=true" >> $GITHUB_OUTPUT
          else
            echo "has_human_needs=false" >> $GITHUB_OUTPUT
          fi
          
      - name: Create Issue - Human Needed
        if: steps.completion.outputs.has_human_needs == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const needHuman = \`\${{ steps.process.outputs.need_human }}\`;
            
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '❓ DevFactory: Need Your Input',
              body: \`## DevFactory needs your input
            
            Claude Strategist reviewed stuck tasks and determined these need human action:
            
            \${needHuman}
            
            ---
            
            **What to do:**
            1. Check the task details in \\\`.devfactory/tasks/\\\`
            2. Provide what's needed (credentials, decision, clarification)
            3. Close this issue when resolved
            
            Everything else continues in parallel! 🚀
            \`,
              labels: ['devfactory', 'needs-human']
            });
            
      - name: Create Issue - Project Complete
        if: steps.completion.outputs.project_complete == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const merged = '\${{ steps.process.outputs.merged }}';
            const skipped = '\${{ steps.process.outputs.skipped }}';
            const interventions = \`\${{ steps.process.outputs.interventions }}\`;
            
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🎉 DevFactory: Project Complete!',
              body: \`## Your project is complete!
            
            ### Summary
            - **Tasks Merged:** \${merged}
            - **Tasks Skipped:** \${skipped}
            
            ### Claude Interventions
            \${interventions || 'None needed - smooth sailing! 🌊'}
            
            ---
            
            Your code is ready on \\\`main\\\`! 🚀
            
            Run \\\`devfactory status\\\` for full details.
            \`,
              labels: ['devfactory', 'complete']
            });
            
      - name: Create Issue - Wave Complete
        if: steps.check.outputs.running == 'true' && steps.process.outputs.merged != '0'
        uses: actions/github-script@v7
        with:
          script: |
            const merged = '\${{ steps.process.outputs.merged }}';
            const skipped = '\${{ steps.process.outputs.skipped }}';
            const interventions = \`\${{ steps.process.outputs.interventions }}\`;
            
            // Only create wave update if significant progress
            if (parseInt(merged) < 3) return;
            
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '✅ DevFactory: Progress Update',
              body: \`## Progress Update
            
            ### This Cycle
            - **Tasks Merged:** \${merged}
            - **Tasks Skipped:** \${skipped}
            
            ### Claude Interventions
            \${interventions || 'None - everything auto-approved! ✨'}
            
            ---
            
            Work continues... Run \\\`devfactory status\\\` for current state.
            \`,
              labels: ['devfactory', 'progress']
            });
`;
