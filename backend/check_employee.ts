import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 's7896629@gmail.com';
  
  console.log(`Checking user: ${email}`);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error('User not found!');
    return;
  }

  console.log(`User found: ${user.id}`);

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
  });

  if (employee) {
    console.log(`Employee record found: ${employee.id}`);
  } else {
    console.log('Employee record NOT found. Creating one...');
    
    // We need an entity first
    const entity = await prisma.entity.findFirst();
    if (!entity) {
      console.error('No entity found to link employee to.');
      return;
    }

    // Create employee record
    const newEmployee = await prisma.employee.create({
      data: {
        entityId: entity.id,
        userId: user.id,
        employeeNo: 'EMP-001',
        name: 'Developer Admin',
        country: 'TW',
        hireDate: new Date(),
        salaryBaseOriginal: 50000,
        salaryBaseCurrency: 'TWD',
        salaryBaseFxRate: 1,
        salaryBaseBase: 50000,
        isActive: true,
      },
    });
    console.log(`Created employee record: ${newEmployee.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
