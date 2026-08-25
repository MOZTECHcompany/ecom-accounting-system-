function configureDatabaseUrl(env = process.env) {
  if (!env.DB_PASSWORD) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL or DB_PASSWORD must be configured');
    }
    return env.DATABASE_URL;
  }

  const instance =
    env.CLOUDSQL_INSTANCE || 'moztech-main-db:asia-east1:moztech-main-db';
  const user = encodeURIComponent(env.DB_USER || 'erp_user');
  const password = encodeURIComponent(env.DB_PASSWORD);
  const database = encodeURIComponent(env.DB_NAME || 'erp_db');
  const databaseUrl = `postgresql://${user}:${password}@localhost/${database}?host=/cloudsql/${instance}`;
  env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}

module.exports = { configureDatabaseUrl };
