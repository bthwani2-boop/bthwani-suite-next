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

test("app-client keeps every Expo capability used by the operational experience", () => {
  const packageJson = JSON.parse(source("apps/app-client/runtime/package.json"));
  for (const dependency of [
    "expo-crypto",
    "expo-file-system",
    "expo-haptics",
    "expo-image",
    "expo-sharing",
    "expo-video",
    "expo-web-browser",
  ]) {
    assert.equal(typeof packageJson.dependencies?.[dependency], "string", `missing dependency: ${dependency}`);
  }

  const manifest = JSON.parse(source("tools/mobile/mobile-apps.manifest.json"));
  const features = new Set(manifest.apps?.["app-client"]?.features ?? []);
  for (const feature of ["crypto", "fileSystem", "image", "sharing", "video", "webBrowser"]) {
    assert.equal(features.has(feature), true, `app-client manifest missing feature: ${feature}`);
  }
});

test("client discovery exposes real search, cached images, and vertical active-only reels", () => {
  const discovery = assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx",
    [
      "createClientEphemeralId",
      "searchText",
      "normalizedQuery",
      "ابحث عن متجر أو فئة",
      "setReels([])",
      "reels.length > 0",
      "openCategoryDestination",
      'category.destinationType === "special_request"',
      'category.destinationType === "catalog_domain"',
    ],
  );
  assert.equal(discovery.includes("Math.random("), false);
  assert.equal(discovery.includes("node-shein"), false);
  assert.equal(discovery.includes("node-awnak"), false);

  assertMarkers(
    "apps/app-client/runtime/src/media/ClientRemoteImage.tsx",
    ["expo-image", 'cachePolicy="memory-disk"', "transition={150}"],
  );
  const reels = assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomeReelsSection.tsx",
    [
      "expo-video",
      "useVideoPlayer",
      "useCaching: true",
      "allowsPictureInPicture",
      "FlatList",
      "pagingEnabled",
      "itemVisiblePercentThreshold: 80",
      "onViewableItemsChanged",
      "player.pause()",
      "initialScrollIndex",
    ],
  );
  assert.equal(reels.includes("expo-av"), false);
  assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomePromoSection.tsx",
    ["promo.actionTarget.trim().length > 0", "hasQuickActions", "interactive ?"],
  );
});

test("manual request categories are server-routed sovereign destinations", () => {
  assertMarkers(
    "services/dsh/backend/internal/homediscovery/repository.go",
    [
      "'catalog_domain' AS destination_type",
      "'special_request' AS destination_type",
      "SHEIN_ASSISTED_PURCHASE",
      "AWNAK_ERRAND",
      "n.slug IN ('shein', 'awnak')",
      "&c.DestinationType",
      "&c.DestinationTarget",
    ],
  );
  assertMarkers(
    "services/dsh/contracts/components/schemas/catalog.schemas.yaml",
    [
      "destinationType:",
      "enum: [catalog_domain, special_request]",
      "destinationTarget:",
    ],
  );
  assertMarkers(
    "services/dsh/frontend/shared/home-discovery/home-discovery.view-model.ts",
    ["destinationType: dto.destinationType", "destinationTarget: dto.destinationTarget"],
  );
  const surface = assertMarkers(
    "services/dsh/frontend/app-client/DshClientSurface.tsx",
    [
      "DshHomeSpecialRequestTarget",
      "openSpecialRequestType",
      'requestType === "SHEIN_ASSISTED_PURCHASE" ? "shein" : "awnak"',
      "onSpecialRequestPress={openSpecialRequestType}",
    ],
  );
  assert.equal(surface.includes("node-shein"), false);
  assert.equal(surface.includes("node-awnak"), false);
});

test("SHEIN and Awnak intake forms expose the backend-supported operational fields", () => {
  assertMarkers(
    "services/dsh/frontend/shared/shein/SheinForm.tsx",
    [
      "validateSheinInput",
      "MAX_QUANTITY",
      "deliveryAddressReference",
      "handlingRequirements",
      "customerNotes",
      "إرسال للمراجعة والتسعير",
    ],
  );
  assertMarkers(
    "services/dsh/frontend/shared/awnak/AwnakForm.tsx",
    [
      "ITEM_TYPES",
      'type AwnakScheduleMode = "asap" | "scheduled"',
      "validateAwnakInput",
      "scheduledAt: parsed.toISOString()",
      "handlingRequirements",
      "pickupAddressReference",
      "dropoffAddressReference",
      "إرسال للمراجعة والتسعير",
    ],
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

test("privacy-safe order sharing uses temporary Expo files and no sensitive references", () => {
  const platform = assertMarkers(
    "apps/app-client/runtime/src/platform/client-platform-actions.ts",
    [
      "expo-file-system",
      "expo-sharing",
      "Sharing.isAvailableAsync()",
      "Sharing.shareAsync",
      "Paths.cache",
      "file.delete()",
    ],
  );
  assert.ok(platform.includes('mimeType: "text/plain"'));

  const orders = assertMarkers(
    "services/dsh/frontend/app-client/orders/OrdersListScreen.tsx",
    ["shareClientTextDocument", "shareableOrderSummary", "مشاركة الملخص"],
  );
  const summaryStart = orders.indexOf("function shareableOrderSummary");
  const summaryEnd = orders.indexOf("type Props", summaryStart);
  assert.ok(summaryStart >= 0 && summaryEnd > summaryStart);
  const summarySource = orders.slice(summaryStart, summaryEnd);
  for (const forbidden of [
    "deliveryAddressSnapshot",
    "wltPaymentRefId",
    "correlationId",
    "clientId",
  ]) {
    assert.equal(
      summarySource.includes(forbidden),
      false,
      `shared order summary must not include ${forbidden}`,
    );
  }
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
