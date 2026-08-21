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
  assert.doesNotMatch(routes, /assignmentPrefill|storeNameHint|phoneHint|addressHint|locationLatitude|locationLongitude/);
  assert.match(surface, /pushRoute\(\{ kind: 'onboarding', assignmentId \}\)/);
  assert.doesNotMatch(surface, /storeNameHint|phoneHint|addressHint|locationLatitude|locationLongitude/);
  assert.match(renderer, /onOpenAssignment\(assignment\.id\)/);
  assert.match(model, /left\.assignmentId === right\.assignmentId/);
});

test("assignment onboarding re-reads current DSH truth and fails closed", async () => {
  const resolver = await source("services/dsh/frontend/app-field/onboarding/DshFieldAssignmentOnboardingScreen.tsx");

  assert.match(resolver, /listFieldOnboardingAssignments\(\)/);
  assert.match(resolver, /assignments\.find\(\(candidate\) => candidate\.id === assignmentId\)/);
  assert.match(resolver, /openFieldOnboardingAssignment\(assignment\.id, \{ expectedVersion: assignment\.version \}\)/);
  assert.match(resolver, /ASSIGNMENT_NOT_AVAILABLE/);
  assert.match(resolver, /ASSIGNMENT_DRAFT_LINK_INCONSISTENT/);
  assert.match(resolver, /current\.status === 'draft_linked' && !current\.draftPartnerId/);
  assert.match(resolver, /controller\.reset\(\)/);
  assert.match(resolver, /resolution\.assignmentId !== assignmentId/);
  assert.match(resolver, /controller\.state\.partnerId \?\? assignment\.draftPartnerId/);
});
