# DevFactory v4.1 - Issues & Improvements

Tracked from first live test run (MyCPA project, Dec 3 2025)

---

## 🔴 Critical Issues

### 1. Workers Don't Auto-Poll
**Problem:** Workers complete initial tasks then stop at prompt, waiting for input
**Expected:** Workers should poll state.json every 30s and pick up new tasks automatically
**Fix:** Update bootstrap prompts with continuous polling loop

### 2. Workers Need Subagent Pattern
**Problem:** Workers accumulate context with every task, eventually hitting limits
**Expected:** Worker stays lean, spawns subagent per task, subagent context freed after
**Fix:** Rewrite bootstrap to use subagent architecture:
```
Worker (orchestrator loop)
   └── Spawn subagent → Task → Complete → Context freed
```

---

## 🟡 Dashboard Issues

### 3. Pipeline Status Not Syncing
**Problem:** Backend shows "waiting" when actually working
**Cause:** Workers not writing status updates to state.json properly
**Fix:** Ensure workers update `pipeline.[worker].status` in state.json

### 4. Specs Card Shows 0/0
**Problem:** Specs completed counter stuck at 0/0
**Cause:** Dashboard reading wrong path in state.json OR workers not updating spec status
**Fix:** Verify state.json structure matches dashboard expectations

### 5. Tasks Merged Shows 0/0
**Problem:** No task count even though work is happening
**Cause:** Workers not incrementing `stats.tasks_merged` in state.json
**Fix:** Workers must update stats after each task completion

### 6. Tests Passed Shows 0
**Problem:** Testing worker is working but counter is 0
**Cause:** Test results not being written to expected location
**Fix:** Testing worker should update `stats.tests_passed`

### 7. Overall Progress Stuck at 0%
**Problem:** Progress bar and ETA never update
**Cause:** Depends on tasks_completed/tasks_total which aren't being updated
**Fix:** Fix task counting (issue #5)

### 8. Activity Feed Timezone
**Problem:** Not showing Central time
**Fix:** Add timezone support to dashboard, use user's locale or configurable TZ

### 9. Live Preview Not Starting
**Problem:** :3000 preview pane is dead
**Cause:** `npm run dev` never triggered
**Fix:** Frontend worker should start dev server after initial setup, OR orchestrator starts it when frontend layer begins

---

## 🟢 Enhancements

### 10. Slash Command Registration
**Problem:** `/plan-product` etc. don't register as native Claude Code commands
**Current Workaround:** CLAUDE.md file mapping commands to files
**Fix:** Investigate Claude Code plugin manifest format for custom slash commands

### 11. SSH Tunnel for Dashboard
**Problem:** Dashboard only accessible from WSL localhost, not network
**Current Workaround:** SSH tunnel `-L 5555:localhost:5555`
**Fix:** Dashboard should bind to 0.0.0.0 or auto-setup port forwarding

### 12. Worker Health Heartbeats
**Problem:** No way to know if a worker is stuck vs. working on long task
**Fix:** Workers should write heartbeat timestamp to state.json every 60s

### 13. Better Bootstrap Injection
**Problem:** Had to manually hit Enter in each tmux session to start
**Fix:** Improve tmux send-keys timing or use expect-style automation

---

## 📋 v4.1 Implementation Checklist

- [ ] Rewrite bootstrap-database.md with subagent pattern
- [ ] Rewrite bootstrap-backend.md with subagent pattern
- [ ] Rewrite bootstrap-frontend.md with subagent pattern
- [ ] Rewrite bootstrap-testing.md with subagent pattern
- [ ] Add continuous polling loop to all bootstraps
- [ ] Fix state.json update calls in worker instructions
- [ ] Update dashboard to read correct state.json paths
- [ ] Add timezone config to dashboard
- [ ] Add dev server auto-start to frontend worker
- [ ] Add heartbeat mechanism
- [ ] Bind dashboard to 0.0.0.0
- [ ] Test full end-to-end run

---

## 📝 Notes from First Run

- 8 specs, 252 tasks, 5 waves
- Database completed successfully
- Frontend working on tasks
- Backend waiting for Wave 2 (correct - Foundation had no backend tasks)
- Testing waiting for frontend (correct)
- Workers are doing the work, just state.json sync is broken
- Overall: Architecture works, plumbing needs fixes

---

*Last updated: Dec 3, 2025*
