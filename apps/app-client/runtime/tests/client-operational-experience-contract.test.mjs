import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDirectory, "../../../..");

function source(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assertMarkers(relativePath, markers) {
  const content = source(relativePath);
  for (const marker of markers) {
    assert.ok(content.includes(marker), `${relativePath}: missing ${marker}`);
  }
  return content;
}

test("client discovery exposes real search, cached images, and playable reels", () => {
  const discovery = assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx",
    ["createClientEphemeralId", "searchText", "normalizedQuery", "ابحث عن متجر أو فئة"],
  );
  assert.equal(discovery.includes("Math.random("), false);

  assertMarkers(
    "apps/app-client/runtime/src/media/ClientRemoteImage.tsx",
    ["expo-image", 'cachePolicy="memory-disk"', "transition={150}"],
  );
  assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomeReelsSection.tsx",
    ["expo-video", "useVideoPlayer", "useCaching: true", "allowsPictureInPicture"],
  );
});

test("client order and support routes remain navigable and failure-safe", () => {
  assertMarkers(
    "services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx",
    ["onOpenPickup", 'order.fulfillmentMode === "pickup"', "افتح جلسة الاستلام"],
  );
  assertMarkers(
    "services/dsh/frontend/app-client/support/SupportTicketScreen.tsx",
    ["const ok = await submitTicket", "if (!ok) return;", "maxLength={4000}"],
  );
  assertMarkers(
    "services/dsh/frontend/app-client/DshClientSurface.tsx",
    ["openClientExternalUrl", "onOpenPickup={openPickupSession}", "performClientSelectionHaptic"],
  );
});

test("notification mutations are contained and provide canonical readback", () => {
  assertMarkers(
    "services/dsh/frontend/shared/notifications/use-notifications-controller.tsx",
    [
      "mutationBusyRef",
      "runMutation",
      '"mark_read"',
      '"mark_all_read"',
      '"save_preference"',
      "Promise<boolean>",
      "setActionError(resolveMessage(err))",
      "await loadNotifications()",
      "await loadPreferences()",
    ],
  );
  assertMarkers(
    "services/dsh/frontend/shared/notifications/ActorNotificationsPanel.tsx",
    ["busyAction", "actionError", "mutationBusy", "showPreferences"],
  );
  assertMarkers(
    "services/dsh/frontend/app-client/account/PreferencesHubScreen.tsx",
    ["const accepted = await controller.savePreference", "controller.actionError", "controller.busyAction"],
  );
});

test("incomplete dark appearance is not exposed while video PiP remains configured", () => {
  assert.equal(
    fs.existsSync(path.join(repoRoot, "apps/app-client/runtime/src/preferences/client-appearance.tsx")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(repoRoot, "services/dsh/frontend/app-client/account/AppearanceHubScreen.tsx")),
    false,
  );
  const config = assertMarkers(
    "apps/app-client/runtime/app.config.ts",
    ['userInterfaceStyle: "light"', "supportsPictureInPicture: true", "ExpoConfig"],
  );
  assert.equal(config.includes('userInterfaceStyle: "automatic"'), false);
});
