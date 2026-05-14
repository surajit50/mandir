import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter = {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    };

    // ── Fetch the bank account ────────────────────────────────────────
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountHolder: true,
        accountType: true,
        openingBalance: true,
        currentBalance: true,
        branch: true,
        ifscCode: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // ── Source 1: BankTransaction records (from approved vouchers) ────
    const bankTransactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId: accountId,
        ...(startDate || endDate ? { transactionDate: dateFilter } : {}),
      },
      include: {
        paymentVoucher: { select: { voucherNumber: true, id: true } },
      },
      orderBy: { transactionDate: "asc" },
    });

    // ── Source 2: Verified bank deposits ─────────────────────────────
    const deposits = await prisma.bankDeposit.findMany({
      where: {
        accountId,
        status: "VERIFIED",
        ...(startDate || endDate ? { depositDate: dateFilter } : {}),
      },
      orderBy: { depositDate: "asc" },
    });

    // ── Source 3: Cleared cheques ─────────────────────────────────────
    const clearedCheques = await prisma.chequeRegister.findMany({
      where: {
        accountId,
        status: "CLEARED",
        amount: { gt: 0 },
        ...(startDate || endDate
          ? { clearedDate: dateFilter }
          : {}),
      },
      orderBy: { clearedDate: "asc" },
      include: {
        paymentVouchers: {
          take: 1,
          select: { payee: { select: { name: true } } },
        },
        deposit: { select: { remarks: true, depositNumber: true } },
      },
    });

    // Deposit IDs tied to cheque encashments – skip them (avoid double-counting)
    const encashmentDepositIds = new Set(
      clearedCheques.filter((c: any) => c.depositId).map((c: any) => c.depositId!)
    );

    // Voucher IDs already covered by BankTransaction – skip duplicate deposits
    const coveredVoucherIds = new Set(
      bankTransactions
        .filter((bt: any) => bt.paymentVoucher)
        .map((bt: any) => bt.paymentVoucher!.id)
    );

    // ── Merge all sources into a unified list ─────────────────────────
    type TxRow = {
      id: string;
      date: Date;
      description: string;
      creditAmount: number;
      debitAmount: number;
      referenceType: string;
      voucherNumber?: string;
    };

    const rows: TxRow[] = [];

    // BankTransaction (primary source – approved vouchers)
    for (const bt of bankTransactions) {
      rows.push({
        id: `bt-${bt.id}`,
        date: bt.transactionDate,
        description: bt.description || "Bank Transaction",
        creditAmount: bt.type === "CREDIT" ? bt.amount : 0,
        debitAmount: bt.type === "DEBIT" ? bt.amount : 0,
        referenceType: "VOUCHER",
        voucherNumber: bt.paymentVoucher?.voucherNumber,
      });
    }

    // Verified deposits not from encashments and not already covered by a BankTransaction
    for (const d of deposits) {
      if (encashmentDepositIds.has(d.id)) continue;
      rows.push({
        id: `dep-${d.id}`,
        date: d.depositDate,
        description: d.remarks || `Bank Deposit – ${d.depositNumber}`,
        creditAmount: d.totalAmount,
        debitAmount: 0,
        referenceType: "BANK_DEPOSIT",
      });
    }

    // Cleared cheques
    for (const c of clearedCheques) {
      const isReceived = c.chequeType === "RECEIVED";
      const payeeName =
        c.paymentVouchers[0]?.payee?.name ?? "Unknown";
      const receivedFrom =
        c.deposit?.remarks?.trim() ||
        (c.deposit?.depositNumber
          ? `Deposit ${c.deposit.depositNumber}`
          : "Unknown");
      rows.push({
        id: `chq-${c.id}`,
        date: c.clearedDate!,
        description: isReceived
          ? `Cheque #${c.chequeNumber} received from ${receivedFrom}`
          : `Cheque #${c.chequeNumber} issued to ${payeeName}`,
        creditAmount: isReceived ? c.amount : 0,
        debitAmount: isReceived ? 0 : c.amount,
        referenceType: "CHEQUE",
      });
    }

    // Sort by date ascending
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    let runningBalance = account.openingBalance;
    const transactions = rows.map((row: any) => {
      runningBalance += row.creditAmount - row.debitAmount;
      return { ...row, balance: runningBalance };
    });

    return NextResponse.json({ account, transactions });
  } catch (error) {
    console.error("Error fetching passbook:", error);
    return NextResponse.json({ error: "Failed to fetch passbook" }, { status: 500 });
  }
}
