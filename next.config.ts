import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root so an unrelated lockfile higher in the tree
  // (e.g. ~/package-lock.json) doesn't widen Next.js file tracing.
  outputFileTracingRoot: path.join(__dirname),
  // Let `next build` write to an alternate dir (BUILD_DIR) so verifying a build
  // locally doesn't clobber the running `next dev` server's `.next` (which would
  // 404 its CSS). Defaults to `.next`, so Vercel deploys are unaffected.
  distDir: process.env.BUILD_DIR || ".next",
};

export default nextConfig;
