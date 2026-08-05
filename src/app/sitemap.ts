import type { MetadataRoute } from "next";
import { COMMERCIAL_PRODUCTS, PERSONAL_PRODUCTS } from "@/lib/products";

const SITE = "https://northstonetrustbank.com";

// Public pages only — anything behind a login is deliberately left out.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFrequency: "monthly" },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" },
    { path: "/security", priority: 0.8, changeFrequency: "monthly" },
    // Every product in the catalogue gets a public page, so they are listed
    // from the catalogue rather than by hand.
    ...[...PERSONAL_PRODUCTS, ...COMMERCIAL_PRODUCTS].map((p) => ({
      path: `/products/${p.key}`,
      priority: 0.7,
      changeFrequency: "monthly" as const,
    })),
    { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
    { path: "/signup", priority: 0.7, changeFrequency: "monthly" },
    { path: "/login", priority: 0.4, changeFrequency: "yearly" },
    { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/e-consent", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/deposit-agreement", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
