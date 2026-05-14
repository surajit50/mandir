import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { postTransaction } from "@/lib/accounting/gl-service";

const ChequeBouncedSchema = z.object({
  bounceDate: z.string().datetime(),
  bounceReason: z.string().min(1, "Bounce reason is required"),
});

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

    // Only ADMIN and ACCOUNTANT can mark cheques as bounced
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can mark cheques as bounced" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = ChequeBouncedSchema.parse(body);

    // Find the cheque
    const cheque = await prisma.chequeRegister.findUnique({
      where: { id },
    });

    if (!cheque) {
      return NextResponse.json(
        { error: "Cheque not found" },
        { status: 404 }
      );
    }

    // Only allow bouncing cheques that are ISSUED or DEPOSITED
    if (!["ISSUED", "DEPOSITED"].includes(cheque.status)) {
      return NextResponse.json(
        { error: `Cannot bounce a ${cheque.status} cheque` },
        { status: 400 }
      );
    }

    const updatedCheque = await prisma.$transaction(async (tx: any) => {
      // Update cheque status to BOUNCED
      const updated = await tx.chequeRegister.update({
        where: { id },
        data: {
          status: "BOUNCED",
          bounceDate: new Date(validatedData.bounceDate),
          bounceReason: validatedData.bounceReason,
        },
        include: { paymentVouchers: true }
      });

      const isReceived = updated.chequeType === "RECEIVED";

      // Reverse bank account balance
      await tx.bankAccount.update({
        where: { id: updated.accountId },
        data: {
          currentBalance: {
            [isReceived ? "decrement" : "increment"]: updated.amount,
          },
        },
      });

      // Create cash book entry for the bounce (reverse entry) if it doesn't exist
      const existingEntry = await tx.cashBook.findFirst({
        where: { referenceId: id, referenceType: "ChequeBounce" },
      });

      if (!existingEntry) {
        await tx.cashBook.create({
          data: {
            date: new Date(validatedData.bounceDate),
            description: `Cheque Bounce Reversal: #${updated.chequeNumber} - ${validatedData.bounceReason}`,
            debitAmount: isReceived ? updated.amount : 0, 
            creditAmount: !isReceived ? updated.amount : 0,
            balance: 0,
            referenceType: "ChequeBounce",
            referenceId: id,
          },
        });
      }

      // Reverse GL Posting if there is an associated voucher
      const voucher = updated.paymentVouchers[0];
      if (voucher && voucher.status === "APPROVED") {
        const primaryAccountCode = "1002"; // Bank Account
        const primaryAccountName = "Bank Account";
        const isReceipt = voucher.voucherType === "RECEIPT";
        const categoryCode = voucher.category
          ? `CAT-${voucher.category.toUpperCase().replace(/\s/g, "_")}`
          : isReceipt ? "4001" : "5001";
        const categoryName = voucher.category ?? (isReceipt ? "General Income" : "General Expense");
        const categoryType = isReceipt ? "Income" : "Expense";

        const currentFY = await tx.financialYear.findFirst({ where: { isCurrent: true } });

        // REVERSE the entries
        await postTransaction(tx, {
          date: new Date(validatedData.bounceDate),
          description: `Bounce Reversal for Voucher ${voucher.voucherNumber} – ${validatedData.bounceReason}`,
          referenceType: "ChequeBounce",
          referenceId: id,
          financialYearId: currentFY?.id,
          entries: isReceipt
            ? [
                { accountCode: primaryAccountCode, accountName: primaryAccountName, accountType: "Asset", credit: voucher.amount },
                { accountCode: categoryCode, accountName: categoryName, accountType: categoryType, debit: voucher.amount },
              ]
            : [
                { accountCode: primaryAccountCode, accountName: primaryAccountName, accountType: "Asset", debit: voucher.amount },
                { accountCode: categoryCode, accountName: categoryName, accountType: categoryType, credit: voucher.amount },
              ],
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name ?? "Unknown User",
          userRole: userRole,
          action: "UPDATE",
          module: "ChequeRegister",
          entityId: updated.id,
          entityType: "ChequeRegister",
          status: "SUCCESS",
        },
      });

      return updated;
    });

    return NextResponse.json({
      cheque: updatedCheque,
      message: "Cheque marked as bounced successfully",
    });
  } catch (error: any) {
    console.error("Cheque bounce error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to mark cheque as bounced", details: error.message },
      { status: 500 }
    );
  }
}
