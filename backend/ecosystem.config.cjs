/**
 * PM2 ecosystem for Oracle Always Free (Phase 16).
 * Usage: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'captain-truck-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      time: true,
      kill_timeout: 10_000,
    },
  ],
};
