import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const payeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  payeeType: z.enum([
    "PRESIDENT", "SECRETARY", "VICE_PRESIDENT", "JOINT_SECRETARY",
    "TREASURER", "PRIEST", "PUJARI", "SEVAK", "TRUSTEE", "DEVOTEE",
    "MANAGER", "ARCHAKA", "LABOUR", "VENDOR", "STAFF", "MEMBER", "OTHER"
  ]).default("OTHER"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payees = await prisma.payee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(payees);
  } catch (error) {
    console.error("Payees fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payees" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = payeeSchema.parse(body);

    const payee = await prisma.payee.create({
      data: {
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        payeeType: validated.payeeType,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Unknown User",
        userRole: (session.user as any).role,
        action: "CREATE",
        module: "Payee",
        entityId: payee.id,
        entityType: "Payee",
        newValues: payee as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(payee, { status: 201 });
  } catch (error) {
    console.error("Create payee error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create payee" },
      { status: 400 }
    );
  }
}
