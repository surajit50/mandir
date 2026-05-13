import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderPdfmePdf } from "@/lib/pdfme/render-pdf";
import {
  buildDonationPdfInputs,
  donationPdfTemplate,
} from "@/lib/pdfme/donation-template";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const donation = await prisma.donationCollection.findUnique({
      where: { id },
      include: {
        donationItems: true,
        collector: { select: { id: true, name: true, email: true } },
        jewelleryAssets: true,
      },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }

    const inputs = buildDonationPdfInputs({
      id: donation.id,
      collectionDate: donation.collectionDate,
      totalAmount: donation.totalAmount,
      isVerified: donation.isVerified,
      status: donation.status,
      remarks: donation.remarks,
      donationItems: donation.donationItems.map((i) => ({
        donorName: i.donorName,
        amount: i.amount,
        donationType: i.donationType,
        weight: i.weight,
        description: i.description,
      })),
      jewelleryAssets: donation.jewelleryAssets.map((j) => ({
        jewelleryCode: j.jewelleryCode,
        jewelleryName: j.jewelleryName,
        metalType: j.metalType,
        purity: j.purity,
        weight: j.weight,
        quantity: j.quantity,
        estimatedValue: j.estimatedValue,
        donorName: j.donorName,
      })),
      collector: donation.collector,
      verifiedAt: donation.verifiedAt,
    });

    const pdf = await renderPdfmePdf(
      donationPdfTemplate,
      [inputs],
      {
        title: `Donation collection ${donation.id}`,
        subject: "Donation collection summary",
      },
    );

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Donation-${donation.id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Donation print error:", error);
    return NextResponse.json(
      { error: "Failed to generate donation PDF", details: message },
      { status: 500 },
    );
  }
}
