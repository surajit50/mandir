import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chequePayeeDisplayName } from "@/lib/cheque-payee";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const reconciliation = await prisma.bankReconciliation.findUnique({
      where: { id },
      include: {
        account: true,
        reconciliationItems: true,
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        { error: "Reconciliation not found" },
        { status: 404 }
      );
    }

    // Build date range for cheque transactions (6 months before/after reconciliation date)
    const reconDate = reconciliation.reconciliationDate;
    const startDate = new Date(reconDate.getFullYear(), reconDate.getMonth() - 6, 1);
    const endDate = new Date(reconDate.getFullYear(), reconDate.getMonth() + 1, 0);

    // Fetch credit entries - all VERIFIED bank deposits (received funds) for this account
    const allDeposits = await prisma.bankDeposit.findMany({
      where: {
        accountId: reconciliation.accountId,
        status: "VERIFIED",
        depositDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        cheques: {
          select: {
            id: true,
            chequeNumber: true,
            chequeDate: true,
            paymentVouchers: {
              take: 1,
              select: { payee: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { depositDate: "asc" },
    });

    // Format deposits as credit entries
    const creditEntries = allDeposits.map((d: any) => ({
      id: d.id,
      date: d.depositDate,
      description: d.remarks || `${d.depositType} Deposit`,
      chequeNumber: d.depositType === "CHEQUE" && d.cheques.length > 0 ? d.cheques[0].chequeNumber : null,
      payeeName:
        d.depositType === "CHEQUE" && d.cheques.length > 0
          ? chequePayeeDisplayName(d.cheques[0])
          : null,
      amount: d.totalAmount,
      type: "RECEIVED" as const,
      referenceType: "BANK_DEPOSIT",
      depositType: d.depositType,
    })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Fetch debit entries - issued cheques that are cleared (NOT linked to a deposit)
    const issuedCheques = await prisma.chequeRegister.findMany({
      where: {
        accountId: reconciliation.accountId,
        status: "CLEARED",
        depositId: null,
        clearedDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { clearedDate: "asc" },
      include: {
        paymentVouchers: {
          take: 1,
          select: { payee: { select: { name: true } } },
        },
      },
    });

    // Also fetch outstanding cheques (issued but not yet cleared) for the reconciliation picture
    // Exclude blank leaves (amount = 0)
    const outstandingCheques = await prisma.chequeRegister.findMany({
      where: {
        accountId: reconciliation.accountId,
        status: { in: ["ISSUED", "DEPOSITED"] },
        chequeDate: {
          lte: endDate,
        },
        amount: { gt: 0 },
      },
      orderBy: { chequeDate: "asc" },
      include: {
        paymentVouchers: {
          take: 1,
          select: { payee: { select: { name: true } } },
        },
      },
    });

    const debitEntries = issuedCheques.map((c: any) => ({
      id: c.id,
      date: c.clearedDate!,
      description: `Cheque #${c.chequeNumber} - ${chequePayeeDisplayName(c)}`,
      chequeNumber: c.chequeNumber,
      payeeName: chequePayeeDisplayName(c),
      amount: c.amount,
      type: "ISSUED" as const,
      referenceType: "CHEQUE",
      clearedDate: c.clearedDate,
    })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalCredits = creditEntries.reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalDebits = debitEntries.reduce((sum: number, e: any) => sum + e.amount, 0);

    // Format outstanding cheques
    const outstandingEntries = outstandingCheques.map((c: any) => ({
      id: c.id,
      chequeNumber: c.chequeNumber,
      payeeName: chequePayeeDisplayName(c),
      amount: c.amount,
      chequeDate: c.chequeDate,
      status: c.status,
    }));

    return NextResponse.json({
      ...reconciliation,
      chequeTransactions: {
        credits: creditEntries,
        debits: debitEntries,
        outstanding: outstandingEntries,
        totalCredits,
        totalDebits,
        netBalance: totalCredits - totalDebits,
      },
    });
  } catch (error) {
    console.error("Reconciliation fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reconciliation" },
      { status: 500 }
    );
  }
}
