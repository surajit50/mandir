import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting database reset via API...");

    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.notificationTemplate.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.inventoryMovement.deleteMany(),
      prisma.inventoryItem.deleteMany(),
      prisma.inventoryCategory.deleteMany(),
      prisma.festivalTransaction.deleteMany(),
      prisma.festival.deleteMany(),
      prisma.trialBalance.deleteMany(),
      prisma.gLPosting.deleteMany(),
      prisma.gLAccount.deleteMany(),
      prisma.donationReceipt.deleteMany(),
      prisma.bankReconciliationItem.deleteMany(),
      prisma.bankReconciliation.deleteMany(),
      prisma.bankTransaction.deleteMany(),
      prisma.chequeRegister.deleteMany(),
      prisma.chequeBook.deleteMany(),
      prisma.bankDeposit.deleteMany(),
      prisma.bankAccount.deleteMany(),
      prisma.cashBook.deleteMany(),
      prisma.paymentVoucher.deleteMany(),
      prisma.cashDeliveryNote.deleteMany(),
      prisma.cashHandover.deleteMany(),
      prisma.memberCashLedger.deleteMany(),
      prisma.donationItem.deleteMany(),
      prisma.donationCollection.deleteMany(),
      prisma.payee.deleteMany(),
      prisma.fYPeriodConfig.deleteMany(),
      prisma.financialYear.deleteMany(),
      prisma.templeUser.deleteMany(),
      prisma.temple.deleteMany(),
      prisma.document.deleteMany(),
      prisma.mandirAsset.deleteMany(),
      prisma.jewelleryAsset.deleteMany(),
      prisma.counter.deleteMany(),
    ]);

    // Create an audit log for the reset action (since we just deleted everything, this will be the only log)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? "Admin",
        userRole: "ADMIN",
        action: "DELETE",
        module: "SYSTEM",
        entityType: "DATABASE",
        entityId: "ALL",
        newValues: { message: "Full database reset performed" } as any,
        status: "SUCCESS",
      }
    });

    return NextResponse.json({ message: "Database reset successfully" });
  } catch (error: any) {
    console.error("Error resetting database:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
