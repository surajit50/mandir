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

    let runningBalance = 0;
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
