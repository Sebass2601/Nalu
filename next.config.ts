import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build for the Hetzner deployment: `next build` emits
  // .next/standalone with a server.js and only the traced node_modules,
  // which is what deploy/Dockerfile packages. Vercel ignores this setting.
  output: "standalone",
  reactCompiler: true,
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ufs.sh",
        pathname: "/f/**",
      },
      // Where Google serves the avatar it hands us at OAuth sign-in. Without
      // this every Google user's picture throws instead of rendering, since
      // next/image refuses any host not listed here.
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
