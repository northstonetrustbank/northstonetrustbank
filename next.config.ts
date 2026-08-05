import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Identity checks submit three images in one request. Photos are shrunk in
    // the browser first (see components/file-field.tsx), so a typical set is
    // well under a megabyte; this leaves room for PDFs and multipart overhead
    // without going near the request body ceiling on serverless hosting.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
