import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inventoryItemSchema = z.object({
  itemCode: z.string(),
  categoryId: z.string(),
  itemName: z.string(),
  description: z.string().optional(),
  quantity: z.number().default(0),
  unit: z.string(),
  reorderLevel: z.number().default(0),
  unitCost: z.number().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        category: { select: { categoryName: true } },
        movements: { orderBy: { movementDate: "desc" }, take: 5 },
      },
      orderBy: { itemCode: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Get inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
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
    const validated = inventoryItemSchema.parse(body);

    // Check if code exists
    const existing = await prisma.inventoryItem.findUnique({
      where: { itemCode: validated.itemCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Item code already exists" },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.create({
      data: validated,
      include: { category: { select: { categoryName: true } } },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
       
        userRole: session.user.role,
        action: "CREATE",
        module: "Inventory",
        entityId: item.id,
        entityType: "InventoryItem",
        newValues: item as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Create inventory item error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create item" },
      { status: 400 }
    );
  }
}
