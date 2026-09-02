import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createRequire } from 'node:module';

type DatabaseUrlModule = {
  configureDatabaseUrl(env?: NodeJS.ProcessEnv): string;
};

const loadCommonJsModule = createRequire(__filename);
const databaseUrl = loadCommonJsModule(
  '../../../scripts/database-url',
) as DatabaseUrlModule;

databaseUrl.configureDatabaseUrl();

const EXPECTED_DATABASE_NAME = 'erp_after_sales_staging';

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function assertStagingDatabase() {
  if (process.env.AFTER_SALES_STAGING_BOOTSTRAP_ENABLED !== 'true') {
    throw new Error('AFTER_SALES_STAGING_BOOTSTRAP_ENABLED must be true');
  }

  const configuredName = process.env.DB_NAME?.trim();
  let databaseUrlName = '';
  try {
    const databaseUrl = process.env.DATABASE_URL;
    databaseUrlName = databaseUrl
      ? decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''))
      : '';
  } catch {
    databaseUrlName = '';
  }

  if (
    configuredName !== EXPECTED_DATABASE_NAME &&
    databaseUrlName !== EXPECTED_DATABASE_NAME
  ) {
    throw new Error(
      `Refusing to bootstrap database other than ${EXPECTED_DATABASE_NAME}`,
    );
  }
}

async function main() {
  assertStagingDatabase();

  const email = requireEnv('AFTER_SALES_STAGING_ADMIN_EMAIL').toLowerCase();
  const password = requireEnv('AFTER_SALES_STAGING_ADMIN_PASSWORD');
  const passwordHash = await bcrypt.hash(password, 12);
  const prisma = new PrismaClient();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const entity = await tx.entity.upsert({
        where: { id: 'tw-entity-001' },
        update: {
          loginCode: '900324',
          name: '萬博創業科技有限公司',
          country: 'TW',
          baseCurrency: 'TWD',
          taxId: '85030997',
          isActive: true,
        },
        create: {
          id: 'tw-entity-001',
          loginCode: '900324',
          name: '萬博創業科技有限公司',
          country: 'TW',
          baseCurrency: 'TWD',
          taxId: '85030997',
          isActive: true,
        },
      });

      const roles = await Promise.all(
        [
          {
            code: 'SUPER_ADMIN',
            name: 'SUPER_ADMIN',
            description: 'Staging super administrator',
            hierarchyLevel: 1,
          },
          {
            code: 'ADMIN',
            name: 'ADMIN',
            description: 'Staging administrator',
            hierarchyLevel: 2,
          },
        ].map((role) =>
          tx.role.upsert({
            where: { code: role.code },
            update: role,
            create: role,
          }),
        ),
      );

      const user = await tx.user.upsert({
        where: { email },
        update: {
          name: '售後整併 Staging 管理員',
          passwordHash,
          isActive: true,
          mustChangePassword: false,
        },
        create: {
          email,
          name: '售後整併 Staging 管理員',
          passwordHash,
          isActive: true,
          mustChangePassword: false,
        },
      });

      for (const role of roles) {
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: role.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }

      await tx.userEntityMembership.upsert({
        where: {
          userId_entityId: {
            userId: user.id,
            entityId: entity.id,
          },
        },
        update: { isPrimary: true },
        create: {
          userId: user.id,
          entityId: entity.id,
          isPrimary: true,
        },
      });

      return {
        entityId: entity.id,
        loginCode: entity.loginCode,
        adminUserId: user.id,
        roles: roles.map((role) => role.code),
      };
    });

    console.log(JSON.stringify({ ok: true, ...result }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
});
