export type SentryRuntimeConfig = {
  readonly dsn: string | undefined;
  readonly environment: string;
  readonly tracesSampleRate: number;
};

function boundedSampleRate(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
}

export function resolveSentryRuntimeConfig(): SentryRuntimeConfig {
  return {
    dsn: process.env["EXPO_PUBLIC_SENTRY_DSN"]?.trim(),
    environment: process.env["EXPO_PUBLIC_APP_ENV"]?.trim() || "development",
    tracesSampleRate: boundedSampleRate(
      process.env["EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE"],
    ),
  };
}
