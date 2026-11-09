/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  experimental: { cpus: 1 },
};

module.exports = nextConfig;
