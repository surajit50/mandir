import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // CashBook summary excluding handovers (to avoid legacy wrong handover rows).
    const [cashBookSummary, approvedHandovers] = await Promise.all([
      prisma.cashBook.aggregate({
        where: {
          referenceType: {
            not: "CashHandover",
          },
        },
        _sum: {
          creditAmount: true,
          debitAmount: true,
        },
      }),
      prisma.cashHandover.aggregate({
        where: {
          status: "APPROVED",
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const cashBookReceipts = cashBookSummary._sum.creditAmount || 0;
    const cashBookPayments = cashBookSummary._sum.debitAmount || 0;
    const handoverCashIn = approvedHandovers._sum.totalAmount || 0;
    const totalReceipts = cashBookReceipts + handoverCashIn;
    const totalPayments = cashBookPayments;
    // Prevent tiny/legacy negative drift from blocking cash deposits in UI.
    const rawBalance = totalReceipts - totalPayments;
    const balance = rawBalance < 0 ? 0 : rawBalance;

    return NextResponse.json({
      balance,
      totalReceipts,
      totalPayments,
      rawBalance,
      handoverCashIn,
    });
  } catch (error) {
    console.error("Cash balance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash balance" },
      { status: 500 }
    );
  }
}
