/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@youngro/chat-zustand",
    "@repo/ui",
    "@youngro/feature-youngro-card",
  ],
};

export default nextConfig;
