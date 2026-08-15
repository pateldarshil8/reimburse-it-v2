import { redirect } from "next/navigation";
import { auth } from "@/auth";

const ROLE_HOME: Record<string, string> = {
  employee: "/employee",
  reviewer: "/reviewer",
  admin: "/admin",
};

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(ROLE_HOME[session.user.role] ?? "/employee");
}
