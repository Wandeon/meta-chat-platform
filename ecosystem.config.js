module.exports = {
  apps: [
    {
      name: 'meta-chat-api',
      script: 'apps/api/dist/index.js',
      cwd: '/home/deploy/meta-chat-platform',
      instances: 2,
      exec_mode: 'cluster',
      env_file: './apps/api/.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
