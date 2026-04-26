/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure no SSR for client-only canvas code
  reactStrictMode: false,
};
export default nextConfig;
