import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaEnroll } from "./MfaEnroll";
import { MfaDisable } from "./MfaDisable";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true, mfaEnabledAt: true, name: true, email: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50">Account settings</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {user.name} &middot; {user.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Optional. When enabled, signing in requires a code from your
            authenticator app in addition to your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.mfaEnabled ? (
            <MfaDisable enabledAt={user.mfaEnabledAt ? formatDateTime(user.mfaEnabledAt) : "unknown"} />
          ) : (
            <MfaEnroll />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
