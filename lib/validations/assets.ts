import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Mandir Asset  (model: MandirAsset)
// ─────────────────────────────────────────────────────────────
export const AssetSchema = z.object({
  assetCode: z
    .string()
    .min(1, "Asset code is required")
    .max(20, "Asset code too long")
    .regex(/^[A-Z0-9-]+$/i, "Only letters, numbers, and hyphens allowed"),
  assetName: z.string().min(1, "Asset name is required"),
  category: z.enum([
    "Furniture",
    "Electronics",
    "Construction",
    "Ritual Item",
    "Vehicle",
    "Other",
  ]),
  description: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseValue: z.coerce.number().min(0, "Purchase value cannot be negative").default(0),
  location: z.string().optional(),
  condition: z.enum(["Good", "Needs Repair", "Damaged", "Scrap"]).optional(),
});
export type AssetFormValues = z.infer<typeof AssetSchema>;

// ─────────────────────────────────────────────────────────────
// Jewellery  (model: JewelleryAsset)
// ─────────────────────────────────────────────────────────────
export const JewellerySchema = z.object({
  jewelleryCode: z
    .string()
    .min(1, "Jewellery code is required")
    .max(30, "Code too long"),
  jewelleryName: z.string().min(1, "Jewellery name is required"),
  metalType: z.enum(["Gold", "Silver", "Other"]),
  description: z.string().optional(),
  purity: z.string().optional(),
  weight: z.coerce.number().min(0, "Weight cannot be negative").default(0),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").default(1),
  estimatedValue: z.coerce.number().min(0, "Estimated value cannot be negative").default(0),
  receivedDate: z.string().optional(),
  donorName: z.string().optional(),
});
export type JewelleryFormValues = z.infer<typeof JewellerySchema>;

// ─────────────────────────────────────────────────────────────
// Inventory Item  (model: InventoryItem)
// ─────────────────────────────────────────────────────────────
export const InventoryItemSchema = z.object({
  itemCode: z
    .string()
    .min(1, "Item code is required")
    .max(20, "Item code too long"),
  itemName: z.string().min(1, "Item name is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required (e.g. Kg, Pcs, Liters)"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative").default(0),
  reorderLevel: z.coerce.number().min(0, "Reorder level cannot be negative").default(0),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative").default(0),
});
export type InventoryItemFormValues = z.infer<typeof InventoryItemSchema>;

// ─────────────────────────────────────────────────────────────
// Festival  (model: Festival)
// ─────────────────────────────────────────────────────────────
export const FestivalSchema = z.object({
  festivalName: z.string().min(1, "Festival name is required"),
  festivalDate: z.string().min(1, "Festival date is required"),
  description: z.string().optional(),
  budgetAmount: z.coerce.number().min(0, "Budget cannot be negative").default(0),
});
export type FestivalFormValues = z.infer<typeof FestivalSchema>;
