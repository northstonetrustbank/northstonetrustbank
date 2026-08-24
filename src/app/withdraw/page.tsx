import { redirect } from "next/navigation";

/**
 * Money movement now lives on one tabbed page. This route is kept so links
 * already sent to clients by email — and any bookmark — still land in the
 * right place.
 */
export default async function WithdrawRedirect({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>;
}) {
  const { method } = await searchParams;
  redirect(`/transfers?tab=withdraw${method ? `&method=${method}` : ""}`);
}
