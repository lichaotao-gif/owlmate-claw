import type { NextConfig } from 'next';

const configuredBasePath = process.env.PUBLIC_BASE_PATH?.trim() ?? '';
const publicBasePath =
  configuredBasePath && configuredBasePath !== '/'
    ? `/${configuredBasePath.replace(/^\/+|\/+$/g, '')}`
    : '';

const nextConfig: NextConfig = {
  output: 'export',
  ...(publicBasePath ? { assetPrefix: publicBasePath } : {}),
};

export default nextConfig;
