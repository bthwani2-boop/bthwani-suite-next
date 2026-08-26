/**
 * Bthwani mutation identity scope — negative-space tests.
 *
 * The scope guard exists so that mutation identity cannot leak
 * across actor, installation, or entity boundaries. These tests
 * pin the negative behaviors that the storage contract relies on.
 */

import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  MutationIdentityPersistenceError,
  MutationIdentityScopeError,
  assertScopeMatches,
  normalizeMutationIdentityScope,
  resolveMutationIdentityScope,
} from "../src/mutation-identity-scope.ts";
import {
  resetBthwaniCurrentActor,
  setBthwaniCurrentActor,
} from "../src/current-actor.ts";
import {
  bthwaniDurableStorage,
  configureBthwaniDurableStorage,
  BthwaniDurableWriteError,
  BthwaniDurableRemoveError,
} from "../src/storage-adapter.ts";

afterEach(() => {
  resetBthwaniCurrentActor();
  configureBthwaniDurableStorage({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  });
});

function memoryDurable() {
  const map = new Map();
  return {
    map,
    adapter: {
      getItem: async (key) => map.has(key) ? map.get(key) : null,
      setItem: async (key, value) => { map.set(key, value); },
      removeItem: async (key) => { map.delete(key); },
      getAllKeys: async () => [...map.keys()],
      multiRemove: async (keys) => { for (const key of keys) map.delete(key); },
    },
  };
}

test("normalize rejects blank actor and installation", () => {
  assert.throws(
    () => normalizeMutationIdentityScope({ actorId: " ", installationId: "   " }),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "missing_actor",
  );
  assert.throws(
    () => normalizeMutationIdentityScope({ actorId: "actor-1", installationId: "" }),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "missing_installation",
  );
});

test("assertScopeMatches refuses cross-actor reuse", () => {
  const stored = { actorId: "actor-A", installationId: "install-1", entityId: "x" };
  assert.throws(
    () => assertScopeMatches(stored, { actorId: "actor-B", installationId: "install-1" }),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "actor_mismatch",
  );
});

test("assertScopeMatches refuses cross-installation reuse", () => {
  const stored = { actorId: "actor-A", installationId: "install-1", entityId: "x" };
  assert.throws(
    () => assertScopeMatches(stored, { actorId: "actor-A", installationId: "install-2" }),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "installation_mismatch",
  );
});

test("assertScopeMatches refuses cross-entity reuse", () => {
  const stored = { actorId: "actor-A", installationId: "install-1", entityId: "order-1" };
  assert.throws(
    () => assertScopeMatches(stored, { actorId: "actor-A", installationId: "install-1", entityId: "order-2" }),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "entity_mismatch",
  );
});

test("resolveMutationIdentityScope throws when no actor is bound", async () => {
  await assert.rejects(
    resolveMutationIdentityScope(""),
    (error) => error instanceof MutationIdentityScopeError && error.reason === "missing_actor",
  );
});

test("resolveMutationIdentityScope returns the current binding when no override is given", async () => {
  const { adapter, map } = memoryDurable();
  configureBthwaniDurableStorage(adapter);
  const installationIdModule = await import("../src/installation-id.ts");
  const installationId = await installationIdModule.getBthwaniInstallationId();
  assert.equal(map.size, 1, "installation id is persisted on first read");
  setBthwaniCurrentActor({ actorId: "actor-A", installationId });
  const resolved = await resolveMutationIdentityScope("");
  assert.equal(resolved.actorId, "actor-A");
  assert.equal(resolved.installationId, installationId);
});

test("resolveMutationIdentityScope fails closed when the actor id is non-empty but unmatched", async () => {
  const { adapter } = memoryDurable();
  configureBthwaniDurableStorage(adapter);
  setBthwaniCurrentActor({ actorId: "actor-A", installationId: "install-1" });
  const resolved = await resolveMutationIdentityScope("actor-B");
  assert.equal(resolved.actorId, "actor-B", "explicit actor id always wins over the binding");
});

test("MutationIdentityPersistenceError preserves key and cause", () => {
  const error = new MutationIdentityPersistenceError("k", new Error("quota"));
  assert.equal(error.code, "MUTATION_IDENTITY_PERSISTENCE_FAILED");
  assert.equal(error.key, "k");
  assert.ok(error.cause instanceof Error);
});

test("durable store cannot fabricate success on a failed write", async () => {
  const failingAdapter = {
    getItem: async () => null,
    setItem: async () => {
      throw new BthwaniDurableWriteError("mutation-id", new Error("platform reject"));
    },
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  };
  configureBthwaniDurableStorage(failingAdapter);
  await assert.rejects(
    bthwaniDurableStorage.setItem("mutation-id", "payload"),
    (error) => error instanceof BthwaniDurableWriteError && error.key === "mutation-id",
  );
});

test("durable store cannot fabricate cleanup success on a failed remove", async () => {
  const failingAdapter = {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => {
      throw new BthwaniDurableRemoveError("mutation-id", new Error("platform reject"));
    },
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  };
  configureBthwaniDurableStorage(failingAdapter);
  await assert.rejects(
    bthwaniDurableStorage.removeItem("mutation-id"),
    (error) => error instanceof BthwaniDurableRemoveError && error.key === "mutation-id",
  );
});
