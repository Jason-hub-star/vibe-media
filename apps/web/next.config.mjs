/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@vibehub/backend",
    "@vibehub/content-contracts",
    "@vibehub/design-tokens",
    "@vibehub/ui-patterns",
    "@vibehub/media-engine"
  ]
};

export default nextConfig;
