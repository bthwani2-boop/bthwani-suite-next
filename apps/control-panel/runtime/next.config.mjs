import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const developmentConnectSources =
  process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:*", "http://127.0.0.1:*", "ws:", "wss:"];

const googleMapsScriptSources = [
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://*.google.com",
  "https://*.ggpht.com",
  "https://*.googleusercontent.com",
  "blob:",
];
const googleMapsConnectSources = [
  "https://*.googleapis.com",
  "https://*.google.com",
  "https://*.gstatic.com",
  "data:",
  "blob:",
];

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${googleMapsScriptSources.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: http: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' data: blob: http: https:",
  `connect-src 'self' ${developmentConnectSources.join(" ")} ${googleMapsConnectSources.join(" ")}`.trim(),
  "frame-src https://*.google.com",
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.0.100"],
  env: {
    // Compile-time transport switch consumed only by shared frontend resolvers.
    // Upstream service URLs remain server-only inside src/server/bff-proxy.ts.
    NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED: "true",
  },
  transpilePackages: [
    "tamagui",
    "@tamagui/core",
    "@tamagui/config",
    "@bthwani/ui-kit",
    "@bthwani/control-panel",
    "@bthwani/dsh",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    root: path.join(__dirname, "../../.."),
    resolveAlias: {
      "react-native": "react-native-web",
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
