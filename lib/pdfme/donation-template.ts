import { BLANK_A4_PDF, type Template } from "@pdfme/common";
import { textField } from "./text-field";

/** pdfme template for donation collection summary (cash / UPI, metals, jewellery). */
export const donationPdfTemplate: Template = {
  basePdf: BLANK_A4_PDF,
  pdfmeVersion: "6.1.2",
  schemas: [
    [
      textField("docTitle", 15, 12, 180, 12, {
        fontSize: 16,
        alignment: "center",
        fontColor: "#0f172a",
      }),
      textField("metaLine", 15, 28, 180, 8, { fontSize: 10 }),
      textField("collectorBlock", 15, 40, 180, 18, {
        fontSize: 10,
        lineHeight: 1.2,
      }),
      textField("totalsLine", 15, 62, 180, 10, { fontSize: 11 }),
      textField("remarksBlock", 15, 76, 180, 22, {
        fontSize: 9,
        lineHeight: 1.2,
      }),
      textField("cashSectionTitle", 15, 102, 180, 7, {
        fontSize: 10,
        fontColor: "#0f766e",
      }),
      textField("cashItemsBlock", 15, 110, 180, 62, {
        fontSize: 8,
        lineHeight: 1.2,
        overflow: "visible",
      }),
      textField("metalSectionTitle", 15, 176, 180, 7, {
        fontSize: 10,
        fontColor: "#b45309",
      }),
      textField("metalItemsBlock", 15, 184, 180, 42, {
        fontSize: 8,
        lineHeight: 1.2,
        overflow: "visible",
      }),
      textField("jewellerySectionTitle", 15, 230, 180, 7, {
        fontSize: 10,
        fontColor: "#a16207",
      }),
      textField("jewelleryItemsBlock", 15, 238, 180, 22, {
        fontSize: 8,
        lineHeight: 1.2,
        overflow: "visible",
      }),
      textField("otherSectionTitle", 15, 262, 180, 5, {
        fontSize: 9,
        fontColor: "#475569",
      }),
      textField("otherItemsBlock", 15, 268, 180, 16, {
        fontSize: 8,
        lineHeight: 1.15,
        overflow: "visible",
      }),
      textField("footerNote", 15, 286, 180, 10, {
        fontSize: 7,
        fontColor: "#64748b",
      }),
    ],
  ],
};

type DonationItem = {
  donorName: string;
  amount: number;
  donationType: string;
  weight?: number | null;
  description?: string | null;
};

type JewelleryRow = {
  jewelleryCode: string;
  jewelleryName: string;
  metalType: string;
  purity?: string | null;
  weight: number;
  quantity: number;
  estimatedValue: number;
  donorName?: string | null;
};

type DonationForPdf = {
  id: string;
  collectionDate: Date;
  totalAmount: number;
  isVerified: boolean;
  status: string;
  remarks?: string | null;
  donationItems: DonationItem[];
  jewelleryAssets?: JewelleryRow[];
  collector: { name: string; email?: string | null };
  verifiedAt?: Date | null;
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

function formatTableLines(
  rows: string[],
  opts: { empty: string; maxLines: number },
): string {
  if (rows.length === 0) return opts.empty;
  const extra = rows.length - opts.maxLines;
  const shown = rows.slice(0, opts.maxLines);
  let out = shown.join("\n");
  if (extra > 0) out += `\n… and ${extra} more row(s) not shown (print from export for full list).`;
  return out;
}

export function buildDonationPdfInputs(d: DonationForPdf): Record<string, string> {
  const cashItems = d.donationItems.filter(
    (i) => i.donationType === "Cash" || i.donationType === "UPI",
  );
  const metalItems = d.donationItems.filter(
    (i) => i.donationType === "Gold" || i.donationType === "Silver",
  );
  const otherItems = d.donationItems.filter(
    (i) =>
      i.donationType !== "Cash" &&
      i.donationType !== "UPI" &&
      i.donationType !== "Gold" &&
      i.donationType !== "Silver",
  );
  const cashTotal = cashItems.reduce((s, i) => s + i.amount, 0);
  const metalWeight = metalItems.reduce((s, i) => s + (i.weight || 0), 0);

  const cashRows = cashItems.map((i) => {
    const desc = i.description?.trim() ? ` · ${i.description.trim()}` : "";
    return `${i.donorName} · ${i.donationType} · ${fmtINR(i.amount)}${desc}`;
  });

  const metalRows = metalItems.map((i) => {
    const w = i.weight != null ? `${i.weight} g` : "— g";
    const desc = i.description?.trim() ? ` · ${i.description.trim()}` : "";
    return `${i.donorName} · ${i.donationType} · ${w} · ${fmtINR(i.amount)}${desc}`;
  });

  const jewels = d.jewelleryAssets ?? [];
  const jewelRows = jewels.map((j) => {
    const dn = j.donorName?.trim() ? ` · Donor: ${j.donorName}` : "";
    const pur = j.purity?.trim() ? ` · ${j.purity}` : "";
    return `${j.jewelleryCode} · ${j.jewelleryName} · ${j.metalType}${pur} · ${j.weight}g × ${j.quantity} · ${fmtINR(j.estimatedValue)}${dn}`;
  });

  const otherRows = otherItems.map((i) => {
    const w =
      i.weight != null && i.weight > 0 ? ` · ${i.weight} g` : "";
    const desc = i.description?.trim() ? ` · ${i.description.trim()}` : "";
    return `${i.donorName} · ${i.donationType} · ${fmtINR(i.amount)}${w}${desc}`;
  });

  const remarksBlock = d.remarks?.trim()
    ? `Remarks:\n${d.remarks.trim().slice(0, 800)}`
    : "Remarks: —";

  return {
    docTitle: "DONATION COLLECTION SUMMARY",
    metaLine: `Collection ID: ${d.id} · Date: ${fmtDate(d.collectionDate)} · Status: ${d.status} · Verified: ${d.isVerified ? "Yes" : "No"}${d.verifiedAt ? ` (${fmtDate(d.verifiedAt)})` : ""}`,
    collectorBlock: `Collector:\n${d.collector.name}${d.collector.email?.trim() ? `\n${d.collector.email}` : ""}`,
    totalsLine: `Recorded total amount (items): ${fmtINR(d.totalAmount)} · Cash/UPI subtotal: ${fmtINR(cashTotal)} · Precious metal items: ${metalItems.length} (${metalWeight.toFixed(2)} g total weight) · Other line types: ${otherItems.length} · Linked jewellery rows: ${jewels.length}`,
    remarksBlock,
    cashSectionTitle: "Cash / UPI items",
    cashItemsBlock: formatTableLines(cashRows, {
      empty: "No cash or UPI line items.",
      maxLines: 28,
    }),
    metalSectionTitle: "Gold / Silver (donation line items)",
    metalItemsBlock: formatTableLines(metalRows, {
      empty: "No precious metal line items.",
      maxLines: 18,
    }),
    jewellerySectionTitle: "Linked jewellery assets (inventory)",
    jewelleryItemsBlock: formatTableLines(jewelRows, {
      empty: "No linked jewellery assets on this collection.",
      maxLines: 12,
    }),
    otherSectionTitle: "Other donation line items (type not Cash / UPI / Gold / Silver)",
    otherItemsBlock: formatTableLines(otherRows, {
      empty: "No other-type line items.",
      maxLines: 8,
    }),
    footerNote:
      "Summary generated by the temple trust system. Use verified records for statutory reporting.",
  };
}
