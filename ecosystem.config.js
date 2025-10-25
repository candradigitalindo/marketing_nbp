// PM2 Ecosystem Configuration for Production
// Install PM2: npm install -g pm2
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'marketing-nbp-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1, // atau 'max' untuk gunakan semua CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
    },
    {
      name: 'marketing-nbp-worker',
      script: 'worker.ts',
      interpreter: 'node_modules/.bin/tsx',
      instances: 1, // Worker sebaiknya 1 instance
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M',
      watch: false,
    },
  ],
};
