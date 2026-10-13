import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Monorepo root (silences "inferred workspace root" warning from stray
  // lockfiles outside the repo).
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
