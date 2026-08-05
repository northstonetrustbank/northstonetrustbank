import "server-only";
import { createClient } from "@supabase/supabase-js";

// Private Supabase Storage buckets for identity docs and deposit proofs.
// Files are never public — they're streamed through our own authorized routes.

export const KYC_BUCKET = process.env.SUPABASE_KYC_BUCKET ?? "kyc-documents";
export const DEPOSIT_BUCKET = process.env.SUPABASE_DEPOSIT_BUCKET ?? "deposit-proofs";
export const APPLICATION_BUCKET =
  process.env.SUPABASE_APPLICATION_BUCKET ?? "application-documents";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadFile(
  bucket: string,
  path: string,
  bytes: Buffer,
  contentType: string
) {
  const { error } = await adminClient()
    .storage.from(bucket)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
}

/**
 * Permanently removes files from a bucket. Used when an admin purges identity
 * documents after review — the bytes are gone, only the audit trail remains.
 */
export async function deleteFiles(bucket: string, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await adminClient().storage.from(bucket).remove(paths);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/** Returns the file bytes, or null if missing. */
export async function downloadFile(bucket: string, path: string): Promise<Buffer | null> {
  const { data, error } = await adminClient().storage.from(bucket).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
