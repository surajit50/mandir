import { PrismaClient, Role, PayeeType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting member seeding...');
  
  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);
  
  const membersData = Array.from({ length: 10 }).map((_, i) => ({
    name: `Member ${i + 1}`,
    email: `member${i + 1}@example.com`,
    passwordHash,
    role: Role.MEMBER,
    userType: PayeeType.MEMBER,
    isActive: true,
  }));

  for (const member of membersData) {
    const existing = await prisma.user.findUnique({
      where: { email: member.email },
    });

    if (!existing) {
      await prisma.user.create({
        data: member,
      });
      console.log(`Created member: ${member.name} (${member.email})`);
    } else {
      console.log(`Member already exists: ${member.email}`);
    }
  }

  console.log('Member seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
