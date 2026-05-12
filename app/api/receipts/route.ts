import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const receiptSchema = z.object({
  donationId: z.string(),
  donorEmail: z.string().email().optional(),
  donorPhone: z.string().optional(),
  donorAddress: z.string().optional(),
  receiptType: z.enum(["Regular", "Provisional", "Duplicate"]).default("Regular"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const receipts = await prisma.donationReceipt.findMany({
      include: {
        donation: {
          include: {
            donationItems: true,
            collector: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { receiptDate: "desc" },
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error("Fetch receipts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validated = receiptSchema.parse(body);

    // Verify donation exists
    const donation = await prisma.donationCollection.findUnique({
      where: { id: validated.donationId },
      include: { donationItems: true },
    });

    if (!donation) {
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 }
      );
    }

    // Generate receipt number
    const lastReceipt = await prisma.donationReceipt.findFirst({
      orderBy: { receiptNumber: "desc" },
    });

    const nextNumber = lastReceipt
      ? parseInt(lastReceipt.receiptNumber.split("-")[1]) + 1
      : 1001;
    const receiptNumber = `RCP-${nextNumber.toString().padStart(6, "0")}`;

    // Create receipt
    const receipt = await prisma.donationReceipt.create({
      data: {
        receiptNumber,
        donationId: validated.donationId,
        receiptDate: new Date(),
        donorName: donation.donationItems[0]?.donorName || "Anonymous",
        donorEmail: validated.donorEmail,
        donorPhone: validated.donorPhone,
        donorAddress: validated.donorAddress,
        amount: donation.totalAmount,
        receiptType: validated.receiptType,
      },
      include: { donation: { include: { donationItems: true } } },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? "Unknown User",
        userRole: session.user.role,
        action: "CREATE",
        module: "DonationReceipt",
        entityId: receipt.id,
        entityType: "DonationReceipt",
        newValues: receipt as any,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error("Create receipt error:", error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Failed to create receipt" },
      { status: 400 }
    );
  }
}
