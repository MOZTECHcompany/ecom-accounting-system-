const { spawn } = require('child_process');

function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function start() {
  try {
    console.log('Starting application...');

    // 1. Construct DATABASE_URL if Cloud SQL vars are present
    if (process.env.CLOUDSQL_INSTANCE && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
      console.log('Configuring Cloud SQL connection...');
      
      const user = encodeURIComponent(process.env.DB_USER);
      const password = encodeURIComponent(process.env.DB_PASSWORD);
      const dbName = encodeURIComponent(process.env.DB_NAME); // Usually db name doesn't need encoding but safe to do
      const instance = process.env.CLOUDSQL_INSTANCE;
      
      // Construct PostgreSQL Connection URL with Unix Socket
      // Format: postgresql://USER:PASSWORD@localhost/DB_NAME?host=/cloudsql/INSTANCE_CONNECTION_NAME
      const databaseUrl = `postgresql://${user}:${password}@localhost/${dbName}?host=/cloudsql/${instance}`;
      
      process.env.DATABASE_URL = databaseUrl;
      console.log(`DATABASE_URL constructed for instance: ${instance}`);
    } else {
        console.log('Skipping Cloud SQL URL construction (Using existing DATABASE_URL or defaults)');
    }

    // 2. Run Prisma Migrations
    console.log('Running pending migrations...');
    try {
        await runCommand('npx', ['prisma', 'migrate', 'deploy']);
        console.log('Migrations completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
        // We do NOT exit here, because sometimes migration fails due to lock but app can still run,
        // or we want to see the app logs.
        console.log('Attempting to start application despite migration failure...');
    }

    // 3. Start NestJS App
    console.log('Starting NestJS server...');
    await runCommand('node', ['dist/main']);

  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

start();
