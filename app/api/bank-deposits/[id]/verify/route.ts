import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can verify deposits" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const newStatus: "VERIFIED" | "REJECTED" = body.status;

    if (!["VERIFIED", "REJECTED"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Status must be VERIFIED or REJECTED" },
        { status: 400 }
      );
    }

    const deposit = await prisma.bankDeposit.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, bankName: true, accountNumber: true } },
      },
    });

    if (!deposit) {
      return NextResponse.json(
        { error: "Deposit not found" },
        { status: 404 }
      );
    }

    if (deposit.status !== "PENDING") {
      return NextResponse.json(
        { error: `Deposit is already ${deposit.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (newStatus === "VERIFIED") {
      await prisma.$transaction(async (tx: any) => {
        await tx.bankDeposit.update({
          where: { id },
          data: {
            status: "VERIFIED",
            verifiedByBank: true,
            verifiedAt: new Date(),
          },
        });

        // Update bank account balance
        await tx.bankAccount.update({
          where: { id: deposit.accountId },
          data: {
            currentBalance: {
              increment: deposit.totalAmount,
            },
          },
        });

        // Move linked cheques from ISSUED -> CLEARED (Received cheques are cleared when deposit is verified)
        const linkedCheques = await tx.chequeRegister.findMany({
          where: { depositId: id },
          include: { 
            paymentVouchers: {
              take: 1,
              select: { id: true, voucherNumber: true }
            }
          }
        });

        if (linkedCheques.length > 0) {
          await tx.chequeRegister.updateMany({
            where: { id: { in: linkedCheques.map((c: any) => c.id) } },
            data: { 
              status: "CLEARED",
              clearedDate: new Date(),
            },
          });
        }

        // Create BankTransaction entry for the passbook
        await tx.bankTransaction.create({
          data: {
            bankAccountId: deposit.accountId,
            amount: deposit.totalAmount,
            type: "CREDIT",
            description: deposit.remarks || `Deposit verified – ${deposit.depositNumber}`,
            transactionDate: new Date(),
            referenceType: "BankDeposit",
            referenceId: id,
            instrumentType: deposit.depositType,
            instrumentNumber: deposit.depositNumber,
            financialYearId: deposit.financialYearId,
          },
        });
      });
    } else {
      // REJECTED - undo the deposit
      await prisma.bankDeposit.update({
        where: { id },
        data: {
          status: "REJECTED",
          verifiedByBank: false,
          verifiedAt: new Date(),
        },
      });

      // Remove cash book entries (cash goes back to available)
      await prisma.cashBook.deleteMany({
        where: { referenceType: "BankDeposit", referenceId: deposit.id },
      });

      // ── GL Reversal ───────────────────────────────────────────────
      // Find GL Postings and reverse the balance changes
      const postings = await prisma.gLPosting.findMany({
        where: { referenceType: "BankDeposit", referenceId: deposit.id },
      });

      for (const posting of postings) {
        const account = await prisma.gLAccount.findUnique({ where: { id: posting.accountId } });
        if (account) {
          let reverseChange = 0;
          if (["Asset", "Expense"].includes(account.accountType)) {
            // Original: debit - credit. Reverse: credit - debit
            reverseChange = posting.creditAmount - posting.debitAmount;
          } else {
            // Original: credit - debit. Reverse: debit - credit
            reverseChange = posting.debitAmount - posting.creditAmount;
          }

          await prisma.gLAccount.update({
            where: { id: account.id },
            data: { currentBalance: { increment: reverseChange } },
          });
        }
      }

      // Delete GL Postings
      await prisma.gLPosting.deleteMany({
        where: { referenceType: "BankDeposit", referenceId: deposit.id },
      });

      // Reset linked cheques back to ISSUED and unlink from deposit
      await prisma.chequeRegister.updateMany({
        where: { depositId: id },
        data: { status: "ISSUED", depositId: null },
      });
    }

    const updatedDeposit = await prisma.bankDeposit.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, bankName: true, accountNumber: true } },
        cheques: true,
      },
    });

    return NextResponse.json(updatedDeposit);
  } catch (error) {
    console.error("Bank deposit verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify deposit" },
      { status: 500 }
    );
  }
}
