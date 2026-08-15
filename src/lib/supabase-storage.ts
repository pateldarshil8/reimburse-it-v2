import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key, which bypasses
// Storage RLS. This is safe ONLY because every call site must already have
// verified the caller's authorization (via Auth.js session) before invoking
// these helpers -- the same trust model we use for direct Postgres access.
function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use receipt storage."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export const RECEIPTS_BUCKET = "receipts";
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

export async function uploadReceipt(
  path: string,
  file: Blob,
  contentType: string
) {
  const supabase = getServiceClient();
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

// Short-lived signed URL -- only call this after confirming the requesting
// user is authorized to view the associated expense request.
export async function getReceiptSignedUrl(path: string, expiresInSeconds = 300) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
