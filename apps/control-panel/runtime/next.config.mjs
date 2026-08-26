import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Control Panel runtime configuration.
 *
 * Security headers (Content-Security-Policy, Referrer-Policy, etc.) are NOT
 * defined here. The single canonical writer for the governed security header
 * set is `src/middleware.ts`, which consumes `csp-policy.mjs`. Keeping
 * authority in one place lets tests assert against a real policy object and
 * lets the per-request nonce reach Next SSR through the request
 * `content-security-policy` header, which Next's app-render uses to nonify
 * its own bootstrap, polyfill and flight-data scripts.
 *
 * Font assets are served from this origin by `next/font/google` (self-hosted
 * at build time), so the CSP no longer needs to allowlist
 * `fonts.googleapis.com` / `fonts.gstatic.com`.
 *
 * @type {import('next').NextConfig}
 */
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
