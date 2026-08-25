"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MINUTES } from "@/lib/password-reset-tokens";
import { isPasswordResetIpThrottled } from "@/lib/login-security";
import { logAuthEvent } from "@/lib/auth-audit";
import { getClientIp, getUserAgent, getOrigin } from "@/lib/request-context";
import { sendPasswordResetEmail } from "@/lib/email";

export type ForgotPasswordState = { submitted?: boolean; error?: string };

const EmailSchema = z.string().trim().toLowerCase().email();

// Always returns the same { submitted: true } shape regardless of whether
// the email matched an account, was throttled, or email delivery failed --
// the whole point of this flow is that a requester can never learn from
// the response whether a given email has an account. Real failures (email
// provider errors) are logged server-side, not surfaced to the caller.
export async function requestPasswordReset(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = EmailSchema.safeParse(formData.get("email"));
  const ip = await getClientIp();
  const userAgent = await getUserAgent();

  if (!parsed.success) {
    // Still generic -- an invalid email format gets the same response as a
    // valid-but-nonexistent one, just without doing any work.
    return { submitted: true };
  }
  const email = parsed.data;

  if (await isPasswordResetIpThrottled(ip)) {
    await logAuthEvent({ event: "password_reset_requested", email, ip, userAgent, detail: "ip_throttled" });
    return { submitted: true };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await logAuthEvent({ event: "password_reset_requested", email, ip, userAgent, detail: "unknown_email" });
    return { submitted: true };
  }

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  const origin = await getOrigin();
  const resetUrl = `${origin}/reset-password/${token}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }

  await logAuthEvent({ event: "password_reset_requested", userId: user.id, email, ip, userAgent });

  return { submitted: true };
}
