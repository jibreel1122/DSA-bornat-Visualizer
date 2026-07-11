import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A stray package-lock.json in the user home dir otherwise makes Next
  // guess the wrong workspace root for file tracing.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
