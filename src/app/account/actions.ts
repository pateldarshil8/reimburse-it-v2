"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateMfaSecret,
  buildOtpAuthUrl,
  generateQrCodeDataUrl,
  verifyTotpCode,
  encryptMfaSecret,
  generateBackupCodes,
  hashBackupCode,
} from "@/lib/mfa";
import { logAuthEvent } from "@/lib/auth-audit";
import { getClientIp, getUserAgent } from "@/lib/request-context";

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required.");
  }
  return session.user;
}

export type MfaSetupInit = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
};

// Step 1 of enrollment: generate a candidate secret and its QR code. Not
// persisted yet -- it only becomes real once confirmMfaSetup verifies the
// user actually scanned it and can produce a valid code from it. Passed
// back to the client and round-tripped through a hidden form field; it
// isn't meaningfully secret at this point since MFA isn't enabled yet and
// the whole exchange already requires an authenticated session.
export async function generateMfaSetupInit(): Promise<MfaSetupInit> {
  const user = await requireUser();
  const secret = generateMfaSecret();
  const otpauthUrl = buildOtpAuthUrl(user.email!, secret);
  const qrDataUrl = await generateQrCodeDataUrl(otpauthUrl);
  return { secret, otpauthUrl, qrDataUrl };
}

export type ConfirmMfaState = {
  error?: string;
  backupCodes?: string[];
};

// Step 2: the user submits the code their app produced for the secret from
// step 1. Only on success is anything written to the database.
export async function confirmMfaSetup(
  _prevState: ConfirmMfaState | undefined,
  formData: FormData
): Promise<ConfirmMfaState> {
  const user = await requireUser();
  const secret = formData.get("secret") as string | null;
  const code = formData.get("code") as string | null;
  const ip = await getClientIp();
  const userAgent = await getUserAgent();

  if (!secret || !code) {
    return { error: "Missing setup data. Start over." };
  }

  const valid = await verifyTotpCode(code, secret);
  if (!valid) {
    return { error: "That code didn't match. Check your app and try again." };
  }

  const backupCodes = generateBackupCodes();
  const backupCodeHashes = await Promise.all(backupCodes.map(hashBackupCode));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaSecretEncrypted: encryptMfaSecret(secret),
        mfaEnabledAt: new Date(),
      },
    }),
    prisma.mfaBackupCode.deleteMany({ where: { userId: user.id } }),
    prisma.mfaBackupCode.createMany({
      data: backupCodeHashes.map((codeHash) => ({ userId: user.id, codeHash })),
    }),
  ]);

  await logAuthEvent({ event: "mfa_enabled", userId: user.id, email: user.email, ip, userAgent });

  revalidatePath("/account");
  return { backupCodes };
}

export type DisableMfaState = { error?: string };

// Requires the current password to disable -- an already-open session
// shouldn't be enough on its own to strip a security control, the same
// reasoning as requiring re-auth for other sensitive account changes.
export async function disableMfa(
  _prevState: DisableMfaState | undefined,
  formData: FormData
): Promise<DisableMfaState> {
  const sessionUser = await requireUser();
  const password = formData.get("password") as string | null;
  const ip = await getClientIp();
  const userAgent = await getUserAgent();

  if (!password) {
    return { error: "Enter your password to confirm." };
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) {
    return { error: "Account not found." };
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return { error: "Incorrect password." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecretEncrypted: null, mfaEnabledAt: null },
    }),
    prisma.mfaBackupCode.deleteMany({ where: { userId: user.id } }),
  ]);

  await logAuthEvent({ event: "mfa_disabled", userId: user.id, email: user.email, ip, userAgent });

  revalidatePath("/account");
  return {};
}
