import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden – only Admins can lock/unlock financial years" },
        { status: 403 }
      );
    }

    const financialYear = await prisma.financialYear.findUnique({
      where: { id },
    });

    if (!financialYear) {
      return NextResponse.json(
        { error: "Financial year not found" },
        { status: 404 }
      );
    }

    const updatedYear = await prisma.financialYear.update({
      where: { id },
      data: {
        isLocked: !financialYear.isLocked,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? "Unknown User",
        userRole: session.user.role,
        action: "UPDATE",
        module: "FinancialYear",
        entityId: id,
        entityType: "FinancialYear",
        newValues: { isLocked: updatedYear.isLocked } as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(updatedYear);
  } catch (error) {
    console.error("Lock financial year error:", error);
    return NextResponse.json(
      { error: "Failed to update financial year status" },
      { status: 500 }
    );
  }
}
