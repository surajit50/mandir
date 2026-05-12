import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const cheque = await prisma.chequeRegister.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, bankName: true, accountNumber: true } },
      },
    });

    if (!cheque) {
      return NextResponse.json(
        { error: "Cheque not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(cheque);
  } catch (error) {
    console.error("Cheque fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cheque" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can update cheques" },
        { status: 403 }
      );
    }

    const cheque = await prisma.chequeRegister.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!cheque) {
      return NextResponse.json(
        { error: "Cheque not found" },
        { status: 404 }
      );
    }

    if (cheque.status !== "ISSUED") {
      return NextResponse.json(
        { error: "Only issued cheques can be cancelled" },
        { status: 400 }
      );
    }

    const updatedCheque = await prisma.chequeRegister.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        account: { select: { id: true, bankName: true, accountNumber: true } },
      },
    });

    return NextResponse.json(updatedCheque);
  } catch (error) {
    console.error("Cheque update error:", error);
    return NextResponse.json(
      { error: "Failed to update cheque" },
      { status: 500 }
    );
  }
}
