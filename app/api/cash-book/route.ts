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

    // Build canonical cash-book view:
    // We now rely on the CashBook table which is populated during approval/verification.
    // 1) Fetch all entries.
    // 2) We filter out 'DonationCollection' since they are now tracked only in Member Ledger
    //    until handed over.
    const mergedEntries = await prisma.cashBook.findMany({
      where: {
        referenceType: {
          not: "DonationCollection",
        },
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

    // Fetch Cash Account (1001) opening balance
    const cashAccount = await prisma.gLAccount.findUnique({
      where: { accountCode: "1001" },
      select: { openingBalance: true },
    });

    // Sort: date (day only) asc, then receipts (credit) before payments (debit), then createdAt asc
    mergedEntries.sort((a: any, b: any) => {
      const d1 = new Date(a.date).setHours(0, 0, 0, 0);
      const d2 = new Date(b.date).setHours(0, 0, 0, 0);
      if (d1 !== d2) return d1 - d2;

      // Receipts before payments on the same date
      if (a.creditAmount > 0 && b.debitAmount > 0) return -1;
      if (a.debitAmount > 0 && b.creditAmount > 0) return 1;

      // Stable sort using creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let runningBalance = cashAccount?.openingBalance || 0;
    const normalizedEntries = mergedEntries.map((entry: any) => {
      runningBalance += (entry.creditAmount || 0) - (entry.debitAmount || 0);
      return {
        ...entry,
        balance: runningBalance,
      };
    });

    return NextResponse.json(normalizedEntries);
  } catch (error) {
    console.error("Cash book fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash book" },
      { status: 500 }
    );
  }
}
