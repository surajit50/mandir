import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const IssueChequeSchema = z.object({
  // Empty schema or we can keep it if we want to allow some metadata updates
});

// PATCH /api/cheques/[id]/issue — mark a blank leaf as ISSUED
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

    // Find the cheque
    const cheque = await prisma.chequeRegister.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!cheque) {
      return NextResponse.json({ error: "Cheque not found" }, { status: 404 });
    }

    if (cheque.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "Only available cheque leaves can be issued" },
        { status: 400 }
      );
    }

    const updated = await prisma.chequeRegister.update({
      where: { id },
      data: {
        status: "ISSUED",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Cheque issue error:", error);
    return NextResponse.json(
      { error: "Failed to issue cheque" },
      { status: 500 }
    );
  }
}
