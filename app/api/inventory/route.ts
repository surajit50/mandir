import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryItemSchema } from "@/lib/validations/assets";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const lowStock = searchParams.get("lowStock") === "true";

    const items = await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: { select: { categoryName: true } },
        movements: { orderBy: { movementDate: "desc" }, take: 5 },
      },
      orderBy: { itemCode: "asc" },
    });

    // Optionally filter low stock items in-memory for performance
    const result = lowStock
      ? items.filter((item: any) => item.quantity <= item.reorderLevel)
      : items;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get inventory error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
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
    const result = InventoryItemSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { itemCode, itemName, categoryId, description, unit, quantity, reorderLevel, unitCost } =
      result.data;

    // Verify category exists
    const category = await prisma.inventoryCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check for duplicate item code
    const existing = await prisma.inventoryItem.findUnique({ where: { itemCode } });
    if (existing) {
      return NextResponse.json({ error: "Item code already exists" }, { status: 409 });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        itemCode,
        itemName,
        categoryId,
        description: description || null,
        unit,
        quantity: quantity ?? 0,
        reorderLevel: reorderLevel ?? 0,
        unitCost: unitCost ?? 0,
      },
      include: { category: { select: { categoryName: true } } },
    });

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
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
