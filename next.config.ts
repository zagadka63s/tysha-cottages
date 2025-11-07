// next.config.ts

const nextConfig = {
  eslint: {
    // не валить билд, если eslint нашёл ошибки
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
