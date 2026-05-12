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

    const deposit = await prisma.bankDeposit.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, bankName: true, accountNumber: true } },
        cheques: true,
      },
    });

    if (!deposit) {
      return NextResponse.json(
        { error: "Deposit not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(deposit);
  } catch (error) {
    console.error("Deposit fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deposit" },
      { status: 500 }
    );
  }
}
