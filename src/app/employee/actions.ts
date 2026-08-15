"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseRequestFormSchema, validateReceiptFile } from "@/lib/validation";
import { uploadReceipt } from "@/lib/supabase-storage";

export type SaveRequestState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Handles both "Save as draft" and "Submit for review" for both creating a
// new request and editing an existing draft -- which action ran is decided
// by the `intent` field, set by whichever submit button the user clicked
// (both buttons share this one form, per the standard HTML
// name/value-on-the-submitter pattern).
export async function saveExpenseRequest(
  _prevState: SaveRequestState | undefined,
  formData: FormData
): Promise<SaveRequestState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "employee") {
    return { error: "You must be signed in as an employee to do this." };
  }

  const intent = formData.get("intent");
  if (intent !== "draft" && intent !== "submit") {
    return { error: "Invalid form submission." };
  }

  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId.length > 0 ? rawId : null;

  const parsed = ExpenseRequestFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    expenseDate: formData.get("expenseDate"),
    totalAmount: formData.get("totalAmount"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  let existing = null;
  if (id) {
    existing = await prisma.expenseRequest.findUnique({ where: { id } });
    if (!existing || existing.submitterId !== session.user.id) {
      return { error: "Request not found." };
    }
    if (existing.status !== "draft") {
      return { error: "Only draft requests can be edited." };
    }
  }

  const receiptField = formData.get("receipt");
  const hasNewReceipt = receiptField instanceof File && receiptField.size > 0;

  if (hasNewReceipt) {
    const receiptError = validateReceiptFile(receiptField);
    if (receiptError) {
      return { error: receiptError, fieldErrors: { receipt: receiptError } };
    }
  }

  const willHaveReceipt = hasNewReceipt || Boolean(existing?.receiptUrl);
  if (intent === "submit" && !willHaveReceipt) {
    return {
      error: "Attach a receipt before submitting for review.",
      fieldErrors: { receipt: "A receipt is required to submit." },
    };
  }

  const status: "draft" | "submitted" = intent === "submit" ? "submitted" : "draft";

  const data = {
    submitterId: session.user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    expenseDate: new Date(parsed.data.expenseDate),
    totalAmount: parsed.data.totalAmount.toFixed(2),
    status,
  };

  const saved = existing
    ? await prisma.expenseRequest.update({ where: { id: existing.id }, data })
    : await prisma.expenseRequest.create({ data });

  if (hasNewReceipt) {
    try {
      const path = `${session.user.id}/${saved.id}/${Date.now()}-${receiptField.name}`;
      await uploadReceipt(path, receiptField, receiptField.type);
      await prisma.expenseRequest.update({
        where: { id: saved.id },
        data: {
          receiptUrl: path,
          receiptName: receiptField.name,
          receiptType: receiptField.type,
        },
      });
    } catch (err) {
      console.error("Receipt upload failed:", err);
      return {
        error:
          "Your request was saved, but the receipt upload failed. You can try attaching it again from the request page.",
      };
    }
  }

  if (intent === "submit") {
    await prisma.reviewAction.create({
      data: {
        requestId: saved.id,
        action: "submitted",
        previousStatus: "draft",
        newStatus: "submitted",
      },
    });
  }

  revalidatePath("/employee");
  redirect(`/employee/${saved.id}`);
}

// Drafts only -- once a request has been submitted, its record is part of
// the audit trail and shouldn't disappear.
export async function deleteDraftRequest(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "employee") {
    throw new Error("Unauthorized");
  }
  const existing = await prisma.expenseRequest.findUnique({ where: { id } });
  if (!existing || existing.submitterId !== session.user.id) {
    throw new Error("Request not found.");
  }
  if (existing.status !== "draft") {
    throw new Error("Only draft requests can be deleted.");
  }
  await prisma.expenseRequest.delete({ where: { id } });
  revalidatePath("/employee");
  redirect("/employee");
}
