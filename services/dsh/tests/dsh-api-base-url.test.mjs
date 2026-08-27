import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  validateDshApiBaseUrl,
  resolveDshApiBaseUrl,
  resolveDshLocalRuntimeHost,
} = await import(
  "../dist/services/dsh/frontend/shared/_kernel/dsh-api-base-url.js"
);

describe("validateDshApiBaseUrl — rejects old ports on localhost", () => {
  test("rejects localhost:8080", () => {
    assert.equal(validateDshApiBaseUrl("http://localhost:8080"), false);
  });

  test("rejects localhost:8081", () => {
    assert.equal(validateDshApiBaseUrl("http://localhost:8081"), false);
  });

  test("rejects localhost:8082", () => {
    assert.equal(validateDshApiBaseUrl("http://localhost:8082"), false);
  });

  test("rejects localhost:8083", () => {
    assert.equal(validateDshApiBaseUrl("http://localhost:8083"), false);
  });

  test("rejects localhost:8084", () => {
    assert.equal(validateDshApiBaseUrl("http://localhost:8084"), false);
  });

  test("rejects localhost:3000", () => {
    assert.equal(validateDshApiBaseUrl("http://localhost:3000"), false);
  });

  test("rejects 127.0.0.1:8080", () => {
    assert.equal(validateDshApiBaseUrl("http://127.0.0.1:8080"), false);
  });

  test("rejects 127.0.0.1:3000", () => {
    assert.equal(validateDshApiBaseUrl("http://127.0.0.1:3000"), false);
  });

  test("rejects IPv6 localhost old port", () => {
    assert.equal(validateDshApiBaseUrl("http://[::1]:8084"), false);
  });

  test("still rejects old device port when adb reverse is declared", () => {
    assert.equal(validateDshApiBaseUrl("http://127.0.0.1:8080", true, true), false);
  });
});

describe("validateDshApiBaseUrl — accepts canonical DSH port", () => {
  test("accepts localhost:18080", () => {
    assert.equal(validateDshApiBaseUrl("http://localhost:18080"), true);
  });

  test("accepts 127.0.0.1:18080", () => {
    assert.equal(validateDshApiBaseUrl("http://127.0.0.1:18080"), true);
  });

  test("accepts production HTTPS URL without port restriction", () => {
    assert.equal(validateDshApiBaseUrl("https://api.example.com"), true);
  });

  test("accepts production URL with port 8080 (non-localhost)", () => {
    assert.equal(validateDshApiBaseUrl("https://api.example.com:8080"), true);
  });

  test("accepts IPv6 localhost canonical port", () => {
    assert.equal(validateDshApiBaseUrl("http://[::1]:18080"), true);
  });
});

describe("validateDshApiBaseUrl — native Android transport", () => {
  test("rejects physical-device loopback without an explicit bridge", () => {
    assert.equal(validateDshApiBaseUrl("http://127.0.0.1:18080", true, false), false);
  });

  test("accepts physical-device loopback after adb reverse is verified", () => {
    assert.equal(validateDshApiBaseUrl("http://127.0.0.1:18080", true, true), true);
  });

  test("accepts the Android emulator host bridge", () => {
    assert.equal(validateDshApiBaseUrl("http://10.0.2.2:18080", true, false), true);
  });

  test("accepts a non-local production endpoint on a device", () => {
    assert.equal(validateDshApiBaseUrl("https://api.example.com", true, false), true);
  });
});

describe("validateDshApiBaseUrl — rejects malformed URLs", () => {
  test("rejects empty string", () => {
    assert.equal(validateDshApiBaseUrl(""), false);
  });

  test("rejects plain hostname without protocol", () => {
    assert.equal(validateDshApiBaseUrl("localhost:18080"), false);
  });

  test("rejects garbage", () => {
    assert.equal(validateDshApiBaseUrl("not-a-url"), false);
  });
});

describe("resolveDshLocalRuntimeHost — canonical broker/API host", () => {
  test("uses loopback outside a React Native runtime", () => {
    assert.equal(resolveDshLocalRuntimeHost(), "127.0.0.1");
  });

  test("broker adapter delegates host selection to the shared resolver", () => {
    const broker = readFileSync(new URL(
      "../frontend/shared/session/dev-session-broker.adapter.ts",
      import.meta.url,
    ), "utf8");
    assert.match(broker, /resolveDshLocalRuntimeHost/);
    assert.doesNotMatch(broker, /10\.0\.2\.2|Platform\.OS/);
  });
});

describe("resolveDshApiBaseUrl — defaults to canonical port", () => {
  test("fallback is http://localhost:18080", () => {
    const url = resolveDshApiBaseUrl();
    assert.ok(
      validateDshApiBaseUrl(url),
      `resolveDshApiBaseUrl() fallback must pass validateDshApiBaseUrl, got: ${url}`,
    );
    assert.ok(url.includes("18080"), `expected canonical port 18080 in fallback, got: ${url}`);
  });
});
