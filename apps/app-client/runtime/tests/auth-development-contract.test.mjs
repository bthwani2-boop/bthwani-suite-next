import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("client persists its own stable Identity installation fingerprint", async () => {
  const source = await read("apps/app-client/runtime/src/App.tsx");
  assert.match(source, /configureIdentityDeviceFingerprintProvider/);
  assert.match(source, /SecureStore/);
  assert.match(source, /from "@bthwani\/dsh\/mobile-capabilities"/);
  assert.match(source, /secureRandomId/);
  assert.doesNotMatch(source, /Crypto\.randomUUID/);
});

test("client source never bundles privileged local-development credentials", async () => {
  const source = await read("apps/app-client/runtime/src/App.tsx");
  assert.doesNotMatch(source, /IDENTITY_LOCAL_BOOTSTRAP_PASSWORD/);
  assert.doesNotMatch(source, /BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD/);
  assert.doesNotMatch(source, /BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED/);
  assert.doesNotMatch(source, /BTHWANI_LOCAL_DEV_PASSWORD/);
  assert.doesNotMatch(source, /LOCAL_ONLY_replace_with_workforce_internal_service_token/);
  assert.doesNotMatch(source, /123456/);
});
