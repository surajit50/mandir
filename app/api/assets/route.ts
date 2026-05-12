import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const assetSchema = z.object({
  assetCode: z.string(),
  assetName: z.string(),
  category: z.string(),
  description: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchaseValue: z.number().default(0),
  location: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const assets = await prisma.mandirAsset.findMany({
      where: { isActive: true },
      orderBy: { assetCode: "asc" },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Get assets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
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
    const validated = assetSchema.parse(body);

    const existing = await prisma.mandirAsset.findUnique({
      where: { assetCode: validated.assetCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Asset code already exists" },
        { status: 400 }
      );
    }

    const asset = await prisma.mandirAsset.create({
      data: {
        ...validated,
        purchaseDate: validated.purchaseDate ? new Date(validated.purchaseDate) : null,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        userRole: session.user.role,
        action: "CREATE",
        module: "Assets",
        entityId: asset.id,
        entityType: "MandirAsset",
        newValues: asset as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Create asset error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create asset" },
      { status: 400 }
    );
  }
}
