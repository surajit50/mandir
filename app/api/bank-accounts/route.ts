import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BankAccountSchema = z.object({
  accountNumber: z.string().min(1, "Account number is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountHolder: z.string().min(1, "Account holder is required"),
  accountType: z.string().min(1, "Account type is required"),
  openingBalance: z.number().default(0),
});

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

    // Only ADMIN and ACCOUNTANT can create bank accounts
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can create bank accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = BankAccountSchema.parse(body);

    // Check if account number already exists
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
        accountHolder: validatedData.accountHolder,
        accountType: validatedData.accountType,
        openingBalance: validatedData.openingBalance,
        currentBalance: validatedData.openingBalance,
      },
    });

    // Log audit
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bankAccounts);
  } catch (error) {
    console.error("Bank accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}
