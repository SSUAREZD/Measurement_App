module.exports = {
  apps: [
    {
      name: 'measurement-app',
      script: 'dist/measurement-app/server/server.mjs',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
