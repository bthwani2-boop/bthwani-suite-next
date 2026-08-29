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
  const capabilities = new Set(manifest.apps?.["app-client"]?.nativeCapabilities ?? []);
  for (const capability of ["crypto", "fileSystem", "image", "sharing", "video", "webBrowser"]) {
    assert.equal(capabilities.has(capability), true, `app-client manifest missing capability: ${capability}`);
  }
});

test("client native wiring leaves inbound URL navigation to Expo Router", () => {
  const platform = source("apps/app-client/runtime/src/platform/dsh-capabilities.tsx");

  assert.doesNotMatch(platform, /configureDshLinkingAdapter|getInitialURL|getInitialUrl|addUrlListener|addEventListener\("url"/);
  assert.match(platform, /configureDshMobileNotificationRuntime\(createDshExpoNotificationRuntime/);
  assert.match(platform, /linking: Linking/);
});

test("client platform capabilities cross the runtime boundary through the DSH adapter", () => {
  const surface = assertMarkers(
    "services/dsh/frontend/app-client/DshClientSurface.tsx",
    ["useDshClientPlatform", "selectionHaptic", "openExternalUrl"],
  );
  assert.doesNotMatch(surface, /apps\/app-client\/runtime/);
  const runtime = assertMarkers(
    "apps/app-client/runtime/src/App.tsx",
    ["DshClientPlatformProvider", "RemoteImage: ClientRemoteImage", "selectionHaptic: performClientSelectionHaptic", "shareTextDocument: shareClientTextDocument"],
  );
  assert.match(runtime, /<DshClientPlatformProvider platform=\{clientPlatform\}>/);
});

test("client discovery exposes real search, cached images, and a persistent donor-style reels launcher", () => {
  const discovery = assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx",
    [
      "useDshClientPlatform",
      "createEphemeralId",
      "searchQuery",
      "normalizedQuery",
      "setReels([])",
      "setVideoOpenRequest",
      "onVideoPress={handleVideoPress}",
      "openRequest={videoOpenRequest}",
      "loadState={reelsLoadState}",
      "openCategoryDestination",
      'category.destinationType === "special_request"',
      'category.destinationType === "catalog_domain"',
      "discoveryRequestSequence",
      "queryError",
      "تعذر تحديث النتائج",
      "إعادة المحاولة",
    ],
  );
  assert.equal(discovery.includes("Math.random("), false);
  assert.equal(discovery.includes("node-shein"), false);
  assert.equal(discovery.includes("node-awnak"), false);
  assert.equal(discovery.includes("reels.length > 0 ? { onVideoPress"), false);

  assertMarkers(
    "apps/app-client/runtime/src/media/ClientRemoteImage.tsx",
    ["expo-image", 'cachePolicy="memory-disk"', "transition={150}"],
  );
  const reels = assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomeReelsSection.tsx",
    [
      "getDshVideoRenderer",
      "VideoSurface",
      "active={active}",
      "FlatList",
      "pagingEnabled",
      "itemVisiblePercentThreshold: 80",
      "onViewableItemsChanged",
      "initialScrollIndex",
      "ReelsStateModal",
      "لا توجد فيديوهات معتمدة بعد",
      "impressedIds",
      "onItemImpression",
      "slideCard",
      "borderRadius: 30",
    ],
  );
  assert.equal(reels.includes("expo-av"), false);
  assert.equal(reels.includes("expo-video"), false);
  assertMarkers(
    "apps/app-client/runtime/src/platform/dsh-capabilities.tsx",
    ["expo-video", "useVideoPlayer", "useCaching: true", "player.pause()", "allowsPictureInPicture"],
  );
  assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomePromoSection.tsx",
    ["promo.actionTarget.trim().length > 0", "hasQuickActions", 'label="فيديو"', "isVideo"],
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
      'requestType === "SHEIN_ASSISTED_PURCHASE"',
      '"special-request-shein"',
      '"special-request-awnak"',
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
    ["onOpenPickup", "onOpenOrderSupport", 'order.fulfillmentMode === "pickup"', "مراسلة الدعم بشأن الطلب"],
  );
  assertMarkers(
    "services/dsh/frontend/app-client/support/SupportTicketScreen.tsx",
    ["const ok = await submitTicket", "if (!ok) return;", "orderId", "maxLength={4000}"],
  );
  assertMarkers(
    "services/dsh/frontend/app-client/DshClientSurface.tsx",
    ["openExternalUrl", "onOpenPickup={openPickupSession}", "onOpenOrderSupport={openOrderSupport}", "selectionHaptic", "هذا الإجراء غير مدعوم", "case \"profile\":\n      content"],
  );
});

test("client order preparation never fabricates an operational readback", () => {
  const controller = assertMarkers(
    "services/dsh/frontend/shared/orders/use-client-order-controller.ts",
    ["fetchOrderPreparation(orderId)", "fetchOrderPreparationIssues(orderId)", "Required preparation projections fail the whole read"],
  );
  assert.doesNotMatch(controller, /fallbackOrderPreparation/);
  assert.doesNotMatch(controller, /fetchOrderPreparation\(orderId\)\.catch/);
  assert.doesNotMatch(controller, /fetchOrderPreparationIssues\(orderId\)\.catch/);
});

test("client notification action routes are canonical and fail closed", () => {
  const navigation = assertMarkers(
    "services/dsh/frontend/app-client/client-navigation.ts",
    [
      "function decodeSegment",
      "decodeURIComponent(value)",
      'parts.path === \"/orders/pickup\"',
      'return queryFor(parts, []) ? { kind: \"orders\" } : null',
      'parts.path === \"/cart\"',
      'parts.path === \"/support\"',
    ],
  );
  assert.doesNotMatch(navigation, /decodeURIComponent\([^)]*\)\s*\}/);
  const backend = assertMarkers(
    "services/dsh/backend/internal/operationaloutbox/notification_policy.go",
    ["pickupOrderID(event)", 'return \"/orders/\" + url.PathEscape(orderID) + \"/pickup\"'],
  );
  assert.ok(backend.includes("pickup_order_ready"));
});

test("client commercial profile is reachable from My Space and has no inert privacy actions", () => {
  const surface = assertMarkers(
    "services/dsh/frontend/app-client/DshClientSurface.tsx",
    [
      '"profile-commercial"',
      "MyProfileScreen",
      'onOpenProfile={() => navigate({ kind: "profile-commercial" })}',
    ],
  );
  assert.match(surface, /case "profile-commercial":/);
  assert.doesNotMatch(surface, /setProfileRoute|commercial-profile/);
  const profile = assertMarkers(
    "services/dsh/frontend/app-client/account/MyProfileScreen.tsx",
    ["fetchClientProfile", "upsertClientProfilePreferences", "upsertClientProfileConsents", "serverProfile"],
  );
  const profileApi = assertMarkers(
    "services/dsh/frontend/shared/client-profile/client-profile.api.ts",
    ["resolveDshApiBaseUrl()"],
  );
  assert.equal(profileApi.includes('createDshHttpClient("",'), false);
  assert.equal(profile.includes("طلب نسخة بياناتي"), false);
  assert.equal(profile.includes("طلب حذف الحساب"), false);
});

test("catalog verification wrapper initializes native exit state before a PowerShell child", () => {
  const runtime = assertMarkers(
    "infra/docker/scripts/runtime.ps1",
    ["\"verify-catalog\"", "$global:LASTEXITCODE = 0", "verify-catalog: PASS"],
  );
  assert.ok(runtime.indexOf("$global:LASTEXITCODE = 0") < runtime.indexOf("verify-catalog: PASS"));
});

test("checkout carries the confirmed cart version into the canonical DSH OCC contract", () => {
  const screen = assertMarkers(
    "services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx",
    ["expectedCartVersion: cart.version", "flow.start(input)"],
  );
  assert.ok(screen.includes("expectedCartVersion: cart.version"));
  const schema = assertMarkers(
    "services/dsh/contracts/components/schemas/checkout.schemas.yaml",
    ["required: [cartId, storeId, expectedCartVersion]", "expectedCartVersion: { type: integer, minimum: 1 }"],
  );
  assert.ok(schema.includes("expectedCartVersion"));
  const checkoutHandler = assertMarkers(
    "services/dsh/backend/internal/http/checkout.go",
    ["CheckGovernedServiceability", "ComputeCheckoutSnapshotTx", "CART_VERSION_CONFLICT", "currentCartVersion"],
  );
  assert.ok(checkoutHandler.includes("CheckGovernedServiceability"));
  const snapshot = assertMarkers(
    "services/dsh/backend/internal/cart/checkout_snapshot_scoped.go",
    ["func ComputeCheckoutSnapshotTx(", "expectedVersion int"],
  );
  assert.equal(snapshot.includes("ComputeCheckoutSnapshotForClient"), false);
  const conflictSchema = assertMarkers(
    "services/dsh/contracts/components/schemas/checkout.schemas.yaml",
    ["DshCheckoutCartVersionConflict", "currentCartVersion"],
  );
  assert.ok(conflictSchema.includes("DshCheckoutCartVersionConflict"));
  assertMarkers(
    "services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx",
    ["useCreateOrderTruthController", "submitOrder({ checkoutIntentId", "order_ready"],
  );
  assertMarkers(
    "services/dsh/frontend/shared/order-truth/order-truth.api.ts",
    ["/dsh/client/order-truth", "idempotencyKey: context.idempotencyKey", "correlationId: context.correlationId"],
  );
  assertMarkers(
    "services/dsh/frontend/shared/order-truth/use-order-truth-controller.ts",
    ["fetchClientOrderTruthDetail(created.id, token)", "getOrCreateOrderTruthAttempt(actorId, input)", "clearOrderTruthAttempt(actorId, attempt.fingerprint)"],
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
    ["shareTextDocument", "shareableOrderSummary", "مشاركة الملخص"],
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

test("subscription mutations persist one governed attempt across retries and restart", () => {
  const lifecycle = assertMarkers(
    "services/dsh/frontend/shared/marketing/subscription-lifecycle.api.ts",
    [
      "getOrCreateSubscriptionMutationAttempt",
      "recoverDshSubscriptionPurchase",
      "clearSubscriptionMutationAttempt",
      "attempt.context",
    ],
  );
  assert.equal(lifecycle.includes("mutationSequence"), false);
  assert.equal(lifecycle.includes("Date.now"), false);
  assertMarkers(
    "services/dsh/frontend/shared/marketing/use-subscription-lifecycle-controller.tsx",
    ["recoverDshSubscriptionPurchase"],
  );
  const controller = source("services/dsh/frontend/shared/marketing/use-subscription-lifecycle-controller.tsx");
  assert.doesNotMatch(controller, /registerIdentityBeforeSessionEndHook/);
  assert.doesNotMatch(controller, /clearSubscriptionMutationAttempts/);
  assertMarkers(
    "services/dsh/frontend/shared/marketing/subscription-mutation-attempt.ts",
    ["@bthwani/data-runtime", "bthwaniDurableStorage", "latestPurchaseKey", "PREFIX"],
  );
});

test("client does not own mobile appearance while video PiP remains configured", () => {
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
    ["supportsPictureInPicture: true", "ExpoConfig"],
  );
  assert.equal(config.includes("userInterfaceStyle"), false);
});
