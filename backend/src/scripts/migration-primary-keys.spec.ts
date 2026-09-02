import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('raw migration seed primary keys', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20260505120000_seed_employee_permission_model/migration.sql',
    ),
    'utf8',
  );

  it.each(['permissions', 'roles'])(
    'provides an id when inserting into %s',
    (table) => {
      expect(migration).toMatch(
        new RegExp(`INSERT INTO "${table}" \\(\\s*"id"\\s*,`),
      );
    },
  );

  it('generates database-side UUIDs for raw seed rows', () => {
    expect(migration).toContain('gen_random_uuid()::text');
  });
});
