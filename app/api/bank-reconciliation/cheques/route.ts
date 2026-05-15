import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chequePayeeDisplayName } from "@/lib/cheque-payee";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const dateStr = searchParams.get("date");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    // Date range: 12 months before the given date up to the given date
    const referenceDate = dateStr ? new Date(dateStr) : new Date();
    const startDate = new Date(referenceDate.getFullYear() - 1, referenceDate.getMonth(), 1);
    const endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

    // Fetch VERIFIED bank deposits (received funds - credits) for this account
    const deposits = await prisma.bankDeposit.findMany({
      where: {
        accountId,
        status: "VERIFIED",
        depositDate: { gte: startDate, lte: endDate },
      },
      include: {
        cheques: {
          select: {
            id: true,
            chequeNumber: true,
            paymentVouchers: {
              take: 1,
              select: { amount: true, referenceDate: true, payee: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { depositDate: "asc" },
    });

    // Fetch ALL cheques for this account (including those NOT linked to deposits yet)
    const cheques = await prisma.chequeRegister.findMany({
      where: {
        accountId,
      },
      orderBy: { createdAt: "asc" },
      include: {
        paymentVouchers: {
          take: 1,
          select: { amount: true, referenceDate: true, payee: { select: { name: true } } },
        },
      },
    });

    // Get IDs of cheques already linked to deposits
    const linkedChequeIds = new Set(deposits.flatMap((d: any) => d.cheques.map((c: any) => c.id)));

    // Format received entries (credits - bank deposits + direct received cheques)
    const receivedFromDeposits = deposits.map((d: any) => ({
      id: d.id,
      type: "RECEIVED" as const,
      date: d.depositDate,
      description: d.remarks || `${d.depositType} Deposit`,
      chequeNumber: d.depositType === "CHEQUE" && d.cheques.length > 0 ? d.cheques[0].chequeNumber : null,
      payeeName:
        d.depositType === "CHEQUE" && d.cheques.length > 0
          ? chequePayeeDisplayName(d.cheques[0])
          : null,
      amount: d.totalAmount,
      status: d.status === "VERIFIED" ? "CLEARED" : d.status,
      depositType: d.depositType,
      encashmentDate: d.verifiedAt || d.depositDate,
    }));

    // Add cheques of type RECEIVED that are NOT yet linked to any deposit
    const directReceivedCheques = cheques
      .filter((c: any) => c.chequeType === "RECEIVED" && !linkedChequeIds.has(c.id))
      .map((c: any) => ({
        id: c.id,
        type: "RECEIVED" as const,
        date: c.paymentVouchers[0]?.referenceDate || c.createdAt,
        description: `Received Cheque #${c.chequeNumber} from ${chequePayeeDisplayName(c)}`,
        chequeNumber: c.chequeNumber,
        payeeName: "Temple Trust",
        amount: c.paymentVouchers[0]?.amount || 0,
        status: c.status,
        depositType: "CHEQUE",
        encashmentDate: c.clearedDate,
      }));

    const received = [...receivedFromDeposits, ...directReceivedCheques].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Format issued entries (debits - cheques) with assignment flag
    // Include cheques of type ISSUED (or missing/null for legacy data) and EXCLUDE those already part of a "RECEIVED" deposit (credits)
    const issued = cheques
      .filter((c: any) => (c.chequeType === "ISSUED" || !c.chequeType) && !linkedChequeIds.has(c.id))
      .map((c: any) => {
        const amount = c.paymentVouchers[0]?.amount || 0;
        return {
          id: c.id,
          type: "ISSUED" as const,
          date: c.paymentVouchers[0]?.referenceDate || c.createdAt,
          description: `Cheque #${c.chequeNumber}`,
          chequeNumber: c.chequeNumber,
          payeeName: chequePayeeDisplayName(c),
          amount: amount,
          status: c.status,
          clearedDate: c.clearedDate,
          encashmentDate: c.clearedDate,
          isAssigned: amount > 0,
        };
      });

    const assignedIssued = issued.filter((c: any) => c.isAssigned);
    const unassignedIssued = issued.filter((c: any) => !c.isAssigned);

    return NextResponse.json({
      received,
      issued,
      assignedIssued,
      unassignedIssued,
      totalReceived: received.reduce((s: number, r: any) => s + r.amount, 0),
      totalIssued: issued.reduce((s: number, i: any) => s + i.amount, 0),
      totalAssignedIssued: assignedIssued.reduce((s: number, i: any) => s + i.amount, 0),
    });
  } catch (error) {
    console.error("Error fetching reconciliation cheques:", error);
    return NextResponse.json(
      { error: "Failed to fetch cheques for reconciliation" },
      { status: 500 }
    );
  }
}
