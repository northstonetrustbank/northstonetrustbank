// Creates the private storage buckets. Run with: npx tsx prisma/setup-storage.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const KYC = process.env.SUPABASE_KYC_BUCKET ?? "kyc-documents";
const DEPOSIT = process.env.SUPABASE_DEPOSIT_BUCKET ?? "deposit-proofs";
const APPLICATION = process.env.SUPABASE_APPLICATION_BUCKET ?? "application-documents";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

async function main() {
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const bucket of [KYC, DEPOSIT, APPLICATION]) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: false,
      allowedMimeTypes: ALLOWED,
      fileSizeLimit: "8MB",
    });
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Failed to create ${bucket}: ${error.message}`);
    }
    console.log(`Bucket ready (private): ${bucket}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
