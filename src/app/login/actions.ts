"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getClientIp, getUserAgent } from "@/lib/request-context";
import { LOCKOUT_MINUTES } from "@/lib/login-security";

export type LoginState = {
  error?: string;
  mfaRequired?: boolean;
};

export async function loginAction(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const code = formData.get("code");

  const ip = await getClientIp();
  const userAgent = await getUserAgent();

  try {
    await signIn("credentials", {
      email,
      password,
      code: code || undefined,
      ip,
      userAgent,
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      const code = (error as { code?: string }).code;

      if (code === "mfa_required") {
        // Not an error -- password was correct. Tell the form to render
        // the authentication-code step instead of showing a failure.
        return { mfaRequired: true };
      }
      if (code === "invalid_mfa_code") {
        return { mfaRequired: true, error: "Invalid authentication code. Please try again." };
      }
      if (code === "account_deactivated") {
        return { error: "Account Deactivated, Contact System Admin." };
      }
      if (code === "account_locked") {
        return {
          error: `Too many failed attempts. This account is temporarily locked for ${LOCKOUT_MINUTES} minutes.`,
        };
      }
      if (code === "too_many_attempts") {
        return { error: "Too many login attempts from this network. Please try again later." };
      }
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
