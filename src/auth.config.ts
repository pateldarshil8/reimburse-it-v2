import type { NextAuthConfig } from "next-auth";

export type AppRole = "employee" | "reviewer" | "admin";

export const ROLE_HOME: Record<AppRole, string> = {
  employee: "/employee",
  reviewer: "/reviewer",
  admin: "/admin",
};

const ROLE_PREFIXES: Record<AppRole, string> = {
  employee: "/employee",
  reviewer: "/reviewer",
  admin: "/admin",
};

function roleForPath(pathname: string): AppRole | null {
  for (const role of Object.keys(ROLE_PREFIXES) as AppRole[]) {
    if (pathname.startsWith(ROLE_PREFIXES[role])) return role;
  }
  return null;
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: AppRole }).role;
        token.id = (user as { id: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as AppRole;
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role as AppRole | undefined;

      const requiredRole = roleForPath(nextUrl.pathname);

      if (requiredRole) {
        if (!isLoggedIn) return false;
        if (role !== requiredRole) {
          return Response.redirect(
            new URL(role ? ROLE_HOME[role] : "/login", nextUrl)
          );
        }
        return true;
      }

      if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
        return Response.redirect(
          new URL(role ? ROLE_HOME[role] : "/employee", nextUrl)
        );
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
