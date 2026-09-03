import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

const forbiddenPublicComposition = [
  /export\s+\{\s*Dsh\w+Surface\b/u,
  /export\s+\{\s*IdentitySessionGate\b/u,
  /export\s+\{[\s\S]*?WorkforceAccessGate/u,
  /export\s+\{[\s\S]*?WorkforceProfileProvider/u,
  /export\s+\{\s*useDshMobilePushRegistration\b/u,
  /export\s+\{[\s\S]*?fetch\w*OperationalReadiness/u,
  /export\s+\{\s*ClientOrderRatingGate\b/u,
  /export\s+\{\s*PartnerFieldRatingGate\b/u,
  /export\s+\{\s*DshFieldProfileCompletionScreen\b/u,
];

test("mobile public APIs expose canonical application boundaries without product-composition internals", async () => {
  const entries = await Promise.all([
    read("services/dsh/frontend/app-client/index.ts"),
    read("services/dsh/frontend/app-partner/index.ts"),
    read("services/dsh/frontend/app-captain/index.ts"),
    read("services/dsh/frontend/app-field/index.ts"),
  ]);

  assert.match(entries[0], /export \{ DshClientApplication \}/u);
  assert.match(entries[1], /export \{ DshPartnerApplication \}/u);
  assert.match(entries[2], /export \{ DshCaptainApplication \}/u);
  assert.match(entries[3], /export \{ DshFieldApplication \}/u);

  for (const entry of entries) {
    for (const pattern of forbiddenPublicComposition) {
      assert.doesNotMatch(entry, pattern);
    }
  }
});

test("captain readiness remains DSH-owned behind the application boundary", async () => {
  const [publicApi, application, dispatchApi, dispatchTypes] = await Promise.all([
    read("services/dsh/frontend/app-captain/index.ts"),
    read("services/dsh/frontend/app-captain/DshCaptainApplication.tsx"),
    read("services/dsh/frontend/shared/dispatch/dispatch.api.ts"),
    read("services/dsh/frontend/shared/dispatch/dispatch.types.ts"),
  ]);

  assert.doesNotMatch(publicApi, /fetchCaptainOperationalReadiness/u);
  assert.doesNotMatch(publicApi, /CaptainOperationalReadiness/u);
  assert.match(application, /fetchOwnCaptainReadiness/u);
  assert.match(application, /DshOperationalReadinessBoundary/u);
  assert.match(dispatchApi, /export function fetchOwnCaptainReadiness/u);
  assert.match(dispatchApi, /\/dsh\/captain\/me\/readiness/u);
  assert.match(
    dispatchTypes,
    /export type DshCaptainReadiness =\s*operations\["getOwnCaptainReadiness"\]\["responses"\]\[200\]\["content"\]\["application\/json"\];/u,
  );
});
