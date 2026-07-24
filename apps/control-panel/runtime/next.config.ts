import type { NextConfig } from "next";

const developmentConnectSources =
  process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:*", "http://127.0.0.1:*", "ws:", "wss:"];
const developmentScriptSources =
  process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"];

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${developmentScriptSources.join(" ")}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob: http: https:",
  `connect-src 'self' ${developmentConnectSources.join(" ")}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    // Compile-time transport switch consumed only by shared frontend resolvers.
    // Upstream service URLs remain server-only inside src/server/bff-proxy.ts.
    NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED: "true",
  },
  transpilePackages: ["tamagui", "@tamagui/core", "@tamagui/config", "@bthwani/ui-kit"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
      "@expo/vector-icons/Ionicons": "./stubs/ionicons-stub.js",
      "@react-native-community/netinfo": "./stubs/netinfo-stub.js",
      "expo-image-picker": "./stubs/expo-image-picker-web.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "react-native$": "react-native-web",
      "@expo/vector-icons/Ionicons": require.resolve("./stubs/ionicons-stub.js"),
      "@react-native-community/netinfo": require.resolve("./stubs/netinfo-stub.js"),
      "expo-image-picker": require.resolve("./stubs/expo-image-picker-web.js"),
    };
    return config;
  },
};

export default nextConfig;
