/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["googleapis"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  // Allow larger body sizes for video uploads
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export default nextConfig;
