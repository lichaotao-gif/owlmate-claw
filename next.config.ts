import type { NextConfig } from 'next';

const tencentStatic = process.env.TENCENT_STATIC === '1';

const nextConfig: NextConfig = {
  output: 'export',
  ...(tencentStatic
    ? {
        assetPrefix: '/owlmate-claw',
      }
    : {}),
};

export default nextConfig;
