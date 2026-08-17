"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PasswordSchema } from "@/lib/password";

export type SignupState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

const SignupSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(100, "First name must be 100 characters or fewer."),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(100, "Last name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(200, "Email must be 200 characters or fewer."),
  password: PasswordSchema,
});

// Creates a pending AccountRequest -- not a real User yet. An admin reviews
// it on /admin (Account Requests tab) and either approves it (creating a
// real `employee`-role User) or rejects it. Backend-validated with the same
// PasswordSchema the client-side strength meter is built from, so a
// crafted request that skips the client entirely still can't create a
// weak-password request.
export async function submitAccountRequest(
  _prevState: SignupState | undefined,
  formData: FormData
): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
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

  const { firstName, lastName, email, password } = parsed.data;

  const [existingUser, existingRequest] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.accountRequest.findUnique({ where: { email } }),
  ]);

  if (existingUser) {
    const msg = "An account with this email already exists.";
    return { error: msg, fieldErrors: { email: msg } };
  }

  if (existingRequest) {
    if (existingRequest.status === "pending") {
      const msg = "A request for this email is already pending admin approval.";
      return { error: msg, fieldErrors: { email: msg } };
    }
    if (existingRequest.status === "rejected") {
      // Let a previously-rejected email try again rather than being
      // permanently locked out.
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.accountRequest.update({
        where: { id: existingRequest.id },
        data: {
          firstName,
          lastName,
          passwordHash,
          status: "pending",
          reviewedAt: null,
          reviewedById: null,
        },
      });
      return { success: true };
    }
    // "approved" without a matching User would mean stale/manually-edited
    // data; treat it the same as an existing account rather than erroring.
    const msg = "An account with this email already exists.";
    return { error: msg, fieldErrors: { email: msg } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.accountRequest.create({
    data: { firstName, lastName, email, passwordHash },
  });

  return { success: true };
}
