import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Tamagui packages use a "react-native" export condition in their package.json,
  // which Turbopack was resolving instead of "browser", causing it to load
  // native JS files that import from react-native (which has Flow syntax
  // that Turbopack's parser cannot handle).
  // transpilePackages ensures Next.js processes these packages so that
  // the resolveAlias (react-native → react-native-web) applies inside them.
  transpilePackages: ["tamagui", "@tamagui/core", "@tamagui/config", "@bthwani/ui-kit"],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
    // @ts-expect-error -- resolveConditions not yet in installed @types/next TurbopackOptions
    resolveConditions: ["browser"],
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
