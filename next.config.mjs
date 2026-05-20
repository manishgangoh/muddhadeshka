/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure files read at runtime via fs (config/sources.json, public/logo.png)
  // are bundled into the serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./config/**", "./public/logo.png"],
  },
};

export default nextConfig;
