import "@harvverse-monorepo/env/web";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Accel-Buffering", value: "no" }],
      },
    ];
  },
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
