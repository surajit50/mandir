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

    const [cashBookSummary, pendingVouchers] = await Promise.all([
      prisma.cashBook.aggregate({
        where: {
          referenceType: {
            not: "DonationCollection",
          },
        },
        _sum: {
          creditAmount: true,
          debitAmount: true,
        },
      }),
      prisma.paymentVoucher.aggregate({
        where: {
          status: "DRAFT",
          voucherType: "PAYMENT",
          paymentMethod: "CASH",
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    // Summary calculation
    const totalReceipts = cashBookSummary._sum.creditAmount || 0;
    
    // Payments summary: we exclude 'BankDeposit' (transfers) from the expenditures total
    const totalPaymentsRaw = await prisma.cashBook.aggregate({
      where: {
        referenceType: {
          notIn: ["DonationCollection", "BankDeposit"],
        },
      },
      _sum: {
        debitAmount: true,
      }
    });
    const totalPayments = totalPaymentsRaw._sum.debitAmount || 0;

    const pendingPayments = pendingVouchers._sum.amount || 0;

    // Balance calculation
    const rawBalance = totalReceipts - (cashBookSummary._sum.debitAmount || 0);
    const balance = rawBalance < 0 ? 0 : rawBalance;

    // Handover cash summary: total cash received through approved handovers
    const handoverSummary = await prisma.cashBook.aggregate({
      where: {
        referenceType: "CashHandover",
      },
      _sum: {
        creditAmount: true,
      }
    });
    const handoverCashIn = handoverSummary._sum.creditAmount || 0;

    return NextResponse.json({
      balance,
      totalReceipts,
      totalPayments,
      handoverCashIn,
      rawBalance,
      pendingPayments,
      potentialBalance: balance - pendingPayments,
    });
  } catch (error) {
    console.error("Cash balance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash balance" },
      { status: 500 }
    );
  }
}
