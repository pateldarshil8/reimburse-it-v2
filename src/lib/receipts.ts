import { getReceiptSignedUrl } from "@/lib/supabase-storage";

// Resolves a stored receipt object path to a short-lived signed URL. Returns
// null (rather than throwing) if the path is missing or the object can't be
// found -- e.g. the demo/seed rows reference paths that were never actually
// uploaded to Supabase Storage. Callers should render a "not available"
// fallback rather than crash the page over a demo-data gap or a transient
// storage error.
export async function resolveReceiptUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    return await getReceiptSignedUrl(path);
  } catch (err) {
    console.error("Failed to generate receipt signed URL:", err);
    return null;
  }
}
