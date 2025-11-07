// next.config.ts

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // говорим next'у: если где-то useSearchParams без Suspense — не падай на билде
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
