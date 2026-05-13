// app/api/vouchers/route.ts
/**
 * VOUCHER CREATION RULES
 * ──────────────────────
 * • Voucher is created as DRAFT – NO balance changes, NO bank debits/credits.
 * • GL posting happens ONLY on APPROVE (in the /approve endpoint).
 * • Balance guards (negative balance prevention) also run on APPROVE.
 * • Exception: INSTANT_POST_RECEIPT_CATEGORIES receipts are auto-APPROVED
 *   immediately on creation (bank interest, online received, etc.) because
 *   they are already confirmed by the bank and need no further verification.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PaymentVoucherSchema } from "@/lib/validations/accounting";

// These receipt categories are instant-post: already confirmed by the bank.
const INSTANT_POST_RECEIPT_CATEGORIES = [
  "DIRECT_DEPOSIT",
  "BANK_INTEREST",
  "BANK_TRANSFER_RECEIVED",
  "ONLINE_RECEIVED",
];

async function generateVoucherNumber(type: "PAYMENT" | "RECEIPT"): Promise<string> {
  const count = await prisma.paymentVoucher.count({ where: { voucherType: type } });
  const year = new Date().getFullYear();
  const prefix = type === "PAYMENT" ? "PV" : "RV";
  return `${prefix}-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden – only Admins and Accountants can create vouchers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = PaymentVoucherSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = result.data;

    const trimmedPayeeName = data.payeeName?.trim();
    if (!data.payeeId && !trimmedPayeeName) {
      return NextResponse.json({ error: "Payee is required" }, { status: 400 });
    }

    // ── Resolve or create payee ───────────────────────────────────────────
    let payee = data.payeeId
      ? await prisma.payee.findUnique({
          where: { id: data.payeeId },
          select: { id: true, name: true, email: true, userId: true, payeeType: true },
        })
      : null;
 
    if (!payee && trimmedPayeeName) {
      payee = await prisma.payee.findFirst({
        where: { name: trimmedPayeeName, email: data.payeeEmail || null },
        select: { id: true, name: true, email: true, userId: true, payeeType: true },
      });
 
      if (!payee) {
        const linkedUser = data.payeeEmail
          ? await prisma.user.findUnique({
              where: { email: data.payeeEmail },
              select: { id: true },
            })
          : null;
        payee = await prisma.payee.create({
          data: { 
            name: trimmedPayeeName, 
            email: data.payeeEmail || null, 
            userId: linkedUser?.id || null, 
            payeeType: data.payeeType || "OTHER",
            isActive: true 
          },
          select: { id: true, name: true, email: true, userId: true, payeeType: true },
        });
      }
    }

    if (!payee) {
      return NextResponse.json({ error: "Payee not found" }, { status: 400 });
    }

    // ── Cheque validation (PAYMENT + CHEQUE method) ───────────────────────
    let selectedCheque: { id: string; chequeNumber: string; amount: number; paymentVouchers: { id: string }[] } | null = null;

    if (data.voucherType === "PAYMENT" && data.paymentMethod === "CHEQUE") {
      if (!data.chequeId) {
        return NextResponse.json({ error: "Please select a cheque from the cheque register" }, { status: 400 });
      }
      selectedCheque = await prisma.chequeRegister.findFirst({
        where: { id: data.chequeId, status: "ISSUED" },
        select: {
          id: true,
          chequeNumber: true,
          amount: true,
          paymentVouchers: { select: { id: true } }, // check existing links
        },
      });
      if (!selectedCheque) {
        return NextResponse.json({ error: "Selected cheque is invalid or no longer available" }, { status: 400 });
      }
      // A cheque is "unassigned" if it has no linked payment vouchers AND amount is 0
      const isUnassigned = selectedCheque.paymentVouchers.length === 0 && selectedCheque.amount === 0;
      if (!isUnassigned && selectedCheque.amount !== data.amount) {
        return NextResponse.json({ error: "Voucher amount must match cheque amount" }, { status: 400 });
      }
    }

    // ── Bank account pre-check for PAYMENT vouchers ───────────────────────
    // Full guard for PAYMENT vouchers runs at APPROVE time.

    const voucherNumber = await generateVoucherNumber(data.voucherType);
    const currentFY = await prisma.financialYear.findFirst({ where: { isCurrent: true } });

    const isInstantReceipt =
      data.voucherType === "RECEIPT" &&
      data.bankAccountId &&
      INSTANT_POST_RECEIPT_CATEGORIES.includes(data.category ?? "");

    const voucher = await prisma.$transaction(async (tx) => {
      // 1. Create the voucher (always starts as DRAFT unless instant-receipt)
      const v = await tx.paymentVoucher.create({
        data: {
          voucherNumber,
          voucherDate: new Date(data.voucherDate),
          voucherType: data.voucherType,
          payeeId: payee!.id,
          amount: data.amount,
          description:
            data.paymentMethod === "CHEQUE" && selectedCheque
              ? `${data.description} (Cheque #${selectedCheque.chequeNumber})`
              : data.description,
          paymentMethod: data.paymentMethod,
          bankAccountId: data.bankAccountId || null,
          chequeId: data.chequeId || null,
          category: data.category,
          referenceNumber: data.referenceNumber,
          referenceDate: data.referenceDate ? new Date(data.referenceDate) : undefined,
          metalType: data.metalType,
          weight: data.weight,
          purity: data.purity,
          status: "DRAFT",
          financialYearId: currentFY?.id,
        },
        include: { payee: { select: { id: true, name: true, email: true } } },
      });

      // 2. Update unassigned cheque leaf details (only amount, no payeeName)
      if (selectedCheque) {
        await tx.chequeRegister.update({
          where: { id: selectedCheque.id },
          data: { amount: data.amount },
        });
      }

      // 3. Register received cheque in cheque register (RECEIPT + CHEQUE)
      if (data.voucherType === "RECEIPT" && data.paymentMethod === "CHEQUE" && data.referenceNumber && data.bankAccountId) {
        await tx.chequeRegister.create({
          data: {
            chequeNumber: data.referenceNumber,
            chequeDate: data.referenceDate ? new Date(data.referenceDate) : new Date(data.voucherDate),
            amount: data.amount,
            chequeType: "RECEIVED",
            status: "DEPOSITED",
            accountId: data.bankAccountId,
            financialYearId: currentFY?.id,
          },
        });
      }

      // 4. Instant-post for pre-confirmed bank receipts
      if (isInstantReceipt) {
        await tx.bankTransaction.create({
          data: {
            bankAccountId: data.bankAccountId!,
            amount: data.amount,
            type: "CREDIT",
            description: `${v.voucherNumber} – ${data.description}`,
            voucherId: v.id,
            transactionDate: new Date(data.voucherDate),
          },
        });
        await tx.bankAccount.update({
          where: { id: data.bankAccountId! },
          data: { currentBalance: { increment: data.amount } },
        });
        await tx.cashBook.create({
          data: {
            date: new Date(data.voucherDate),
            description: `RECEIPT – ${payee!.name} – ${data.description}`,
            creditAmount: data.amount,
            debitAmount: 0,
            balance: 0,
            referenceType: "PaymentVoucher",
            referenceId: v.id,
            paymentVoucherId: v.id,
            financialYearId: currentFY?.id,
          },
        });
        await tx.paymentVoucher.update({ where: { id: v.id }, data: { status: "APPROVED", approvedAt: new Date() } });
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          userName: session.user.name ?? "Unknown User",
          userRole,
          action: "CREATE",
          module: "PaymentVoucher",
          entityId: v.id,
          entityType: "PaymentVoucher",
          status: "SUCCESS",
        },
      });

      return tx.paymentVoucher.findUnique({
        where: { id: v.id },
        include: { payee: { select: { id: true, name: true, email: true } } },
      });
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Voucher creation error:", error);
    return NextResponse.json({ error: "Failed to create payment voucher" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const voucherType = searchParams.get("voucherType");

    const where: any = userRole === "MEMBER" ? { payee: { userId } } : {};
    if (status) where.status = status;
    if (voucherType) where.voucherType = voucherType;

    const vouchers = await prisma.paymentVoucher.findMany({
      where,
      include: {
        payee: { select: { id: true, name: true, email: true } },
        bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error("Voucher fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch vouchers" }, { status: 500 });
  }
}
