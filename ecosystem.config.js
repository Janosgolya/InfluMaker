module.exports = {
  apps: [
    {
      name: 'george-producer-cron',
      script: 'src/agents/george.js',
      args: '--tick',
      cron_restart: '0 6,11,16,20 * * *', // 4 times daily (06:00 MORNING, 11:00 MIDDAY, 16:00 PREP, 20:00 NIGHT UTC)
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2_george_error.log',
      out_file: 'logs/pm2_george_out.log'
    }
  ]
};
