import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const financialYear = await prisma.financialYear.findUnique({
      where: { id },
      include: {
        periodConfigs: {
          orderBy: { periodNumber: "asc" },
        },
      },
    });

    if (!financialYear) {
      return NextResponse.json(
        { error: "Financial year not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(financialYear);
  } catch (error) {
    console.error("Get financial year error:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial year" },
      { status: 500 }
    );
  }
}
