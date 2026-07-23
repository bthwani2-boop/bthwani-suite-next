import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveSentryEnvironment } = require("../mobile/sentry-env.js");

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const appKey = valueAfter("--app");
const profile = valueAfter("--profile") ?? "development";
if (!appKey) throw new Error("--app is required");
if (!["development", "internal", "production"].includes(profile)) {
  throw new Error("--profile must be development, internal, or production");
}

const sentry = resolveSentryEnvironment(appKey, process.env);
const missing = [];
if (!sentry.organization) missing.push("SENTRY_ORG");
if (!sentry.project) missing.push("SENTRY_PROJECT");
if (!sentry.dsn) missing.push("EXPO_PUBLIC_SENTRY_DSN");
if (!sentry.authToken) missing.push("SENTRY_AUTH_TOKEN");
if (!sentry.appEnvironment) missing.push("EXPO_PUBLIC_APP_ENV");

if (missing.length > 0) {
  throw new Error(`${appKey}: missing Sentry build configuration: ${missing.join(", ")}`);
}

let dsn;
try {
  dsn = new URL(sentry.dsn);
} catch {
  throw new Error(`${appKey}: EXPO_PUBLIC_SENTRY_DSN is not an absolute URL`);
}
if (!["http:", "https:"].includes(dsn.protocol) || !dsn.hostname || !dsn.pathname || dsn.pathname === "/") {
  throw new Error(`${appKey}: EXPO_PUBLIC_SENTRY_DSN is incomplete`);
}

const sampleRate = Number(sentry.tracesSampleRate);
if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
  throw new Error(`${appKey}: EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE must be between 0 and 1`);
}

const expectedEnvironment = profile === "internal" ? "preview" : profile;
if (sentry.appEnvironment !== expectedEnvironment) {
  throw new Error(`${appKey}: EXPO_PUBLIC_APP_ENV must be '${expectedEnvironment}' for profile '${profile}'`);
}

console.log(`PASS: ${appKey} Sentry build environment is complete for ${profile}; secrets were not printed`);
