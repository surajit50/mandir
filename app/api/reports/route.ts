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

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "overview";
    const financialYearId = searchParams.get("financialYearId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const fyFilter = financialYearId ? { financialYearId } : {};

    // ── TRIAL BALANCE ────────────────────────────────────────────────
    if (reportType === "trial-balance") {
      const accounts = await prisma.gLAccount.findMany({
        where: { isActive: true },
        include: {
          postings: {
            where: fyFilter,
            select: { debitAmount: true, creditAmount: true, postingDate: true },
          },
        },
        orderBy: { accountCode: "asc" },
      });

      const trialBalance = accounts.map((acc: any) => {
        const totalDebits = acc.postings.reduce(
          (sum: number, p: any) => sum + p.debitAmount, 0
        );
        const totalCredits = acc.postings.reduce(
          (sum: number, p: any) => sum + p.creditAmount, 0
        );

        // Compute balance based on account type
        let debitBalance = 0;
        let creditBalance = 0;

        if (["Asset", "Expense"].includes(acc.accountType)) {
          const net = acc.openingBalance + totalDebits - totalCredits;
          if (net > 0) debitBalance = net;
          else creditBalance = Math.abs(net);
        } else {
          // Liability, Equity, Income
          const net = acc.openingBalance + totalCredits - totalDebits;
          if (net > 0) creditBalance = net;
          else debitBalance = Math.abs(net);
        }

        return {
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          accountType: acc.accountType,
          openingBalance: acc.openingBalance,
          totalDebits,
          totalCredits,
          debitBalance,
          creditBalance,
        };
      });

      const totalDebitSide = trialBalance.reduce((s: number, r: any) => s + r.debitBalance, 0);
      const totalCreditSide = trialBalance.reduce((s: number, r: any) => s + r.creditBalance, 0);

      return NextResponse.json({
        type: "trial-balance",
        data: trialBalance,
        totalDebitSide,
        totalCreditSide,
        isBalanced: Math.abs(totalDebitSide - totalCreditSide) < 0.01,
      });
    }

    // ── INCOME & EXPENSE SUMMARY ────────────────────────────────────
    if (reportType === "income-expense") {
      const incomeAccounts = await prisma.gLAccount.findMany({
        where: { accountType: "Income", isActive: true },
        include: {
          postings: {
            where: fyFilter,
            select: { creditAmount: true, debitAmount: true },
          },
        },
      });

      const expenseAccounts = await prisma.gLAccount.findMany({
        where: { accountType: "Expense", isActive: true },
        include: {
          postings: {
            where: fyFilter,
            select: { debitAmount: true, creditAmount: true },
          },
        },
      });

      const incomeData = incomeAccounts.map((acc: any) => ({
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        amount:
          acc.openingBalance +
          acc.postings.reduce((s: number, p: any) => s + p.creditAmount - p.debitAmount, 0),
      }));

      const expenseData = expenseAccounts.map((acc: any) => ({
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        amount:
          acc.openingBalance +
          acc.postings.reduce((s: number, p: any) => s + p.debitAmount - p.creditAmount, 0),
      }));

      const totalIncome = incomeData.reduce((s: number, r: any) => s + r.amount, 0);
      const totalExpense = expenseData.reduce((s: number, r: any) => s + r.amount, 0);

      return NextResponse.json({
        type: "income-expense",
        income: incomeData,
        expense: expenseData,
        totalIncome,
        totalExpense,
        netSurplus: totalIncome - totalExpense,
      });
    }

    // ── BANK SUMMARY ────────────────────────────────────────────────
    if (reportType === "bank-summary") {
      const bankAccounts = await prisma.bankAccount.findMany({
        where: { isActive: true },
        include: {
          bankTransactions: {
            where: fyFilter,
            select: { amount: true, type: true, transactionDate: true, description: true },
            orderBy: { transactionDate: "asc" },
          },
        },
      });

      const bankSummary = bankAccounts.map((acc: any) => {
        const totalCredits = acc.bankTransactions
          .filter((t: any) => t.type === "CREDIT")
          .reduce((s: number, t: any) => s + t.amount, 0);
        const totalDebits = acc.bankTransactions
          .filter((t: any) => t.type === "DEBIT")
          .reduce((s: number, t: any) => s + t.amount, 0);

        return {
          id: acc.id,
          bankName: acc.bankName,
          accountNumber: acc.accountNumber,
          accountHolder: acc.accountHolder,
          accountType: acc.accountType,
          openingBalance: acc.openingBalance,
          totalCredits,
          totalDebits,
          currentBalance: acc.currentBalance,
        };
      });

      const totalBankBalance = bankSummary.reduce((s: number, b: any) => s + b.currentBalance, 0);

      return NextResponse.json({
        type: "bank-summary",
        accounts: bankSummary,
        totalBankBalance,
      });
    }

    // ── CASH SUMMARY ────────────────────────────────────────────────
    if (reportType === "cash-summary") {
      const cashBookEntries = await prisma.cashBook.findMany({
        where: {
          ...fyFilter,
          referenceType: { not: "DonationCollection" },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      });

      const cashAccount = await prisma.gLAccount.findUnique({
        where: { accountCode: "1001" },
      });

      let runningBalance = cashAccount?.openingBalance || 0;
      const enrichedEntries = cashBookEntries.map((entry: any) => {
        runningBalance += (entry.creditAmount || 0) - (entry.debitAmount || 0);
        return { ...entry, balance: runningBalance };
      });

      const totalReceipts = cashBookEntries.reduce(
        (s: number, e: any) => s + (e.creditAmount || 0), 0
      );
      const totalPayments = cashBookEntries.reduce(
        (s: number, e: any) => s + (e.debitAmount || 0), 0
      );

      return NextResponse.json({
        type: "cash-summary",
        entries: enrichedEntries,
        openingBalance: cashAccount?.openingBalance || 0,
        totalReceipts,
        totalPayments,
        closingBalance: runningBalance,
      });
    }

    // ── DONATION SUMMARY ────────────────────────────────────────────
    if (reportType === "donation-summary") {
      const donations = await prisma.donationCollection.findMany({
        where: fyFilter,
        include: {
          donationItems: true,
          collector: { select: { name: true, email: true } },
        },
        orderBy: { collectionDate: "desc" },
      });

      const verifiedDonations = donations.filter((d: any) => d.isVerified);
      const pendingDonations = donations.filter((d: any) => !d.isVerified);

      const totalVerifiedAmount = verifiedDonations.reduce(
        (s: number, d: any) => s + d.totalAmount, 0
      );
      const totalPendingAmount = pendingDonations.reduce(
        (s: number, d: any) => s + d.totalAmount, 0
      );

      // Group by donation type
      const byType: Record<string, { count: number; amount: number }> = {};
      for (const d of donations) {
        for (const item of d.donationItems) {
          const type = item.donationType;
          if (!byType[type]) byType[type] = { count: 0, amount: 0 };
          byType[type].count += 1;
          byType[type].amount += item.amount || 0;
        }
      }

      // Group by collector
      const byCollector: Record<string, { name: string; count: number; amount: number }> = {};
      for (const d of donations) {
        const name = d.collector?.name || "Unknown";
        if (!byCollector[d.collectorId]) byCollector[d.collectorId] = { name, count: 0, amount: 0 };
        byCollector[d.collectorId].count += 1;
        byCollector[d.collectorId].amount += d.totalAmount;
      }

      // Monthly breakdown
      const byMonth: Record<string, number> = {};
      for (const d of donations) {
        const month = new Date(d.collectionDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
        byMonth[month] = (byMonth[month] || 0) + d.totalAmount;
      }

      return NextResponse.json({
        type: "donation-summary",
        totalCollections: donations.length,
        totalAmount: totalVerifiedAmount + totalPendingAmount,
        verifiedAmount: totalVerifiedAmount,
        pendingAmount: totalPendingAmount,
        byType: Object.entries(byType).map(([type, data]) => ({ type, ...data })),
        byCollector: Object.entries(byCollector).map(([id, data]) => ({ id, ...data })),
        byMonth: Object.entries(byMonth).map(([month, amount]) => ({ month, amount })),
        recentDonations: donations.slice(0, 10).map((d: any) => ({
          id: d.id,
          date: d.collectionDate,
          collectorName: d.collector?.name,
          totalAmount: d.totalAmount,
          isVerified: d.isVerified,
          status: d.status,
        })),
      });
    }

    // ── OVERVIEW (DEFAULT) ──────────────────────────────────────────
    const [
      donations,
      vouchers,
      bankAccounts,
      cashBookEntries,
      glAccounts,
      currentFY,
    ] = await Promise.all([
      prisma.donationCollection.findMany({
        where: fyFilter,
        include: { donationItems: true, collector: { select: { name: true } } },
      }),
      prisma.paymentVoucher.findMany({
        where: fyFilter,
        include: { payee: { select: { name: true } } },
      }),
      prisma.bankAccount.findMany({ where: { isActive: true } }),
      prisma.cashBook.findMany({
        where: { ...fyFilter, referenceType: { not: "DonationCollection" } },
      }),
      prisma.gLAccount.findMany({ where: { isActive: true } }),
      prisma.financialYear.findFirst({ where: { isCurrent: true } }),
    ]);

    const totalDonations = donations.reduce((s: number, d: any) => s + d.totalAmount, 0);
    const verifiedDonations = donations.filter((d: any) => d.isVerified);
    const totalVerified = verifiedDonations.reduce((s: number, d: any) => s + d.totalAmount, 0);

    const totalVouchers = vouchers.reduce((s: number, v: any) => s + v.amount, 0);
    const paymentVouchers = vouchers.filter((v: any) => v.voucherType === "PAYMENT");
    const receiptVouchers = vouchers.filter((v: any) => v.voucherType === "RECEIPT");
    const totalPayments = paymentVouchers.reduce((s: number, v: any) => s + v.amount, 0);
    const totalReceipts = receiptVouchers.reduce((s: number, v: any) => s + v.amount, 0);

    const totalBankBalance = bankAccounts.reduce(
      (s: number, a: any) => s + a.currentBalance, 0
    );

    const cashAccount = glAccounts.find((a: any) => a.accountCode === "1001");
    const cashBalance = cashAccount?.currentBalance || 0;

    const totalCashBookReceipts = cashBookEntries.reduce(
      (s: number, e: any) => s + (e.creditAmount || 0), 0
    );
    const totalCashBookPayments = cashBookEntries.reduce(
      (s: number, e: any) => s + (e.debitAmount || 0), 0
    );

    // Monthly trend data
    const monthlyTrend: Record<string, { donations: number; payments: number; receipts: number }> = {};
    for (const d of donations) {
      const month = new Date(d.collectionDate).toLocaleDateString("en-US", { year: "numeric", month: "short" });
      if (!monthlyTrend[month]) monthlyTrend[month] = { donations: 0, payments: 0, receipts: 0 };
      monthlyTrend[month].donations += d.totalAmount;
    }
    for (const v of vouchers) {
      const month = new Date(v.voucherDate).toLocaleDateString("en-US", { year: "numeric", month: "short" });
      if (!monthlyTrend[month]) monthlyTrend[month] = { donations: 0, payments: 0, receipts: 0 };
      if (v.voucherType === "PAYMENT") monthlyTrend[month].payments += v.amount;
      else monthlyTrend[month].receipts += v.amount;
    }

    // Voucher status distribution
    const voucherByStatus = {
      draft: vouchers.filter((v: any) => v.status === "DRAFT").length,
      submitted: vouchers.filter((v: any) => v.status === "SUBMITTED").length,
      approved: vouchers.filter((v: any) => v.status === "APPROVED").length,
      rejected: vouchers.filter((v: any) => v.status === "REJECTED").length,
    };

    // Donation status distribution
    const donationByStatus = {
      draft: donations.filter((d: any) => d.status === "DRAFT").length,
      submitted: donations.filter((d: any) => d.status === "SUBMITTED").length,
      verified: verifiedDonations.length,
      rejected: donations.filter((d: any) => d.status === "REJECTED").length,
    };

    return NextResponse.json({
      type: "overview",
      currentFY,
      summary: {
        totalDonations,
        totalVerified,
        totalPending: totalDonations - totalVerified,
        totalVouchers,
        totalPayments,
        totalReceipts,
        totalBankBalance,
        cashBalance,
        cashBookReceipts: totalCashBookReceipts,
        cashBookPayments: totalCashBookPayments,
        pendingVouchers: voucherByStatus.draft + voucherByStatus.submitted,
      },
      monthlyTrend: Object.entries(monthlyTrend)
        .map(([month, data]) => ({ month, ...data }))
        .slice(-12),
      voucherByStatus,
      donationByStatus,
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}