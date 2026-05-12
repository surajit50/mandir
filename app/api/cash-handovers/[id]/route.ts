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

    const handover = await prisma.cashHandover.findUnique({
      where: { id },
      include: {
        handoverFromUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!handover) {
      return NextResponse.json(
        { error: "Cash handover not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(handover);
  } catch (error) {
    console.error("Cash handover fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash handover" },
      { status: 500 }
    );
  }
}
