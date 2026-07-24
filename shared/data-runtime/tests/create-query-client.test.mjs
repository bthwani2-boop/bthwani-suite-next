import assert from "node:assert/strict";
import test from "node:test";
import { createBthwaniQueryClient } from "../src/create-query-client.ts";

test("createBthwaniQueryClient sets conservative defaults", () => {
  const client = createBthwaniQueryClient();
  const defaults = client.getDefaultOptions().queries;
  assert.equal(defaults.staleTime, 30_000);
  assert.equal(defaults.refetchOnReconnect, true);
  assert.equal(defaults.refetchOnWindowFocus, false);
  assert.equal(typeof defaults.retry, "function");
});

test("createBthwaniQueryClient retry never retries 4xx", () => {
  const client = createBthwaniQueryClient();
  const retry = client.getDefaultOptions().queries.retry;
  assert.equal(retry(0, { kind: "http", status: 400 }), false);
  assert.equal(retry(0, { kind: "http", status: 503 }), true);
  assert.equal(retry(0, { kind: "network" }), true);
  assert.equal(retry(2, { kind: "network" }), false);
});
