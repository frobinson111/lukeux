/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel builds sometimes fail to resolve Next's internal ESLint parser in monorepo/workspace
  // installs. We run `next lint` separately, so don't block production builds on this.
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ['playwright-core'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize playwright-core to prevent bundling issues
      config.externals = config.externals || [];
      config.externals.push('playwright-core');
    }
    return config;
  },
};

export default nextConfig;
