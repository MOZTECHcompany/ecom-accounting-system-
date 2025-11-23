import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed Script - 初始化系統資料
 * 
 * 建立內容：
 * 1. 兩個公司實體（台灣、大陸）
 * 2. 角色與權限（ADMIN, ACCOUNTANT, OPERATOR）
 * 3. 預設管理員使用者
 * 4. 完整的會計科目表（IFRS / 台灣常用架構）
 * 5. 銷售渠道（Shopify, momo, PChome, Shopee, Coupang 等）
 * 6. 會計期間（2025年度）
 */
async function main() {
  console.log('🌱 Starting database seeding...\n');

  // ============================================
  // 1. 建立公司實體
  // ============================================
  console.log('📦 Creating entities...');
  
  const taiwanEntity = await prisma.entity.upsert({
    where: { id: 'tw-entity-001' },
    update: {},
    create: {
      id: 'tw-entity-001',
      name: '台灣公司',
      country: 'TW',
      baseCurrency: 'TWD',
      taxId: '12345678',
      address: '台北市信義區信義路五段7號',
      contactEmail: 'taiwan@company.com',
      contactPhone: '+886-2-2345-6789',
    },
  });

  const chinaEntity = await prisma.entity.upsert({
    where: { id: 'cn-entity-001' },
    update: {},
    create: {
      id: 'cn-entity-001',
      name: '大陸公司',
      country: 'CN',
      baseCurrency: 'CNY',
      taxId: '91110000000000000X',
      address: '上海市浦東新區陸家嘴環路1000號',
      contactEmail: 'china@company.com',
      contactPhone: '+86-21-1234-5678',
    },
  });

  console.log(`✅ Created entities: ${taiwanEntity.name}, ${chinaEntity.name}\n`);

  // ============================================
  // 2. 建立角色與權限
  // ============================================
  console.log('👥 Creating roles and permissions...');

  // 建立權限
  const permissions = await Promise.all([
    // Users
    prisma.permission.upsert({
      where: { resource_action: { resource: 'users', action: 'read' } },
      update: {},
      create: { resource: 'users', action: 'read', description: '查看使用者' },
    }),
    prisma.permission.upsert({
      where: { resource_action: { resource: 'users', action: 'create' } },
      update: {},
      create: { resource: 'users', action: 'create', description: '建立使用者' },
    }),
    // Accounts
    prisma.permission.upsert({
      where: { resource_action: { resource: 'accounts', action: 'read' } },
      update: {},
      create: { resource: 'accounts', action: 'read', description: '查看會計科目' },
    }),
    prisma.permission.upsert({
      where: { resource_action: { resource: 'accounts', action: 'create' } },
      update: {},
      create: { resource: 'accounts', action: 'create', description: '建立會計科目' },
    }),
    // Journal Entries
    prisma.permission.upsert({
      where: { resource_action: { resource: 'journal_entries', action: 'read' } },
      update: {},
      create: { resource: 'journal_entries', action: 'read', description: '查看會計分錄' },
    }),
    prisma.permission.upsert({
      where: { resource_action: { resource: 'journal_entries', action: 'create' } },
      update: {},
      create: { resource: 'journal_entries', action: 'create', description: '建立會計分錄' },
    }),
    prisma.permission.upsert({
      where: { resource_action: { resource: 'journal_entries', action: 'approve' } },
      update: {},
      create: { resource: 'journal_entries', action: 'approve', description: '審核會計分錄' },
    }),
    // Sales Orders
    prisma.permission.upsert({
      where: { resource_action: { resource: 'sales_orders', action: 'read' } },
      update: {},
      create: { resource: 'sales_orders', action: 'read', description: '查看銷售訂單' },
    }),
    prisma.permission.upsert({
      where: { resource_action: { resource: 'sales_orders', action: 'create' } },
      update: {},
      create: { resource: 'sales_orders', action: 'create', description: '建立銷售訂單' },
    }),
  ]);

  // 建立角色（四層級）
  const roleDefinitions = [
    {
      code: 'SUPER_ADMIN',
      name: 'SUPER_ADMIN',
      description: '最高管理員，擁有完整系統權限',
      hierarchyLevel: 1,
    },
    {
      code: 'ADMIN',
      name: 'ADMIN',
      description: '公司管理員，可管理大部分模組',
      hierarchyLevel: 2,
    },
    {
      code: 'ACCOUNTANT',
      name: 'ACCOUNTANT',
      description: '財會部門成員，可處理會計與報表作業',
      hierarchyLevel: 3,
    },
    {
      code: 'OPERATOR',
      name: 'OPERATOR',
      description: '一般操作成員，可進行基礎作業',
      hierarchyLevel: 4,
    },
  ];

  const roles: Record<string, { id: string }> = {};

  for (const roleDef of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { code: roleDef.code },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        hierarchyLevel: roleDef.hierarchyLevel,
      },
      create: {
        code: roleDef.code,
        name: roleDef.name,
        description: roleDef.description,
        hierarchyLevel: roleDef.hierarchyLevel,
      },
    });

    roles[roleDef.code] = role;
  }

  const permissionIndex = new Map(
    permissions.map((permission) => [`${permission.resource}:${permission.action}`, permission]),
  );

  const ensureRolePermissions = async (roleCode: string, keys: string[] | 'ALL') => {
    const role = roles[roleCode];
    if (!role) {
      return;
    }

    const targetPermissions =
      keys === 'ALL'
        ? permissions
        : keys
            .map((key) => permissionIndex.get(key))
            .filter((permission): permission is (typeof permissions)[number] => Boolean(permission));

    for (const permission of targetPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  };

  await ensureRolePermissions('SUPER_ADMIN', 'ALL');
  await ensureRolePermissions('ADMIN', 'ALL');
  await ensureRolePermissions('ACCOUNTANT', [
    'accounts:read',
    'journal_entries:read',
    'journal_entries:create',
    'journal_entries:approve',
    'sales_orders:read',
  ]);
  await ensureRolePermissions('OPERATOR', ['sales_orders:read', 'sales_orders:create']);

  console.log(`✅ Created roles with hierarchy: SUPER_ADMIN, ADMIN, ACCOUNTANT, OPERATOR\n`);

  const superAdminRole = roles['SUPER_ADMIN'];
  const adminRole = roles['ADMIN'];

  // ============================================
  // 3. 建立部門（每個公司）
  // ============================================
  console.log('🏢 Creating departments...');

  const departmentTemplates = [
    { key: 'mgmt', name: '管理部' },
    { key: 'procurement', name: '採購部' },
    { key: 'logistics', name: '儲運部' },
    { key: 'product', name: '產品部' },
    { key: 'design', name: '設計部' },
    { key: 'customer-success', name: '客服部' },
    { key: 'finance', name: '財會部' },
  ];

  const entities = [taiwanEntity, chinaEntity];

  for (const entity of entities) {
    for (const template of departmentTemplates) {
      await prisma.department.upsert({
        where: { id: `${entity.id}-${template.key}` },
        update: {
          name: template.name,
          isActive: true,
        },
        create: {
          id: `${entity.id}-${template.key}`,
          entityId: entity.id,
          name: template.name,
        },
      });
    }
  }

  console.log(`✅ Created departments for entities: ${entities.map((entity) => entity.name).join(', ')}\n`);

  // ============================================
  // 4. 建立預設管理員
  // ============================================
  console.log('👤 Creating default admin user...');

  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const adminName = process.env.SUPER_ADMIN_NAME ?? '系統管理員';

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in environment variables before running the seed script.',
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash, // Update password if user exists
      name: adminName,
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
    },
  });

  // 指派 SUPER_ADMIN 與 ADMIN 角色
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    });
  }

  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
  }

  console.log(`✅ Ensured admin user: ${adminUser.email} (name: ${adminUser.name}, roles: SUPER_ADMIN, ADMIN)\n`);

  // ============================================
  // 5. 建立會計科目表（台灣公司）
  // ============================================
  console.log('📊 Creating chart of accounts for Taiwan...');

  const twAccounts = [
    // 資產類 (1xxx)
    { code: '1000', name: '資產', type: 'asset', parentId: null },
    { code: '1100', name: '流動資產', type: 'asset', parentId: '1000' },
    { code: '1101', name: '現金', type: 'asset', parentId: '1100' },
    { code: '1102', name: '銀行存款', type: 'asset', parentId: '1100' },
    { code: '1120', name: '應收帳款', type: 'asset', parentId: '1100' },
    { code: '1121', name: '備抵呆帳', type: 'asset', parentId: '1100' },
    { code: '1130', name: '存貨', type: 'asset', parentId: '1100' },
    { code: '1140', name: '預付費用', type: 'asset', parentId: '1100' },
    { code: '1200', name: '非流動資產', type: 'asset', parentId: '1000' },
    { code: '1201', name: '固定資產', type: 'asset', parentId: '1200' },
    { code: '1202', name: '累計折舊', type: 'asset', parentId: '1200' },
    
    // 負債類 (2xxx)
    { code: '2000', name: '負債', type: 'liability', parentId: null },
    { code: '2100', name: '流動負債', type: 'liability', parentId: '2000' },
    { code: '2101', name: '應付帳款', type: 'liability', parentId: '2100' },
    { code: '2102', name: '應付費用', type: 'liability', parentId: '2100' },
    { code: '2103', name: '應付薪資', type: 'liability', parentId: '2100' },
    { code: '2104', name: '應付勞保', type: 'liability', parentId: '2100' },
    { code: '2105', name: '應付健保', type: 'liability', parentId: '2100' },
    { code: '2106', name: '應付所得稅', type: 'liability', parentId: '2100' },
    { code: '2107', name: '預收款項', type: 'liability', parentId: '2100' },
    
    // 權益類 (3xxx)
    { code: '3000', name: '權益', type: 'equity', parentId: null },
    { code: '3101', name: '股本', type: 'equity', parentId: '3000' },
    { code: '3102', name: '資本公積', type: 'equity', parentId: '3000' },
    { code: '3103', name: '保留盈餘', type: 'equity', parentId: '3000' },
    { code: '3104', name: '本期損益', type: 'equity', parentId: '3000' },
    
    // 收入類 (4xxx)
    { code: '4000', name: '營業收入', type: 'revenue', parentId: null },
    { code: '4101', name: '銷貨收入', type: 'revenue', parentId: '4000' },
    { code: '4102', name: '平台補貼收入', type: 'revenue', parentId: '4000' },
    { code: '4103', name: '其他收入', type: 'revenue', parentId: '4000' },
    { code: '4201', name: '銷貨折讓', type: 'revenue', parentId: '4000' },
    
    // 費用類 (5xxx, 6xxx, 7xxx)
    { code: '5000', name: '營業成本', type: 'expense', parentId: null },
    { code: '5101', name: '銷貨成本', type: 'expense', parentId: '5000' },
    { code: '5102', name: '進貨成本', type: 'expense', parentId: '5000' },
    
    { code: '6000', name: '營業費用', type: 'expense', parentId: null },
    { code: '6101', name: '薪資費用', type: 'expense', parentId: '6000' },
    { code: '6102', name: '勞保費用', type: 'expense', parentId: '6000' },
    { code: '6103', name: '健保費用', type: 'expense', parentId: '6000' },
    { code: '6104', name: '勞退費用', type: 'expense', parentId: '6000' },
    { code: '6105', name: '租金費用', type: 'expense', parentId: '6000' },
    { code: '6106', name: '水電費用', type: 'expense', parentId: '6000' },
    { code: '6107', name: '廣告費用', type: 'expense', parentId: '6000' },
    { code: '6108', name: '平台費用', type: 'expense', parentId: '6000' },
    { code: '6109', name: '刷卡手續費', type: 'expense', parentId: '6000' },
    { code: '6110', name: '金流手續費', type: 'expense', parentId: '6000' },
    { code: '6111', name: '運費', type: 'expense', parentId: '6000' },
    { code: '6112', name: '差旅費', type: 'expense', parentId: '6000' },
    { code: '6113', name: '辦公用品', type: 'expense', parentId: '6000' },
    { code: '6114', name: 'KOL分潤費用', type: 'expense', parentId: '6000' },
    { code: '6115', name: '折舊費用', type: 'expense', parentId: '6000' },
    
    { code: '7000', name: '營業外收支', type: 'expense', parentId: null },
    { code: '7101', name: '呆帳損失', type: 'expense', parentId: '7000' },
    { code: '7102', name: '匯兌損失', type: 'expense', parentId: '7000' },
    { code: '7103', name: '匯兌利益', type: 'expense', parentId: '7000' },
    { code: '7104', name: '利息收入', type: 'expense', parentId: '7000' },
    { code: '7105', name: '利息費用', type: 'expense', parentId: '7000' },
  ];

  // 建立科目（需要先建立父科目）
  const accountMap: Record<string, string> = {};
  
  for (const account of twAccounts) {
    const created = await prisma.account.upsert({
      where: {
        entityId_code: {
          entityId: taiwanEntity.id,
          code: account.code,
        },
      },
      update: {},
      create: {
        entityId: taiwanEntity.id,
        code: account.code,
        name: account.name,
        type: account.type,
        parentId: account.parentId ? accountMap[account.parentId] : null,
      },
    });
    accountMap[account.code] = created.id;
  }

  console.log(`✅ Created ${twAccounts.length} accounts for Taiwan\n`);

  // ============================================
  // 5. 建立會計科目表（大陸公司 - 簡化版）
  // ============================================
  console.log('📊 Creating chart of accounts for China...');

  const cnAccounts = [
    { code: '1001', name: '库存现金', type: 'asset', parentId: null },
    { code: '1002', name: '银行存款', type: 'asset', parentId: null },
    { code: '1122', name: '应收账款', type: 'asset', parentId: null },
    { code: '1405', name: '库存商品', type: 'asset', parentId: null },
    { code: '2202', name: '应付账款', type: 'liability', parentId: null },
    { code: '2211', name: '应付职工薪酬', type: 'liability', parentId: null },
    { code: '4001', name: '主营业务收入', type: 'revenue', parentId: null },
    { code: '5001', name: '主营业务成本', type: 'expense', parentId: null },
    { code: '6601', name: '销售费用', type: 'expense', parentId: null },
  ];

  for (const account of cnAccounts) {
    await prisma.account.upsert({
      where: {
        entityId_code: {
          entityId: chinaEntity.id,
          code: account.code,
        },
      },
      update: {},
      create: {
        entityId: chinaEntity.id,
        code: account.code,
        name: account.name,
        type: account.type,
      },
    });
  }

  console.log(`✅ Created ${cnAccounts.length} accounts for China\n`);

  // ============================================
  // 6. 建立銷售渠道
  // ============================================
  console.log('🛍️  Creating sales channels...');

  const channels = [
    {
      entityId: taiwanEntity.id,
      name: 'Shopify 官網',
      code: 'SHOPIFY',
      type: 'own_site',
      defaultCurrency: 'TWD',
    },
    {
      entityId: taiwanEntity.id,
      name: '1shop 團購',
      code: '1SHOP',
      type: 'group_buy',
      defaultCurrency: 'TWD',
    },
    {
      entityId: taiwanEntity.id,
      name: 'SHOPLINE',
      code: 'SHOPLINE',
      type: 'own_site',
      defaultCurrency: 'TWD',
    },
    {
      entityId: taiwanEntity.id,
      name: 'momo 購物',
      code: 'MOMO',
      type: 'marketplace',
      defaultCurrency: 'TWD',
    },
    {
      entityId: taiwanEntity.id,
      name: 'PChome 商店街',
      code: 'PCHOME',
      type: 'marketplace',
      defaultCurrency: 'TWD',
    },
    {
      entityId: taiwanEntity.id,
      name: 'Shopee 蝦皮',
      code: 'SHOPEE',
      type: 'marketplace',
      defaultCurrency: 'TWD',
    },
    {
      entityId: taiwanEntity.id,
      name: 'Coupang',
      code: 'COUPANG',
      type: 'marketplace',
      defaultCurrency: 'TWD',
    },
    {
      entityId: taiwanEntity.id,
      name: 'Amazon',
      code: 'AMAZON',
      type: 'marketplace',
      defaultCurrency: 'USD',
    },
    {
      entityId: taiwanEntity.id,
      name: 'TikTok Shop',
      code: 'TTSHOP',
      type: 'social_commerce',
      defaultCurrency: 'TWD',
    },
  ];

  for (const channel of channels) {
    await prisma.salesChannel.upsert({
      where: {
        entityId_code: {
          entityId: channel.entityId,
          code: channel.code,
        },
      },
      update: {},
      create: channel,
    });
  }

  console.log(`✅ Created ${channels.length} sales channels\n`);

  // ============================================
  // 7. 建立會計期間（2025年）
  // ============================================
  console.log('📅 Creating accounting periods for 2025...');

  const periods = [];
  for (let month = 1; month <= 12; month++) {
    const startDate = new Date(2025, month - 1, 1);
    const endDate = new Date(2025, month, 0); // 該月最後一天

    // 台灣公司
    periods.push(
      prisma.period.upsert({
        where: {
          entityId_name: {
            entityId: taiwanEntity.id,
            name: `2025-${String(month).padStart(2, '0')}`,
          },
        },
        update: {},
        create: {
          entityId: taiwanEntity.id,
          name: `2025-${String(month).padStart(2, '0')}`,
          startDate,
          endDate,
          status: month <= 11 ? 'open' : 'open', // 當前月及之後為 open
        },
      }),
    );

    // 大陸公司
    periods.push(
      prisma.period.upsert({
        where: {
          entityId_name: {
            entityId: chinaEntity.id,
            name: `2025-${String(month).padStart(2, '0')}`,
          },
        },
        update: {},
        create: {
          entityId: chinaEntity.id,
          name: `2025-${String(month).padStart(2, '0')}`,
          startDate,
          endDate,
          status: 'open',
        },
      }),
    );
  }

  await Promise.all(periods);

  console.log(`✅ Created 24 accounting periods (12 months × 2 entities)\n`);

  console.log('✨ Database seeding completed successfully!\n');
  console.log('📝 Summary:');
  console.log(`   - Entities: 2 (台灣公司, 大陸公司)`);
  console.log('   - Users: 1 admin (credentials sourced from SUPER_ADMIN_* environment variables)');
  console.log('   - Roles: 4 (SUPER_ADMIN, ADMIN, ACCOUNTANT, OPERATOR)');
  console.log(`   - Permissions: ${permissions.length}`);
  console.log(`   - Accounts: ${twAccounts.length + cnAccounts.length}`);
  console.log(`   - Sales Channels: ${channels.length}`);
  console.log(`   - Accounting Periods: 24`);
  console.log('\n🚀 You can now start the application!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
