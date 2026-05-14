import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Indian Rupees, grouped for en-IN (matches dashboard money display). */
export function formatCurrency(amount: number): string {
  return `₹${(amount || 0).toLocaleString("en-IN")}`
}
