/**
 * DevFactory v4.5 - Real-time Dashboard
 * 
 * WebSocket-based dashboard for monitoring beast mode progress
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 5555;
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();
const STATE_PATH = path.join(PROJECT_ROOT, '.devfactory', 'beast', 'state.json');

// Serve static dashboard
app.get('/', (req, res) => {
  res.send(getDashboardHTML());
});

// API endpoint for current state
app.get('/api/state', (req, res) => {
  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    res.json(state);
  } else {
    res.json({ status: 'not_started' });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Dashboard client connected');
  
  // Send initial state
  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    socket.emit('state', state);
  }
  
  socket.on('disconnect', () => {
    console.log('Dashboard client disconnected');
  });
});

// Watch state file for changes
if (fs.existsSync(path.dirname(STATE_PATH))) {
  const watcher = chokidar.watch(STATE_PATH, { persistent: true });
  
  watcher.on('change', () => {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      io.emit('state', state);
    } catch (error) {
      console.error('Error reading state:', error);
    }
  });
}

server.listen(PORT, () => {
  console.log(`🦁 DevFactory Dashboard running at http://localhost:${PORT}`);
});

function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevFactory v4.5 - Beast Mode Dashboard</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
      background: #0d1117;
      color: #c9d1d9;
      padding: 20px;
      min-height: 100vh;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 2em;
      color: #f0883e;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #8b949e;
      font-size: 0.9em;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 20px;
    }
    .card h2 {
      font-size: 1em;
      color: #8b949e;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .progress-container {
      margin-bottom: 20px;
    }
    .progress-bar {
      height: 30px;
      background: #21262d;
      border-radius: 5px;
      overflow: hidden;
      position: relative;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #238636, #2ea043);
      transition: width 0.5s ease;
    }
    .progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-weight: bold;
      color: white;
      text-shadow: 0 0 5px rgba(0,0,0,0.5);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      text-align: center;
    }
    .stat {
      background: #21262d;
      padding: 15px;
      border-radius: 5px;
    }
    .stat-value {
      font-size: 1.5em;
      font-weight: bold;
      color: #58a6ff;
    }
    .stat-label {
      font-size: 0.8em;
      color: #8b949e;
      margin-top: 5px;
    }
    .worker {
      display: flex;
      align-items: center;
      padding: 10px;
      background: #21262d;
      border-radius: 5px;
      margin-bottom: 10px;
    }
    .worker-icon {
      font-size: 1.5em;
      margin-right: 15px;
    }
    .worker-info {
      flex: 1;
    }
    .worker-name {
      font-weight: bold;
      color: #c9d1d9;
    }
    .worker-status {
      font-size: 0.9em;
      color: #8b949e;
    }
    .worker-task {
      font-size: 0.8em;
      color: #58a6ff;
      margin-top: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity {
      max-height: 300px;
      overflow-y: auto;
    }
    .activity-item {
      padding: 8px 10px;
      border-bottom: 1px solid #21262d;
      font-size: 0.85em;
    }
    .activity-item:last-child {
      border-bottom: none;
    }
    .activity-time {
      color: #8b949e;
      margin-right: 10px;
    }
    .queue-bar {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .queue-label {
      width: 80px;
      color: #8b949e;
    }
    .queue-fill {
      flex: 1;
      height: 20px;
      background: #21262d;
      border-radius: 3px;
      overflow: hidden;
    }
    .queue-fill-inner {
      height: 100%;
      background: #58a6ff;
      transition: width 0.3s ease;
    }
    .queue-count {
      width: 40px;
      text-align: right;
      color: #8b949e;
    }
    .status-working { color: #f0883e; }
    .status-verifying { color: #a371f7; }
    .status-idle { color: #8b949e; }
    .status-stuck { color: #f85149; }
    .status-offline { color: #484f58; }
    .orchestrator-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 0.8em;
      margin-left: 10px;
    }
    .orchestrator-active {
      background: #238636;
      color: white;
    }
    .orchestrator-paused {
      background: #f0883e;
      color: white;
    }
    .no-golfing {
      font-size: 0.9em;
      color: #8b949e;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🦁 DevFactory v4.5</h1>
    <div class="subtitle">Beast Mode Dashboard - Active Orchestration</div>
    <div class="no-golfing">🏌️❌ No Golfing Mode</div>
  </div>

  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
      <div class="progress-text" id="progress-text">0%</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Stats</h2>
      <div class="stats">
        <div class="stat">
          <div class="stat-value" id="stat-completed">0</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="stat-pending">0</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="stat-failed">0</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="stat-stuck">0</div>
          <div class="stat-label">Stuck</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Orchestrator <span class="orchestrator-badge orchestrator-active" id="orch-badge">Active</span></h2>
      <div id="orchestrator-info">
        <div>Polls: <span id="orch-polls">0</span></div>
        <div>Last poll: <span id="orch-last">-</span></div>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Workers</h2>
      <div id="workers"></div>
    </div>

    <div class="card">
      <h2>Queues</h2>
      <div id="queues"></div>
    </div>
  </div>

  <div class="card">
    <h2>Activity Feed</h2>
    <div class="activity" id="activity"></div>
  </div>

  <script>
    const socket = io();
    
    socket.on('state', (state) => {
      updateDashboard(state);
    });
    
    function updateDashboard(state) {
      if (!state || state.status === 'not_started') {
        return;
      }
      
      // Progress
      const completed = state.stats?.completedTasks || 0;
      const total = state.stats?.totalTasks || 1;
      const percent = Math.round((completed / total) * 100);
      
      document.getElementById('progress-fill').style.width = percent + '%';
      document.getElementById('progress-text').textContent = percent + '% (' + completed + '/' + total + ')';
      
      // Stats
      document.getElementById('stat-completed').textContent = completed;
      document.getElementById('stat-pending').textContent = total - completed - (state.stats?.stuckTasks || 0);
      document.getElementById('stat-failed').textContent = state.stats?.failedTasks || 0;
      document.getElementById('stat-stuck').textContent = state.stats?.stuckTasks || 0;
      
      // Orchestrator
      const orchBadge = document.getElementById('orch-badge');
      orchBadge.textContent = state.orchestrator?.status || 'unknown';
      orchBadge.className = 'orchestrator-badge orchestrator-' + (state.orchestrator?.status || 'paused');
      document.getElementById('orch-polls').textContent = state.orchestrator?.totalPolls || 0;
      document.getElementById('orch-last').textContent = state.orchestrator?.lastPoll?.substring(11, 19) || '-';
      
      // Workers
      const workersDiv = document.getElementById('workers');
      workersDiv.innerHTML = '';
      
      const icons = {
        'working': '🔨',
        'verifying': '🔍',
        'idle': '😴',
        'stuck': '🚨',
        'offline': '💀'
      };
      
      for (const [id, worker] of Object.entries(state.workers || {})) {
        const task = worker.currentTask ? state.tasks[worker.currentTask]?.title : null;
        workersDiv.innerHTML += \`
          <div class="worker">
            <div class="worker-icon">\${icons[worker.status] || '❓'}</div>
            <div class="worker-info">
              <div class="worker-name">\${id}</div>
              <div class="worker-status status-\${worker.status}">\${worker.status}</div>
              \${task ? '<div class="worker-task">' + task + '</div>' : ''}
            </div>
          </div>
        \`;
      }
      
      // Queues
      const queuesDiv = document.getElementById('queues');
      const maxQueue = Math.max(
        state.queues?.database?.length || 0,
        state.queues?.backend?.length || 0,
        state.queues?.frontend?.length || 0,
        state.queues?.testing?.length || 0,
        1
      );
      
      queuesDiv.innerHTML = '';
      const queueNames = { database: 'Database', backend: 'Backend', frontend: 'Frontend', testing: 'Testing' };
      
      for (const [key, label] of Object.entries(queueNames)) {
        const count = state.queues?.[key]?.length || 0;
        const width = (count / maxQueue) * 100;
        queuesDiv.innerHTML += \`
          <div class="queue-bar">
            <div class="queue-label">\${label}</div>
            <div class="queue-fill">
              <div class="queue-fill-inner" style="width: \${width}%"></div>
            </div>
            <div class="queue-count">\${count}</div>
          </div>
        \`;
      }
      
      // Activity
      const activityDiv = document.getElementById('activity');
      activityDiv.innerHTML = '';
      
      const activities = (state.activity || []).slice(-20).reverse();
      for (const entry of activities) {
        const time = entry.timestamp?.substring(11, 19) || '';
        activityDiv.innerHTML += \`
          <div class="activity-item">
            <span class="activity-time">\${time}</span>
            \${entry.message}
          </div>
        \`;
      }
    }
    
    // Initial load
    fetch('/api/state')
      .then(r => r.json())
      .then(updateDashboard);
  </script>
</body>
</html>`;
}
