import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const IssueChequeSchema = z.object({
  payeeName: z.string().min(1, "Payee name is required"),
  amount: z.number().positive("Amount must be positive"),
});

// PATCH /api/cheques/[id]/issue — issue a blank cheque leaf to a payee with amount
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = IssueChequeSchema.parse(body);

    // Only allow issuing if the cheque is currently unassigned/blank (ISSUED status with no payee)
    const cheque = await prisma.chequeRegister.findUnique({
      where: { id },
      select: { id: true, status: true, payeeName: true, amount: true },
    });

    if (!cheque) {
      return NextResponse.json({ error: "Cheque not found" }, { status: 404 });
    }

    // Allow issuing unassigned cheques (ISSUED with UNASSIGNED payee or 0 amount)
    const isUnassigned = cheque.payeeName === "UNASSIGNED" || cheque.amount === 0;

    if (cheque.status !== "ISSUED" || !isUnassigned) {
      return NextResponse.json(
        { error: "Only unassigned cheque leaves can be issued for payment" },
        { status: 400 }
      );
    }

    const updated = await prisma.chequeRegister.update({
      where: { id },
      data: {
        payeeName: validated.payeeName,
        amount: validated.amount,
        chequeDate: new Date(), // Set issue date to now
        status: "ISSUED",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Cheque issue error:", error);
    return NextResponse.json(
      { error: "Failed to issue cheque" },
      { status: 500 }
    );
  }
}
