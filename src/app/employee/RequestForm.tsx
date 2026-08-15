"use client";

import { useActionState } from "react";
import { saveExpenseRequest, deleteDraftRequest, type SaveRequestState } from "./actions";
import { CATEGORIES } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExistingRequest = {
  id: string;
  title: string;
  description: string;
  category: string;
  expenseDate: Date;
  // Prisma's Decimal type (for @db.Decimal fields) isn't string | number, but
  // it does implement toString(), which is all this form needs from it.
  totalAmount: { toString(): string };
  receiptName: string | null;
};

const initialState: SaveRequestState = {};

export function RequestForm({ existing }: { existing?: ExistingRequest }) {
  const [state, formAction, pending] = useActionState(saveExpenseRequest, initialState);

  const defaultDate = existing
    ? new Date(existing.expenseDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-5" encType="multipart/form-data">
      {existing && <input type="hidden" name="id" value={existing.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Printer paper and toner"
          defaultValue={existing?.title}
          required
          maxLength={200}
        />
        {state.fieldErrors?.title && (
          <p className="text-xs text-red-600">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Select name="category" defaultValue={existing?.category} required>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.category && (
            <p className="text-xs text-red-600">{state.fieldErrors.category}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expenseDate">Expense date</Label>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            defaultValue={defaultDate}
            max={new Date().toISOString().slice(0, 10)}
            required
          />
          {state.fieldErrors?.expenseDate && (
            <p className="text-xs text-red-600">{state.fieldErrors.expenseDate}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="totalAmount">Amount (USD)</Label>
        <Input
          id="totalAmount"
          name="totalAmount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          defaultValue={existing?.totalAmount?.toString()}
          required
        />
        {state.fieldErrors?.totalAmount && (
          <p className="text-xs text-red-600">{state.fieldErrors.totalAmount}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description / business justification</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="What was this expense for?"
          defaultValue={existing?.description}
          required
          maxLength={2000}
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-600">{state.fieldErrors.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="receipt">Receipt (JPEG, PNG, or PDF, up to 10MB)</Label>
        <Input id="receipt" name="receipt" type="file" accept=".jpg,.jpeg,.png,.pdf" />
        {existing?.receiptName && (
          <p className="text-xs text-neutral-500">
            Current receipt: {existing.receiptName}. Choose a new file to replace it.
          </p>
        )}
        {state.fieldErrors?.receipt && (
          <p className="text-xs text-red-600">{state.fieldErrors.receipt}</p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="submit"
          name="intent"
          value="draft"
          variant="outline"
          disabled={pending}
        >
          {pending ? "Saving..." : "Save as draft"}
        </Button>
        <Button type="submit" name="intent" value="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit for review"}
        </Button>
        {existing && (
          <form
            action={deleteDraftRequest.bind(null, existing.id)}
            className="ml-auto"
          >
            <Button type="submit" variant="ghost" className="text-red-600 hover:text-red-700">
              Delete draft
            </Button>
          </form>
        )}
      </div>
    </form>
  );
}
