module.exports = {
  apps: [{
    name: 'brain-server',
    script: './server/server.js',
    cwd: '/var/www/daily-brain-exercise',
    env: {
      NODE_ENV: 'production'
    },
    restart_delay: 3000,
    max_restarts: 10,
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
