import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const festivalSchema = z.object({
  festivalName: z.string(),
  festivalDate: z.string().datetime(),
  description: z.string().optional(),
  budgetAmount: z.number().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const festivals = await prisma.festival.findMany({
      include: {
        festivalTransactions: {
          select: { amount: true, transactionType: true },
        },
      },
      orderBy: { festivalDate: "desc" },
    });

    // Calculate summary for each festival
    const enriched = festivals.map((festival) => {
      const income = festival.festivalTransactions
        .filter((t) => t.transactionType === "Income")
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = festival.festivalTransactions
        .filter((t) => t.transactionType === "Expense")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        ...festival,
        totalIncome: income,
        totalExpense: expense,
        surplus: income - expense,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Get festivals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch festivals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = festivalSchema.parse(body);

    const festival = await prisma.festival.create({
      data: {
        festivalName: validated.festivalName,
        festivalDate: new Date(validated.festivalDate),
        description: validated.description,
        budgetAmount: validated.budgetAmount,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        userRole: session.user.role,
        action: "CREATE",
        module: "Festival",
        entityId: festival.id,
        entityType: "Festival",
        newValues: festival as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(festival, { status: 201 });
  } catch (error) {
    console.error("Create festival error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create festival" },
      { status: 400 }
    );
  }
}
