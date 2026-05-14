import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id },
      include: {
        payee: { select: { id: true, name: true, email: true } },
      },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Voucher not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(voucher);
  } catch (error) {
    console.error("Voucher fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch voucher" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Voucher not found" },
        { status: 404 }
      );
    }

    // Only allow deletion if in DRAFT or REJECTED status
    if (voucher.status === "APPROVED" || voucher.status === "SUBMITTED") {
      return NextResponse.json(
        { error: `Cannot delete a voucher in ${voucher.status} status` },
        { status: 400 }
      );
    }

    // Check permissions: only admin or accountant
    if (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.paymentVoucher.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Voucher deleted successfully" });
  } catch (error) {
    console.error("Voucher delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete voucher" },
      { status: 500 }
    );
  }
}
