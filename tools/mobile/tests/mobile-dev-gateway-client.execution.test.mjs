import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL(
  "../../../services/dsh/frontend/shared/_kernel/mobile-dev-gateway.ts",
  import.meta.url,
);
const {
  resolveMobileDevGatewayBaseUrl,
  resolveMobileDevGatewayCapability,
  rewriteMobileDevPresignedMediaUrl,
} = await import(moduleUrl.href);

const keys = [
  "EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL",
  "EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_TOKEN",
];
const original = new Map(keys.map((key) => [key, process.env[key]]));

test.afterEach(() => {
  for (const [key, value] of original) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("gateway client policy rejects public and loopback gateway origins", () => {
  process.env.EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL = "http://8.8.8.8:18110";
  assert.throws(() => resolveMobileDevGatewayBaseUrl(), /MOBILE_DEV_GATEWAY_BASE_URL_INVALID/);

  process.env.EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL = "http://127.0.0.1:18110";
  assert.throws(() => resolveMobileDevGatewayBaseUrl(), /MOBILE_DEV_GATEWAY_BASE_URL_INVALID/);
});

test("gateway client policy requires a per-run capability for developer sessions", () => {
  process.env.EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL = "http://192.168.1.20:18110";
  delete process.env.EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_TOKEN;
  assert.equal(resolveMobileDevGatewayBaseUrl(), "http://192.168.1.20:18110");
  assert.throws(() => resolveMobileDevGatewayCapability(), /MOBILE_DEV_GATEWAY_CAPABILITY_MISSING/);

  process.env.EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_TOKEN = "a".repeat(64);
  assert.equal(resolveMobileDevGatewayCapability(), "a".repeat(64));
});

test("only signed loopback MinIO URLs are rewritten through the mobile gateway", () => {
  process.env.EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL = "http://192.168.1.20:18110";
  process.env.EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_TOKEN = "b".repeat(64);
  const query = [
    "X-Amz-Algorithm=AWS4-HMAC-SHA256",
    "X-Amz-Credential=test%2Fscope",
    "X-Amz-Date=20260810T120000Z",
    "X-Amz-Expires=3600",
    "X-Amz-SignedHeaders=host",
    "X-Amz-Signature=abcdef",
  ].join("&");
  const originalUrl = `http://localhost:59000/dsh-media/a.jpg?${query}`;
  assert.equal(
    rewriteMobileDevPresignedMediaUrl(originalUrl),
    `http://192.168.1.20:18110/__media/dsh-media/a.jpg?${query}`,
  );
  assert.equal(
    rewriteMobileDevPresignedMediaUrl("https://cdn.example.com/a.jpg"),
    "https://cdn.example.com/a.jpg",
  );
  assert.equal(
    rewriteMobileDevPresignedMediaUrl("http://localhost:59000/dsh-media/a.jpg"),
    "http://localhost:59000/dsh-media/a.jpg",
  );
});
