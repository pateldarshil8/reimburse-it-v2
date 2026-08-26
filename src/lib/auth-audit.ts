import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client/client";

export type AuthEventInput = {
  event: Prisma.AuthAuditCreateInput["event"];
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detail?: string | null;
};

// Best-effort logging: a failure to write an audit row must never block or
// fail the login/MFA/reset flow it's describing -- that would turn an
// observability feature into an availability bug. Errors are swallowed
// (and reported to the server console, which Vercel captures) rather than
// thrown.
export async function logAuthEvent(input: AuthEventInput): Promise<void> {
  try {
    await prisma.authAudit.create({
      data: {
        event: input.event,
        userId: input.userId ?? null,
        email: input.email ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        detail: input.detail ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write AuthAudit event:", input.event, err);
  }
}
