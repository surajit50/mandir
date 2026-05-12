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

    // Find the voucher with payee details
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
      },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Voucher not found" },
        { status: 404 }
      );
    }

    // Generate HTML for PDF
    const htmlContent = generateVoucherHTML(voucher);

    // Return HTML that can be printed or converted to PDF
    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="Voucher-${voucher.voucherNumber}.html"`,
      },
    });
  } catch (error: any) {
    console.error("Voucher print error:", error);
    return NextResponse.json(
      { error: "Failed to generate voucher print", details: error.message },
      { status: 500 }
    );
  }
}

function generateVoucherHTML(voucher: any): string {
  const formattedDate = new Date(voucher.voucherDate).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const approvedDate = voucher.approvedAt
    ? new Date(voucher.approvedAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "Not Approved";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Voucher - ${voucher.voucherNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', sans-serif;
          background-color: #f5f5f5;
          padding: 20px;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          background-color: white;
          padding: 40px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          border: 2px solid #333;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #333;
          padding-bottom: 20px;
        }

        .header h1 {
          font-size: 28px;
          color: #333;
          margin-bottom: 10px;
        }

        .header p {
          font-size: 14px;
          color: #666;
        }

        .voucher-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .detail-section h3 {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .detail-section p {
          font-size: 14px;
          color: #333;
          margin-bottom: 5px;
        }

        .amount-section {
          grid-column: 1 / -1;
          background-color: #f9f9f9;
          padding: 20px;
          border: 1px solid #ddd;
          margin: 20px 0;
        }

        .amount-row {
          display: grid;
          grid-template-columns: 1fr auto;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .amount-row.total {
          border-top: 2px solid #333;
          border-bottom: 2px solid #333;
          padding: 10px 0;
          margin: 10px 0;
          font-weight: bold;
          font-size: 16px;
        }

        .amount-label {
          color: #333;
        }

        .amount-value {
          text-align: right;
          color: #333;
          font-weight: 500;
        }

        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 30px;
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #ddd;
        }

        .signature-box {
          text-align: center;
        }

        .signature-line {
          border-top: 1px solid #333;
          margin-bottom: 5px;
          height: 50px;
        }

        .signature-label {
          font-size: 12px;
          color: #666;
          font-weight: bold;
        }

        .status-badge {
          display: inline-block;
          padding: 5px 15px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .status-draft {
          background-color: #f0f0f0;
          color: #666;
        }

        .status-submitted {
          background-color: #fff3cd;
          color: #856404;
        }

        .status-approved {
          background-color: #d4edda;
          color: #155724;
        }

        .status-rejected {
          background-color: #f8d7da;
          color: #721c24;
        }

        .remark {
          margin-top: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 4px solid #333;
        }

        @media print {
          body {
            background-color: white;
            padding: 0;
          }

          .container {
            box-shadow: none;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PAYMENT VOUCHER</h1>
          <p>Temple Trust Financial Record</p>
        </div>

        <div class="status-badge status-${voucher.status.toLowerCase()}">
          ${voucher.status}
        </div>

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
            <h3>Payee</h3>
            <p><strong>${voucher.payee.name}</strong></p>
            <p>${voucher.payee.email}</p>
          </div>

          <div class="detail-section">
            <h3>Payment Method</h3>
            <p><strong>${voucher.paymentMethod}</strong></p>
          </div>

          <div class="detail-section">
            <h3>Description</h3>
            <p>${voucher.description}</p>
          </div>

          <div class="detail-section">
            <h3>Approval Status</h3>
            <p>${voucher.approvedAt ? `Approved on ${approvedDate}` : "Pending Approval"}</p>
          </div>
        </div>

        <div class="amount-section">
          <div class="amount-row total">
            <span class="amount-label">Amount</span>
            <span class="amount-value">₹ ${voucher.amount.toFixed(2)}</span>
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Prepared By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Checked By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Approved By</div>
          </div>
        </div>

        <div class="remark">
          <p><strong>Note:</strong> This is a system-generated voucher. Please verify all details before payment processing.</p>
        </div>
      </div>

      <script>
        // Auto-print on page load (can be disabled)
        // window.print();
      </script>
    </body>
    </html>
  `;
}
