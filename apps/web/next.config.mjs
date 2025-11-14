/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@youngro/chat-zustand",
    "@repo/ui",
    "@youngro/feature-youngro-card",
  ],
  // Work around WasmHash issue in webpack by forcing a stable hash function
  webpack: (config) => {
    if (!config.output) config.output = {};
    // Use a non-wasm hash to avoid TypeError in WasmHash.update under Node 22
    config.output.hashFunction = "xxhash64";
    return config;
  },
};

export default nextConfig;
