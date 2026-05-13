import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: periodId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT") {
      return NextResponse.json(
        { error: "Forbidden – only Admins or Accountants can close periods" },
        { status: 403 }
      );
    }

    const period = await prisma.fYPeriodConfig.findUnique({
      where: { id: periodId },
      include: { financialYear: true },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Financial period not found" },
        { status: 404 }
      );
    }

    if (period.isClosed) {
      return NextResponse.json(
        { error: "Period is already closed" },
        { status: 400 }
      );
    }

    if (period.financialYear.isLocked) {
      return NextResponse.json(
        { error: "Financial year is locked. Unlock it to close periods." },
        { status: 400 }
      );
    }

    // Check if previous period is closed (if not first period)
    if (period.periodNumber > 1) {
      const prevPeriod = await prisma.fYPeriodConfig.findFirst({
        where: {
          financialYearId: period.financialYearId,
          periodNumber: period.periodNumber - 1,
        },
      });

      if (prevPeriod && !prevPeriod.isClosed) {
        return NextResponse.json(
          { error: "Previous period must be closed before closing this one." },
          { status: 400 }
        );
      }
    }

    const updatedPeriod = await prisma.fYPeriodConfig.update({
      where: { id: periodId },
      data: {
        isClosed: true,
        closedDate: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? "Unknown User",
        userRole: session.user.role,
        action: "UPDATE",
        module: "FinancialYear",
        entityId: periodId,
        entityType: "FYPeriodConfig",
        newValues: { isClosed: true, closedDate: updatedPeriod.closedDate } as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(updatedPeriod);
  } catch (error) {
    console.error("Close financial period error:", error);
    return NextResponse.json(
      { error: "Failed to close financial period" },
      { status: 500 }
    );
  }
}
