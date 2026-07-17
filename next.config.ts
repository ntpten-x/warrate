import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "moneychat.co.th",
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "expo-sqlite": false,
      "react-native-sqlite-storage": false,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      "expo-sqlite": "./src/lib/empty.ts",
      "react-native-sqlite-storage": "./src/lib/empty.ts",
    },
  } as any,
  outputFileTracingIncludes: {
    "**/*": [
      "./node_modules/pg-cloudflare/**/*",
      "./node_modules/expo-sqlite/**/*"
    ]
  },
};

export default nextConfig;
