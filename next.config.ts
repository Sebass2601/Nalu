import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
