/**
 * VOUCHER APPROVE / REJECT ENDPOINT
 * ───────────────────────────────────
 * APPROVE:
 *   PAYMENT  → Deduct from cash or bank balance. Guard: prevents negative balance.
 *   RECEIPT  → Credit cash or bank balance.
 *   Both     → Create CashBook entry, GL posting.
 *
 * REJECT:
 *   Reverse any bank / cash balance change that may have been made
 *   (only possible for already-APPROVED instant-receipt vouchers).
 *   Mark cheque back to ISSUED if it was linked.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postTransaction } from "@/lib/accounting/gl-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const approverId = (session.user as any).id;

    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden – only Admins can approve vouchers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isApproving = Boolean(body.approve);

    const currentFY = await prisma.financialYear.findFirst({ where: { isCurrent: true } });

    const updatedVoucher = await prisma.$transaction(async (tx: any) => {
      // ── Fetch full voucher ─────────────────────────────────────────────
      const voucher = await tx.paymentVoucher.findUnique({
        where: { id },
        include: {
          payee: { select: { id: true, name: true, userId: true } },
          bankAccount: true,
        },
      });

      if (!voucher) throw new Error("Voucher not found");

      // Prevent double-processing
      if (voucher.status === "APPROVED" && isApproving) {
        throw new Error("Voucher is already approved");
      }
      if (voucher.status === "REJECTED" && !isApproving) {
        throw new Error("Voucher is already rejected");
      }

      const isPayment = voucher.voucherType === "PAYMENT";
      const isReceipt = voucher.voucherType === "RECEIPT";
      const useBank = !!voucher.bankAccountId;
      const useCash = !useBank; // cash if no bank account linked

      // ══════════════════════════════════════════════════════════════════
      // APPROVE PATH
      // ══════════════════════════════════════════════════════════════════
      if (isApproving) {
        // ── 1. Negative balance guard ────────────────────────────────
        if (isPayment) {
          if (useBank) {
            const bankAccount = await tx.bankAccount.findUnique({
              where: { id: voucher.bankAccountId! },
              select: { currentBalance: true, bankName: true, accountNumber: true },
            });
            if (!bankAccount) throw new Error("Bank account not found");

            if (bankAccount.currentBalance - voucher.amount < 0) {
              throw new Error(
                `Insufficient bank balance. Available: ₹${bankAccount.currentBalance.toLocaleString("en-IN")}, ` +
                `Required: ₹${voucher.amount.toLocaleString("en-IN")} ` +
                `(${bankAccount.bankName} ${bankAccount.accountNumber})`
              );
            }
          } else {
            // Cash payment – check aggregate cash book balance
            const latestCash = await tx.cashBook.findFirst({
              orderBy: { date: "desc" },
              select: { balance: true },
            });
            // Compute running balance from debits and credits
            const agg = await tx.cashBook.aggregate({
              _sum: { creditAmount: true, debitAmount: true },
            });
            const cashBalance =
              (agg._sum.creditAmount ?? 0) - (agg._sum.debitAmount ?? 0);

            if (cashBalance - voucher.amount < 0) {
              throw new Error(
                `Insufficient cash balance. Available: ₹${cashBalance.toLocaleString("en-IN")}, ` +
                `Required: ₹${voucher.amount.toLocaleString("en-IN")}`
              );
            }
          }
        }

        // ── 2. Update voucher status ────────────────────────────────
        await tx.paymentVoucher.update({
          where: { id },
          data: {
            status: "APPROVED",
            approvedBy: approverId,
            approvedAt: new Date(),
            financialYearId: currentFY?.id ?? null,
          },
        });

        // ── 3. Bank balance change ──────────────────────────────────
        if (useBank) {
          const existingBankTx = await tx.bankTransaction.findFirst({
            where: { voucherId: id },
          });

          if (!existingBankTx) {
            await tx.bankTransaction.create({
              data: {
                bankAccountId: voucher.bankAccountId!,
                amount: voucher.amount,
                type: isPayment ? "DEBIT" : "CREDIT",
                description: `${voucher.voucherNumber} – ${voucher.description}`,
                voucherId: id,
                transactionDate: voucher.voucherDate,
              },
            });

            await tx.bankAccount.update({
              where: { id: voucher.bankAccountId! },
              data: {
                currentBalance: isPayment
                  ? { decrement: voucher.amount }
                  : { increment: voucher.amount },
              },
            });
          }
        }

        // ── 4. CashBook entry (Only for cash vouchers) ───────────────
        if (useCash) {
          const existingCashEntry = await tx.cashBook.findFirst({
            where: { paymentVoucherId: id },
          });

          if (!existingCashEntry) {
            await tx.cashBook.create({
              data: {
                date: voucher.voucherDate,
                description: `${voucher.voucherType} – ${voucher.payee.name} (${voucher.description})`,
                debitAmount: isPayment ? voucher.amount : 0,
                creditAmount: isReceipt ? voucher.amount : 0,
                balance: 0, // running balance computed separately by ledger
                referenceType: "PaymentVoucher",
                referenceId: id,
                paymentVoucherId: id,
                financialYearId: currentFY?.id,
              },
            });
          }
        }

        // ── 5. GL double-entry posting ──────────────────────────────
        const primaryAccountCode = useBank ? "1002" : "1001";
        const primaryAccountName = useBank ? "Bank Account" : "Cash Account";
        const categoryCode = voucher.category
          ? `CAT-${voucher.category.toUpperCase().replace(/\s/g, "_")}`
          : isReceipt ? "4001" : "5001";
        const categoryName = voucher.category ?? (isReceipt ? "General Income" : "General Expense");
        const categoryType = isReceipt ? "Income" : "Expense";

        await postTransaction(tx, {
          date: voucher.voucherDate,
          description: `Voucher ${voucher.voucherNumber} – ${voucher.description}`,
          referenceType: "PaymentVoucher",
          referenceId: id,
          financialYearId: currentFY?.id,
          entries: isReceipt
            ? [
                { accountCode: primaryAccountCode, accountName: primaryAccountName, accountType: "Asset", debit: voucher.amount },
                { accountCode: categoryCode, accountName: categoryName, accountType: categoryType, credit: voucher.amount },
              ]
            : [
                { accountCode: primaryAccountCode, accountName: primaryAccountName, accountType: "Asset", credit: voucher.amount },
                { accountCode: categoryCode, accountName: categoryName, accountType: categoryType, debit: voucher.amount },
              ],
        });

        // ── 6. Member cash ledger (if payee is a system user) ───────
        if (voucher.payee.userId && isPayment) {
          await tx.memberCashLedger.create({
            data: {
              memberId: voucher.payee.userId,
              description: `Payment Voucher – ${voucher.description}`,
              transactionDate: new Date(),
              debitAmount: voucher.amount,
              creditAmount: 0,
              balance: -voucher.amount,
              referenceType: "PaymentVoucher",
              referenceId: id,
            },
          });
        }

        // ── 7. Jewellery register for jewellery donation receipts ───
        if (isReceipt && voucher.category === "JEWELLERY_DONATION") {
          const prefix = voucher.metalType === "Gold" ? "GLD" : "SLV";
          const count = await tx.jewelleryAsset.count({
            where: { metalType: voucher.metalType || "Gold" },
          });
          const jewelleryCode = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
          await tx.jewelleryAsset.create({
            data: {
              jewelleryCode,
              jewelleryName: voucher.description,
              metalType: voucher.metalType || "Gold",
              weight: voucher.weight || 0,
              purity: voucher.purity ?? null,
              estimatedValue: voucher.amount,
              donorName: voucher.payee.name,
              receivedDate: voucher.voucherDate,
              description: `Received via Voucher #${voucher.voucherNumber}`,
              paymentVoucherId: id,
            },
          });
        }
      }

      // ══════════════════════════════════════════════════════════════════
      // REJECT PATH  – reverse anything that was already posted
      // ══════════════════════════════════════════════════════════════════
      else {
        await tx.paymentVoucher.update({
          where: { id },
          data: { status: "REJECTED", approvedBy: null, approvedAt: null },
        });

        // Reverse bank transaction if one exists (instant-approved receipts)
        const bankTx = await tx.bankTransaction.findFirst({ where: { voucherId: id } });
        if (bankTx && voucher.bankAccountId) {
          await tx.bankTransaction.delete({ where: { id: bankTx.id } });
          await tx.bankAccount.update({
            where: { id: voucher.bankAccountId },
            data: {
              currentBalance:
                bankTx.type === "CREDIT"
                  ? { decrement: bankTx.amount }
                  : { increment: bankTx.amount },
            },
          });
        }

        // Remove cash book entry if it exists
        const cashEntry = await tx.cashBook.findFirst({ where: { paymentVoucherId: id } });
        if (cashEntry) {
          await tx.cashBook.delete({ where: { id: cashEntry.id } });
        }

        // ── Reset linked cheque for reuse ──────────────────────────
        if (voucher.chequeId) {
          await tx.chequeRegister.update({
            where: { id: voucher.chequeId },
            data: {
              amount: 0,
              status: "ISSUED", // Ensure it's back to ISSUED
            },
          });
        }
      }

      // ── Audit ───────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          userId: approverId,
          userName: session.user.name ?? "Unknown User",
          userRole,
          action: isApproving ? "APPROVE" : "REJECT",
          module: "PaymentVoucher",
          entityId: id,
          entityType: "PaymentVoucher",
          status: "SUCCESS",
        },
      });

      return tx.paymentVoucher.findUnique({
        where: { id },
        include: { payee: { select: { id: true, name: true, email: true } }, bankAccount: true },
      });
    }, { timeout: 15000 }); // ⬅️ FIX: increased timeout from default 5000ms to 15000ms

    return NextResponse.json(updatedVoucher);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process voucher";
    // Surface balance-guard errors as 422 Unprocessable Entity
    const isBalanceError =
      message.startsWith("Insufficient") || message.includes("already approved") || message.includes("already rejected");

    console.error("Voucher approval error:", error);
    return NextResponse.json({ error: message }, { status: isBalanceError ? 422 : 500 });
  }
}
