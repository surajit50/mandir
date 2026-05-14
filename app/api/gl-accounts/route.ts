import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GLAccountSchema } from "@/lib/validations/accounting";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("accountType");

    const accounts = await prisma.gLAccount.findMany({
      where: {
        isActive: true,
        ...(accountType ? { accountType } : {}),
      },
      include: {
        postings: {
          select: { debitAmount: true, creditAmount: true },
        },
      },
      orderBy: { accountCode: "asc" },
    });

    const enriched = accounts.map((acc: any) => ({
      ...acc,
      totalDebits: acc.postings.reduce((sum: number, p: any) => sum + p.debitAmount, 0),
      totalCredits: acc.postings.reduce((sum: number, p: any) => sum + p.creditAmount, 0),
      runningBalance:
        acc.openingBalance +
        acc.postings.reduce((sum: number, p: any) => sum + p.creditAmount - p.debitAmount, 0),
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Get GL accounts error:", error);
    return NextResponse.json({ error: "Failed to fetch GL accounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden – only Admins can create GL accounts" }, { status: 403 });
    }

    const body = await req.json();
    const result = GLAccountSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { accountCode, accountName, accountType, subType, description, openingBalance } =
      result.data;

    const existing = await prisma.gLAccount.findUnique({ where: { accountCode } });
    if (existing) {
      return NextResponse.json({ error: "Account code already exists" }, { status: 409 });
    }

    const account = await prisma.gLAccount.create({
      data: {
        accountCode,
        accountName,
        accountType,
        subType: subType || null,
        description: description || null,
        openingBalance: openingBalance ?? 0,
        currentBalance: openingBalance ?? 0,
      },
    });

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
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
