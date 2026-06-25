import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      "react-native": path.resolve(__dirname, "node_modules/react-native-web").replace(/\\/g, "/"),
      "react-native-web": path.resolve(__dirname, "node_modules/react-native-web").replace(/\\/g, "/"),
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "react-native$": "react-native-web",
    };
    return config;
  },
};

export default nextConfig;
