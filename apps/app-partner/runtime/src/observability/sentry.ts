import * as Sentry from "@sentry/react-native";

/**
 * No-op unless EXPO_PUBLIC_SENTRY_DSN is set. No source-map upload, no Expo
 * config plugin, no build-time secret — activation is documented in
 * governance/runbooks/JRN-SENTRY-ACTIVATION.md.
 */
export function initSentry(): void {
  const dsn = process.env["EXPO_PUBLIC_SENTRY_DSN"];
  if (!dsn) {
    console.log("[sentry] disabled: EXPO_PUBLIC_SENTRY_DSN not set");
    return;
  }
  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0,
  });
}
