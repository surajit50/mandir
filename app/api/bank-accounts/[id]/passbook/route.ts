import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accountId = id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Fetch VERIFIED bank deposits for this account (skip PENDING/REJECTED)
    const deposits = await prisma.bankDeposit.findMany({
      where: {
        accountId,
        status: "VERIFIED",
        depositDate: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: { depositDate: "asc" },
    });

    // Fetch cleared cheques for this account (debits — money out)
    // Skip placeholder/unassigned cheque leaves
    const cheques = await prisma.chequeRegister.findMany({
      where: {
        accountId,
        status: "CLEARED",
        clearedDate: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: { chequeDate: "asc" },
    });

    // Get deposit IDs that are linked to cleared cheques (encashment deposits)
    // These were created by the encash API and should NOT be shown as separate deposits
    const encashmentDepositIds = new Set(
      cheques.filter((c) => c.depositId).map((c) => c.depositId!)
    );

    // Filter out encashment-generated deposits — only show real deposits (money in)
    // Then combine with cleared cheques (money out) for the passbook
    const transactions = [
      ...deposits
        .filter((d) => !encashmentDepositIds.has(d.id))
        .map((d) => ({
          id: `dep-${d.id}`,
          date: d.depositDate,
          description: d.remarks || "Bank Deposit",
          creditAmount: d.totalAmount,
          debitAmount: 0,
          referenceType: "BANK_DEPOSIT",
        })),
      ...cheques
        .filter((c) => c.amount > 0)
        .map((c) => {
          const isReceived = (c as any).chequeType === "RECEIVED";
          return {
            id: `chq-${c.id}`,
            date: c.clearedDate!,
            description: isReceived 
              ? `Cheque #${c.chequeNumber} from ${(c as any).payerName || "Unknown"}`
              : `Cheque #${c.chequeNumber} to ${c.payeeName}`,
            chequeNumber: c.chequeNumber,
            creditAmount: isReceived ? c.amount : 0,
            debitAmount: isReceived ? 0 : c.amount,
            referenceType: "CHEQUE" as const,
          };
        }),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    let runningBalance = account?.openingBalance || 0;
    const passbook = transactions.map((tx) => ({
      ...tx,
      balance: (runningBalance += tx.creditAmount - tx.debitAmount),
    }));

    return NextResponse.json(passbook);
  } catch (error) {
    console.error("Error fetching passbook:", error);
    return NextResponse.json(
      { error: "Failed to fetch passbook" },
      { status: 500 }
    );
  }
}
