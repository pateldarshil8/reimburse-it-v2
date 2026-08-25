"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PasswordSchema } from "@/lib/password";
import { hashResetToken } from "@/lib/password-reset-tokens";
import { logAuthEvent } from "@/lib/auth-audit";
import { getClientIp, getUserAgent } from "@/lib/request-context";

export type ResetPasswordState = { error?: string; success?: boolean };

const FormSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
});

export async function resetPassword(
  _prevState: ResetPasswordState | undefined,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = FormSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  const ip = await getClientIp();
  const userAgent = await getUserAgent();

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const tokenHash = hashResetToken(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  // Deliberately generic: an expired token, an already-used token, and a
  // token that never existed all produce the same message, so a guessed or
  // reused token can't be distinguished from a stale one.
  const invalidMsg = "This reset link is invalid or has expired. Request a new one.";

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
    await logAuthEvent({
      event: "password_reset_completed",
      ip,
      userAgent,
      detail: "invalid_or_expired_token",
    });
    return { error: invalidMsg };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        // A successful reset is a legitimate reason to clear any lockout
        // -- the person proved account ownership via the emailed link,
        // which is a stronger signal than the password they were locked
        // out for guessing.
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding reset tokens for this user so an
    // older, still-unused link can't also be redeemed after this one.
    prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null, id: { not: resetToken.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  await logAuthEvent({
    event: "password_reset_completed",
    userId: resetToken.userId,
    ip,
    userAgent,
  });

  return { success: true };
}
