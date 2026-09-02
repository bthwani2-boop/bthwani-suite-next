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
  const sharedCapabilities = source("services/dsh/frontend/shared/mobile-runtime-capabilities.ts");

  assert.doesNotMatch(platform, /configureDshLinkingAdapter|getInitialURL|getInitialUrl|addUrlListener|addEventListener\("url"/);
  assert.match(sharedCapabilities, /configureDshMobileNotificationRuntime\(createDshExpoNotificationRuntime/);
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
      "onMarketingAction?.(\"unsupported\", target)",
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
  const capabilities = `${source("apps/app-client/runtime/src/platform/dsh-capabilities.tsx")}\n${source("services/dsh/frontend/shared/mobile-runtime-capabilities.ts")}`;
  for (const marker of ["expo-video", "useVideoPlayer", "useCaching: true", "player.pause()", "allowsPictureInPicture"]) {
    assert.ok(capabilities.includes(marker), `mobile capability wiring missing ${marker}`);
  }
  assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomePromoSection.tsx",
    ["promo.actionTarget.trim().length > 0", "hasQuickActions", 'label="فيديو"', "isVideo"],
  );
  assertMarkers(
    "services/dsh/frontend/app-client/home-discovery/HomeHeroBannerSection.tsx",
    ["banner.actionTarget.trim().length > 0"],
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
    ["openExternalUrl", "onOpenPickup={openPickupSession}", "onOpenOrderSupport={openOrderSupport}", "selectionHaptic", "هذا الإجراء غير مدعوم", "هذا الإجراء التسويقي غير مدعوم", "case \"profile\":\n      content"],
  );
});

test("client order ratings preserve one durable mutation through canonical readback", () => {
  const attempt = assertMarkers(
    "services/dsh/frontend/shared/provider-ratings/client-order-rating-attempt.ts",
    ["client-order-ratings-submit", "resolveMutationIdentityScope", "getOrCreateDurableMutationAttempt", "purgeExactDurableMutationAttempt"],
  );
  assert.match(attempt, /entityId: `order:\$\{normalizedOrderId\}`/);
  const gate = assertMarkers(
    "services/dsh/frontend/app-client/ratings/ClientOrderRatingGate.tsx",
    ["getOrCreateClientOrderRatingAttempt", "fetchClientOrderRatingPrompt", "clearClientOrderRatingAttempt", "promptLoadError", "إعادة التحقق من التقييمات"],
  );
  assert.match(gate, /submitClientOrderRatings\(prompt\.orderId, input, attempt\.context\)/);
  const api = assertMarkers(
    "services/dsh/frontend/shared/provider-ratings/provider-ratings.api.ts",
    ["idempotencyKey: mutation.idempotencyKey", "canonical readback did not preserve the mutation identity"],
  );
  assert.match(api, /correlationId: mutation\.correlationId/);
  const backend = assertMarkers(
    "services/dsh/backend/internal/ratings/ratings.go",
    ["dsh_provider_rating_mutation_receipts", "ErrIdempotencyConflict", "clientOrderRatingsFingerprint"],
  );
  assert.match(backend, /pg_advisory_xact_lock/);
  assertMarkers(
    "services/dsh/database/migrations/dsh-1060_provider_rating_mutation_idempotency.sql",
    ["dsh_provider_rating_mutation_receipts", "uq_dsh_provider_rating_receipts_actor_key", "request_fingerprint"],
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

test("client preparation decisions keep one actor-scoped command until readback", () => {
  const attempt = assertMarkers(
    "services/dsh/frontend/shared/orders/client-preparation-decision-attempt.ts",
    ["client-preparation-decision", "resolveMutationIdentityScope", "getOrCreateDurableMutationAttempt", "purgeExactDurableMutationAttempt"],
  );
  assert.match(attempt, /entityId: `order:\$\{normalized\.orderId\}:issue:\$\{normalized\.issueId\}`/);
  const panel = assertMarkers(
    "services/dsh/frontend/app-client/orders/ClientPreparationDecisionPanel.tsx",
    ["useIdentitySession", "getOrCreateClientPreparationDecisionAttempt", "clearClientPreparationDecisionAttempt", "await onUpdated()"],
  );
  assert.match(panel, /decideOrderPreparationIssue\(orderId, issue\.id, input, attempt\.context\)/);
  const api = assertMarkers(
    "services/dsh/frontend/shared/orders/orders.api.ts",
    ["idempotencyKey: mutation.idempotencyKey", "canonical readback did not preserve the mutation"],
  );
  assert.match(api, /decideOrderPreparationIssue\(/);
  const backend = assertMarkers(
    "services/dsh/backend/internal/orders/preparation_issues.go",
    ["clientPreparationDecisionFingerprint", "idempotency_key", "request_fingerprint", "ErrIdempotencyConflict"],
  );
  assert.match(backend, /customer_decision/);
  assertMarkers(
    "services/dsh/database/migrations/dsh-1061_preparation_decision_idempotency.sql",
    ["idempotency_key", "request_fingerprint", "uq_dsh_preparation_issue_events_idempotency"],
  );
});

test("client special-request saga commands survive restart through durable identity", () => {
  const attempt = assertMarkers(
    "services/dsh/frontend/shared/special-requests/client-special-request-command-attempt.ts",
    ["client-special-request-command", "resolveMutationIdentityScope", "getOrCreateDurableMutationAttempt", "purgeExactDurableMutationAttempt"],
  );
  assert.match(attempt, /entityId: `special-request:\$\{normalized\.requestId\}:\$\{normalized\.action\}`/);
  const controller = assertMarkers(
    "services/dsh/frontend/shared/special-requests/use-special-requests-controller.tsx",
    ["getOrCreateClientSpecialRequestCommandAttempt", "clearClientSpecialRequestCommandAttempt", "fetchClientSpecialRequest"],
  );
  assert.match(controller, /cancelSpecialRequest\(id, expectedVersion, attempt\.context\)/);
  assert.match(controller, /approveSpecialRequestQuote\(id, expectedVersion, attempt\.context\)/);
  const api = assertMarkers(
    "services/dsh/frontend/shared/special-requests/special-requests.api.ts",
    ["idempotencyKey: mutation.idempotencyKey", "correlationId: mutation.correlationId"],
  );
  assert.match(api, /Promise<void>/);
  const contract = assertMarkers(
    "services/dsh/contracts/paths/misc.paths.yaml",
    ["cancelDshClientSpecialRequest", "approveDshSpecialRequestQuote", "DshSpecialRequestSagaResponse", "IdempotencyKey", "CorrelationId"],
  );
  assert.match(contract, /description: Durable cancellation saga accepted/);
  assert.match(contract, /description: Durable payment-session saga accepted/);
});

test("client special-request information responses replay through a canonical exchange", () => {
  const controller = assertMarkers(
    "services/dsh/frontend/shared/special-requests/use-special-requests-controller.tsx",
    ["respond-information", "getOrCreateClientSpecialRequestCommandAttempt", "fetchClientSpecialRequestInformation", "canonicalExchange"],
  );
  assert.match(controller, /respondClientSpecialRequestInformation\(request\.id,[\s\S]*attempt\.context\)/);
  const api = assertMarkers(
    "services/dsh/frontend/shared/special-requests/special-requests.api.ts",
    ["respondClientSpecialRequestInformation", "idempotencyKey: mutation.idempotencyKey", "correlationId: mutation.correlationId"],
  );
  assert.match(api, /input: DshRespondSpecialRequestInformation,[\s\S]*mutation: ClientSpecialRequestMutationContext/);
  const contract = assertMarkers(
    "services/dsh/contracts/paths/misc.paths.yaml",
    ["/dsh/client/special-requests/{requestId}/information-response", "IdempotencyKey", "CorrelationId"],
  );
  const service = assertMarkers(
    "services/dsh/backend/internal/specialrequests/information_exchange.go",
    ["InformationResponseMutationContext", "dsh_special_request_information_response_receipts", "informationResponseFingerprint", "pg_advisory_xact_lock"],
  );
  assert.ok(service.includes("ErrInformationResponseIdempotencyConflict"));
  const handler = assertMarkers(
    "services/dsh/backend/internal/http/specialrequests_information.go",
    ["specialRequestInformationMutationContext", "IDEMPOTENCY_CONFLICT", "X-Correlation-ID"],
  );
  assert.ok(handler.includes("Idempotency-Key"));
  const migration = assertMarkers(
    "services/dsh/database/migrations/dsh-1065_special_request_information_response_idempotency.sql",
    ["dsh_special_request_information_response_receipts", "exchange_id", "PRIMARY KEY"],
  );
  assert.ok(migration.includes("request_fingerprint"));
});

test("client order delivery projections distinguish unavailable data from readback failure", () => {
  const controller = assertMarkers(
    "services/dsh/frontend/shared/orders/use-client-order-controller.ts",
    ["liveTrackingReadbackMessage", "partnerDeliveryReadbackMessage", "classified.kind !== 'not_found'"],
  );
  assert.match(controller, /تعذر تحديث التتبع الحي/);
  assert.match(controller, /تعذر تحديث حالة توصيل الشريك/);
  const tracking = assertMarkers(
    "services/dsh/frontend/app-client/orders/ClientLiveTrackingCard.tsx",
    ["readbackMessage", "إعادة قراءة التتبع", "tone={readbackMessage ? \"danger\" : \"muted\"}"],
  );
  assert.ok(tracking.includes("onRetry"));
  assertMarkers(
    "services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx",
    ["partnerDeliveryReadbackMessage", "تعذر تحديث توصيل الشريك", "readbackMessage={liveTrackingReadbackMessage}"],
  );
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
  assert.equal(profile.includes("useState<ClientProfileCurrency>"), false);
  assert.equal(profile.includes("setCurrency("), false);
  assert.match(profile, /currencyPreference: profileState\.profile\.currencyPreference/);
  assert.match(profile, /currencyPreference: "YER" as const/);
});

test("client profile mutations persist identity and reconcile partial saves", () => {
  const attempt = assertMarkers(
    "services/dsh/frontend/shared/client-profile/client-profile-mutation-attempt.ts",
    ["client-profile-mutation", "resolveMutationIdentityScope", "getOrCreateDurableMutationAttempt", "purgeExactDurableMutationAttempt"],
  );
  assert.match(attempt, /entityId: `client-profile:\$\{normalized\.operation\}`/);
  const screen = assertMarkers(
    "services/dsh/frontend/app-client/account/MyProfileScreen.tsx",
    ["getOrCreateClientProfileMutationAttempt", "clearClientProfileMutationAttempt", "fetchClientProfile", "saveError"],
  );
  assert.match(screen, /upsertClientProfilePreferences\(input, attempt\.context\)/);
  assert.match(screen, /upsertClientProfileConsents\(input, attempt\.context\)/);
  const api = assertMarkers(
    "services/dsh/frontend/shared/client-profile/client-profile.api.ts",
    ["idempotencyKey: mutation.idempotencyKey", "correlationId: mutation.correlationId"],
  );
  const handler = assertMarkers(
    "services/dsh/backend/internal/http/clientprofile_handlers.go",
    ["clientProfileMutationContext", "X-Correlation-ID", "IDEMPOTENCY_CONFLICT"],
  );
  assert.ok(handler.includes("Idempotency-Key"));
  const backend = assertMarkers(
    "services/dsh/backend/internal/clientprofile/clientprofile.go",
    ["dsh_client_profile_mutation_receipts", "pg_advisory_xact_lock", "request_fingerprint"],
  );
  const migration = assertMarkers(
    "services/dsh/database/migrations/dsh-1063_client_profile_mutation_idempotency.sql",
    ["dsh_client_profile_mutation_receipts", "preferences", "consents"],
  );
  assert.ok(migration.includes("PRIMARY KEY (client_id, idempotency_key)"));
  const contract = assertMarkers(
    "services/dsh/contracts/dsh.runtime-extensions.openapi.yaml",
    ["ClientIdempotencyKey", "ClientCorrelationId", "dsh_client_me_profile_preferences", "dsh_client_me_profile_consents"],
  );
  assert.ok(contract.includes("#/components/responses/Conflict"));
  assert.match(contract, /DshClientProfilePreferencesInput/);
  assert.match(contract, /currencyPreference: \{ type: string, const: YER \}/);
  assert.match(screen, /kind: \"not_found\"/);
  assert.match(screen, /إنشاء الملف الشخصي/);
  assert.doesNotMatch(screen, /Not found, use defaults|version: 0/);
});

test("client profile consent withdrawal requires explicit confirmation", () => {
  const screen = assertMarkers(
    "services/dsh/frontend/app-client/account/MyProfileScreen.tsx",
    [
      'import { Alert, StyleSheet, Switch, TouchableOpacity, View } from "react-native";',
      "Alert.alert(",
      "تأكيد سحب الموافقة",
      "سحب الموافقة",
      'style: "cancel"',
      'style: "destructive"',
      "onPress: revoke",
    ],
  );
  assert.match(screen, /onValueChange=\{\(v\) => v \? setConsentEmail\(true\) : confirmWithdrawConsent\("email"\)\}/);
  assert.doesNotMatch(screen, /immediately toggle|if \(type === "email"\) setConsentEmail\(false\)/);
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

test("checkout keeps an unresolved payment intent visible and blocks duplicate submission", () => {
  const flow = assertMarkers(
    "services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx",
    ["operationLock", "checkout_action_error", "بقيت الجلسة محفوظة", "currentIntent.id !== intentId", "isOrderCreationEligible", "intent.state === \"confirmed\"", "reconciliation_pending", "checkoutInputRef", "clearCurrentCheckoutAttempt", "await cancelCheckoutIntent(intentId);"],
  );
  assert.doesNotMatch(flow, /catch \{\s*\/\/ Best effort cancel/);
  const cart = assertMarkers(
    "services/dsh/frontend/app-client/cart/CartScreen.tsx",
    ["const checkoutLocked", "checkoutLocked || !cartReady", "checkoutState?.kind === \"order_error\"", "serviceabilityController.serviceability.kind === \"serviceable\"", "disabled={!canProceed}"],
  );
  assert.match(cart, /actionPending \|\| checkoutLocked/);
  assert.match(cart, /label="رمز القسيمة"/);
  assert.match(cart, /accessibilityLabel=\{label \|\| placeholder\}/);
  assertMarkers(
    "services/dsh/frontend/app-client/cart/CheckoutProgress.tsx",
    ["جلسة الدفع ما تزال محفوظة", "إعادة محاولة الإلغاء", "state.intent.id"],
  );
});

test("client payment choices honor the provider capability boundary", () => {
  const payment = assertMarkers(
    "services/dsh/frontend/wlt/payment/use-wlt-payment-controller.tsx",
    [
      "providerPaymentsEnabled &&",
      "method === \"wallet\" && (!providerPaymentsEnabled || !hasSufficientWallet)",
      "method === \"mixed\" && (!providerPaymentsEnabled || !hasPartialWallet)",
      "disabled: !providerPaymentsEnabled || !hasSufficientWallet",
      "disabled: !providerPaymentsEnabled || !hasPartialWallet",
      "الدفع من المحفظة غير مفعّل حاليًا لهذا التطبيق.",
      "الدفع المختلط غير مفعّل حاليًا لهذا التطبيق.",
      "walletReadbackError",
      "تعذر التحقق من رصيد المحفظة حاليًا.",
      "label: \"إعادة التحقق\"",
    ],
  );
  assert.match(payment, /providerPaymentsEnabled/);
  assertMarkers(
    "services/dsh/frontend/app-client/cart/PaymentDecisionSection.tsx",
    ["<View key={option.id} style={styles.optionContainer}>", "{option.action ? ("],
  );
});

test("special-request creation keeps one actor-scoped idempotency attempt until readback", () => {
  const attempt = assertMarkers(
    "services/dsh/frontend/shared/special-requests/special-request-create-attempt.ts",
    [
      "client-special-request-create",
      "getOrCreateDurableMutationAttempt",
      "purgeExactDurableMutationAttempt",
      "fingerprintSpecialRequestInput",
    ],
  );
  assert.match(attempt, /Omit<DshCreateSpecialRequest, "idempotencyKey">/);
  const controller = assertMarkers(
    "services/dsh/frontend/shared/special-requests/use-special-requests-controller.tsx",
    ["getOrCreateSpecialRequestCreateAttempt", "fetchClientSpecialRequest(created.id)", "clearSpecialRequestCreateAttempt"],
  );
  assert.doesNotMatch(controller, /generateSpecialRequestIdempotencyKey/);
  const surface = source("services/dsh/frontend/app-client/DshClientSurface.tsx");
  assert.doesNotMatch(surface, /generateSpecialRequestIdempotencyKey/);
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
      "return loadPreferences()",
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
