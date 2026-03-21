/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@vibehub/content-contracts",
    "@vibehub/design-tokens",
    "@vibehub/ui-patterns"
  ]
};

export default nextConfig;
