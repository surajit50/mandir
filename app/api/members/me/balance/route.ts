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

    const userRole = (session.user as any).role;
    const { searchParams } = new URL(request.url);
    let targetUserId = (session.user as any).id;

    // If Admin/Accountant and userId param is provided, use that
    const queryUserId = searchParams.get("userId");
    if (["ADMIN", "ACCOUNTANT"].includes(userRole) && queryUserId) {
      targetUserId = queryUserId;
    }

    // Get target user name
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate balance from MemberCashLedger
    const ledgerEntries = await prisma.memberCashLedger.findMany({
      where: { memberId: targetUserId },
      select: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const totalCredits = ledgerEntries.reduce((sum: number, entry: any) => sum + entry.creditAmount, 0);
    const totalDebits = ledgerEntries.reduce((sum: number, entry: any) => sum + entry.debitAmount, 0);
    const balance = totalCredits - totalDebits;

    // Alternative: Calculate directly from source tables to ensure accuracy if ledger is inconsistent
    const [donations, handoversSent, handoversReceived] = await Promise.all([
      prisma.donationCollection.aggregate({
        where: {
          collectorId: targetUserId,
          status: "VERIFIED",
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.cashHandover.aggregate({
        where: {
          handoverFrom: targetUserId,
          status: "APPROVED",
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.cashHandover.aggregate({
        where: {
          approvedBy: targetUserId,
          status: "APPROVED",
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const totalCollected = donations._sum.totalAmount || 0;
    const totalSent = handoversSent._sum.totalAmount || 0;
    const totalReceived = handoversReceived._sum.totalAmount || 0;
    
    const directBalance = totalCollected + totalReceived - totalSent;

    return NextResponse.json({
      balance: directBalance,
      totalCollected,
      totalHandedOver: totalSent,
      totalReceived,
      userName: targetUser.name,
      ledgerBalance: balance,
    });
  } catch (error) {
    console.error("Member balance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch member balance" },
      { status: 500 }
    );
  }
}
