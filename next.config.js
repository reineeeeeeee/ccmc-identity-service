// Services are only reachable through the API gateway. The gateway serves this app's static
// assets under /_ccms/identity so several Next.js apps can share one browser origin.
const assetPrefix = process.env.ASSET_PREFIX ?? '/_ccms/identity';

// The Accounts page needs the office list, which belongs to the Catalogue service. Behind the
// gateway /api/catalogue/* is routed for us; when Identity runs on its own, set
// CATALOGUE_SERVICE_URL (e.g. http://127.0.0.1:3003/api) and this forwards the calls to it.
const catalogueUrl = (process.env.CATALOGUE_SERVICE_URL ?? '').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: assetPrefix || undefined,
  serverExternalPackages: ['pg', 'typeorm'],
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  // The browser calls /api/identity/*. Behind the gateway that is already mapped to /api/*, and
  // when Identity runs on its own this rewrite does the same, so it works both ways.
  async rewrites() {
    const rules = [{ source: '/api/identity/:path*', destination: '/api/:path*' }];
    if (catalogueUrl) rules.push({ source: '/api/catalogue/:path*', destination: `${catalogueUrl}/:path*` });
    return rules;
  },
};

export default nextConfig;
