import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const templeSchema = z.object({
  templeName: z.string(),
  templeCode: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  registrationNumber: z.string().optional(),
  gstNumber: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get temples accessible to user
    const templeUsers = await prisma.templeUser.findMany({
      where: { userId: session.user.id },
      include: {
        temple: {
          include: {
            templeUsers: { select: { userId: true } },
          },
        },
      },
    });

    const temples = templeUsers.map((tu: { temple: any }) => tu.temple);

    // For ADMIN, show all temples
    if (session.user.role === "ADMIN") {
      const allTemples = await prisma.temple.findMany({
        include: {
          templeUsers: { select: { userId: true } },
        },
        orderBy: { templeName: "asc" },
      });
      return NextResponse.json(allTemples);
    }

    return NextResponse.json(temples);
  } catch (error) {
    console.error("Get temples error:", error);
    return NextResponse.json(
      { error: "Failed to fetch temples" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = templeSchema.parse(body);

    // Check if temple code exists
    const existing = await prisma.temple.findUnique({
      where: { templeCode: validated.templeCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Temple code already exists" },
        { status: 400 }
      );
    }

    const temple = await prisma.temple.create({
      data: validated,
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        userRole: session.user.role,
        action: "CREATE",
        module: "Temple",
        entityId: temple.id,
        entityType: "Temple",
        newValues: temple as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(temple, { status: 201 });
  } catch (error) {
    console.error("Create temple error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create temple" },
      { status: 400 }
    );
  }
}
