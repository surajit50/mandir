import { BLANK_A4_PDF, type Template } from "@pdfme/common";
import { PDF_SAFFRON } from "./pdf-theme";
import { textField } from "./text-field";

/**
 * pdfme template for payment / receipt vouchers (A4).
 * Schemas match `buildVoucherPdfInputs` keys — export as JSON for the pdfme designer if needed.
 */
const labelMuted = { fontSize: 9 as const, fontColor: PDF_SAFFRON.muted };
const bodyRow = {
  fontSize: 10 as const,
  fontColor: PDF_SAFFRON.inkSoft,
  lineHeight: 1.22 as const,
};

export const voucherPdfTemplate: Template = {
  basePdf: BLANK_A4_PDF,
  pdfmeVersion: "6.1.2",
  schemas: [
    [
      textField("docTitle", 15, 10, 180, 15, {
        fontSize: 17,
        alignment: "center",
        verticalAlignment: "middle",
        fontColor: PDF_SAFFRON.ink,
        backgroundColor: PDF_SAFFRON.cream,
        characterSpacing: 0.35,
        padding: { top: 2, right: 6, bottom: 2, left: 6 },
        borderWidth: { top: 0, right: 0, bottom: 0.75, left: 0 },
        borderColor: PDF_SAFFRON.border,
      }),
      textField("voucherNumberLine", 15, 28, 118, 8, {
        fontSize: 11,
        fontColor: PDF_SAFFRON.ink,
        verticalAlignment: "middle",
      }),
      textField("statusLine", 136, 28, 59, 8, {
        fontSize: 10,
        alignment: "right",
        verticalAlignment: "middle",
        fontColor: PDF_SAFFRON.deep,
        backgroundColor: PDF_SAFFRON.wash,
        padding: { top: 1, right: 4, bottom: 1, left: 4 },
        borderWidth: { top: 0.35, right: 0.35, bottom: 0.35, left: 0.35 },
        borderColor: PDF_SAFFRON.borderSoft,
      }),
      textField("voucherDateLine", 15, 38, 180, 8, { ...bodyRow }),
      textField("counterpartyLabel", 15, 49, 180, 6, {
        ...labelMuted,
        characterSpacing: 0.15,
      }),
      textField("counterpartyName", 15, 56, 180, 9, {
        fontSize: 12,
        fontColor: PDF_SAFFRON.ink,
        lineHeight: 1.2,
      }),
      textField("counterpartyEmail", 15, 66, 180, 7, {
        fontSize: 9,
        fontColor: PDF_SAFFRON.muted,
      }),
      textField("amountLine", 15, 76, 180, 14, {
        fontSize: 15,
        fontColor: PDF_SAFFRON.primary,
        verticalAlignment: "middle",
        backgroundColor: PDF_SAFFRON.wash,
        padding: { top: 3, right: 6, bottom: 3, left: 8 },
        borderWidth: { top: 0, right: 0, bottom: 0, left: 2.5 },
        borderColor: PDF_SAFFRON.vivid,
        lineHeight: 1.15,
      }),
      textField("typeAndMethodLine", 15, 93, 180, 8, { ...bodyRow }),
      textField("categoryLine", 15, 103, 180, 7, { ...labelMuted }),
      textField("referenceLine", 15, 111, 180, 7, { ...bodyRow, fontSize: 9 }),
      textField("bankLine", 15, 119, 180, 7, { ...bodyRow, fontSize: 9 }),
      textField("chequeLine", 15, 127, 180, 7, { ...bodyRow, fontSize: 9 }),
      textField("metalLine", 15, 135, 180, 7, { ...bodyRow, fontSize: 9 }),
      textField("descriptionBlock", 15, 145, 180, 56, {
        fontSize: 9,
        lineHeight: 1.28,
        overflow: "visible",
        fontColor: PDF_SAFFRON.inkSoft,
        backgroundColor: PDF_SAFFRON.cream,
        padding: { top: 4, right: 5, bottom: 4, left: 5 },
        borderWidth: { top: 0.4, right: 0.4, bottom: 0.4, left: 0.4 },
        borderColor: PDF_SAFFRON.borderSoft,
      }),
      textField("approvalLine", 15, 205, 180, 8, {
        fontSize: 9,
        fontColor: PDF_SAFFRON.ink,
        backgroundColor: PDF_SAFFRON.mist,
        padding: { top: 2, right: 4, bottom: 2, left: 4 },
        borderWidth: { top: 0, right: 0, bottom: 0, left: 2 },
        borderColor: PDF_SAFFRON.vivid,
        verticalAlignment: "middle",
      }),
      textField("createdLine", 15, 216, 180, 7, {
        fontSize: 8,
        fontColor: PDF_SAFFRON.muted,
      }),
      textField("footerNote", 15, 266, 180, 20, {
        fontSize: 8,
        fontColor: PDF_SAFFRON.muted,
        lineHeight: 1.35,
        padding: { top: 3, right: 0, bottom: 0, left: 0 },
        borderWidth: { top: 0.5, right: 0, bottom: 0, left: 0 },
        borderColor: PDF_SAFFRON.border,
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
