import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderPdfmePdf } from "@/lib/pdfme/render-pdf";
import {
  buildVoucherPdfInputs,
  voucherPdfTemplate,
} from "@/lib/pdfme/voucher-template";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const format = request.nextUrl.searchParams.get("format");

    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id },
      include: {
        payee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bankAccount: {
          select: {
            bankName: true,
            accountNumber: true,
            branch: true,
          },
        },
        cheque: {
          select: {
            chequeNumber: true,
            chequeDate: true,
            amount: true,
          },
        },
      },
    });

    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (format === "html") {
      const htmlContent = generateVoucherHTML(voucher);
      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="Voucher-${voucher.voucherNumber}.html"`,
        },
      });
    }

    const inputs = buildVoucherPdfInputs({
      voucherNumber: voucher.voucherNumber,
      voucherDate: voucher.voucherDate,
      voucherType: voucher.voucherType,
      amount: voucher.amount,
      description: voucher.description,
      paymentMethod: voucher.paymentMethod,
      status: voucher.status,
      category: voucher.category,
      referenceNumber: voucher.referenceNumber,
      referenceDate: voucher.referenceDate,
      metalType: voucher.metalType,
      weight: voucher.weight,
      purity: voucher.purity,
      approvedAt: voucher.approvedAt,
      createdAt: voucher.createdAt,
      payee: voucher.payee,
      bankAccount: voucher.bankAccount,
      cheque: voucher.cheque,
    });

    const pdf = await renderPdfmePdf(
      voucherPdfTemplate,
      [inputs],
      {
        title: `Voucher ${voucher.voucherNumber}`,
        subject: `${voucher.voucherType} voucher`,
      },
    );

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Voucher-${voucher.voucherNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Voucher print error:", error);
    return NextResponse.json(
      { error: "Failed to generate voucher print", details: message },
      { status: 500 },
    );
  }
}

function generateVoucherHTML(voucher: {
  voucherNumber: string;
  voucherDate: Date;
  voucherType: string;
  amount: number;
  description: string;
  paymentMethod: string;
  status: string;
  approvedAt: Date | null;
  payee: { name: string; email: string | null };
}): string {
  const formattedDate = new Date(voucher.voucherDate).toLocaleDateString(
    "en-IN",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

  const approvedDate = voucher.approvedAt
    ? new Date(voucher.approvedAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "Not Approved";

  const title =
    voucher.voucherType === "RECEIPT" ? "RECEIPT VOUCHER" : "PAYMENT VOUCHER";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - ${voucher.voucherNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 40px; border: 2px solid #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
        .header h1 { font-size: 28px; color: #333; margin-bottom: 10px; }
        .voucher-details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .detail-section h3 { font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 8px; }
        .detail-section p { font-size: 14px; color: #333; margin-bottom: 5px; }
        .amount-section { grid-column: 1 / -1; background: #f9f9f9; padding: 20px; border: 1px solid #ddd; margin: 20px 0; }
        .amount-row.total { display: grid; grid-template-columns: 1fr auto; border-top: 2px solid #333; border-bottom: 2px solid #333; padding: 10px 0; font-weight: bold; font-size: 16px; }
        .signature-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; padding-top: 30px; border-top: 1px solid #ddd; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid #333; margin-bottom: 5px; height: 50px; }
        .signature-label { font-size: 12px; color: #666; font-weight: bold; }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 3px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
        .status-draft { background: #f0f0f0; color: #666; }
        .status-submitted { background: #fff3cd; color: #856404; }
        .status-approved { background: #d4edda; color: #155724; }
        .status-rejected { background: #f8d7da; color: #721c24; }
        .remark { margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #333; }
        @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; max-width: 100%; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
          <p>Temple Trust Financial Record</p>
        </div>
        <div class="status-badge status-${String(voucher.status).toLowerCase()}">${voucher.status}</div>
        <div class="voucher-details">
          <div class="detail-section">
            <h3>Voucher Number</h3>
            <p><strong>${voucher.voucherNumber}</strong></p>
          </div>
          <div class="detail-section">
            <h3>Voucher Date</h3>
            <p><strong>${formattedDate}</strong></p>
          </div>
          <div class="detail-section">
            <h3>Party</h3>
            <p><strong>${voucher.payee.name}</strong></p>
            <p>${voucher.payee.email || ""}</p>
          </div>
          <div class="detail-section">
            <h3>Payment Method</h3>
            <p><strong>${voucher.paymentMethod.replace(/_/g, " ")}</strong></p>
          </div>
          <div class="detail-section">
            <h3>Description</h3>
            <p>${voucher.description}</p>
          </div>
          <div class="detail-section">
            <h3>Approval</h3>
            <p>${voucher.approvedAt ? `Approved on ${approvedDate}` : "Pending approval"}</p>
          </div>
        </div>
        <div class="amount-section">
          <div class="amount-row total">
            <span>Amount</span>
            <span>Rs. ${voucher.amount.toFixed(2)}</span>
          </div>
        </div>
        <div class="signature-section">
          <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Prepared By</div></div>
          <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Checked By</div></div>
          <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Approved By</div></div>
        </div>
        <div class="remark">
          <p><strong>Note:</strong> System-generated voucher. Use PDF print for official pdfme output.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
