import type { NextConfig } from "next";

function configuredOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const configuredApiOrigins = [
  process.env.NEXT_PUBLIC_DSH_API_BASE_URL,
  process.env.NEXT_PUBLIC_WLT_API_BASE_URL,
  process.env.NEXT_PUBLIC_IDENTITY_API_BASE_URL,
  process.env.NEXT_PUBLIC_WORKFORCE_API_BASE_URL,
  process.env.NEXT_PUBLIC_PLATFORM_CONTROL_API_BASE_URL,
  process.env.NEXT_PUBLIC_PROVIDERS_API_BASE_URL,
]
  .map(configuredOrigin)
  .filter((origin): origin is string => Boolean(origin));

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
  `connect-src 'self' ${[...configuredApiOrigins, ...developmentConnectSources].join(" ")}`.trim(),
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
