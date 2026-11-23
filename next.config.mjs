/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  serverExternalPackages: ['sqlite3', 'pg'],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || 'https://unwpqxstbvjgkulfzpve.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'sb_publishable_Hk2A71-b1QlTmB5dnSog4A_f1E7kqZX'
  }
};

export default nextConfig;
