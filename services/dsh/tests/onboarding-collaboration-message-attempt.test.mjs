import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import { resetBthwaniInstallationIdForTests } from "@bthwani/data-runtime/installation-id";
import { configureBthwaniDurableStorage } from "@bthwani/data-runtime/storage-adapter";
import { configureSecureRandomUuidProvider } from "../dist/services/dsh/frontend/shared/_kernel/secure-random.js";
import {
  clearOnboardingCollaborationMessageAttempt,
  getOrCreateOnboardingCollaborationMessageAttempt,
} from "../dist/services/dsh/frontend/shared/field-assignment/onboarding-collaboration-message-attempt.js";

const INSTALLATION_KEY = "@bthwani/installation-id/v1";
const fieldSource = readFileSync(resolve(process.cwd(), "services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx"), "utf8");
const operatorSource = readFileSync(resolve(process.cwd(), "services/dsh/frontend/control-panel/partners/field-assignment/FieldAssignmentWorkspace.tsx"), "utf8");
const apiSource = readFileSync(resolve(process.cwd(), "services/dsh/frontend/shared/field-assignment/onboarding-collaboration.api.ts"), "utf8");

function configureTestStorage() {
  const map = new Map([[INSTALLATION_KEY, "collaboration-installation-0001"]]);
  resetBthwaniInstallationIdForTests();
  configureBthwaniDurableStorage({
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => { map.set(key, value); },
    removeItem: async (key) => { map.delete(key); },
    getAllKeys: async () => [...map.keys()],
    multiRemove: async (keys) => { for (const key of keys) map.delete(key); },
  });
  return map;
}

function intent(overrides = {}) {
  return {
    surface: "app-field",
    actorId: "field-1",
    partnerId: "partner-1",
    assignmentId: "assignment-1",
    body: "تم تحديث وثيقة السجل التجاري",
    ...overrides,
  };
}

afterEach(() => {
  configureSecureRandomUuidProvider(null);
  resetBthwaniInstallationIdForTests();
  configureBthwaniDurableStorage({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
    getAllKeys: async () => [],
    multiRemove: async () => undefined,
  });
});

test("collaboration message keeps one secure client identity across runtime reset", async () => {
  const map = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => {
    generated += 1;
    return "00000000-0000-4000-8000-000000000301";
  });

  const original = await getOrCreateOnboardingCollaborationMessageAttempt(intent());
  resetBthwaniInstallationIdForTests();
  const replay = await getOrCreateOnboardingCollaborationMessageAttempt(intent({ body: "  تم تحديث وثيقة السجل التجاري  " }));

  assert.equal(original.clientMessageId, "onboarding-message:app-field:00000000-0000-4000-8000-000000000301");
  assert.equal(replay.clientMessageId, original.clientMessageId);
  assert.equal(generated, 1);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/onboarding-collaboration-message-create/")).length, 1);
});

test("collaboration message identity isolates surface, actor, object, and body", async () => {
  const map = configureTestStorage();
  let generated = 0;
  configureSecureRandomUuidProvider(() => `00000000-0000-4000-8000-${String(++generated).padStart(12, "0")}`);

  const original = await getOrCreateOnboardingCollaborationMessageAttempt(intent());
  const changedBody = await getOrCreateOnboardingCollaborationMessageAttempt(intent({ body: "تم تحديث وثيقة أخرى" }));
  const operator = await getOrCreateOnboardingCollaborationMessageAttempt(intent({ surface: "control-panel", actorId: "operator-1" }));
  assert.notEqual(changedBody.clientMessageId, original.clientMessageId);
  assert.notEqual(operator.clientMessageId, original.clientMessageId);

  await clearOnboardingCollaborationMessageAttempt(intent(), original.signature);
  assert.equal([...map.keys()].filter((key) => key.startsWith("@bthwani/mutation-attempt:v4/onboarding-collaboration-message-create/")).length, 2);
});

test("both collaboration surfaces clear only after exact message readback", () => {
  for (const source of [fieldSource, operatorSource]) {
    assert.match(source, /getOrCreateOnboardingCollaborationMessageAttempt\(attemptIntent\)/);
    assert.match(source, /message\.clientMessageId !== attempt\.clientMessageId/);
    assert.match(source, /clearOnboardingCollaborationMessageAttempt\(attemptIntent, attempt\.signature\)/);
    assert.doesNotMatch(source, /clientMessageId: `(?:field|cp)-[^`]*Date\.now/);
  }
  assert.doesNotMatch(apiSource, /idempotencyKey: input\.clientMessageId/);
});
