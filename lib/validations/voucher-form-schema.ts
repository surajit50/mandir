import { z } from "zod";

export const VoucherFormSchema = z.object({
  voucherDate: z.string().min(1, "Voucher date is required"),

  voucherType: z.enum(["PAYMENT", "RECEIPT"]),

  payeeId: z.string().optional(),

  payeeName: z.string().min(1, "Payee name is required"),

  payeeEmail: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),

  payeeType: z.string(),

  amount: z.coerce.number().min(1, "Amount must be greater than 0"),

  description: z.string().min(3, "Description is required"),

  paymentMethod: z.enum([
    "CASH",
    "CHEQUE",
    "BANK_TRANSFER",
    "ONLINE",
  ]),

  chequeId: z.string().optional(),

  bankAccountId: z.string().optional(),

  category: z.string().optional(),

  referenceNumber: z.string().optional(),

  referenceDate: z.string().optional(),

  metalType: z.string().optional(),

  weight: z.coerce.number().optional(),

  purity: z.string().optional(),
});

export type VoucherFormValues = z.infer<typeof VoucherFormSchema>;
