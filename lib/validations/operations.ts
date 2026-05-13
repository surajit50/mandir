import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Donation  (models: DonationCollection + DonationItem)
// ─────────────────────────────────────────────────────────────
export const DonationItemSchema = z
  .object({
    donorName: z.string().min(1, "Donor name is required"),
    amount: z.coerce.number().min(0).optional(),
    donationType: z.enum(["Cash", "UPI", "Gold", "Silver"]),
    weight: z.coerce.number().min(0).optional(),
    purity: z.string().optional(),
    description: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.donationType === "Gold" || d.donationType === "Silver") {
        return d.weight !== undefined && d.weight > 0;
      }
      return d.amount !== undefined && d.amount > 0;
    },
    { message: "Weight required for metals, amount required for Cash/UPI", path: ["weight"] }
  );

export const DonationCollectionSchema = z.object({
  collectionDate: z.string().min(1, "Collection date is required"),
  donationItems: z.array(DonationItemSchema).min(1, "At least one donation item is required"),
  remarks: z.string().optional(),
});
export type DonationCollectionFormValues = z.infer<typeof DonationCollectionSchema>;
export type DonationItemFormValues = z.infer<typeof DonationItemSchema>;

// ─────────────────────────────────────────────────────────────
// Member / User  (model: User)
// ─────────────────────────────────────────────────────────────
export const MemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "ACCOUNTANT", "MEMBER"]).default("MEMBER"),
  userType: z.enum([
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
  ]).default("MEMBER"),
});
export type MemberFormValues = z.infer<typeof MemberSchema>;

// ─────────────────────────────────────────────────────────────
// Cash Handover  (model: CashHandover)
// ─────────────────────────────────────────────────────────────
export const CashHandoverSchema = z.object({
  handoverDate: z.string().min(1, "Handover date is required"),
  totalAmount: z.coerce.number().positive("Amount must be greater than 0"),
  numberOfNotes: z.record(z.string(), z.coerce.number().int().min(0)).optional(),
  remarks: z.string().optional(),
});
export type CashHandoverFormValues = z.infer<typeof CashHandoverSchema>;
