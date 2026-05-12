import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const financialYearSchema = z.object({
  yearCode: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const isCurrent = searchParams.get("isCurrent") === "true";

    if (isCurrent) {
      const currentYear = await prisma.financialYear.findFirst({
        where: { isCurrent: true },
      });
      return NextResponse.json(currentYear);
    }

    const years = await prisma.financialYear.findMany({
      include: {
        periodConfigs: { orderBy: { periodNumber: "asc" } },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(years);
  } catch (error) {
    console.error("Get financial years error:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial years" },
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
    const validated = financialYearSchema.parse(body);

    // Check if year code exists
    const existing = await prisma.financialYear.findUnique({
      where: { yearCode: validated.yearCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Financial year already exists" },
        { status: 400 }
      );
    }

    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);

    const year = await prisma.financialYear.create({
      data: {
        yearCode: validated.yearCode,
        startDate,
        endDate,
        isCurrent: false,
        isLocked: false,
      },
      include: { periodConfigs: true },
    });

    // Create monthly period configs
    const monthNames = [
      "April", "May", "June", "July", "August", "September",
      "October", "November", "December", "January", "February", "March"
    ];

    let currentDate = new Date(startDate);
    for (let i = 0; i < 12; i++) {
      const periodStart = new Date(currentDate);
      const periodEnd = new Date(currentDate);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0); // Last day of month

      await prisma.fYPeriodConfig.create({
        data: {
          financialYearId: year.id,
          periodName: monthNames[i],
          periodNumber: i + 1,
          startDate: periodStart,
          endDate: periodEnd,
        },
      });

      currentDate = new Date(periodEnd);
      currentDate.setDate(1); // First day of next month
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? "Unknown User",
        userRole: session.user.role,
        action: "CREATE",
        module: "FinancialYear",
        entityId: year.id,
        entityType: "FinancialYear",
        newValues: year as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(year, { status: 201 });
  } catch (error) {
    console.error("Create financial year error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create financial year" },
      { status: 400 }
    );
  }
}
