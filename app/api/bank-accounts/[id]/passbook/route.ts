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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const dateFilter = {
      lte: endDateParam ? new Date(endDateParam) : undefined,
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
        ...(endDateParam ? { transactionDate: dateFilter } : {}),
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
        status: { in: ["VERIFIED", "PENDING"] },
        ...(endDateParam ? { depositDate: dateFilter } : {}),
      },
      orderBy: { depositDate: "asc" },
    });

    // ── Source 3: Cleared cheques ─────────────────────────────────────
    const clearedCheques = await prisma.chequeRegister.findMany({
      where: {
        accountId,
        status: "CLEARED",
        ...(endDateParam ? { clearedDate: dateFilter } : {}),
      },
      orderBy: { clearedDate: "asc" },
      include: {
        paymentVouchers: {
          take: 1,
          select: { id: true, voucherNumber: true, amount: true, payee: { select: { name: true } } },
        },
        deposit: { select: { remarks: true, depositNumber: true } },
      },
    });

    // Deposit IDs tied to cheque encashments – skip them (avoid double-counting)
    const encashmentDepositIds = new Set(
      clearedCheques.filter((c: any) => c.depositId).map((c: any) => c.depositId!)
    );

    // ── Merge all sources into a unified list ─────────────────────────
    type TxRow = {
      id: string;
      date: Date;
      createdAt: Date;
      description: string;
      creditAmount: number;
      debitAmount: number;
      referenceType: string;
      referenceId?: string;
      voucherNumber?: string;
      instrumentType?: string;
      instrumentNumber?: string;
    };

    const rows: TxRow[] = [];

    // Track voucher and deposit IDs already added to avoid double counting
    const addedVoucherIds = new Set<string>();
    const addedDepositIds = new Set<string>();

    // BankTransaction (primary source – approved vouchers and verified deposits)
    for (const bt of bankTransactions) {
      if (bt.voucherId) addedVoucherIds.add(bt.voucherId);
      if (bt.referenceType === "BankDeposit" && bt.referenceId) {
        addedDepositIds.add(bt.referenceId);
      }
      
      rows.push({
        id: `bt-${bt.id}`,
        date: bt.transactionDate,
        createdAt: bt.createdAt,
        description: bt.description || "Bank Transaction",
        creditAmount: bt.type === "CREDIT" ? bt.amount : 0,
        debitAmount: bt.type === "DEBIT" ? bt.amount : 0,
        referenceType: bt.referenceType || "VOUCHER",
        referenceId: bt.referenceId || undefined,
        voucherNumber: bt.paymentVoucher?.voucherNumber,
        instrumentType: bt.instrumentType || undefined,
        instrumentNumber: bt.instrumentNumber || undefined,
      });
    }

    // Verified deposits not already covered by a BankTransaction
    for (const d of deposits) {
      if (encashmentDepositIds.has(d.id) || addedDepositIds.has(d.id)) continue;
      rows.push({
        id: `dep-${d.id}`,
        date: d.depositDate,
        createdAt: d.createdAt,
        description: d.status === "PENDING" 
          ? `[PENDING] ${d.remarks || `Bank Deposit – ${d.depositNumber}`}`
          : d.remarks || `Bank Deposit – ${d.depositNumber}`,
        creditAmount: d.totalAmount,
        debitAmount: 0,
        referenceType: "BANK_DEPOSIT",
        referenceId: d.id,
        instrumentType: d.depositType,
        instrumentNumber: d.depositNumber,
      });
    }

    // Cleared cheques (only those NOT already in a voucher BankTransaction)
    for (const c of clearedCheques) {
      const isReceived = c.chequeType === "RECEIVED";
      
      // If this cheque is linked to a voucher that's already added, skip it
      const voucherId = c.paymentVouchers[0]?.id;
      if (voucherId && addedVoucherIds.has(voucherId)) continue;

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
        createdAt: c.createdAt,
        description: isReceived
          ? `Cheque #${c.chequeNumber} received from ${receivedFrom}`
          : `Cheque #${c.chequeNumber} issued to ${payeeName}`,
        creditAmount: isReceived ? (c.paymentVouchers[0]?.amount || 0) : 0,
        debitAmount: isReceived ? 0 : (c.paymentVouchers[0]?.amount || 0),
        referenceType: "CHEQUE",
        referenceId: c.id,
        voucherNumber: c.paymentVouchers[0]?.voucherNumber,
        instrumentType: "CHEQUE",
        instrumentNumber: c.chequeNumber,
      });
    }

    // Sort by date (day only), then receipts before payments, then createdAt
    rows.sort((a, b) => {
      const d1 = new Date(a.date).setHours(0, 0, 0, 0);
      const d2 = new Date(b.date).setHours(0, 0, 0, 0);
      if (d1 !== d2) return d1 - d2;

      // Receipts before payments on the same date
      if (a.creditAmount > 0 && b.debitAmount > 0) return -1;
      if (a.debitAmount > 0 && b.creditAmount > 0) return 1;

      // Stable sort using creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Compute running balance
    let runningBalance = account.openingBalance;
    const allTransactions = rows.map((row: any) => {
      runningBalance += row.creditAmount - row.debitAmount;
      return { ...row, balance: runningBalance };
    });

    // Filter by startDate only after running balance is computed
    const transactions = startDateParam
      ? allTransactions.filter(tx => new Date(tx.date) >= new Date(startDateParam))
      : allTransactions;

    return NextResponse.json({ account, transactions });
  } catch (error) {
    console.error("Error fetching passbook:", error);
    return NextResponse.json({ error: "Failed to fetch passbook" }, { status: 500 });
  }
}
