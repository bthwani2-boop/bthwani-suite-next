import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { validateDshApiBaseUrl, resolveDshApiBaseUrl } = await import(
  "../dist/frontend/shared/_kernel/dsh-api-base-url.js"
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
});

describe("validateDshApiBaseUrl — accepts canonical DSH port", () => {
  test("accepts localhost:58080", () => {
    assert.equal(validateDshApiBaseUrl("http://localhost:58080"), true);
  });

  test("accepts 127.0.0.1:58080", () => {
    assert.equal(validateDshApiBaseUrl("http://127.0.0.1:58080"), true);
  });

  test("accepts production HTTPS URL without port restriction", () => {
    assert.equal(validateDshApiBaseUrl("https://api.example.com"), true);
  });

  test("accepts production URL with port 8080 (non-localhost)", () => {
    assert.equal(validateDshApiBaseUrl("https://api.example.com:8080"), true);
  });

  test("accepts IPv6 localhost canonical port", () => {
    assert.equal(validateDshApiBaseUrl("http://[::1]:58080"), true);
  });
});

describe("validateDshApiBaseUrl — rejects malformed URLs", () => {
  test("rejects empty string", () => {
    assert.equal(validateDshApiBaseUrl(""), false);
  });

  test("rejects plain hostname without protocol", () => {
    assert.equal(validateDshApiBaseUrl("localhost:58080"), false);
  });

  test("rejects garbage", () => {
    assert.equal(validateDshApiBaseUrl("not-a-url"), false);
  });
});

describe("resolveDshApiBaseUrl — defaults to canonical port", () => {
  test("fallback is http://localhost:58080", () => {
    const url = resolveDshApiBaseUrl();
    assert.ok(
      validateDshApiBaseUrl(url),
      `resolveDshApiBaseUrl() fallback must pass validateDshApiBaseUrl, got: ${url}`,
    );
    assert.ok(url.includes("58080"), `expected canonical port 58080 in fallback, got: ${url}`);
  });
});
