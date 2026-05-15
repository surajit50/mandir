import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

import { BankDepositSchema } from "@/lib/validations/accounting";
import { postTransaction } from "@/lib/accounting/gl-service";

// Generate deposit number
async function generateDepositNumber(): Promise<string> {
  const count = await prisma.bankDeposit.count();
  const year = new Date().getFullYear();
  return `DEP-${year}-${String(count + 1).padStart(5, "0")}`;
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

    // Only ADMIN and ACCOUNTANT can create deposits
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can create deposits" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = BankDepositSchema.parse(body);

    // Verify account exists
    const account = await prisma.bankAccount.findUnique({
      where: { id: validatedData.accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 400 }
      );
    }

    const depositNumber = await generateDepositNumber();

    // Get current financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    // Compute cash-out portion that should reduce available cash:
    // total deposit amount minus the value of linked cheques.
    let chequeTotal = 0;
    if (validatedData.chequeIds && validatedData.chequeIds.length > 0) {
      const linkedCheques = await prisma.chequeRegister.findMany({
        where: { id: { in: validatedData.chequeIds } },
        include: { paymentVouchers: { select: { amount: true } } },
      });
      chequeTotal = linkedCheques.reduce((sum: number, c: any) => sum + (c.paymentVouchers[0]?.amount || 0), 0);
    }
    const cashPortion = Math.max(0, validatedData.totalAmount - chequeTotal);

    const deposit = await prisma.$transaction(async (tx: any) => {
      const d = await tx.bankDeposit.create({
        data: {
          depositNumber,
          depositDate: new Date(validatedData.depositDate),
          accountId: validatedData.accountId,
          totalAmount: validatedData.totalAmount,
          depositType: validatedData.depositType,
          remarks: validatedData.remarks,
          status: "PENDING",
          financialYearId: currentFY?.id,
          cheques: {
            connect: (validatedData.chequeIds || []).map((id: string) => ({ id })),
          },
          cashHandovers: {
            connect: (validatedData.handoverIds || []).map((id: string) => ({ id })),
          },
        },
        include: {
          account: { select: { id: true, bankName: true, accountNumber: true } },
          cheques: true,
        },
      });

      // Update cheque status to DEPOSITED
      if (validatedData.chequeIds && validatedData.chequeIds.length > 0) {
        await tx.chequeRegister.updateMany({
          where: { id: { in: validatedData.chequeIds } },
          data: { status: "DEPOSITED" },
        });
      }

      // Record cash reduction so "Available Cash for Deposit" updates correctly.
      if (cashPortion > 0) {
        const existingCashEntry = await tx.cashBook.findFirst({
          where: { referenceType: "BankDeposit", referenceId: d.id },
        });

        if (!existingCashEntry) {
          await tx.cashBook.create({
            data: {
              date: new Date(validatedData.depositDate),
              description: `Bank Deposit (${d.depositType}) - ${d.depositNumber}`,
              debitAmount: cashPortion,
              creditAmount: 0,
              balance: 0,
              referenceType: "BankDeposit", // We'll keep this but the UI will handle it
              referenceId: d.id,
              financialYearId: currentFY?.id,
            },
          });
        }
      }

      // Note: Bank balance update and BankTransaction record are now handled 
      // exclusively in the /verify route to prevent double counting.

      // ===== NEW: Double-Entry GL Posting =====
      const entries: { accountCode: string, accountName: string, accountType: string, debit?: number, credit?: number }[] = [];
      
      // Debit Bank Account
      entries.push({ accountCode: "1002", accountName: "Bank Account", accountType: "Asset", debit: validatedData.totalAmount });
      
      // Credit Cash / Cheque in transit
      if (cashPortion > 0) {
        entries.push({ accountCode: "1001", accountName: "Cash Account", accountType: "Asset", credit: cashPortion });
      }
      if (chequeTotal > 0) {
        entries.push({ accountCode: "1003", accountName: "Cheques in Hand", accountType: "Asset", credit: chequeTotal });
      }

      await postTransaction(tx, {
        date: new Date(validatedData.depositDate),
        description: `Bank Deposit - ${d.depositNumber}`,
        referenceType: "BankDeposit",
        referenceId: d.id,
        financialYearId: currentFY?.id,
        entries
      });
      // ===== End GL Posting =====

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: (session.user as any).id,
          userName: session.user.name ?? "Unknown User",
          userRole: userRole,
          action: "CREATE",
          module: "BankDeposit",
          entityId: d.id,
          entityType: "BankDeposit",
          status: "SUCCESS",
        },
      });

      return d;
    });

    return NextResponse.json(deposit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Bank deposit creation error:", error);
    return NextResponse.json(
      { error: "Failed to create bank deposit" },
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

    const deposits = await prisma.bankDeposit.findMany({
      include: {
        account: { select: { id: true, bankName: true, accountNumber: true } },
        cheques: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(deposits);
  } catch (error) {
    console.error("Bank deposits fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank deposits" },
      { status: 500 }
    );
  }
}
