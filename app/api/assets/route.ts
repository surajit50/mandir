import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetSchema } from "@/lib/validations/assets";
import { 
  successResponse, 
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse, 
  validationErrorResponse, 
  serverErrorResponse 
} from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const assets = await prisma.mandirAsset.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { assetCode: "asc" },
    });

    return successResponse(assets);
  } catch (error) {
    return serverErrorResponse(error, "Failed to fetch assets");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorizedResponse();

    if (!["ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const result = AssetSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(result.error);
    }

    const { assetCode, assetName, category, description, purchaseDate, purchaseValue, location, condition } =
      result.data;

    const existing = await prisma.mandirAsset.findUnique({ where: { assetCode } });
    if (existing) {
      return errorResponse("Asset code already exists", 409);
    }

    const asset = await prisma.mandirAsset.create({
      data: {
        assetCode,
        assetName,
        category,
        description: description || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseValue: purchaseValue ?? 0,
        location: location || null,
        condition: condition || null,
      },
    });

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

    return successResponse(asset, 201);
  } catch (error) {
    return serverErrorResponse(error, "Failed to create asset");
  }
}
