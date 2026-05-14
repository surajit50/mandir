import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const donation = await prisma.donationCollection.findUnique({
      where: { id },
      include: {
        donationItems: true,
        collector: { select: { id: true, name: true, email: true } },
        jewelleryAssets: true,   // include linked jewellery assets
      },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }

    return NextResponse.json(donation);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const donation = await prisma.donationCollection.findUnique({
      where: { id },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }

    // Only allow deletion if not verified
    if (donation.isVerified) {
      return NextResponse.json(
        { error: "Cannot delete a verified donation" },
        { status: 400 }
      );
    }

    // Check permissions: only admin or the collector themselves can delete
    if (session.user.role !== "ADMIN" && donation.collectorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.donationCollection.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Donation deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
