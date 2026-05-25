import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Standalone output — produces a self-contained .next/standalone directory
  // that Electron can spawn directly. Required for the desktop app bundle.
  output: "standalone",

  // Make sure file-tracing includes the Prisma engines and the better-sqlite3
  // native binding — without these, the standalone build won't run.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**",
      "./node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/**",
      "./node_modules/.prisma/client/**",
      "./node_modules/@prisma/client/**",
      "./node_modules/@prisma/engines/**",
      "./node_modules/better-sqlite3/build/Release/**",
    ],
  },

  // outputFileTracingRoot needs to point at the monorepo root in pnpm setups
  // — otherwise next traces only the local workspace.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
