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
    // 1) Keep all cashBook entries except CashHandover (legacy rows may be wrong)
    // 2) Add approved handovers as receipt entries directly from cashHandover table
    const [cashBookEntries, approvedHandovers] = await Promise.all([
      prisma.cashBook.findMany({
        where: {
          referenceType: {
            not: "CashHandover",
          },
        },
        orderBy: { date: "asc" },
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
      }),
      prisma.cashHandover.findMany({
        where: { status: "APPROVED" },
        orderBy: { approvedAt: "asc" },
        select: {
          id: true,
          totalAmount: true,
          approvedAt: true,
          handoverFromUser: {
            select: { name: true },
          },
        },
      }),
    ]);

    const handoverEntries = approvedHandovers.map((handover: any) => ({
      id: `handover-${handover.id}`,
      date: handover.approvedAt ?? new Date(),
      description: `Cash Handover - ${handover.handoverFromUser.name}`,
      debitAmount: 0,
      creditAmount: handover.totalAmount,
      referenceType: "CashHandover",
      referenceId: handover.id,
      createdAt: handover.approvedAt ?? new Date(),
    }));

    const mergedEntries = [...cashBookEntries, ...handoverEntries].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
