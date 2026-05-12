import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import { z } from "zod";

const glAccountSchema = z.object({
  accountCode: z.string().min(3),
  accountName: z.string(),
  accountType: z.enum(["Asset", "Liability", "Equity", "Income", "Expense"]),
  subType: z.string().optional(),
  description: z.string().optional(),
  openingBalance: z.number().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("accountType");

    const where: any = { isActive: true };
    if (accountType) where.accountType = accountType;

    const accounts = await prisma.gLAccount.findMany({
      where,
      include: {
        postings: {
          select: { debitAmount: true, creditAmount: true },
        },
      },
      orderBy: { accountCode: "asc" },
    });

    // Calculate balances
    const enriched = accounts.map((acc) => ({
      ...acc,
      totalDebits: acc.postings.reduce((sum, p) => sum + p.debitAmount, 0),
      totalCredits: acc.postings.reduce((sum, p) => sum + p.creditAmount, 0),
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Get GL accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GL accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = glAccountSchema.parse(body);

    // Check if account code exists
    const existing = await prisma.gLAccount.findUnique({
      where: { accountCode: validated.accountCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Account code already exists" },
        { status: 400 }
      );
    }

    const account = await prisma.gLAccount.create({
      data: {
        ...validated,
        currentBalance: validated.openingBalance,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? "",
        userRole: session.user.role,
        action: "CREATE",
        module: "GLAccount",
        entityId: account.id,
        entityType: "GLAccount",
        newValues: account as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Create GL account error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create account" },
      { status: 400 }
    );
  }
}
