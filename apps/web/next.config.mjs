/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
