/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@youngro/feature-chat", "@youngro/ui", "@youngro/feature-card"],
  // Work around WasmHash issue in webpack by forcing a stable hash function
  // Note: This is ignored by Turbopack and causes a warning. Uncomment if using webpack.
  webpack: (config) => {
    if (!config.output) config.output = {};
    // Use a Node crypto hash to avoid the webpack WasmHash path in this environment.
    config.output.hashFunction = "sha256";
    return config;
  },
};

export default nextConfig;
