import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("startDate");
    const toDate = searchParams.get("endDate");

    // Build canonical cash-book view:
    // We now rely on the CashBook table which is populated during approval/verification.
    
    // 1) Fetch Cash Account (1001) opening balance
    const cashAccount = await prisma.gLAccount.findUnique({
      where: { accountCode: "1001" },
      select: { openingBalance: true },
    });
    const baseOpeningBalance = cashAccount?.openingBalance || 0;

    // 2) Calculate Opening Balance for the period if fromDate is provided
    let periodOpeningBalance = baseOpeningBalance;
    if (fromDate) {
      const priorTransactions = await prisma.cashBook.aggregate({
        where: {
          date: { lt: new Date(fromDate) },
          referenceType: { not: "DonationCollection" },
        },
        _sum: {
          creditAmount: true,
          debitAmount: true,
        },
      });
      periodOpeningBalance += (priorTransactions._sum.creditAmount || 0) - (priorTransactions._sum.debitAmount || 0);
    }

    // 3) Fetch entries for the specified period
    const dateFilter: any = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const entries = await prisma.cashBook.findMany({
      where: {
        referenceType: {
          not: "DonationCollection",
        },
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        date: true,
        description: true,
        debitAmount: true,
        creditAmount: true,
        referenceType: true,
        referenceId: true,
        createdAt: true,
      },
    });

    // 4) Sort: date (day only) asc, then receipts (credit) before payments (debit), then createdAt asc
    entries.sort((a: any, b: any) => {
      const d1 = new Date(a.date).setHours(0, 0, 0, 0);
      const d2 = new Date(b.date).setHours(0, 0, 0, 0);
      if (d1 !== d2) return d1 - d2;

      // In the simplified CashBook table:
      // creditAmount = Inflow (Receipt)
      // debitAmount = Outflow (Payment)
      // Receipts before payments on the same date
      if (a.creditAmount > 0 && b.debitAmount > 0) return -1;
      if (a.debitAmount > 0 && b.creditAmount > 0) return 1;

      // Stable sort using creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let runningBalance = periodOpeningBalance;
    const normalizedEntries = entries.map((entry: any) => {
      runningBalance += (entry.creditAmount || 0) - (entry.debitAmount || 0);
      return {
        ...entry,
        balance: runningBalance,
      };
    });

    // 5) Calculate Total Pending Cash with Members (Verified but not handed over)
    const memberBalances = await prisma.memberCashLedger.groupBy({
      by: ["memberId"],
      _sum: {
        creditAmount: true,
        debitAmount: true,
      },
    });

    const pendingMemberCash = memberBalances.reduce((sum, m) => {
      const balance = (m._sum.creditAmount || 0) - (m._sum.debitAmount || 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0);

    const summary = {
      openingBalance: periodOpeningBalance,
      totalReceipts: entries.reduce((sum, e) => sum + (e.creditAmount || 0), 0),
      totalPayments: entries.reduce((sum, e) => sum + (e.debitAmount || 0), 0),
      closingBalance: runningBalance,
      pendingMemberCash,
      totalTrustCash: runningBalance + pendingMemberCash,
    };

    return NextResponse.json({
      entries: normalizedEntries,
      summary,
    });
  } catch (error) {
    console.error("Cash book fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash book" },
      { status: 500 }
    );
  }
}
