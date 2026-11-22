/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  serverExternalPackages: ['sqlite3', 'pg']
};

export default nextConfig;
