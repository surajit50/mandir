import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const jewellerySchema = z.object({
  jewelleryCode: z.string(),
  jewelleryName: z.string(),
  metalType: z.string(),
  description: z.string().optional().nullable(),
  purity: z.string().optional().nullable(),
  weight: z.number().default(0),
  quantity: z.number().int().default(1),
  estimatedValue: z.number().default(0),
  receivedDate: z.string().optional().nullable(),
  donorName: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.jewelleryAsset.findMany({
      where: { isActive: true },
      orderBy: { jewelleryCode: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Get jewellery error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jewellery register" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = jewellerySchema.parse(body);

    const existing = await prisma.jewelleryAsset.findUnique({
      where: { jewelleryCode: validated.jewelleryCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Jewellery code already exists" },
        { status: 400 }
      );
    }

    const item = await prisma.jewelleryAsset.create({
      data: {
        ...validated,
        receivedDate: validated.receivedDate ? new Date(validated.receivedDate) : null,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        userRole: session.user.role,
        action: "CREATE",
        module: "Jewellery",
        entityId: item.id,
        entityType: "JewelleryAsset",
        newValues: item as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Create jewellery error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create jewellery entry" },
      { status: 400 }
    );
  }
}
