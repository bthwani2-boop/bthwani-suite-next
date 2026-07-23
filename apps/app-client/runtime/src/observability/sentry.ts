import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

const FORBIDDEN_KEY = /(authorization|cookie|token|secret|password|phone|email|tenant|iban|account|card|wallet|ledger|message|document|latitude|longitude)/i;

function boundedSampleRate(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
}

function scrubRecord(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    sanitized[key] = FORBIDDEN_KEY.test(key) ? "[Filtered]" : entry;
  }
  return sanitized;
}

function sanitizeUrl(value: string | undefined): string | undefined {
  if (!value) return value;
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.split("?")[0]?.split("#")[0];
  }
}

/**
 * Technical crash reporting only. Identity, tenant, financial and message truth
 * remain in their sovereign services and are deliberately filtered here.
 */
export function initSentry(): void {
  const dsn = process.env["EXPO_PUBLIC_SENTRY_DSN"]?.trim();
  if (!dsn) {
    console.log("[sentry] disabled: EXPO_PUBLIC_SENTRY_DSN not set");
    return;
  }

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  Sentry.init({
    dsn,
    environment: process.env["EXPO_PUBLIC_APP_ENV"] || "development",
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    tracesSampleRate: boundedSampleRate(process.env["EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE"]),
    initialScope: {
      tags: {
        surface: typeof extra?.["appKey"] === "string" ? extra["appKey"] : "app-client",
        appLine: typeof extra?.["appLine"] === "string" ? extra["appLine"] : "next",
      },
    },
    beforeBreadcrumb(breadcrumb) {
      return {
        ...breadcrumb,
        message: FORBIDDEN_KEY.test(breadcrumb.category || "") ? "[Filtered]" : breadcrumb.message,
        data: scrubRecord(breadcrumb.data),
      };
    },
    beforeSend(event) {
      event.user = event.user?.id ? { id: event.user.id } : undefined;
      event.extra = scrubRecord(event.extra);
      if (event.request) {
        event.request.url = sanitizeUrl(event.request.url);
        event.request.data = undefined;
        event.request.cookies = undefined;
        event.request.env = undefined;
        event.request.headers = undefined;
      }
      return event;
    },
  });
}
