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

    // 1. Construct DATABASE_URL if Cloud SQL vars are present (or use defaults)
    // Defaults from Dockerfile
    const defaultInstance = 'moztech-main-db:asia-east1:moztech-main-db';
    const defaultUser = 'erp_user';
    const defaultDb = 'erp_db';

    const instance = process.env.CLOUDSQL_INSTANCE || defaultInstance;
    const dbUser = process.env.DB_USER || defaultUser;
    const dbNameRaw = process.env.DB_NAME || defaultDb;
    
    // We only REQUIRE DB_PASSWORD to be present for this logic to run,
    // assuming valid setup if password is provided.
    // If DB_PASSWORD is missing, we might be in dev mode or using pre-set DATABASE_URL.
    if (process.env.DB_PASSWORD) {
      console.log('Configuring Cloud SQL connection...');
      
      const user = encodeURIComponent(dbUser);
      const password = encodeURIComponent(process.env.DB_PASSWORD);
      const dbName = encodeURIComponent(dbNameRaw);
      
      // Construct PostgreSQL Connection URL with Unix Socket
      // Format: postgresql://USER:PASSWORD@localhost/DB_NAME?host=/cloudsql/INSTANCE_CONNECTION_NAME
      const databaseUrl = `postgresql://${user}:${password}@localhost/${dbName}?host=/cloudsql/${instance}`;
      
      process.env.DATABASE_URL = databaseUrl;
      console.log(`DATABASE_URL constructed for instance: ${instance}`);
    } else {
        console.log('Skipping Cloud SQL URL construction (DB_PASSWORD not set)');
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
    // Note: The previous Dockerfile used dist/src/main.js, so we match that path here.
    await runCommand('node', ['dist/src/main.js']);

  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

start();
