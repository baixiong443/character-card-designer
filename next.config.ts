import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  // 优化编译性能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['lucide-react', 'react-markdown'],
  },
  // 减少不必要的编译
  reactStrictMode: false,
};

export default nextConfig;
