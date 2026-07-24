import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  resolveSentryEnvironment,
  withSentryEnvironmentForApp,
} = require("../../../../tools/mobile/sentry-env.js");
const { defineBthwaniExpoApp } = require("../../../../tools/mobile/defineBthwaniExpoApp.js");

test("app-scoped Sentry values override shared values", () => {
  const environment = {
    SENTRY_ORG: "shared-org",
    SENTRY_PROJECT: "shared-project",
    EXPO_PUBLIC_SENTRY_DSN: "https://shared@example.invalid/1",
    SENTRY_PROJECT_APP_CAPTAIN: "captain-project",
    EXPO_PUBLIC_SENTRY_DSN_APP_CAPTAIN: "https://captain@example.invalid/2",
    SENTRY_AUTH_TOKEN_APP_CAPTAIN: "captain-token",
  };

  const resolved = resolveSentryEnvironment("app-captain", environment);
  assert.equal(resolved.organization, "shared-org");
  assert.equal(resolved.project, "captain-project");
  assert.equal(resolved.dsn, "https://captain@example.invalid/2");
  assert.equal(resolved.authToken, "captain-token");

  const mapped = withSentryEnvironmentForApp("app-captain", environment);
  assert.equal(mapped.SENTRY_PROJECT, "captain-project");
  assert.equal(mapped.EXPO_PUBLIC_SENTRY_DSN, "https://captain@example.invalid/2");
  assert.equal(mapped.SENTRY_AUTH_TOKEN, "captain-token");
});

test("Expo config includes project metadata but never the Sentry auth token", () => {
  const previous = { ...process.env };
  try {
    process.env.SENTRY_ORG_APP_FIELD = "bthwani-org";
    process.env.SENTRY_PROJECT_APP_FIELD = "bthwani-field";
    process.env.SENTRY_AUTH_TOKEN_APP_FIELD = "must-not-enter-expo-config";
    process.env.EXPO_PUBLIC_SENTRY_DSN_APP_FIELD = "https://public@example.invalid/42";
    process.env.EXPO_PUBLIC_APP_ENV_APP_FIELD = "preview";
    process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE_APP_FIELD = "0.25";

    const config = defineBthwaniExpoApp("app-field");
    const sentryPlugin = config.plugins.find((plugin) =>
      Array.isArray(plugin) && plugin[0] === "@sentry/react-native/expo",
    );

    assert.deepEqual(sentryPlugin, [
      "@sentry/react-native/expo",
      { organization: "bthwani-org", project: "bthwani-field" },
    ]);
    assert.equal(config.extra.sentry.dsn, "https://public@example.invalid/42");
    assert.equal(config.extra.sentry.environment, "preview");
    assert.equal(config.extra.sentry.tracesSampleRate, "0.25");
    assert.equal(JSON.stringify(config).includes("must-not-enter-expo-config"), false);
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!Object.hasOwn(previous, key)) delete process.env[key];
    }
    Object.assign(process.env, previous);
  }
});
