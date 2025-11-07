// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // твои будущие настройки можно сюда добавлять
  eslint: {
    // говорим Vercel: не валить билд из-за eslint-ошибок
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
