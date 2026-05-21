import "@harvverse-monorepo/env/web";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  experimental: {
    optimizePackageImports: [
      "@clerk/nextjs",
      "@clerk/ui",
      "@clerk/shared",
      "lucide-react",
      "@tanstack/react-query",
      "@harvverse-monorepo/ui",
    ],
  },
};

export default withNextIntl(nextConfig);
