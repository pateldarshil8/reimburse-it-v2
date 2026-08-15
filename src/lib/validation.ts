import { z } from "zod";

// Suggested categories from the CDF brief (problem_statement.md §3), plus "Other".
export const CATEGORIES = [
  "Travel",
  "Meals",
  "Office supplies",
  "Software or subscriptions",
  "Event expenses",
  "Training",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Shared with src/lib/supabase-storage.ts's storage-side limits -- kept here
// too so form validation can fail fast before ever calling Supabase.
export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10MB

export const ExpenseRequestFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(2000, "Description must be 2000 characters or fewer."),
  category: z.enum(CATEGORIES, {
    message: "Select a valid category.",
  }),
  expenseDate: z
    .string()
    .trim()
    .min(1, "Expense date is required.")
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "Enter a valid date.",
    })
    .refine((val) => new Date(val) <= new Date(), {
      message: "Expense date cannot be in the future.",
    }),
  totalAmount: z.coerce
    .number({ message: "Amount is required." })
    .positive("Amount must be greater than zero.")
    .max(1_000_000, "Amount is unrealistically large -- double check it.")
    .refine((val) => Math.round(val * 100) === val * 100, {
      message: "Amount can have at most 2 decimal places.",
    }),
});

export type ExpenseRequestFormValues = z.infer<typeof ExpenseRequestFormSchema>;

export function validateReceiptFile(file: File): string | null {
  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.type as (typeof ALLOWED_RECEIPT_MIME_TYPES)[number])) {
    return "Receipt must be a JPEG, PNG, or PDF file.";
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return "Receipt must be 10MB or smaller.";
  }
  if (file.size === 0) {
    return "Receipt file is empty.";
  }
  return null;
}
