// app/api/vouchers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PaymentVoucherSchema = z.object({
  voucherDate: z.string().datetime(),
  payeeId: z.string().optional(),
  payeeName: z.string().optional(),
  payeeEmail: z.string().email().optional().or(z.literal("")),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(["CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE"]),
  voucherType: z.enum(["PAYMENT", "RECEIPT"]),
  chequeId: z.string().optional(),
  bankAccountId: z.string().optional(),
  category: z.string().optional(),
  referenceNumber: z.string().optional(),
  referenceDate: z.string().datetime().optional().or(z.literal("")),
  metalType: z.string().optional(),
  weight: z.number().optional(),
  purity: z.string().optional(),
});

// Categories that should instantly credit the bank account and be marked as APPROVED
const INSTANT_POST_RECEIPT_CATEGORIES = [
  "DIRECT_DEPOSIT",
  "BANK_INTEREST",
  "BANK_TRANSFER_RECEIVED",
  "ONLINE_RECEIVED",
];

// Generate voucher number
async function generateVoucherNumber(type: "PAYMENT" | "RECEIPT"): Promise<string> {
  const count = await prisma.paymentVoucher.count({
    where: { voucherType: type }
  });
  const year = new Date().getFullYear();
  const prefix = type === "PAYMENT" ? "PV" : "RV";
  return `${prefix}-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;

    // Only ADMIN and ACCOUNTANT can create vouchers
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can create vouchers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = PaymentVoucherSchema.parse(body);

    const trimmedPayeeName = validatedData.payeeName?.trim();
    if (!validatedData.payeeId && !trimmedPayeeName) {
      return NextResponse.json({ error: "Payee is required" }, { status: 400 });
    }

    let payee = validatedData.payeeId
      ? await prisma.payee.findUnique({
          where: { id: validatedData.payeeId },
          select: { id: true, name: true, email: true, userId: true },
        })
      : null;

    if (!payee && trimmedPayeeName) {
      const normalizedEmail = validatedData.payeeEmail || null;
      payee = await prisma.payee.findFirst({
        where: {
          name: trimmedPayeeName,
          email: normalizedEmail,
        },
        select: { id: true, name: true, email: true, userId: true },
      });

      if (!payee) {
        const linkedUser = normalizedEmail
          ? await prisma.user.findUnique({
              where: { email: normalizedEmail },
              select: { id: true },
            })
          : null;

        payee = await prisma.payee.create({
          data: {
            name: trimmedPayeeName,
            email: normalizedEmail,
            userId: linkedUser?.id || null,
            isActive: true,
          },
          select: { id: true, name: true, email: true, userId: true },
        });
      }
    }

    if (!payee) {
      return NextResponse.json({ error: "Payee not found" }, { status: 400 });
    }

    let selectedCheque: {
      id: string;
      chequeNumber: string;
      amount: number;
      payeeName: string;
    } | null = null;

    if (
      validatedData.voucherType === "PAYMENT" &&
      validatedData.paymentMethod === "CHEQUE"
    ) {
      if (!validatedData.chequeId) {
        return NextResponse.json(
          { error: "Please select a cheque from cheque register" },
          { status: 400 }
        );
      }

      selectedCheque = await prisma.chequeRegister.findFirst({
        where: {
          id: validatedData.chequeId,
          status: "ISSUED",
        },
        select: {
          id: true,
          chequeNumber: true,
          amount: true,
          payeeName: true,
        },
      });

      if (!selectedCheque) {
        return NextResponse.json(
          { error: "Selected cheque is invalid or no longer available" },
          { status: 400 }
        );
      }

      const isUnassignedCheque =
        selectedCheque.payeeName === "UNASSIGNED" && selectedCheque.amount === 0;

      if (!isUnassignedCheque && selectedCheque.amount !== validatedData.amount) {
        return NextResponse.json(
          { error: "Voucher amount must match selected cheque amount" },
          { status: 400 }
        );
      }
    }

    const voucherNumber = await generateVoucherNumber(validatedData.voucherType);

    // Get current financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    const voucher = await prisma.$transaction(async (tx) => {
      const v = await tx.paymentVoucher.create({
        data: {
          voucherNumber,
          voucherDate: new Date(validatedData.voucherDate),
          voucherType: validatedData.voucherType,
          payeeId: payee!.id,
          amount: validatedData.amount,
          description:
            validatedData.paymentMethod === "CHEQUE" && selectedCheque
              ? `${validatedData.description} (Cheque #${selectedCheque.chequeNumber})`
              : validatedData.description,
          paymentMethod: validatedData.paymentMethod,
          category: validatedData.category,
          referenceNumber: validatedData.referenceNumber,
          referenceDate: validatedData.referenceDate
            ? new Date(validatedData.referenceDate)
            : undefined,
          metalType: validatedData.metalType,
          weight: validatedData.weight,
          purity: validatedData.purity,
          status: "DRAFT",
          financialYearId: currentFY?.id,
        },
        include: {
          payee: { select: { id: true, name: true, email: true } },
        },
      });

      // ===== NEW: Auto‑post eligible receipts to the bank passbook =====
      const shouldPostToBank =
        validatedData.voucherType === "RECEIPT" &&
        validatedData.bankAccountId &&
        INSTANT_POST_RECEIPT_CATEGORIES.includes(validatedData.category ?? "");

      if (shouldPostToBank) {
        // 1. Create a credit transaction in the bank account
        await tx.bankTransaction.create({
          data: {
            bankAccountId: validatedData.bankAccountId!,
            amount: validatedData.amount,
            type: "CREDIT",
            description: `${v.voucherNumber} - ${validatedData.description}`,
            voucherId: v.id,
            transactionDate: new Date(validatedData.voucherDate),
          },
        });

        // 2. Update the bank account's current balance
        await tx.bankAccount.update({
          where: { id: validatedData.bankAccountId! },
          data: {
            currentBalance: {
              increment: validatedData.amount,
            },
          },
        });

        // 3. Mark the voucher as APPROVED instead of DRAFT
        await tx.paymentVoucher.update({
          where: { id: v.id },
          data: { status: "APPROVED" },
        });

        // Re‑fetch the voucher so the response includes the updated status
        const updatedVoucher = await tx.paymentVoucher.findUnique({
          where: { id: v.id },
          include: { payee: { select: { id: true, name: true, email: true } } },
        });
        if (updatedVoucher) {
          v.status = updatedVoucher.status;
          // Optionally merge other fields if needed, but status is the only change
        }
      }
      // ===== End auto‑post block =====

      if (validatedData.voucherType === "RECEIPT" && validatedData.paymentMethod === "CHEQUE" && validatedData.referenceNumber) {
        if (validatedData.bankAccountId) {
          await tx.chequeRegister.create({
            data: {
              chequeNumber: validatedData.referenceNumber,
              chequeDate: validatedData.referenceDate ? new Date(validatedData.referenceDate) : new Date(validatedData.voucherDate),
              amount: validatedData.amount,
              payeeName: "Temple Trust",
              payerName: payee!.name,
              chequeType: "RECEIVED",
              status: "DEPOSITED",
              accountId: validatedData.bankAccountId,
              financialYearId: currentFY?.id,
            },
          });
        }
      }

      if (selectedCheque) {
        await tx.chequeRegister.update({
          where: { id: selectedCheque.id },
          data: {
            amount: validatedData.amount,
            payeeName: payee!.name,
          },
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          userName: session.user.name ?? "Unknown User",
          userRole: userRole,
          action: "CREATE",
          module: "PaymentVoucher",
          entityId: v.id,
          entityType: "PaymentVoucher",
          status: "SUCCESS",
        },
      });

      return v;
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Voucher creation error:", error);
    return NextResponse.json(
      { error: "Failed to create payment voucher" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Filter based on role
    const where =
      userRole === "MEMBER" ? { payee: { userId } } : {};

    const vouchers = await prisma.paymentVoucher.findMany({
      where,
      include: {
        payee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error("Voucher fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vouchers" },
      { status: 500 }
    );
  }
}
