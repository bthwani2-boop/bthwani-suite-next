"use strict";

const fs = require("fs");
const path = require("path");

function appEnvSuffix(appKey) {
  return appKey.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
}

function optionalString(value) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function firstEnvironmentValue(environment, names) {
  for (const name of names) {
    const value = optionalString(environment[name]);
    if (value) return value;
  }
  return undefined;
}

function scopedNames(baseName, appKey, aliases = []) {
  const suffix = appEnvSuffix(appKey);
  return [
    `${baseName}_${suffix}`,
    ...aliases.map((alias) => `${alias}_${suffix}`),
    baseName,
    ...aliases,
  ];
}

function resolveGoogleServicesFile(appKey, environment = process.env) {
  const suffix = appEnvSuffix(appKey);

  // 1. App-specific environment variable (e.g. GOOGLE_SERVICES_JSON_APP_CLIENT)
  const scoped = optionalString(environment[`GOOGLE_SERVICES_JSON_${suffix}`]);
  if (scoped) {
    return path.resolve(scoped);
  }

  // 2. Common environment variable (GOOGLE_SERVICES_JSON)
  const common = optionalString(environment.GOOGLE_SERVICES_JSON);
  if (common) {
    return path.resolve(common);
  }

  // 3. secrets.local.mobile.json in project root
  const rootDir = path.resolve(__dirname, "../..");
  const secretsConfigPath = path.join(rootDir, "secrets.local.mobile.json");
  if (fs.existsSync(secretsConfigPath)) {
    try {
      const secretsData = JSON.parse(fs.readFileSync(secretsConfigPath, "utf8"));
      const customPath = optionalString(secretsData[appKey]);
      if (customPath && fs.existsSync(path.resolve(customPath))) {
        return path.resolve(customPath);
      }
    } catch {
      // Ignore parse errors in local secrets file
    }
  }

  // 4. Default path under C:\bthwani-secrets\firebase\<appKey>\google-services.json
  const defaultPath = path.join("C:", "bthwani-secrets", "firebase", appKey, "google-services.json");
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  return undefined;
}

function resolveSentryEnvironment(appKey, environment = process.env) {
  return {
    organization: firstEnvironmentValue(environment, scopedNames("SENTRY_ORG", appKey, ["BTHWANI_SENTRY_ORG"])),
    project: firstEnvironmentValue(environment, scopedNames("SENTRY_PROJECT", appKey, ["BTHWANI_SENTRY_PROJECT"])),
    authToken: firstEnvironmentValue(environment, scopedNames("SENTRY_AUTH_TOKEN", appKey, ["BTHWANI_SENTRY_AUTH_TOKEN"])),
    url: firstEnvironmentValue(environment, scopedNames("SENTRY_URL", appKey, ["BTHWANI_SENTRY_URL"])),
    dsn: firstEnvironmentValue(
      environment,
      scopedNames("EXPO_PUBLIC_SENTRY_DSN", appKey, ["BTHWANI_SENTRY_DSN"]),
    ),
    appEnvironment: firstEnvironmentValue(
      environment,
      scopedNames("EXPO_PUBLIC_APP_ENV", appKey, ["BTHWANI_APP_ENV"]),
    ) ?? "development",
    tracesSampleRate: firstEnvironmentValue(
      environment,
      scopedNames("EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", appKey, ["BTHWANI_SENTRY_TRACES_SAMPLE_RATE"]),
    ) ?? "0",
    debug: firstEnvironmentValue(
      environment,
      scopedNames("EXPO_PUBLIC_SENTRY_DEBUG", appKey, ["BTHWANI_SENTRY_DEBUG"]),
    ) ?? "false",
    startupProbe: firstEnvironmentValue(
      environment,
      scopedNames("EXPO_PUBLIC_SENTRY_STARTUP_PROBE", appKey, ["BTHWANI_SENTRY_STARTUP_PROBE"]),
    ) ?? "false",
  };
}

function withSentryEnvironmentForApp(appKey, environment = process.env) {
  const resolved = resolveSentryEnvironment(appKey, environment);
  const next = { ...environment };
  const assignments = {
    SENTRY_ORG: resolved.organization,
    SENTRY_PROJECT: resolved.project,
    SENTRY_AUTH_TOKEN: resolved.authToken,
    SENTRY_URL: resolved.url,
    EXPO_PUBLIC_SENTRY_DSN: resolved.dsn,
    EXPO_PUBLIC_APP_ENV: resolved.appEnvironment,
    EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: resolved.tracesSampleRate,
    EXPO_PUBLIC_SENTRY_DEBUG: resolved.debug,
    EXPO_PUBLIC_SENTRY_STARTUP_PROBE: resolved.startupProbe,
  };

  for (const [name, value] of Object.entries(assignments)) {
    if (value !== undefined) next[name] = value;
    else delete next[name];
  }

  const googleServices = resolveGoogleServicesFile(appKey, environment);
  if (googleServices) {
    next.GOOGLE_SERVICES_JSON = googleServices;
  } else {
    delete next.GOOGLE_SERVICES_JSON;
  }

  return next;
}

module.exports = {
  appEnvSuffix,
  resolveGoogleServicesFile,
  resolveSentryEnvironment,
  withSentryEnvironmentForApp,
};
