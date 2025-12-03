/**
 * BEAST DASHBOARD
 * 
 * A live web dashboard that shows:
 * - Pipeline progress (all 4 workers)
 * - Spec completion status
 * - Task activity feed
 * - Test results
 * - Links to the live app preview
 * 
 * Opens automatically when you /release-the-beast
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const DEFAULT_PORT = 5555;

interface DashboardConfig {
  projectPath: string;
  port: number;
  appPreviewUrl?: string;
}

export function startDashboard(config: DashboardConfig): http.Server {
  const { projectPath, port, appPreviewUrl } = config;
  const devfactoryDir = path.join(projectPath, '.devfactory');
  
  const server = http.createServer((req, res) => {
    // CORS headers for potential embedding
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.url === '/api/state') {
      // Return current state as JSON
      res.setHeader('Content-Type', 'application/json');
      try {
        const statePath = path.join(devfactoryDir, 'beast', 'state.json');
        if (fs.existsSync(statePath)) {
          const state = fs.readFileSync(statePath, 'utf-8');
          res.end(state);
        } else {
          // Try the distributed state.json
          const altPath = path.join(devfactoryDir, 'state.json');
          if (fs.existsSync(altPath)) {
            res.end(fs.readFileSync(altPath, 'utf-8'));
          } else {
            res.end(JSON.stringify({ error: 'No state file found' }));
          }
        }
      } catch (error) {
        res.end(JSON.stringify({ error: String(error) }));
      }
    } else if (req.url === '/api/logs') {
      // Return recent activity
      res.setHeader('Content-Type', 'application/json');
      try {
        const logPath = path.join(devfactoryDir, 'beast', 'logs', 'activity.log');
        if (fs.existsSync(logPath)) {
          const logs = fs.readFileSync(logPath, 'utf-8').split('\n').slice(-50);
          res.end(JSON.stringify({ logs }));
        } else {
          res.end(JSON.stringify({ logs: [] }));
        }
      } catch (error) {
        res.end(JSON.stringify({ logs: [], error: String(error) }));
      }
    } else if (req.url === '/api/tests') {
      // Return test results
      res.setHeader('Content-Type', 'application/json');
      try {
        const testsDir = path.join(devfactoryDir, 'beast', 'test-results');
        if (fs.existsSync(testsDir)) {
          const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.json'));
          const results = files.map(f => {
            const content = fs.readFileSync(path.join(testsDir, f), 'utf-8');
            return JSON.parse(content);
          });
          res.end(JSON.stringify({ results }));
        } else {
          res.end(JSON.stringify({ results: [] }));
        }
      } catch (error) {
        res.end(JSON.stringify({ results: [], error: String(error) }));
      }
    } else {
      // Serve the dashboard HTML
      res.setHeader('Content-Type', 'text/html');
      res.end(generateDashboardHTML(appPreviewUrl || 'http://localhost:3000'));
    }
  });
  
  server.listen(port, () => {
    console.log(`\n🖥️  Beast Dashboard running at: http://localhost:${port}\n`);
  });
  
  return server;
}

function generateDashboardHTML(appPreviewUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🦁 Beast Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
    }
    
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 20px 30px;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header h1 {
      font-size: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .header .status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #1a3a1a;
      border-radius: 20px;
      font-size: 14px;
    }
    
    .header .status.running { background: #1a3a1a; }
    .header .status.paused { background: #3a3a1a; }
    .header .status.complete { background: #1a1a3a; }
    
    .pulse {
      width: 10px;
      height: 10px;
      background: #4ade80;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 20px;
      max-width: 1600px;
      margin: 0 auto;
    }
    
    .panel {
      background: #1a1a1a;
      border-radius: 12px;
      border: 1px solid #333;
      overflow: hidden;
    }
    
    .panel-header {
      background: #222;
      padding: 15px 20px;
      font-weight: 600;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .panel-content {
      padding: 20px;
    }
    
    /* Pipeline */
    .pipeline {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }
    
    .worker {
      flex: 1;
      background: #222;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .worker.idle { border: 2px solid #444; }
    .worker.working { border: 2px solid #4ade80; box-shadow: 0 0 20px rgba(74, 222, 128, 0.2); }
    .worker.waiting { border: 2px solid #fbbf24; }
    .worker.error { border: 2px solid #ef4444; }
    
    .worker-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .worker-name {
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .worker-status {
      font-size: 12px;
      color: #888;
    }
    
    .worker-task {
      font-size: 11px;
      color: #4ade80;
      margin-top: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* Progress */
    .progress-bar {
      height: 8px;
      background: #333;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4ade80 0%, #22d3ee 100%);
      transition: width 0.5s ease;
    }
    
    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #888;
    }
    
    /* Specs */
    .spec-list {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .spec-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-bottom: 1px solid #333;
    }
    
    .spec-item:last-child { border-bottom: none; }
    
    .spec-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
    
    .spec-icon.pending { background: #333; }
    .spec-icon.in_progress { background: #4ade80; color: #000; }
    .spec-icon.complete { background: #22d3ee; color: #000; }
    
    .spec-name {
      flex: 1;
    }
    
    .spec-tasks {
      font-size: 12px;
      color: #888;
    }
    
    /* Activity */
    .activity-feed {
      max-height: 250px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      line-height: 1.6;
    }
    
    .activity-item {
      padding: 5px 0;
      border-bottom: 1px solid #222;
    }
    
    .activity-time {
      color: #666;
      margin-right: 10px;
    }
    
    .activity-type {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      margin-right: 8px;
    }
    
    .activity-type.merge { background: #4ade80; color: #000; }
    .activity-type.review { background: #fbbf24; color: #000; }
    .activity-type.task { background: #22d3ee; color: #000; }
    .activity-type.error { background: #ef4444; color: #fff; }
    
    /* Preview */
    .preview-frame {
      width: 100%;
      height: 400px;
      border: none;
      border-radius: 8px;
      background: #000;
    }
    
    .preview-link {
      display: inline-block;
      margin-top: 10px;
      color: #4ade80;
      text-decoration: none;
    }
    
    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    
    .stat {
      text-align: center;
      padding: 15px;
      background: #222;
      border-radius: 8px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #4ade80;
    }
    
    .stat-label {
      font-size: 12px;
      color: #888;
      margin-top: 5px;
    }
    
    /* Full width panels */
    .full-width {
      grid-column: 1 / -1;
    }
    
    /* Responsive */
    @media (max-width: 1000px) {
      .container {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🦁 Beast Dashboard</h1>
    <div class="status running" id="status">
      <div class="pulse"></div>
      <span>Running</span>
    </div>
  </div>
  
  <div class="container">
    <!-- Pipeline Status -->
    <div class="panel full-width">
      <div class="panel-header">
        <span>4-Stage Pipeline</span>
        <span id="pipeline-time">--:--:--</span>
      </div>
      <div class="panel-content">
        <div class="pipeline">
          <div class="worker idle" id="worker-database">
            <div class="worker-icon">🗄️</div>
            <div class="worker-name">Database</div>
            <div class="worker-status">Idle</div>
            <div class="worker-task"></div>
          </div>
          <div style="display: flex; align-items: center; color: #444;">→</div>
          <div class="worker idle" id="worker-backend">
            <div class="worker-icon">⚙️</div>
            <div class="worker-name">Backend</div>
            <div class="worker-status">Waiting</div>
            <div class="worker-task"></div>
          </div>
          <div style="display: flex; align-items: center; color: #444;">→</div>
          <div class="worker idle" id="worker-frontend">
            <div class="worker-icon">🎨</div>
            <div class="worker-name">Frontend</div>
            <div class="worker-status">Waiting</div>
            <div class="worker-task"></div>
          </div>
          <div style="display: flex; align-items: center; color: #444;">→</div>
          <div class="worker idle" id="worker-testing">
            <div class="worker-icon">🧪</div>
            <div class="worker-name">Testing</div>
            <div class="worker-status">Waiting</div>
            <div class="worker-task"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Stats -->
    <div class="panel full-width">
      <div class="panel-content">
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-value" id="stat-specs">0/0</div>
            <div class="stat-label">Specs Complete</div>
          </div>
          <div class="stat">
            <div class="stat-value" id="stat-tasks">0/0</div>
            <div class="stat-label">Tasks Merged</div>
          </div>
          <div class="stat">
            <div class="stat-value" id="stat-tests">0</div>
            <div class="stat-label">Tests Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value" id="stat-cost">$0.00</div>
            <div class="stat-label">API Cost</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Overall Progress -->
    <div class="panel">
      <div class="panel-header">Overall Progress</div>
      <div class="panel-content">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">
          <span id="progress-percent">0%</span>
          <span id="progress-eta">ETA: calculating...</span>
        </div>
      </div>
    </div>
    
    <!-- Specs -->
    <div class="panel">
      <div class="panel-header">Specs</div>
      <div class="panel-content">
        <div class="spec-list" id="spec-list">
          <div class="spec-item">
            <div class="spec-icon pending">○</div>
            <div class="spec-name">Loading...</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Activity Feed -->
    <div class="panel">
      <div class="panel-header">Activity</div>
      <div class="panel-content">
        <div class="activity-feed" id="activity-feed">
          <div class="activity-item">
            <span class="activity-time">--:--:--</span>
            <span>Waiting for beast to start...</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- App Preview -->
    <div class="panel">
      <div class="panel-header">
        <span>Live Preview</span>
        <a href="${appPreviewUrl}" target="_blank" class="preview-link">Open in new tab ↗</a>
      </div>
      <div class="panel-content">
        <iframe 
          src="${appPreviewUrl}" 
          class="preview-frame" 
          id="preview-frame"
          sandbox="allow-same-origin allow-scripts allow-forms"
        ></iframe>
      </div>
    </div>
  </div>
  
  <script>
    // Poll for updates
    async function fetchState() {
      try {
        const res = await fetch('/api/state');
        const state = await res.json();
        updateDashboard(state);
      } catch (e) {
        console.error('Failed to fetch state:', e);
      }
    }
    
    function updateDashboard(state) {
      if (!state || state.error) return;
      
      // Update status
      const statusEl = document.getElementById('status');
      if (state.is_running) {
        statusEl.className = 'status running';
        statusEl.innerHTML = '<div class="pulse"></div><span>Running</span>';
      } else if (state.overall?.specs_completed === state.overall?.specs_total && state.overall?.specs_total > 0) {
        statusEl.className = 'status complete';
        statusEl.innerHTML = '<span>🎉 Complete!</span>';
      } else {
        statusEl.className = 'status paused';
        statusEl.innerHTML = '<span>Paused</span>';
      }
      
      // Update workers
      const pipeline = state.pipeline || {};
      ['database', 'backend', 'frontend', 'testing'].forEach(worker => {
        const el = document.getElementById('worker-' + worker);
        const data = pipeline[worker] || {};
        
        el.className = 'worker ' + (data.status || 'idle');
        el.querySelector('.worker-status').textContent = data.status || 'Idle';
        el.querySelector('.worker-task').textContent = data.current_task || '';
      });
      
      // Update stats
      const overall = state.overall || {};
      document.getElementById('stat-specs').textContent = 
        (overall.specs_completed || 0) + '/' + (overall.specs_total || 0);
      document.getElementById('stat-tasks').textContent = 
        (overall.tasks_merged || 0) + '/' + (overall.tasks_total || 0);
      document.getElementById('stat-tests').textContent = overall.tests_passed || 0;
      document.getElementById('stat-cost').textContent = '$' + (state.stats?.estimated_cost || 0).toFixed(2);
      
      // Update progress
      const total = overall.tasks_total || 1;
      const done = (overall.tasks_merged || 0) + (overall.tasks_skipped || 0);
      const percent = Math.round((done / total) * 100);
      
      document.getElementById('progress-fill').style.width = percent + '%';
      document.getElementById('progress-percent').textContent = percent + '%';
      
      // Update specs
      const specs = state.specs || {};
      const specList = document.getElementById('spec-list');
      specList.innerHTML = Object.entries(specs).map(([id, spec]) => {
        const s = spec;
        const icon = s.status === 'complete' ? '✓' : s.status === 'in_progress' ? '◉' : '○';
        const iconClass = s.status || 'pending';
        return \`
          <div class="spec-item">
            <div class="spec-icon \${iconClass}">\${icon}</div>
            <div class="spec-name">\${s.name || id}</div>
            <div class="spec-tasks">\${s.tasks_merged || 0}/\${s.tasks_total || 0}</div>
          </div>
        \`;
      }).join('') || '<div class="spec-item"><div class="spec-icon pending">○</div><div class="spec-name">No specs yet</div></div>';
      
      // Update activity from log
      const log = state.activity_log || [];
      const activityFeed = document.getElementById('activity-feed');
      activityFeed.innerHTML = log.slice(-20).reverse().map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const type = entry.type || 'info';
        return \`
          <div class="activity-item">
            <span class="activity-time">\${time}</span>
            <span class="activity-type \${type}">\${type}</span>
            <span>\${entry.description || entry.message || ''}</span>
          </div>
        \`;
      }).join('') || '<div class="activity-item"><span class="activity-time">--:--:--</span><span>No activity yet</span></div>';
    }
    
    // Poll every 2 seconds
    setInterval(fetchState, 2000);
    fetchState();
    
    // Update time
    setInterval(() => {
      document.getElementById('pipeline-time').textContent = new Date().toLocaleTimeString();
    }, 1000);
  </script>
</body>
</html>`;
}

// CLI entry point
export async function dashboardCommand(options: { port?: string; appUrl?: string }) {
  const port = parseInt(options.port || String(DEFAULT_PORT));
  const appUrl = options.appUrl || 'http://localhost:3000';
  
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   🦁 BEAST DASHBOARD                                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const server = startDashboard({
    projectPath: process.cwd(),
    port,
    appPreviewUrl: appUrl,
  });
  
  // Open in browser
  const url = `http://localhost:${port}`;
  console.log(`   Opening ${url} in your browser...`);
  
  try {
    const openCmd = process.platform === 'darwin' ? 'open' :
                    process.platform === 'win32' ? 'start' : 'xdg-open';
    execSync(`${openCmd} ${url}`, { stdio: 'ignore' });
  } catch {
    console.log(`   Could not auto-open. Please visit: ${url}`);
  }
  
  console.log('');
  console.log('   Press Ctrl+C to stop the dashboard');
  console.log('');
}
