import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Bank Account  (model: BankAccount)
// ─────────────────────────────────────────────────────────────
export const BankAccountSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z
    .string()
    .min(5, "Account number must be at least 5 characters")
    .max(20, "Account number must be at most 20 characters"),
  branch: z.string().optional(),
  ifscCode: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code (e.g. SBIN0001234)")
    .optional()
    .or(z.literal("")),
  accountHolder: z.string().min(1, "Account holder is required"),
  accountType: z.enum(["SAVINGS", "CURRENT", "FIXED_DEPOSIT", "RECURRING"]).default("SAVINGS"),
  openingBalance: z.coerce.number().min(0, "Opening balance cannot be negative").default(0),
});
export type BankAccountFormValues = z.infer<typeof BankAccountSchema>;

// ─────────────────────────────────────────────────────────────
// Payment Voucher  (model: PaymentVoucher)
// ─────────────────────────────────────────────────────────────
export const PaymentVoucherSchema = z.object({
  voucherDate: z.string().min(1, "Voucher date is required"),
  voucherType: z.enum(["PAYMENT", "RECEIPT"]),
  payeeId: z.string().optional(),
  payeeName: z.string().optional(),
  payeeEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  payeeType: z.enum([
    "PRESIDENT",
    "SECRETARY",
    "VICE_PRESIDENT",
    "JOINT_SECRETARY",
    "TREASURER",
    "PRIEST",
    "PUJARI",
    "SEVAK",
    "TRUSTEE",
    "DEVOTEE",
    "MANAGER",
    "ARCHAKA",
    "LABOUR",
    "VENDOR",
    "STAFF",
    "MEMBER",
    "OTHER",
  ]).optional().default("OTHER"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(["CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE"]),
  chequeId: z.string().optional(),
  bankAccountId: z.string().optional(),
  category: z.string().optional(),
  referenceNumber: z.string().optional(),
  referenceDate: z.string().optional(),
  metalType: z.string().optional(),
  weight: z.coerce.number().optional(),
  purity: z.string().optional(),
}).refine(
  (d) => d.payeeId || (d.payeeName && d.payeeName.trim().length > 0),
  { message: "Payee is required", path: ["payeeName"] }
);
export type PaymentVoucherFormValues = z.infer<typeof PaymentVoucherSchema>;

// ─────────────────────────────────────────────────────────────
// Bank Deposit  (model: BankDeposit)
// ─────────────────────────────────────────────────────────────
export const BankDepositSchema = z.object({
  depositDate: z.string().min(1, "Deposit date is required"),
  accountId: z.string().min(1, "Account is required"),
  totalAmount: z.coerce.number().positive("Amount must be greater than 0"),
  depositType: z.enum(["CASH", "CHEQUE", "MIXED"]),
  chequeIds: z.array(z.string()).optional().default([]),
  remarks: z.string().optional(),
});
export type BankDepositFormValues = z.infer<typeof BankDepositSchema>;

// ─────────────────────────────────────────────────────────────
// Bank Reconciliation  (model: BankReconciliation)
// ─────────────────────────────────────────────────────────────
export const BankReconciliationSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  reconciliationDate: z.string().min(1, "Date is required"),
  bankBalance: z.coerce.number({ required_error: "Bank balance is required" }),
  bookBalance: z.coerce.number({ required_error: "Book balance is required" }),
  remarks: z.string().optional(),
  encashmentUpdates: z
    .array(
      z.object({
        chequeId: z.string(),
        encashmentDate: z.string(),
      })
    )
    .optional()
    .default([]),
});
export type BankReconciliationFormValues = z.infer<typeof BankReconciliationSchema>;

// ─────────────────────────────────────────────────────────────
// Cheque Register  (models: ChequeRegister – SINGLE & BOOK)
// ─────────────────────────────────────────────────────────────
export const SingleChequeSchema = z.object({
  chequeNumber: z.string().min(1, "Cheque number is required"),
  chequeBookNumber: z.string().optional(),
  chequeDate: z.string().min(1, "Cheque date is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  payeeName: z.string().min(1, "Payee name is required"),
  accountId: z.string().min(1, "Account is required"),
  status: z
    .enum(["ISSUED", "DEPOSITED", "CLEARED", "BOUNCED", "CANCELLED"])
    .default("ISSUED"),
});
export type SingleChequeFormValues = z.infer<typeof SingleChequeSchema>;

export const ChequeBookSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  chequeBookNumber: z.string().optional(),
  startChequeNumber: z
    .string()
    .min(1, "Start cheque number is required")
    .regex(/^\d+$/, "Must be numeric"),
  leafCount: z.coerce
    .number()
    .int()
    .min(20, "Cheque book must have at least 20 leaves"),
  chequeDate: z.string().optional(),
});
export type ChequeBookFormValues = z.infer<typeof ChequeBookSchema>;

// ─────────────────────────────────────────────────────────────
// Financial Year  (model: FinancialYear)
// ─────────────────────────────────────────────────────────────
export const FinancialYearSchema = z
  .object({
    yearCode: z
      .string()
      .min(1, "Year code is required")
      .regex(/^FY\d{4}-\d{2,4}$/, "Format must be FY2024-25 or FY2024-2025"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });
export type FinancialYearFormValues = z.infer<typeof FinancialYearSchema>;

// ─────────────────────────────────────────────────────────────
// GL Account  (model: GLAccount)
// ─────────────────────────────────────────────────────────────
export const GLAccountSchema = z.object({
  accountCode: z
    .string()
    .min(3, "Account code must be at least 3 characters")
    .max(20, "Account code too long"),
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.enum(["Asset", "Liability", "Equity", "Income", "Expense"], {
    errorMap: () => ({ message: "Please select an account type" }),
  }),
  subType: z.string().optional(),
  description: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
});
export type GLAccountFormValues = z.infer<typeof GLAccountSchema>;
