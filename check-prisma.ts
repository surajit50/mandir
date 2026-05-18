import { prisma } from "./lib/prisma";

async function check() {
  console.log("Prisma properties:", Object.keys(prisma).filter(k => !k.startsWith("_")));
  process.exit(0);
}

check();
