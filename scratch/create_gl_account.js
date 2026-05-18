const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const account = await prisma.gLAccount.upsert({
    where: { accountCode: '1005' },
    update: {},
    create: {
      accountCode: '1005',
      accountName: 'Collections in Hand',
      accountType: 'Asset',
      subType: 'Current Asset',
      description: 'Donations collected by members but not yet handed over to main cash',
      openingBalance: 0,
      currentBalance: 0,
    },
  });
  console.log('Account created/verified:', account);
}

main().catch(console.error).finally(() => prisma.$disconnect());
