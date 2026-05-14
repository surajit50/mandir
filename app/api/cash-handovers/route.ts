import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CashHandoverSchema = z.object({
  handoverDate: z.string().datetime(),
  totalAmount: z.number().positive("Amount must be greater than 0"),
  numberOfNotes: z.record(z.string(), z.number()).optional(),
  remarks: z.string().optional(),
  handoverFrom: z.string().optional(), // Allow specifying member
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const body = await request.json();

    const validatedData = CashHandoverSchema.parse(body);

    // Get current financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    // Use provided member ID if Admin/Accountant, otherwise use current user ID
    let finalHandoverFrom = userId;
    if (["ADMIN", "ACCOUNTANT"].includes(userRole) && validatedData.handoverFrom) {
      finalHandoverFrom = validatedData.handoverFrom;
    }

    // Create cash handover
    const handover = await prisma.cashHandover.create({
      data: {
        handoverDate: new Date(validatedData.handoverDate),
        handoverFrom: finalHandoverFrom,
        totalAmount: validatedData.totalAmount,
        numberOfNotes: validatedData.numberOfNotes,
        remarks: validatedData.remarks,
        status: "DRAFT",
        financialYearId: currentFY?.id,
      },
      include: {
        handoverFromUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: userId,
        userName: session.user.name ?? "Unknown User",
        userRole: userRole,
        action: "CREATE",
        module: "CashHandover",
        entityId: handover.id,
        entityType: "CashHandover",
        status: "SUCCESS",
      },
    });

    return NextResponse.json(handover, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Cash handover creation error:", error);
    return NextResponse.json(
      { error: "Failed to create cash handover" },
      { status: 500 }
    );
  }
}

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
    const status = searchParams.get("status");
    const undepositedOnly = searchParams.get("undepositedOnly") === "true";

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Filter based on role
    const where: any = userRole === "MEMBER" ? { handoverFrom: userId } : {};

    if (status) {
      where.status = status;
    }

    if (undepositedOnly) {
      where.bankDepositId = null;
    }

    const handovers = await prisma.cashHandover.findMany({
      where,
      include: {
        handoverFromUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(handovers);
  } catch (error) {
    console.error("Cash handover fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash handovers" },
      { status: 500 }
    );
  }
}
