import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig, type AppRole } from "@/auth.config";
import { prisma } from "@/lib/prisma";

// Thrown instead of returning null so loginAction (src/app/login/actions.ts)
// can show "Account Deactivated, Contact System Admin" instead of the
// generic "Invalid email or password" -- distinguished from other
// authorize() failures via `code`, checked in the catch block there.
export class AccountDeactivatedError extends CredentialsSignin {
  code = "account_deactivated";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Case/whitespace-insensitive lookup -- signup already stores email
        // lowercased/trimmed, so a login attempt typed with different
        // casing (e.g. autocapitalized on a phone keyboard) would otherwise
        // fail the exact-match Prisma lookup and surface as the generic
        // "Invalid email or password."
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Deactivated accounts (admin-managed, see /admin) can't sign in,
        // even with a correct password. Checked only after the password is
        // confirmed correct, so a wrong-password guess never reveals
        // whether a given account exists/is deactivated.
        if (user.accountStatus !== "active") {
          throw new AccountDeactivatedError();
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Overrides authConfig's edge-compatible session callback with a
    // Node-side version that re-reads the user's current role from the
    // database on every request. Without this, a role change made by an
    // admin wouldn't show up for an already-signed-in user until their next
    // login, because the JWT caches the role from the moment they signed
    // in. The edge middleware (src/proxy.ts) can't do this DB lookup itself
    // (no Prisma/pg at the edge), so role-scoped layouts additionally
    // re-check session.user.role at render time -- see
    // src/app/{employee,reviewer,admin}/layout.tsx.
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as AppRole;
        session.user.id = token.id as string;
        if (token.id) {
          const current = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (current) session.user.role = current.role;
        }
      }
      return session;
    },
  },
});
