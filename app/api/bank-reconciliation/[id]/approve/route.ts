import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const approverId = (session.user as any).id;

    // Only ADMIN can approve reconciliations
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Only admins can approve reconciliations" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const reconciliation = await prisma.bankReconciliation.update({
      where: { id },
      data: {
        status: body.approve ? "APPROVED" : "REJECTED",
        approvedBy: body.approve ? approverId : null,
        approvedAt: body.approve ? new Date() : null,
      },
      include: {
        account: true,
        reconciliationItems: true,
      },
    });

    // If approved, update the bank account's current balance
    if (body.approve) {
      await prisma.bankAccount.update({
        where: { id: reconciliation.accountId },
        data: {
          currentBalance: reconciliation.bankBalance,
        },
      });
    }

    return NextResponse.json(reconciliation);
  } catch (error) {
    console.error("Bank reconciliation approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve reconciliation" },
      { status: 500 }
    );
  }
}
