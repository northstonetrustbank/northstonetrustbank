import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getLocale } from "@/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Northstone Trust Bank",
  description:
    "Personal banking, lending, and credit built on trust. Open an account with Northstone Trust Bank.",
};

/**
 * Money actions email the client as part of the same request, and each SMTP
 * send is a fresh authenticated TLS connection to Spacemail — measured at ~3.7s.
 * Sending money emails both sides, so a single action can legitimately need
 * ~8 seconds. The platform default would cut that off mid-transaction, which on
 * a bank means a ledger row written and no receipt sent. Set at the root so
 * every segment inherits it.
 */
export const maxDuration = 60;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
