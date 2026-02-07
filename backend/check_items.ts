
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const entityId = 'tw-entity-001';
  console.log(`Checking items for entity: ${entityId}`);
  
  const items = await prisma.reimbursementItem.findMany({
    where: { entityId },
  });
  
  console.log(`Found ${items.length} reimbursement items.`);
  if (items.length > 0) {
    console.log('Sample items:', items.slice(0, 3).map(i => i.name));
  } else {
    console.log('No items found. The AI suggestion feature will default to null.');
  }

  const accounts = await prisma.account.findMany({
      where: {
        entityId,
        isActive: true,
        OR: [
          { code: { startsWith: '5' } },
          { code: { startsWith: '6' } },
          { code: { startsWith: '7' } },
          { code: { startsWith: '8' } },
        ],
      },
  });
  console.log(`Found ${accounts.length} expense accounts.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
