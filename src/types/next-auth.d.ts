import { DefaultSession } from "next-auth";
import type { AppRole } from "@/auth.config";

declare module "next-auth" {
  interface User {
    role: AppRole;
  }

  interface Session {
    user: {
      role: AppRole;
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: AppRole;
    id: string;
  }
}
