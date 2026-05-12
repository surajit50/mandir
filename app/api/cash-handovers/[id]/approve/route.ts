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

    // Only ADMIN and ACCOUNTANT can approve
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can approve" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isApproving = body.approve;

    // Get current financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const handover = await tx.cashHandover.update({
        where: { id },
        data: {
          status: isApproving ? "APPROVED" : "REJECTED",
          approvedBy: isApproving ? approverId : null,
          approvedAt: isApproving ? new Date() : null,
          financialYearId: isApproving ? (currentFY?.id || null) : null,
        },
        include: {
          handoverFromUser: { select: { id: true, name: true } },
        },
      });

      // If approved, record cash handover as trust cash-in so it can be used for bank deposits.
      if (isApproving) {
        const existingEntry = await tx.cashBook.findFirst({
          where: { referenceId: id, referenceType: "CashHandover" },
        });

        if (!existingEntry) {
          await tx.cashBook.create({
            data: {
              date: new Date(),
              description: `Cash Handover - ${handover.handoverFromUser.name}`,
              creditAmount: handover.totalAmount,
              debitAmount: 0,
              balance: 0,
              referenceType: "CashHandover",
              referenceId: id,
              financialYearId: currentFY?.id,
            },
          });
        } else {
          // Normalize older/wrong entries (e.g., debit) to credit.
          await tx.cashBook.update({
            where: { id: existingEntry.id },
            data: {
              creditAmount: handover.totalAmount,
              debitAmount: 0,
              balance: 0,
              description: `Cash Handover - ${handover.handoverFromUser.name}`,
              financialYearId: currentFY?.id,
            },
          });
        }

        // Update member cash ledger (Sender - Debit)
        await tx.memberCashLedger.create({
          data: {
            memberId: handover.handoverFromUser.id,
            description: `Cash Handover (Sent to ${session.user.name})`,
            transactionDate: new Date(),
            debitAmount: handover.totalAmount,
            balance: -handover.totalAmount,
            referenceType: "CashHandover",
            referenceId: id,
          },
        });

        // Update member cash ledger (Receiver/Approver - Credit)
        await tx.memberCashLedger.create({
          data: {
            memberId: approverId,
            description: `Cash Handover (Received from ${handover.handoverFromUser.name})`,
            transactionDate: new Date(),
            creditAmount: handover.totalAmount,
            balance: handover.totalAmount,
            referenceType: "CashHandover",
            referenceId: id,
          },
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: approverId,
          userName: session.user.name ?? "Unknown User",
          userRole: userRole,
          action: isApproving ? "APPROVE" : "REJECT",
          module: "CashHandover",
          entityId: id,
          entityType: "CashHandover",
          status: "SUCCESS",
        },
      });

      return handover;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cash handover approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve cash handover" },
      { status: 500 }
    );
  }
}
