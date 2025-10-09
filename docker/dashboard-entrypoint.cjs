#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const workspacePackagePath = path.join(__dirname, '..', 'apps', 'dashboard', 'package.json');
const port = process.env.PORT || 4173;

function launchWorkspaceStart() {
  try {
    const pkg = JSON.parse(fs.readFileSync(workspacePackagePath, 'utf8'));
    if (pkg?.scripts?.start) {
      const child = spawn(
        'npm',
        ['run', 'start', '--workspace', pkg.name ?? '@meta-chat/dashboard'],
        {
          stdio: 'inherit',
          env: process.env,
        },
      );
      child.on('exit', (code) => {
        process.exit(code ?? 0);
      });
      child.on('error', (error) => {
        console.error('Failed to start dashboard workspace:', error);
        process.exit(1);
      });
      const stop = () => child.kill('SIGTERM');
      process.on('SIGTERM', stop);
      process.on('SIGINT', stop);
      return true;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error reading dashboard package.json:', error);
    }
  }
  return false;
}

if (!launchWorkspaceStart()) {
  console.warn('Dashboard workspace start script not found; serving placeholder response.');
  const http = require('http');
  http
    .createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', placeholder: true }));
        return;
      }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('Dashboard service placeholder. Implement apps/dashboard to replace this server.');
    })
    .listen(port, '0.0.0.0', () => {
      console.log(`Dashboard placeholder server listening on port ${port}`);
    });
}
