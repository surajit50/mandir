import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only ACCOUNTANT and ADMIN can view cash book
    if (!["ACCOUNTANT", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Build filter
    let dateFilter = {};
    if (fromDate || toDate) {
      dateFilter = {
        date: {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { lte: new Date(toDate) }),
        },
      };
    }

    const [cashBookEntries, approvedHandovers] = await Promise.all([
      prisma.cashBook.findMany({
        where: {
          ...dateFilter,
          referenceType: {
            not: "CashHandover",
          },
        },
        include: {
          donationCollection: {
            include: { collector: { select: { name: true } } },
          },
          paymentVoucher: {
            include: { payee: { select: { name: true } } },
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.cashHandover.findMany({
        where: {
          status: "APPROVED",
          ...(fromDate || toDate
            ? {
                approvedAt: {
                  ...(fromDate && { gte: new Date(fromDate) }),
                  ...(toDate && { lte: new Date(toDate) }),
                },
              }
            : {}),
        },
        include: {
          handoverFromUser: {
            select: { name: true },
          },
        },
        orderBy: { approvedAt: "asc" },
      }),
    ]);

    const handoverEntries = approvedHandovers.map((handover: any) => ({
      id: `handover-${handover.id}`,
      date: handover.approvedAt ?? new Date(),
      description: `Cash Handover - ${handover.handoverFromUser.name}`,
      debitAmount: 0,
      creditAmount: handover.totalAmount,
      balance: 0,
      referenceType: "CashHandover",
      referenceId: handover.id,
      createdAt: handover.approvedAt ?? new Date(),
    }));

    const mergedEntries = [...cashBookEntries, ...handoverEntries].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Running balance = receipts - payments
    let runningBalance = 0;
    const enrichedEntries = mergedEntries.map((entry: any) => {
      runningBalance += (entry.creditAmount || 0) - (entry.debitAmount || 0);
      return {
        ...entry,
        runningBalance,
      };
    });

    // Calculate summary
    const summary = {
      totalDebits: enrichedEntries.reduce((sum: number, e: any) => sum + e.debitAmount, 0),
      totalCredits: enrichedEntries.reduce((sum: number, e: any) => sum + e.creditAmount, 0),
      closingBalance: runningBalance,
      entryCount: enrichedEntries.length,
    };

    return NextResponse.json({
      entries: enrichedEntries,
      summary,
    });
  } catch (error) {
    console.error("Get cash book error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash book" },
      { status: 500 }
    );
  }
}
