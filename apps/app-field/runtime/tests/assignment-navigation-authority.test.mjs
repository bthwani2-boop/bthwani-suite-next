import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("field navigation carries assignment identity only", async () => {
  const [routes, surface, renderer, model] = await Promise.all([
    source("services/dsh/frontend/app-field/dsh-field.routes.ts"),
    source("services/dsh/frontend/app-field/components/DshFieldSurface.tsx"),
    source("services/dsh/frontend/app-field/components/DshFieldRouteRenderer.tsx"),
    source("services/dsh/frontend/app-field/field.surface-model.ts"),
  ]);

  assert.match(routes, /kind:\s*'onboarding'; partnerId\?: string; assignmentId\?: string/);
  assert.match(routes, /DshFieldNavigation/);
  assert.match(routes, /dshFieldRouteToPath/);
  assert.doesNotMatch(routes, /assignmentPrefill|storeNameHint|phoneHint|addressHint|locationLatitude|locationLongitude/);
  assert.match(surface, /navigation\.navigate\(\{ kind: 'onboarding', assignmentId \}\)/);
  assert.doesNotMatch(`${surface}\n${renderer}\n${model}`, /routeStack|pushRoute|popRoute|resetToStores|BackHandler|navCommand/);
  const platform = await source("apps/app-field/runtime/src/platform/dsh-capabilities.tsx");
  assert.doesNotMatch(platform, /configureDshLinkingAdapter|getInitialURL|addUrlListener|addEventListener\("url"/);
  assert.match(renderer, /onOpenAssignment\(assignment\.id\)/);
});

test("assignment onboarding re-reads current DSH truth and fails closed", async () => {
  const resolver = await source("services/dsh/frontend/app-field/onboarding/DshFieldAssignmentOnboardingScreen.tsx");

  assert.match(resolver, /getFieldOnboardingAssignment\(assignmentId\)/);
  assert.doesNotMatch(resolver, /listFieldOnboardingAssignments\(\)|assignments\.find\(\(candidate\) => candidate\.id === assignmentId\)/);
  assert.match(resolver, /openFieldOnboardingAssignment\(assignment\.id, \{ expectedVersion: assignment\.version \}\)/);
  assert.match(resolver, /ASSIGNMENT_NOT_AVAILABLE/);
  assert.match(resolver, /ASSIGNMENT_DRAFT_LINK_INCONSISTENT/);
  assert.match(resolver, /current\.status === 'draft_linked' && !current\.draftPartnerId/);
  assert.match(resolver, /controller\.reset\(\)/);
  assert.match(resolver, /resolution\.assignmentId !== assignmentId/);
  assert.match(resolver, /controller\.state\.partnerId \?\? assignment\.draftPartnerId/);
});
