import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

/**
 * Begins ID.me identity verification the only safe way: by sending the client
 * to ID.me's own site to sign in. Their ID.me password is entered on ID.me,
 * never on Northstone, and ID.me returns an authorization code — never the
 * password — to the callback.
 *
 * The client id and secret are issued by ID.me to Northstone. Until they are in
 * the environment, the button lands back on the tax page with a note that an
 * account manager will complete verification; it never falls back to asking
 * for the ID.me password here.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const clientId = process.env.IDME_CLIENT_ID;
  const redirectUri = process.env.IDME_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    // Not configured yet — do not invent a credential field. Send them back
    // with the honest state.
    return NextResponse.redirect(new URL("/tax-refund?idme=pending", request.url));
  }

  const authorize = new URL("https://api.id.me/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "identity");
  // Ties the returning code to this client; the callback checks it.
  authorize.searchParams.set("state", user.id);

  return NextResponse.redirect(authorize.toString());
}
