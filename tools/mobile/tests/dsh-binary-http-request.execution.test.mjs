import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL(
  "../../../services/dsh/frontend/shared/_kernel/dsh-binary-http-request.ts",
  import.meta.url,
);
const { createDshBinaryHttpClient } = await import(moduleUrl.href);

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("binary client preserves presigned URL, body and content type without DSH auth headers", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: 200 });
  };

  const body = new Blob(["image-bytes"], { type: "image/jpeg" });
  const url = "http://192.168.1.20:58110/__media/dsh-media/a.jpg?X-Amz-Signature=abc";
  const client = createDshBinaryHttpClient(5_000);
  const result = await client.put(url, body, "image/jpeg");

  assert.deepEqual(result, { ok: true, status: 200 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, url);
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(calls[0].init.body, body);
  assert.deepEqual(calls[0].init.headers, { "Content-Type": "image/jpeg" });
  assert.equal("Authorization" in calls[0].init.headers, false);
  assert.equal("X-Correlation-ID" in calls[0].init.headers, false);
});

test("binary client returns non-2xx status without inventing success", async () => {
  globalThis.fetch = async () => new Response(null, { status: 403 });
  const client = createDshBinaryHttpClient();
  const result = await client.put("https://storage.example.com/object?signed=1", new Blob(["x"]), "application/octet-stream");
  assert.deepEqual(result, { ok: false, status: 403 });
});

test("binary client normalizes transport failure as a network error", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("socket closed");
  };
  const client = createDshBinaryHttpClient();

  await assert.rejects(
    () => client.put("https://storage.example.com/object?signed=1", new Blob(["x"]), "application/octet-stream"),
    (error) => error?.kind === "network" && error?.message === "socket closed",
  );
});
