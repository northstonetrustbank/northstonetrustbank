import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Keeps the Supabase project awake.
 *
 * The free tier pauses a project after seven days without database activity,
 * and a paused project takes the whole bank down: sign-in fails, registration
 * returns a server error, the admin panel cannot load its queues. This has
 * already happened twice. Leaving it to somebody remembering to sign in every
 * week is not a control — it fails on the first holiday.
 *
 * A Vercel cron hits this once a day, which issues one query and resets the
 * seven-day clock with six days to spare.
 */
export async function GET() {
  // Vercel attaches this header automatically when CRON_SECRET is configured.
  // If the secret is not set we still answer: a keep-alive that quietly stops
  // working reintroduces exactly the outage it exists to prevent. The endpoint
  // reveals nothing and does one trivial read, so failing open is the safer
  // side to err on here.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = (await headers()).get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Any real query counts as activity. A count on a small table is the
    // cheapest one that still proves the database answered.
    await db.user.count();
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    // Surface it as a failure so the cron shows red in Vercel rather than
    // reporting success while the database is unreachable.
    console.error("keepalive: database unreachable", err);
    return NextResponse.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
