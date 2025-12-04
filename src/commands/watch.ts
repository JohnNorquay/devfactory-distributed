import { execSync } from 'child_process';

export async function watchCommand(options: { layout?: string }) {
  const layout = options.layout || 'grid';
  
  console.log('👁️  Opening Beast Watcher...\n');
  
  // Check if beast sessions exist
  const sessions = ['df-orchestrator', 'df-oracle', 'df-database', 'df-backend', 'df-frontend', 'df-testing'];
  const existingSessions: string[] = [];
  
  for (const session of sessions) {
    try {
      execSync(`tmux has-session -t ${session} 2>/dev/null`, { stdio: 'pipe' });
      existingSessions.push(session);
    } catch {
      // Session doesn't exist
    }
  }
  
  if (existingSessions.length === 0) {
    console.log('❌ No beast sessions found. Run "devfactory release-the-beast" first!\n');
    process.exit(1);
  }
  
  console.log(`Found ${existingSessions.length} active sessions: ${existingSessions.join(', ')}\n`);
  
  // Kill existing watch session if it exists
  try {
    execSync('tmux kill-session -t beast-watch 2>/dev/null', { stdio: 'pipe' });
  } catch {
    // Session didn't exist, that's fine
  }
  
  // Create the watch session
  execSync('tmux new-session -d -s beast-watch', { stdio: 'pipe' });
  
  if (layout === 'grid' && existingSessions.length >= 4) {
    // Create 2x3 grid for 6 sessions or 2x2 for 4
    const paneCount = Math.min(existingSessions.length, 6);
    
    // Split into grid
    // Start with one pane, split to create grid
    execSync('tmux split-window -h -t beast-watch', { stdio: 'pipe' });  // 2 panes side by side
    execSync('tmux split-window -v -t beast-watch:0.0', { stdio: 'pipe' });  // Split left top
    execSync('tmux split-window -v -t beast-watch:0.2', { stdio: 'pipe' });  // Split right top
    
    if (paneCount >= 5) {
      execSync('tmux split-window -v -t beast-watch:0.1', { stdio: 'pipe' });  // Split left bottom
    }
    if (paneCount >= 6) {
      execSync('tmux split-window -v -t beast-watch:0.4', { stdio: 'pipe' });  // Split right bottom
    }
    
    // Assign sessions to panes
    for (let i = 0; i < Math.min(paneCount, existingSessions.length); i++) {
      const session = existingSessions[i];
      // Send command to attach to the session (read-only style with watch)
      execSync(`tmux send-keys -t beast-watch:0.${i} "tmux attach -t ${session}" Enter`, { stdio: 'pipe' });
    }
    
    // Even out the layout
    execSync('tmux select-layout -t beast-watch tiled', { stdio: 'pipe' });
    
  } else {
    // Simple layout - just show first 4 in a 2x2
    execSync('tmux split-window -h -t beast-watch', { stdio: 'pipe' });
    execSync('tmux split-window -v -t beast-watch:0.0', { stdio: 'pipe' });
    execSync('tmux split-window -v -t beast-watch:0.1', { stdio: 'pipe' });
    
    for (let i = 0; i < Math.min(4, existingSessions.length); i++) {
      execSync(`tmux send-keys -t beast-watch:0.${i} "tmux attach -t ${existingSessions[i]}" Enter`, { stdio: 'pipe' });
    }
    
    execSync('tmux select-layout -t beast-watch tiled', { stdio: 'pipe' });
  }
  
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  🦁 BEAST WATCHER                                           │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│  Pane Layout:                                               │');
  console.log('│  ┌─────────────┬─────────────┐                              │');
  console.log('│  │ Orchestrator│   Oracle    │                              │');
  console.log('│  ├─────────────┼─────────────┤                              │');
  console.log('│  │  Database   │   Backend   │                              │');
  console.log('│  ├─────────────┼─────────────┤                              │');
  console.log('│  │  Frontend   │   Testing   │                              │');
  console.log('│  └─────────────┴─────────────┘                              │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log('│  Controls:                                                  │');
  console.log('│  • Ctrl+B then arrow keys = move between panes              │');
  console.log('│  • Ctrl+B then z = zoom current pane (toggle)               │');
  console.log('│  • Ctrl+B then d = detach (exit watcher)                    │');
  console.log('│  • Ctrl+B then [ = scroll mode (q to exit)                  │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('Attaching to beast-watch...\n');
  
  // Attach to the watch session (this replaces current process)
  try {
    execSync('tmux attach -t beast-watch', { stdio: 'inherit' });
  } catch {
    // User detached, that's fine
    console.log('\n👋 Detached from beast watcher. Sessions still running!');
  }
}
