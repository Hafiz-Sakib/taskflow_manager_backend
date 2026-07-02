module.exports = {
  apps: [
    {
      name: 'taskflow-api',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
