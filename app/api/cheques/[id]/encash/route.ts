import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chequePayeeDisplayName } from "@/lib/cheque-payee";
import { postTransaction } from "@/lib/accounting/gl-service";
import { z } from "zod";

const ChequeEncashmentSchema = z.object({
  clearedDate: z.string().datetime(),
  bankAccountId: z.string().min(1, "Bank account is required"),
  remarks: z.string().optional(),
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

    // Only ADMIN and ACCOUNTANT can encash cheques
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can encash cheques" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = ChequeEncashmentSchema.parse(body);

    // Find the cheque
    const cheque = await prisma.chequeRegister.findUnique({
      where: { id },
      include: {
        account: true,
        paymentVouchers: {
          take: 1,
          select: { amount: true, payee: { select: { name: true } } },
        },
      },
    });

    if (!cheque) {
      return NextResponse.json(
        { error: "Cheque not found" },
        { status: 404 }
      );
    }

    // Check if cheque is already cleared or bounced
    if (cheque.status === "CLEARED") {
      return NextResponse.json(
        { error: "Cheque is already cleared" },
        { status: 400 }
      );
    }

    if (cheque.status === "BOUNCED") {
      return NextResponse.json(
        { error: "Cheque has bounced and cannot be cleared" },
        { status: 400 }
      );
    }

    // Verify bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: validatedData.bankAccountId },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    const isReceived = cheque.chequeType === "RECEIVED";

    const result = await prisma.$transaction(async (tx: any) => {
      let bankDeposit: any = null;

      // ── 1. For RECEIVED cheques, create a bank deposit entry (if not already deposited) ──
      if (isReceived && !cheque.depositId) {
        bankDeposit = await tx.bankDeposit.create({
          data: {
            accountId: validatedData.bankAccountId,
            depositNumber: `DEP-${Date.now()}`,
            depositDate: new Date(validatedData.clearedDate),
            totalAmount: cheque.paymentVouchers[0]?.amount || 0,
            depositType: "CHEQUE",
            remarks: `Cheque #${cheque.chequeNumber} - ${chequePayeeDisplayName(cheque)} ${validatedData.remarks ? `(${validatedData.remarks})` : ""}`,
            verifiedByBank: true,
            verifiedAt: new Date(validatedData.clearedDate),
            financialYearId: cheque.financialYearId,
          },
        });
      }

      // ── 2. Update cheque status to CLEARED ────────────────────────────
      const updatedCheque = await tx.chequeRegister.update({
        where: { id },
        data: {
          status: "CLEARED",
          clearedDate: new Date(validatedData.clearedDate),
          depositId: bankDeposit ? bankDeposit.id : cheque.depositId,
        },
      });

      // ── 3. Find linked payment voucher ────────────────────────────────
      const linkedVoucher = await tx.paymentVoucher.findFirst({
        where: { chequeId: id, status: "APPROVED" },
        include: { payee: { select: { id: true, name: true, userId: true } } },
      });

      // ── 4. Create BankTransaction and update bank balance ──────────────
      // For CHEQUE vouchers, these were deferred from approval to encashment.
      // The bank has now confirmed the cheque has cleared.
      const existingBankTx = await tx.bankTransaction.findFirst({
        where: { voucherId: linkedVoucher?.id },
      });

      if (!existingBankTx) {
        const isPayment = linkedVoucher?.voucherType === "PAYMENT";
        const bankAccountId = validatedData.bankAccountId;

        // Balance guard for payment cheques: ensure bank has enough funds
        if (isPayment) {
          const acc = await tx.bankAccount.findUnique({
            where: { id: bankAccountId },
            select: { currentBalance: true },
          });
          if (acc && acc.currentBalance - (cheque.paymentVouchers[0]?.amount || 0) < 0) {
            throw new Error(
              `Insufficient bank balance on encashment. Available: ₹${acc.currentBalance.toLocaleString("en-IN")}, ` +
              `Required: ₹${(cheque.paymentVouchers[0]?.amount || 0).toLocaleString("en-IN")}`
            );
          }
        }

        await tx.bankTransaction.create({
          data: {
            bankAccountId,
            amount: cheque.paymentVouchers[0]?.amount || 0,
            type: isReceived ? "CREDIT" : "DEBIT",
            description: linkedVoucher
              ? `${linkedVoucher.voucherNumber} – ${linkedVoucher.description} (Cheque #${cheque.chequeNumber} cleared)`
              : `Cheque #${cheque.chequeNumber} cleared - ${chequePayeeDisplayName(cheque)}`,
            instrumentType: "CHEQUE",
            instrumentNumber: cheque.chequeNumber,
            voucherId: linkedVoucher?.id || null,
            chequeId: id, // Direct cheque link
            financialYearId: cheque.financialYearId, // Financial year consistency
            transactionDate: new Date(validatedData.clearedDate),
          },
        });

        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            currentBalance: isReceived
              ? { increment: cheque.paymentVouchers[0]?.amount || 0 }
              : { decrement: cheque.paymentVouchers[0]?.amount || 0 },
          },
        });
      }

      // ── 5. Create CashBook entry (for receipt cheques: money now received) ──
      if (linkedVoucher && isReceived) {
        const existingCashEntry = await tx.cashBook.findFirst({
          where: { paymentVoucherId: linkedVoucher.id },
        });

        if (!existingCashEntry) {
          await tx.cashBook.create({
            data: {
              date: new Date(validatedData.clearedDate),
              description: `RECEIPT – ${linkedVoucher.payee.name} – ${linkedVoucher.description} (Chq #${cheque.chequeNumber} cleared)`,
              debitAmount: 0,
              creditAmount: cheque.paymentVouchers[0]?.amount || 0,
              balance: 0, // running balance computed by ledger
              referenceType: "ChequeEncashment",
              referenceId: id,
              paymentVoucherId: linkedVoucher.id,
              financialYearId: cheque.financialYearId,
            },
          });
        }
      }

      // ── 6. Supplementary GL entry confirming encashment ──────────────────
      // The GL was posted on approval with "pending encashment" note.
      // Now create a supplementary entry moving from Cheques Receivable/Payable
      // to the actual Bank account.
      if (linkedVoucher) {
        const currentFY = await tx.financialYear.findFirst({ where: { isCurrent: true } });
        const isReceiptVoucher = linkedVoucher.voucherType === "RECEIPT";
        const useBank = !!linkedVoucher.bankAccountId;
        const primaryAccountCode = useBank ? "1002" : "1001";
        const primaryAccountName = useBank ? "Bank Account" : "Cash Account";

        await postTransaction(tx, {
          date: new Date(validatedData.clearedDate),
          description: `Cheque #${cheque.chequeNumber} encashed – Voucher ${linkedVoucher.voucherNumber}`,
          referenceType: "ChequeEncashment",
          referenceId: id,
          financialYearId: currentFY?.id,
          entries: isReceiptVoucher
            ? [
                // Receipt: Move from Cheques Receivable → Bank Account
                { accountCode: primaryAccountCode, accountName: primaryAccountName, accountType: "Asset", debit: cheque.paymentVouchers[0]?.amount || 0 },
                { accountCode: "1003", accountName: "Cheques Receivable", accountType: "Asset", credit: cheque.paymentVouchers[0]?.amount || 0 },
              ]
            : [
                // Payment: Move from Bank Account → Cheques Payable (liability settled)
                { accountCode: "1003", accountName: "Cheques Payable", accountType: "Liability", debit: cheque.paymentVouchers[0]?.amount || 0 },
                { accountCode: primaryAccountCode, accountName: primaryAccountName, accountType: "Asset", credit: cheque.paymentVouchers[0]?.amount || 0 },
              ],
        });
      }

      // ── 7. Audit log ────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name ?? "Unknown User",
          userRole: userRole,
          action: "UPDATE",
          module: "ChequeRegister",
          entityId: updatedCheque.id,
          entityType: "ChequeRegister",
          status: "SUCCESS",
        },
      });

      return { updatedCheque, bankDeposit };
    }, { timeout: 15000 });

    return NextResponse.json({
      cheque: result.updatedCheque,
      bankDeposit: result.bankDeposit,
      message: "Cheque encashed successfully",
    });
  } catch (error: any) {
    console.error("Cheque encashment error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to encash cheque", details: error.message },
      { status: 500 }
    );
  }
}