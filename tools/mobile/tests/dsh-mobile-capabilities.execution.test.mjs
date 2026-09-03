import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL(
  "../../../services/dsh/frontend/shared/mobile-capabilities.ts",
  import.meta.url,
);
const {
  DshNativeCapabilityUnavailable,
  getDshDocumentPickerAdapter,
  getDshLocationAdapter,
  getDshMobileNotificationRuntime,
} = await import(moduleUrl.href);

test("unconfigured mobile capabilities reject asynchronously with the governed capability error", async () => {
  await assert.rejects(
    () => getDshLocationAdapter().requestForegroundPermissions(),
    (error) => error instanceof DshNativeCapabilityUnavailable,
  );
  await assert.rejects(
    () => getDshDocumentPickerAdapter().getDocument(),
    (error) => error instanceof DshNativeCapabilityUnavailable,
  );
  await assert.rejects(
    () => getDshMobileNotificationRuntime().getPushToken(),
    (error) => error instanceof DshNativeCapabilityUnavailable,
  );
});
