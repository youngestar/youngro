/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@youngro/feature-chat", "@youngro/ui", "@youngro/feature-card"],
  // Work around WasmHash issue in webpack by forcing a stable hash function
  // Note: This is ignored by Turbopack and causes a warning. Uncomment if using webpack.
  /*
  webpack: (config) => {
    if (!config.output) config.output = {};
    // Use a non-wasm hash to avoid TypeError in WasmHash.update under Node 22
    config.output.hashFunction = "xxhash64";
    return config;
  },
  */
};

export default nextConfig;
