import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("Starting database reset...");

  try {
    // List of models to clear (excluding User)
    // Order matters if there are hard foreign key constraints, 
    // but in MongoDB/Prisma it's usually fine to just delete.
    
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

    console.log("Successfully deleted all data except User model.");
  } catch (error) {
    console.error("Error resetting database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
