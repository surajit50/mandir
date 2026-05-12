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
    const approverId = (session.user as any).id;

    // Only ADMIN can approve vouchers
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Only admins can approve vouchers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isApproving = body.approve;

    // Get current financial year
    const currentFY = await prisma.financialYear.findFirst({
      where: { isCurrent: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.paymentVoucher.update({
        where: { id },
        data: {
          status: isApproving ? "APPROVED" : "REJECTED",
          approvedBy: isApproving ? approverId : null,
          approvedAt: isApproving ? new Date() : null,
          financialYearId: isApproving ? (currentFY?.id || null) : null,
        },
        include: {
          payee: { select: { id: true, name: true, userId: true } },
        },
      });

      // If approved, create cash book entry if it doesn't exist
      if (isApproving) {
        const existingEntry = await tx.cashBook.findFirst({
          where: { paymentVoucherId: id },
        });

        if (!existingEntry) {
          await tx.cashBook.create({
            data: {
              date: new Date(),
              description: `${voucher.voucherType} - ${voucher.payee.name} (${voucher.description})`,
              // If it's a payment, it's a debit (cash out). If it's a receipt, it's a credit (cash in).
              debitAmount: voucher.voucherType === "PAYMENT" ? voucher.amount : 0,
              creditAmount: voucher.voucherType === "RECEIPT" ? voucher.amount : 0,
              balance: 0,
              referenceType: "PaymentVoucher",
              referenceId: id,
              paymentVoucherId: id,
              financialYearId: currentFY?.id,
            },
          });
        }

        // Update member cash ledger only when payee is a mapped user.
        if (voucher.payee.userId) {
          await tx.memberCashLedger.create({
            data: {
              memberId: voucher.payee.userId,
              description: `Payment Voucher - ${voucher.description}`,
              transactionDate: new Date(),
              debitAmount: voucher.amount,
              balance: -voucher.amount,
              referenceType: "PaymentVoucher",
              referenceId: id,
            },
          });
        }

        // Add to Jewellery Register if it's a jewellery donation receipt
        if (voucher.voucherType === "RECEIPT" && voucher.category === "JEWELLERY_DONATION") {
          const prefix = voucher.metalType === "Gold" ? "GLD" : "SLV";
          const count = await tx.jewelleryAsset.count({
            where: { metalType: voucher.metalType || "Gold" }
          });
          const jewelleryCode = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

          await tx.jewelleryAsset.create({
            data: {
              jewelleryCode,
              jewelleryName: voucher.description,
              metalType: voucher.metalType || "Gold",
              weight: voucher.weight || 0,
              purity: voucher.purity,
              estimatedValue: voucher.amount,
              donorName: voucher.payee.name,
              receivedDate: voucher.voucherDate,
              description: `Received via Voucher #${voucher.voucherNumber}`,
            },
          });
        }
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: approverId,
          userName: session.user.name ?? "Unknown User",
          userRole: userRole,
          action: isApproving ? "APPROVE" : "REJECT",
          module: "PaymentVoucher",
          entityId: id,
          entityType: "PaymentVoucher",
          status: "SUCCESS",
        },
      });

      return voucher;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Voucher approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve voucher" },
      { status: 500 }
    );
  }
}
