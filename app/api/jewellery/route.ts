import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JewellerySchema } from "@/lib/validations/assets";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const metalType = searchParams.get("metalType");

    const items = await prisma.jewelleryAsset.findMany({
      where: {
        isActive: true,
        ...(metalType ? { metalType } : {}),
      },
      orderBy: { jewelleryCode: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Get jewellery error:", error);
    return NextResponse.json({ error: "Failed to fetch jewellery register" }, { status: 500 });
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
    const result = JewellerySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { jewelleryCode, jewelleryName, metalType, description, purity, weight, quantity, estimatedValue, receivedDate, donorName } =
      result.data;

    const existing = await prisma.jewelleryAsset.findUnique({ where: { jewelleryCode } });
    if (existing) {
      return NextResponse.json({ error: "Jewellery code already exists" }, { status: 409 });
    }

    const item = await prisma.jewelleryAsset.create({
      data: {
        jewelleryCode,
        jewelleryName,
        metalType,
        description: description || null,
        purity: purity || null,
        weight: weight ?? 0,
        quantity: quantity ?? 1,
        estimatedValue: estimatedValue ?? 0,
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        donorName: donorName || null,
      },
    });

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
    return NextResponse.json({ error: "Failed to create jewellery entry" }, { status: 500 });
  }
}
