import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner hub notification settings use the canonical controller and server readback", async () => {
  const hub = await read("services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx");
  const panel = await read("services/dsh/frontend/app-partner/account/PartnerHubSettingsPanel.tsx");
  const types = await read("services/dsh/frontend/shared/partner/partner-hub.types.ts");
  const controller = await read("services/dsh/frontend/shared/notifications/use-notifications-controller.tsx");

  assert.match(hub, /useNotificationsController\(identity\.state\.kind\)/);
  assert.match(hub, /savePreference: saveNotificationPreference/);
  assert.match(hub, /notificationPreferenceState\.kind === "success"/);
  assert.match(panel, /notificationPreferences\.map\(\(preference\)/);
  assert.match(panel, /onSaveNotificationPreference\(preferenceInput\(preference/);
  assert.match(controller, /await loadPreferences\(\);/);
  assert.doesNotMatch(hub, /failClosedNotificationPreferences|useState<NotificationPreferenceState>/);
  assert.doesNotMatch(hub, /updateNotificationPreferences|import\("\.\.\/\.\.\/shared\/notifications"\)/);
  assert.doesNotMatch(panel, /\bNotificationPreferenceState\b|primaryNotificationRows|secondaryNotificationRows/);
  assert.doesNotMatch(types, /\bNotificationPreferenceId\b|\bNotificationPreferenceState\b/);
});
