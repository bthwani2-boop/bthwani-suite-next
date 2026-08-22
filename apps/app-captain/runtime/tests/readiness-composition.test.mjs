import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("captain readiness composition delegates decisions to the DSH boundary", async () => {
  const source = await read("apps/app-captain/runtime/src/App.tsx");
  const wrapperMatch = source.match(/function UnifiedReadinessWrapper[\s\S]+?function AppContent/);
  assert.ok(wrapperMatch, "UnifiedReadinessWrapper should exist");
  const wrapperCode = wrapperMatch[0];

  assert.match(source, /fetchCaptainOperationalReadiness/);
  assert.doesNotMatch(source, /classifyCaptainReadiness|createCaptainEligibilityUnavailableGate/);
  assert.match(wrapperCode, /setState\(\{ kind: "loading" \}\)/);
  assert.match(wrapperCode, /refreshToken/);
  assert.match(wrapperCode, /state\.kind === "unavailable"/);
  assert.match(wrapperCode, /<Button label="تحديث الحالة" onPress=\{\(\) => setRefreshToken/);
  assert.match(wrapperCode, /<ActivityIndicator/);
  assert.match(wrapperCode, /!state\.readiness\.ready/);
  assert.match(wrapperCode, /ReadinessGateScreen/);
  assert.match(wrapperCode, /return <>{children}<\/>;/);
  assert.doesNotMatch(wrapperCode, /blockerReasons|ELIGIBILITY_UNAVAILABLE/);
});

test("captain app keeps canonical identity, workforce, and notification boundaries", async () => {
  const source = await read("apps/app-captain/runtime/src/App.tsx");
  assert.match(source, /requiredRole="captain"/);
  assert.match(source, /requiredSurface="app-captain"/);
  assert.match(source, /expectedKind="captain"/);
  const effectsMatch = source.match(/function CaptainSessionEffects[\s\S]+?function AppContent/);
  assert.ok(effectsMatch, "CaptainSessionEffects should exist");
  assert.match(effectsMatch[0], /useDshMobilePushRegistration\(identity\.state\.kind, "app-captain", "bthwani-captain-next"\)/);
  assert.match(source, /<WorkforceAccessGate expectedKind="captain"[\s\S]+?<CaptainSessionEffects \/>/);
  const appContentMatch = source.match(/function AppContent[\s\S]+?return \(/);
  assert.ok(appContentMatch, "AppContent should exist");
  assert.doesNotMatch(appContentMatch[0], /useDshMobilePushRegistration/);
  assert.match(source, /configureIdentityDeviceFingerprintProvider/);
  assert.match(source, /SecureStore/);
  assert.match(source, /randomUUID/);
});

test("captain identity changes invalidate stale Workforce and push state", async () => {
  const workforce = await read("services/dsh/frontend/shared/workforce/use-workforce-profile.tsx");
  const push = await read("services/dsh/frontend/shared/notifications/use-mobile-push-registration.ts");

  assert.match(workforce, /useRef/);
  assert.match(workforce, /identitySessionBinding/);
  assert.match(workforce, /requestSequence/);
  assert.match(workforce, /sequence === requestSequence\.current/);
  assert.match(push, /registerIdentityBeforeSessionEndHook/);
  assert.match(push, /endpointRegistered/);
  assert.match(push, /deactivateRegisteredEndpoint/);
  assert.match(push, /active = false/);
});
