import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import { resolveSentryRuntimeConfig } from "../config/sentry-config";

const FORBIDDEN_KEY = /(authorization|cookie|token|secret|password|phone|email|tenant|iban|account|card|wallet|ledger|message|document|latitude|longitude)/i;

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
  const config = resolveSentryRuntimeConfig();
  if (!config.dsn) {
    console.log("[sentry] disabled: EXPO_PUBLIC_SENTRY_DSN not set");
    return;
  }

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    // EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE is resolved only by the config layer.
    tracesSampleRate: config.tracesSampleRate,
    initialScope: {
      tags: {
        surface: typeof extra?.["appKey"] === "string" ? extra["appKey"] : "app-partner",
        appLine: typeof extra?.["appLine"] === "string" ? extra["appLine"] : "next",
      },
    },
    beforeBreadcrumb(breadcrumb) {
      const sanitized = { ...breadcrumb };
      if (FORBIDDEN_KEY.test(breadcrumb.category || "")) sanitized.message = "[Filtered]";
      const data = scrubRecord(breadcrumb.data);
      if (data) sanitized.data = data;
      else delete sanitized.data;
      return sanitized;
    },
    beforeSend(event) {
      if (event.user?.id) event.user = { id: event.user.id };
      else delete event.user;

      const extraData = scrubRecord(event.extra);
      if (extraData) event.extra = extraData;
      else delete event.extra;

      if (event.request) {
        const safeUrl = sanitizeUrl(event.request.url);
        if (safeUrl) event.request.url = safeUrl;
        else delete event.request.url;
        const request = event.request as unknown as Record<string, unknown>;
        for (const key of ["data", "cookies", "env", "headers"]) delete request[key];
      }
      return event;
    },
  });
}
