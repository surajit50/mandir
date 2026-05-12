import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ChequeEncashmentSchema = z.object({
  clearedDate: z.string().datetime(),
  bankAccountId: z.string().min(1, "Bank account is required"),
  remarks: z.string().optional(),
});

export async function POST(
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

    const userRole = (session.user as any).role;

    // Only ADMIN and ACCOUNTANT can encash cheques
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can encash cheques" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = ChequeEncashmentSchema.parse(body);

    // Find the cheque
    const cheque = await prisma.chequeRegister.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!cheque) {
      return NextResponse.json(
        { error: "Cheque not found" },
        { status: 404 }
      );
    }

    // Check if cheque is already cleared or bounced
    if (cheque.status === "CLEARED") {
      return NextResponse.json(
        { error: "Cheque is already cleared" },
        { status: 400 }
      );
    }

    if (cheque.status === "BOUNCED") {
      return NextResponse.json(
        { error: "Cheque has bounced and cannot be cleared" },
        { status: 400 }
      );
    }

    // Verify bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: validatedData.bankAccountId },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    const isReceived = cheque.chequeType === "RECEIVED";
    let bankDeposit = null;

    if (isReceived) {
      // Create bank deposit entry for the cheque encashment
      bankDeposit = await prisma.bankDeposit.create({
        data: {
          accountId: validatedData.bankAccountId,
          depositNumber: `DEP-${Date.now()}`,
          depositDate: new Date(validatedData.clearedDate),
          totalAmount: cheque.amount,
          depositType: "CHEQUE",
          remarks: `Cheque #${cheque.chequeNumber} - ${cheque.payeeName} ${validatedData.remarks ? `(${validatedData.remarks})` : ""}`,
          verifiedByBank: true, // Mark as verified immediately since we are encashing it now
          verifiedAt: new Date(validatedData.clearedDate),
          financialYearId: cheque.financialYearId,
        },
      });
    }

    // Update cheque status to CLEARED and link to the deposit if created
    const updatedCheque = await prisma.chequeRegister.update({
      where: { id },
      data: {
        status: "CLEARED",
        clearedDate: new Date(validatedData.clearedDate),
        depositId: bankDeposit ? bankDeposit.id : undefined,
      },
    });

    // Update bank account balance
    // If RECEIVED, increment balance. If ISSUED, decrement balance.
    await prisma.bankAccount.update({
      where: { id: validatedData.bankAccountId },
      data: {
        currentBalance: {
          [isReceived ? "increment" : "decrement"]: cheque.amount,
        },
      },
    });

    // Create cash book entry if it doesn't exist (only for RECEIVED cheques usually, 
    // but maybe for ISSUED too if we want to track bank transactions in cash book)
    // Actually, ISSUED cheques are usually already recorded as payments.
    if (isReceived) {
      const existingEntry = await prisma.cashBook.findFirst({
        where: { referenceId: id, referenceType: "ChequeEncashment" },
      });

      if (!existingEntry) {
        await prisma.cashBook.create({
          data: {
            date: new Date(validatedData.clearedDate),
            description: `Cheque Encashment: #${cheque.chequeNumber}`,
            debitAmount: 0,
            creditAmount: cheque.amount,
            balance: 0,
            referenceType: "ChequeEncashment",
            referenceId: id,
          },
        });
      }
    }

    return NextResponse.json({
      cheque: updatedCheque,
      bankDeposit,
      message: "Cheque encashed successfully",
    });
  } catch (error: any) {
    console.error("Cheque encashment error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to encash cheque", details: error.message },
      { status: 500 }
    );
  }
}
