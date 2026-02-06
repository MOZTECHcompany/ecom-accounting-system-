import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.reimbursementItem.count();
  console.log(`Reimbursement Items Count: ${count}`);
  
  const items = await prisma.reimbursementItem.findMany();
  console.log('Items:', items.map(i => i.name).join(', '));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
