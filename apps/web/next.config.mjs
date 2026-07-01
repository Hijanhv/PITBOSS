/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Consume the generated TS bindings straight from source (Turborepo internal
  // packages) — no separate build step needed for dev or Vercel.
  transpilePackages: [
    "@pitboss/factory",
    "@pitboss/market",
    "@pitboss/oracle",
    "@pitboss/treasury",
  ],
};

export default nextConfig;
