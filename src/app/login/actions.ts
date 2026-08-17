"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // AccountDeactivatedError (src/auth.ts) sets a distinguishing `code`
      // so this message can differ from the generic bad-credentials case.
      if ((error as { code?: string }).code === "account_deactivated") {
        return { error: "Account Deactivated, Contact System Admin." };
      }
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
