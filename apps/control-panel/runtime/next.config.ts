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
      // @expo/vector-icons/Ionicons pulls in expo-font → expo-modules-core →
      // TurboModuleRegistry (native-only) and loads .ttf font files — none of
      // which Turbopack can handle on web. Stub it out so the dependency chain
      // is never entered. Icons render as nothing on the web control panel.
      // Note: Turbopack on Windows does not support absolute paths in resolveAlias,
      // so we use a relative path from the project root (next.config.ts location).
      "@expo/vector-icons/Ionicons": "./stubs/ionicons-stub.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "react-native$": "react-native-web",
      "@expo/vector-icons/Ionicons": require.resolve("./stubs/ionicons-stub.js"),
    };
    return config;
  },
};

export default nextConfig;
