import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function test() {
  await prisma.$transaction(async (tx: TransactionClient) => {
    // test
  });
}
