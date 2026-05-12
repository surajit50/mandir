import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const DonationCollectionSchema = z.object({
  collectionDate: z.string().datetime(),
  donationItems: z.array(
    z.object({
      donorName: z.string().min(1),
      amount: z.number().positive(),
      donationType: z.string(),
      weight: z.number().optional(),
      description: z.string().optional(),
    })
  ),
  remarks: z.string().optional(),
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

    const userId = session.user.id;
    const body = await request.json();
    const validatedData = DonationCollectionSchema.parse(body);

    // Get current financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    // Calculate total amount
    const totalAmount = validatedData.donationItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    // Create donation collection with items
    const donation = await prisma.donationCollection.create({
      data: {
        collectorId: userId,
        collectionDate: new Date(validatedData.collectionDate),
        totalAmount,
        remarks: validatedData.remarks,
        status: "DRAFT",
        financialYearId: currentFY?.id,
        donationItems: {
          create: validatedData.donationItems,
        },
      },
      include: {
        donationItems: true,
        collector: { select: { id: true, name: true, email: true } },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: userId,
        userName: session.user.name ?? "Unknown User",
        userRole: session.user.role,
        action: "CREATE",
        module: "DonationCollection",
        entityId: donation.id,
        entityType: "DonationCollection",
        status: "SUCCESS",
      },
    });

    return NextResponse.json(donation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Donation creation error:", error);
    return NextResponse.json(
      { error: "Failed to create donation collection" },
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

    const userRole = session.user.role;
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const financialYearId = searchParams.get("financialYearId");

    // Filter based on role and financial year
    const where: any = {};
    if (userRole === "MEMBER") {
      where.collectorId = userId;
    }
    if (financialYearId) {
      where.financialYearId = financialYearId;
    }

    const donations = await prisma.donationCollection.findMany({
      where,
      include: {
        donationItems: true,
        collector: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(donations);
  } catch (error) {
    console.error("Donation fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 }
    );
  }
}
