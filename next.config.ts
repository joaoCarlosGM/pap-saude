import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: process.env.PAP_FIRST_ACCESS_E2E === "1" ? false : undefined,
  distDir:
    process.env.PAP_FIRST_ACCESS_E2E === "1" ? ".next-first-access" : ".next",
  // Invitation URLs contain one-time tokens; never log request query strings.
  logging: { incomingRequests: false, browserToTerminal: false },
};

export default nextConfig;
