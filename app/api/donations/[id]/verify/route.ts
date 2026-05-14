import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const userRole = (session.user as any).role;
    const verifierId = (session.user as any).id;

    if (!["ADMIN", "ACCOUNTANT"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden - Only admins and accountants can verify" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isVerifying = body.verify;

    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    const result = await prisma.$transaction(async (tx: any) => {
      const donation = await tx.donationCollection.update({
        where: { id },
        data: {
          isVerified: isVerifying,
          verifiedBy: isVerifying ? verifierId : null,
          verifiedAt: isVerifying ? new Date() : null,
          status: isVerifying ? "VERIFIED" : "SUBMITTED",
          financialYearId: isVerifying ? (currentFY?.id || null) : null,
        },
        include: {
          donationItems: true,
          collector: { select: { id: true, name: true } },
        },
      });

      if (isVerifying) {
        // NOTE: We no longer post DonationCollections to the Main Cash Book here.
        // The cash is still in the collector's custody. 
        // It will only enter the Main Cash Book when a 'CashHandover' is approved.
        
        // Member cash ledger entry (Essential to track how much the member holds)
        const existingLedgerEntry = await tx.memberCashLedger.findFirst({
          where: { referenceId: id, referenceType: "DonationCollection" },
        });

        if (!existingLedgerEntry) {
          await tx.memberCashLedger.create({
            data: {
              memberId: donation.collector.id,
              description: "Donation Collection",
              transactionDate: new Date(),
              creditAmount: donation.totalAmount,
              balance: donation.totalAmount,
              referenceType: "DonationCollection",
              referenceId: id,
            },
          });
        }

        // Add Gold/Silver items to Jewellery Register
        const metalCounts: Record<string, number> = {};
        
        for (const item of donation.donationItems) {
          if (["Gold", "Silver"].includes(item.donationType)) {
            const metalType = item.donationType;
            if (!(metalType in metalCounts)) {
              metalCounts[metalType] = await tx.jewelleryAsset.count({
                where: { metalType: metalType }
              });
            }
            
            metalCounts[metalType]++;
            const prefix = metalType === "Gold" ? "GLD" : "SLV";
            const jewelleryCode = `${prefix}-${new Date().getFullYear()}-${String(metalCounts[metalType]).padStart(4, "0")}`;

            await tx.jewelleryAsset.create({
              data: {
                jewelleryCode,
                jewelleryName: item.description || `${metalType} Donation`,
                metalType: metalType,
                weight: item.weight || 0,
                estimatedValue: item.amount || 0,
                donorName: item.donorName,
                receivedDate: donation.collectionDate,
                description: `Received via Donation Collection #${donation.id}`,
                donationCollectionId: id,
              },
            });
          }
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: verifierId,
          userName: session.user.name ?? "Unknown User",
          userRole: userRole,
          action: isVerifying ? "APPROVE" : "REJECT",
          module: "DonationCollection",
          entityId: id,
          entityType: "DonationCollection",
          status: "SUCCESS",
        },
      });

      return donation;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Donation verification error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify donation",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
