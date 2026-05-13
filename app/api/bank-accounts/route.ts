// app/api/bank-accounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

import { BankAccountSchema } from "@/lib/validations/accounting";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any).role;
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = BankAccountSchema.parse(body);

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { accountNumber: validatedData.accountNumber },
    });
    if (existingAccount) {
      return NextResponse.json(
        { error: "Account number already exists" },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        accountNumber: validatedData.accountNumber,
        bankName: validatedData.bankName,
        branch: validatedData.branch || null,
        ifscCode: validatedData.ifscCode || null,
        accountHolder: validatedData.accountHolder,
        accountType: validatedData.accountType,
        openingBalance: validatedData.openingBalance,
        currentBalance: validatedData.openingBalance,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? "Unknown User",
        userRole: userRole,
        action: "CREATE",
        module: "BankAccount",
        entityId: bankAccount.id,
        entityType: "BankAccount",
        status: "SUCCESS",
      },
    });

    return NextResponse.json(bankAccount, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Bank account creation error:", error);
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching bank accounts...");

    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: "desc" },
    });

    const enrichedAccounts = await Promise.all(
      bankAccounts.map(async (account) => {
        const pendingVouchers = await prisma.paymentVoucher.aggregate({
          where: {
            bankAccountId: account.id,
            status: "DRAFT",
            voucherType: "PAYMENT",
          },
          _sum: {
            amount: true,
          },
        });

        const pendingPayments = pendingVouchers._sum.amount || 0;
        return {
          ...account,
          pendingPayments,
          potentialBalance: account.currentBalance - pendingPayments,
        };
      })
    );

    return NextResponse.json(enrichedAccounts);
  } catch (error) {
    console.error("Bank accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}
