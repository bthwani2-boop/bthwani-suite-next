import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner hub notification settings use the canonical controller and fail closed on stale or missing readback", async () => {
  const hub = await read("services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx");
  const panel = await read("services/dsh/frontend/app-partner/account/PartnerHubSettingsPanel.tsx");
  const types = await read("services/dsh/frontend/shared/partner/partner-hub.types.ts");
  const controller = await read("services/dsh/frontend/shared/notifications/use-notifications-controller.tsx");

  assert.match(hub, /useNotificationsController\(identity\.state\.kind\)/);
  assert.match(hub, /savePreference: saveNotificationPreference/);
  assert.match(hub, /notificationPreferenceState\.kind === "success"/);
  assert.match(panel, /notificationPreferences\.map\(\(preference\)/);
  assert.match(panel, /onSaveNotificationPreference\(preferenceInput\(preference/);

  assert.match(controller, /const sessionEpochRef = useRef\(0\)/);
  assert.match(controller, /const notificationsLoadSeqRef = useRef\(0\)/);
  assert.match(controller, /const preferencesLoadSeqRef = useRef\(0\)/);
  assert.match(controller, /const loadNotifications = useCallback\(async \(\): Promise<boolean> =>/);
  assert.match(controller, /const loadPreferences = useCallback\(async \(\): Promise<boolean> =>/);
  assert.match(controller, /sessionEpoch !== sessionEpochRef\.current/);
  assert.match(controller, /loadSeq !== notificationsLoadSeqRef\.current/);
  assert.match(controller, /loadSeq !== preferencesLoadSeqRef\.current/);
  assert.match(controller, /setPreferenceState\(\{ kind: "success", preferences: data\.preferences \}\);\s*return true;/);
  assert.match(controller, /setPreferenceState\(\{ kind: "error", message: resolveMessage\(err\) \}\);\s*return false;/);
  assert.match(controller, /const result = await operation\(\);/);
  assert.match(controller, /sessionEpoch !== sessionEpochRef\.current\) return false;/);
  assert.match(controller, /if \(result === false\)/);
  assert.match(controller, /return loadNotifications\(\);/);
  assert.match(controller, /return loadPreferences\(\);/);
  assert.match(controller, /تم إرسال التغيير، لكن تعذر التحقق من الحقيقة المحفوظة/);

  assert.doesNotMatch(hub, /failClosedNotificationPreferences|useState<NotificationPreferenceState>/);
  assert.doesNotMatch(hub, /updateNotificationPreferences|import\("\.\.\/\.\.\/shared\/notifications"\)/);
  assert.doesNotMatch(panel, /\bNotificationPreferenceState\b|primaryNotificationRows|secondaryNotificationRows/);
  assert.doesNotMatch(types, /\bNotificationPreferenceId\b|\bNotificationPreferenceState\b/);
});
