import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("captain readiness composition delegates decisions to executable policy", async () => {
  const source = await read("apps/app-captain/runtime/src/App.tsx");
  const wrapperMatch = source.match(/function UnifiedReadinessWrapper[\s\S]+?function AppContent/);
  assert.ok(wrapperMatch, "UnifiedReadinessWrapper should exist");
  const wrapperCode = wrapperMatch[0];

  assert.match(source, /classifyCaptainReadiness/);
  assert.match(source, /createCaptainEligibilityUnavailableGate/);
  assert.match(wrapperCode, /const presentation = classifyCaptainReadiness\(currentReadiness\)/);
  assert.match(wrapperCode, /setReadiness\(null\)/);
  assert.match(wrapperCode, /readiness\?\.actorId === workforce\.state\.me\.actorId/);
  assert.match(wrapperCode, /readinessRefreshToken/);
  assert.match(wrapperCode, /gate\.actorId !== actorId \|\| gate\.workforceKind !== workforceKind/);
  assert.match(wrapperCode, /presentation === "loading"/);
  assert.match(wrapperCode, /<ActivityIndicator/);
  assert.match(wrapperCode, /presentation === "blocked" && currentReadiness/);
  assert.match(wrapperCode, /ReadinessGateScreen/);
  assert.match(wrapperCode, /presentation === "allowed"/);
  assert.match(wrapperCode, /return <>{children}<\/>;/);
  assert.match(wrapperCode, /حالة جاهزية غير معروفة/);
  assert.doesNotMatch(wrapperCode, /blockerReasons:\s*\["ELIGIBILITY_UNAVAILABLE"\]/);
});

test("captain app keeps canonical identity, workforce, and notification boundaries", async () => {
  const source = await read("apps/app-captain/runtime/src/App.tsx");
  assert.match(source, /requiredRole="captain"/);
  assert.match(source, /requiredSurface="app-captain"/);
  assert.match(source, /expectedKind="captain"/);
  assert.match(source, /useDshMobilePushRegistration\(identity\.state\.kind, "app-captain", "bthwani-captain-next"\)/);
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
