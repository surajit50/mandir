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

    const userId = (session.user as any).id;

    // Fetch ledger entries for the logged-in member
    const entries = await prisma.memberCashLedger.findMany({
      where: {
        memberId: userId,
      },
      orderBy: { transactionDate: "asc" },
      select: {
        id: true,
        transactionDate: true,
        description: true,
        debitAmount: true,
        creditAmount: true,
        referenceType: true,
        referenceId: true,
        createdAt: true,
      },
    });

    // Calculate running balance on the fly to ensure accuracy
    let runningBalance = 0;
    const normalizedEntries = entries.map((entry) => {
      // In MemberCashLedger:
      // creditAmount is when member collects money (increases their cash in hand)
      // debitAmount is when member hands over money (decreases their cash in hand)
      runningBalance += (entry.creditAmount || 0) - (entry.debitAmount || 0);
      return {
        id: entry.id,
        date: entry.transactionDate,
        description: entry.description,
        debitAmount: entry.debitAmount,
        creditAmount: entry.creditAmount,
        balance: runningBalance,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
      };
    });

    // Return chronological order to match cash-book behavior
    return NextResponse.json(normalizedEntries);
  } catch (error) {
    console.error("Member ledger fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger" },
      { status: 500 }
    );
  }
}
