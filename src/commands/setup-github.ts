/**
 * SETUP GITHUB (Legacy)
 * 
 * This command was for the GitHub Actions-based orchestrator.
 * DevFactory v4.0 uses LOCAL orchestration instead - no GitHub Actions needed!
 */

import * as fs from 'fs';
import * as path from 'path';

export async function setupGithubCommand() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                           ║');
  console.log('║   📣 DevFactory v4.0 uses LOCAL orchestration!                            ║');
  console.log('║                                                                           ║');
  console.log('║   GitHub Actions orchestration is no longer needed.                       ║');
  console.log('║   The local orchestrator is faster, simpler, and works offline.           ║');
  console.log('║                                                                           ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                           ║');
  console.log('║   Instead of setting up GitHub Actions, just run:                         ║');
  console.log('║                                                                           ║');
  console.log('║      devfactory release-the-beast                                         ║');
  console.log('║                                                                           ║');
  console.log('║   This will:                                                              ║');
  console.log('║   • Start a local orchestrator (no cloud needed)                          ║');
  console.log('║   • Spawn 4 worker tmux sessions                                          ║');
  console.log('║   • Review code via Anthropic API                                         ║');
  console.log('║   • Merge branches locally                                                ║');
  console.log('║   • Push to GitHub only for backup (after each spec)                      ║');
  console.log('║                                                                           ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                           ║');
  console.log('║   Benefits of local orchestration:                                        ║');
  console.log('║   • Instant coordination (no network latency)                             ║');
  console.log('║   • Works offline                                                         ║');
  console.log('║   • Easier debugging (just tmux attach)                                   ║');
  console.log('║   • No GitHub Actions minutes used                                        ║');
  console.log('║   • No secrets to configure                                               ║');
  console.log('║                                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const cwd = process.cwd();
  const devfactoryDir = path.join(cwd, '.devfactory');
  
  if (!fs.existsSync(devfactoryDir)) {
    console.log('Note: DevFactory not initialized in this directory.');
    console.log('      Run: devfactory init --name "YourProject"');
    console.log('');
    return;
  }
  
  console.log('If you still want GitHub Actions for multi-machine/team scenarios,');
  console.log('see: https://github.com/JohnNorquay/devfactory-distributed#github-actions');
  console.log('');
}
