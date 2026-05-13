import { BLANK_A4_PDF, type Template } from "@pdfme/common";
import { textField } from "./text-field";

/**
 * pdfme template for payment / receipt vouchers (A4).
 * Schemas match `buildVoucherPdfInputs` keys — export as JSON for the pdfme designer if needed.
 */
export const voucherPdfTemplate: Template = {
  basePdf: BLANK_A4_PDF,
  pdfmeVersion: "6.1.2",
  schemas: [
    [
      textField("docTitle", 15, 12, 180, 12, {
        fontSize: 16,
        alignment: "center",
        fontColor: "#0f172a",
      }),
      textField("voucherNumberLine", 15, 28, 120, 8, { fontSize: 11 }),
      textField("statusLine", 140, 28, 55, 8, {
        fontSize: 10,
        alignment: "right",
      }),
      textField("voucherDateLine", 15, 38, 180, 8, { fontSize: 10 }),
      textField("counterpartyLabel", 15, 50, 180, 6, {
        fontSize: 9,
        fontColor: "#64748b",
      }),
      textField("counterpartyName", 15, 57, 180, 8, { fontSize: 11 }),
      textField("counterpartyEmail", 15, 66, 180, 7, { fontSize: 9 }),
      textField("amountLine", 15, 78, 180, 12, {
        fontSize: 14,
        fontColor: "#1d4ed8",
      }),
      textField("typeAndMethodLine", 15, 94, 180, 8, { fontSize: 10 }),
      textField("categoryLine", 15, 104, 180, 7, { fontSize: 9 }),
      textField("referenceLine", 15, 112, 180, 7, { fontSize: 9 }),
      textField("bankLine", 15, 120, 180, 7, { fontSize: 9 }),
      textField("chequeLine", 15, 128, 180, 7, { fontSize: 9 }),
      textField("metalLine", 15, 136, 180, 7, { fontSize: 9 }),
      textField("descriptionBlock", 15, 146, 180, 55, {
        fontSize: 9,
        lineHeight: 1.25,
        overflow: "visible",
      }),
      textField("approvalLine", 15, 206, 180, 8, { fontSize: 9 }),
      textField("createdLine", 15, 216, 180, 7, { fontSize: 8, fontColor: "#64748b" }),
      textField("footerNote", 15, 268, 180, 18, {
        fontSize: 8,
        fontColor: "#64748b",
        lineHeight: 1.2,
      }),
    ],
  ],
};

function fmtINR(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

type VoucherForPdf = {
  voucherNumber: string;
  voucherDate: Date;
  voucherType: "PAYMENT" | "RECEIPT";
  amount: number;
  description: string;
  paymentMethod: string;
  status: string;
  category?: string | null;
  referenceNumber?: string | null;
  referenceDate?: Date | null;
  metalType?: string | null;
  weight?: number | null;
  purity?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
  payee: { name: string; email?: string | null };
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    branch?: string | null;
  } | null;
  cheque?: {
    chequeNumber: string;
    chequeDate: Date;
    payeeName: string;
    amount: number;
  } | null;
};

export function buildVoucherPdfInputs(v: VoucherForPdf): Record<string, string> {
  const isPayment = v.voucherType === "PAYMENT";
  const title = isPayment ? "PAYMENT VOUCHER" : "RECEIPT VOUCHER";
  const partyLabel = isPayment ? "Payee" : "Payer / received from";
  const method = v.paymentMethod.replace(/_/g, " ");

  let metalLine = "Metal / weight: —";
  if (v.metalType || v.weight != null || v.purity) {
    const parts = [
      v.metalType || "",
      v.weight != null ? `${v.weight} g` : "",
      v.purity || "",
    ].filter(Boolean);
    metalLine = `Metal / weight: ${parts.join(" · ") || "—"}`;
  }

  let bankLine = "Bank: —";
  if (v.bankAccount) {
    const br = v.bankAccount.branch ? `, ${v.bankAccount.branch}` : "";
    bankLine = `Bank: ${v.bankAccount.bankName}${br} · A/c ${v.bankAccount.accountNumber}`;
  }

  let chequeLine = "Cheque: —";
  if (v.cheque) {
    chequeLine = `Cheque: #${v.cheque.chequeNumber} dated ${fmtDate(v.cheque.chequeDate)} · ${v.cheque.payeeName} · ${fmtINR(v.cheque.amount)}`;
  }

  let referenceLine = "Reference: —";
  if (v.referenceNumber || v.referenceDate) {
    referenceLine = `Reference: ${v.referenceNumber || "—"}${v.referenceDate ? ` · ${fmtDate(v.referenceDate)}` : ""}`;
  }

  const categoryLine = v.category?.trim()
    ? `Category: ${v.category}`
    : "Category: —";

  const approvalLine = v.approvedAt
    ? `Approval: Approved on ${fmtDate(v.approvedAt)}`
    : "Approval: Pending / not approved";

  return {
    docTitle: title,
    voucherNumberLine: `Voucher No: ${v.voucherNumber}`,
    statusLine: `Status: ${v.status}`,
    voucherDateLine: `Voucher date: ${fmtDate(v.voucherDate)}`,
    counterpartyLabel: partyLabel,
    counterpartyName: v.payee.name,
    counterpartyEmail: v.payee.email?.trim() ? v.payee.email : "—",
    amountLine: `Amount: ${fmtINR(v.amount)}`,
    typeAndMethodLine: `Type: ${isPayment ? "Payment" : "Receipt"} · Method: ${method}`,
    categoryLine,
    referenceLine,
    bankLine,
    chequeLine,
    metalLine,
    descriptionBlock: `Description:\n${(v.description || "—").slice(0, 3500)}`,
    approvalLine,
    createdLine: `Generated from system · Created: ${fmtDate(v.createdAt)}`,
    footerNote:
      "This document is generated by the temple trust management system. Verify all details before acting on it.",
  };
}
