import type { MetadataRoute } from "next";

const SITE = "https://northstonetrustbank.com";

// Keep signed-in areas, admin and file downloads out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/account",
        "/activity",
        "/statements",
        "/product",
        "/apply",
        "/deposit",
        "/withdraw",
        "/send",
        "/transfer",
        "/goals",
        "/onboarding",
        "/verify",
        "/reset-password",
        "/api/",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
