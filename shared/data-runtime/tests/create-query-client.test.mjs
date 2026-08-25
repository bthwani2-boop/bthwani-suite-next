import assert from "node:assert/strict";
import test from "node:test";
import { createBthwaniQueryClient } from "../src/create-query-client.ts";
import {
  FINANCIAL_QUERY_KEY_PREFIX,
  financialQueryKey,
  isFinancialQueryKey,
} from "../src/query-keys.ts";

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

test("financial query keys are detected by the reserved prefix", () => {
  const key = financialQueryKey("wlt", "wallet", "captain-1");
  assert.equal(key[0], FINANCIAL_QUERY_KEY_PREFIX);
  assert.equal(isFinancialQueryKey(key), true);
  assert.equal(isFinancialQueryKey(["dsh", "home-discovery"]), false);
  assert.equal(isFinancialQueryKey([]), false);
});

test("persistBthwaniQueryClient never dehydrates financial queries", async () => {
  const { persistBthwaniQueryClient } = await import("../src/persistence.ts");

  const stored = new Map();
  const storage = {
    getItem: async (key) => stored.get(key) ?? null,
    setItem: async (key, value) => void stored.set(key, value),
    removeItem: async (key) => void stored.delete(key),
    getAllKeys: async () => [...stored.keys()],
    multiRemove: async (keys) => void keys.forEach((k) => stored.delete(k)),
  };

  const client = createBthwaniQueryClient();
  const stop = persistBthwaniQueryClient(client, "test-cache-key", storage);
  await client.prefetchQuery({
    queryKey: ["dsh", "home-discovery"],
    queryFn: async () => ({ stores: ["store-1"] }),
  });
  await client.prefetchQuery({
    queryKey: financialQueryKey("wlt", "balance"),
    queryFn: async () => ({ availableBalanceMinorUnits: 999 }),
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  stop();

  const envelope = JSON.parse(stored.get("test-cache-key"));
  const persistedKeys = envelope.clientState.queries.map((q) => q.queryKey);
  assert.deepEqual(persistedKeys, [["dsh", "home-discovery"]]);
});
