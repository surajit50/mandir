import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { id: bookId } = await params;

    // Check if any cheques from this book are used
    const usedCheques = await prisma.chequeRegister.findFirst({
      where: {
        chequeBookId: bookId,
        OR: [
          { paymentVouchers: { some: {} } },
          { status: { not: "AVAILABLE" } }
        ]
      },
    });

    if (usedCheques) {
      return NextResponse.json(
        { error: "Cannot delete cheque book because some cheques are already used." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete all cheques in this book
      await tx.chequeRegister.deleteMany({
        where: { chequeBookId: bookId },
      });

      // Delete the book itself
      await tx.chequeBook.delete({
        where: { id: bookId },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name ?? "Unknown User",
          userRole,
          action: "DELETE",
          module: "ChequeBook",
          entityId: bookId,
          entityType: "ChequeBook",
          status: "SUCCESS",
        },
      });
    });

    return NextResponse.json({ message: "Cheque book deleted successfully" });
  } catch (error) {
    console.error("Cheque book deletion error:", error);
    return NextResponse.json({ error: "Failed to delete cheque book" }, { status: 500 });
  }
}
