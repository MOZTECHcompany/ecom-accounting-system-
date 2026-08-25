const { spawn } = require('child_process');
const { configureDatabaseUrl } = require('./database-url');

configureDatabaseUrl();

const migration = spawn('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});

migration.on('error', (error) => {
  console.error('Unable to start Prisma migration:', error);
  process.exit(1);
});

migration.on('close', (code, signal) => {
  if (signal) {
    console.error(`Prisma migration terminated by ${signal}`);
    process.exit(1);
  }
  process.exit(code || 0);
});
