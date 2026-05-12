import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ChequeBouncedSchema = z.object({
  bounceDate: z.string().datetime(),
  bounceReason: z.string().min(1, "Bounce reason is required"),
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

    // Only ADMIN and ACCOUNTANT can mark cheques as bounced
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can mark cheques as bounced" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = ChequeBouncedSchema.parse(body);

    // Find the cheque
    const cheque = await prisma.chequeRegister.findUnique({
      where: { id },
    });

    if (!cheque) {
      return NextResponse.json(
        { error: "Cheque not found" },
        { status: 404 }
      );
    }

    // Only allow bouncing cheques that are ISSUED or DEPOSITED
    if (!["ISSUED", "DEPOSITED"].includes(cheque.status)) {
      return NextResponse.json(
        { error: `Cannot bounce a ${cheque.status} cheque` },
        { status: 400 }
      );
    }

    // Update cheque status to BOUNCED
    const updatedCheque = await prisma.chequeRegister.update({
      where: { id },
      data: {
        status: "BOUNCED",
        bounceDate: new Date(validatedData.bounceDate),
        bounceReason: validatedData.bounceReason,
      },
    });

    // Create cash book entry for the bounce (reverse entry) if it doesn't exist
    const existingEntry = await prisma.cashBook.findFirst({
      where: { referenceId: id, referenceType: "ChequeBounce" },
    });

    if (!existingEntry) {
      await prisma.cashBook.create({
        data: {
          date: new Date(validatedData.bounceDate),
          description: `Cheque Bounce: #${cheque.chequeNumber} - ${validatedData.bounceReason}`,
          debitAmount: 0,
          creditAmount: cheque.amount, // Reverse the amount
          balance: 0,
          referenceType: "ChequeBounce",
          referenceId: id,
        },
      });
    }

    return NextResponse.json({
      cheque: updatedCheque,
      message: "Cheque marked as bounced successfully",
    });
  } catch (error: any) {
    console.error("Cheque bounce error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to mark cheque as bounced", details: error.message },
      { status: 500 }
    );
  }
}
