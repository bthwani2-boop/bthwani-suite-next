import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner app composes canonical identity, rating, catalog media, push, and router boundaries", async () => {
  const source = await read("apps/app-partner/runtime/src/App.tsx");

  assert.match(source, /requiredRole="partner"/);
  assert.match(source, /requiredSurface="app-partner"/);
  assert.match(source, /<PartnerFieldRatingGate>/);
  assert.match(source, /<DshPartnerSurface route=\{route\} navigation=\{navigation\} appearance=\{appearance\} \/>/);
  assert.match(source, /configureCatalogMobileFilePicker\(pickCatalogFile\)/);
  assert.match(source, /DocumentPicker\.getDocumentAsync/);
  assert.match(source, /copyToCacheDirectory: true/);
  assert.match(source, /configureIdentityDeviceFingerprintProvider/);
  assert.match(source, /SecureStore/);
  assert.match(source, /from "@bthwani\/dsh\/mobile-capabilities"/);
  assert.match(source, /secureRandomId/);
  assert.doesNotMatch(source, /Crypto\.randomUUID/);
  assert.match(source, /useDshMobilePushRegistration\(identity\.state\.kind, "app-partner", "bthwani-partner-next"\)/);
});

test("partner runtime owns persisted appearance and reconciles memory to durable readback", async () => {
  const runtime = await read("apps/app-partner/runtime/src/index.ts");
  const appearance = await read("apps/app-partner/runtime/src/appearance.tsx");
  const hub = await read("services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx");

  assert.match(runtime, /PartnerAppearanceProvider/);
  assert.match(appearance, /getBThwaniAppearanceStorageKey\("app-partner"\)/);
  assert.match(appearance, /SecureStore\.getItemAsync/);
  assert.match(appearance, /SecureStore\.setItemAsync/);
  assert.match(appearance, /window\.localStorage/);
  assert.match(appearance, /async function persistAndReadBackAppearanceMode/);
  assert.match(appearance, /await writeStoredAppearanceMode\(mode\);/);
  assert.match(appearance, /const committedMode = await readStoredAppearanceMode\(\);/);
  assert.match(appearance, /if \(!isBThwaniAppearanceMode\(committedMode\)\)/);
  assert.match(appearance, /matchedRequest: committedMode === mode/);
  assert.match(appearance, /const writeQueueRef = useRef<Promise<void>>\(Promise\.resolve\(\)\);/);
  assert.match(appearance, /writeQueueRef\.current = writeQueueRef\.current\.then\(async \(\) =>/);
  assert.match(appearance, /const \{ committedMode, matchedRequest \} = await persistAndReadBackAppearanceMode\(nextMode\);[\s\S]*setModeState\(committedMode\);/);
  assert.match(appearance, /matchedRequest[\s\S]*تم اعتماد القيمة المحفوظة الفعلية بعد التحقق/);
  assert.doesNotMatch(appearance, /setModeState\(nextMode\);[\s\S]*writeStoredAppearanceMode\(nextMode\)/);
  assert.match(appearance, /لم يتم اعتماد التغيير/);
  assert.match(appearance, /<BThwaniAppearanceProvider mode=\{mode\} syncThemeMode>/);
  assert.doesNotMatch(hub, /useAppPartnerAppearance|useState<BThwaniAppearanceMode>/);
});

test("partner self/readiness state is isolated across store, session, and unmount changes", async () => {
  const controller = await read("services/dsh/frontend/shared/partner/use-partner-self-controller.tsx");
  const hub = await read("services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx");

  assert.match(controller, /const mountedRef = useRef\(true\)/);
  assert.match(controller, /const statusRequestSeqRef = useRef\(0\)/);
  assert.match(controller, /const readinessRequestSeqRef = useRef\(0\)/);
  assert.match(controller, /const requestSeq = \+\+statusRequestSeqRef\.current/);
  assert.match(controller, /const requestSeq = \+\+readinessRequestSeqRef\.current/);
  assert.match(controller, /if \(!isAuth\) \{[\s\S]*setStatusState\(\{ kind: "idle" \}\)/);
  assert.match(controller, /if \(!isAuth\) \{[\s\S]*setReadinessState\(\{ kind: "idle" \}\)/);
  assert.match(controller, /requestSeq !== statusRequestSeqRef\.current/);
  assert.match(controller, /requestSeq !== readinessRequestSeqRef\.current/);
  assert.doesNotMatch(hub, /selfStatusState\.kind === "not_found"/);
  assert.doesNotMatch(hub, /selfStatusState\.kind === "forbidden"/);
});

test("partner native wiring leaves inbound URL navigation to Expo Router", async () => {
  const source = await read("apps/app-partner/runtime/src/platform/dsh-capabilities.tsx");
  const sharedCapabilities = await read("tools/mobile/runtime-shared/dsh-capabilities.ts");

  assert.doesNotMatch(source, /configureDshLinkingAdapter|getInitialURL|getInitialUrl|addUrlListener|addEventListener\("url"/);
  assert.match(sharedCapabilities, /configureDshMobileNotificationRuntime\(createDshExpoNotificationRuntime/);
  assert.match(source, /linking: Linking/);
});

test("partner field rating keeps failures visible and confirms canonical completion readback", async () => {
  const source = await read("services/dsh/frontend/app-partner/ratings/PartnerFieldRatingGate.tsx");

  assert.match(source, /setPromptError\("تعذر تحميل حالة التقييم/);
  assert.match(source, /const committedPrompt = await fetchPartnerFieldRatingPrompt\(\)/);
  assert.match(source, /if \(!committedPrompt\.completed\)/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.doesNotMatch(source, /\.catch\(\(\) => \{ if \(!cancelled\) setPrompt\(null\); \}\)/);
});

test("partner order mutations carry server version and durable idempotency headers", async () => {
  const api = await read("services/dsh/frontend/shared/orders/orders.api.ts");
  const controller = await read("services/dsh/frontend/shared/orders/use-partner-order-commands.ts");
  const journey = await read("services/dsh/frontend/app-partner/DshPartnerOrderJourneyRenderer.tsx");
  const schema = await read("services/dsh/contracts/components/schemas/orders.schemas.yaml");

  assert.match(schema, /required: \[id, version,/);
  assert.match(api, /expectedVersion: options\.expectedVersion/);
  assert.match(api, /idempotencyKey: options\.idempotencyKey \?\? corrId\("partner-order-command"\)/);
  assert.match(controller, /expectedVersion\?: number/);
  assert.match(controller, /idempotencyKey: corrId\('partner-order-command'\)/);
  assert.match(journey, /buildDshPartnerSupportDirectoryRouteFromFlow\('order-reject', 'orders', orderId\)/);
});

test("partner surface keeps store scope explicit while navigation is router-owned", async () => {
  const source = await read("services/dsh/frontend/app-partner/DshPartnerSurface.tsx");
  const model = await read("services/dsh/frontend/app-partner/useDshPartnerSurfaceModel.ts");

  assert.match(source, /if \(!selectedStoreScope\)/);
  assert.match(source, /if \(isLoadingScopes\)/);
  assert.match(source, /<ActivityIndicator/);
  assert.match(source, /scopesError \? 'حدث خطأ أثناء تحميل الفروع' : 'لا يوجد فروع مسجلة'/);
  assert.match(source, /refreshOrders=\{actions\.refreshOrders\}/);
  assert.match(source, /navigation\.navigate\(\{ kind: 'inventory-management' \}\)/);
  assert.match(source, /navigation\.navigate\(\{ kind: 'inbox'/);
  assert.match(source, /id: 'wallet'/);
  assert.match(source, /id: 'orders'/);
  assert.match(source, /id: 'inventory'/);
  assert.doesNotMatch(source, /BackHandler|hardwareBackPress/);
  assert.doesNotMatch(model, /routeHistoryRef|handleHardwareBackPress|usePartnerProfileModel|usePartnerSupportModel/);
});

test("partner client visibility projects canonical publication readback and keeps UI hints presentation-only", async () => {
  const source = await read("services/dsh/frontend/shared/partner/dsh-client-visibility.model.ts");

  assert.match(source, /store\?\.publicationDecision === 'PUBLISHED'/);
  assert.match(source, /store\.isClientVisible/);
  assert.match(source, /getDshPartnerVisibilityBadge\(activationStatus, storeOpen, busy, inZone\)/);
  assert.match(source, /storeOpen = false/);
  assert.match(source, /inZone = true/);
  assert.doesNotMatch(source, /serviceabilityStatus|isServiceable|isOpen/);
  assert.doesNotMatch(source, /options\.storeOpen \?\? true/);
});
