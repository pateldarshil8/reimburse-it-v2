import { headers } from "next/headers";

// Server Actions don't receive the raw Request object, so this reads the
// same headers Vercel's edge network sets on every inbound request.
// x-forwarded-for can contain a comma-separated chain (client, proxy1,
// proxy2, ...) when multiple hops are involved -- the first entry is the
// original client. This is trusted here because Vercel's own edge network
// sets/overwrites it; it would NOT be safe to trust on a deployment where
// an attacker could reach the app directly and forge the header themselves.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return h.get("x-real-ip") ?? "unknown";
}

export async function getUserAgent(): Promise<string> {
  const h = await headers();
  return h.get("user-agent") ?? "unknown";
}

export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
