import { prisma } from "@/lib/prisma";

type VoucherType = "PAYMENT" | "RECEIPT";

export async function generateVoucherNumber(
  type: VoucherType
): Promise<string> {
  const year = new Date().getFullYear();

  const counterName = `voucher-${type}-${year}`;

  const counter = await prisma.counter.upsert({
    where: {
      name: counterName,
    },
    update: {
      seq: {
        increment: 1,
      },
    },
    create: {
      name: counterName,
      seq: 1,
    },
  });

  const prefix = type === "PAYMENT" ? "PV" : "RV";

  return `${prefix}-${year}-${String(counter.seq).padStart(5, "0")}`;
}
