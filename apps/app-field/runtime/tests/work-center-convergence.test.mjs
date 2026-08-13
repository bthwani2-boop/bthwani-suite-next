import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("field work center has no parallel history route or tab", async () => {
  const [routes, model, surface, renderer, profile] = await Promise.all([
    source("services/dsh/frontend/app-field/dsh-field.routes.ts"),
    source("services/dsh/frontend/app-field/field.surface-model.ts"),
    source("services/dsh/frontend/app-field/components/DshFieldSurface.tsx"),
    source("services/dsh/frontend/app-field/components/DshFieldRouteRenderer.tsx"),
    source("services/dsh/frontend/app-field/account/DshFieldProfileHomeScreen.tsx"),
  ]);

  for (const file of [routes, model, surface, renderer, profile]) {
    assert.doesNotMatch(file, /DshFieldStoresHistoryScreen|kind:\s*['"]history['"]|id:\s*['"]history['"]|onOpenHistory/);
  }
});

test("field tasks keep stale work non-actionable and actor-scoped", async () => {
  const [queueScreen, queueController, queueApi, assignmentCard, partnersScreen, assignmentWorkspace] = await Promise.all([
    source("services/dsh/frontend/app-field/escalation/DshFieldWorkQueueScreen.tsx"),
    source("services/dsh/frontend/shared/field-readiness/use-field-readiness-controller.tsx"),
    source("services/dsh/frontend/shared/field-readiness/field-readiness.api.ts"),
    source("services/dsh/frontend/app-field/components/FieldOnboardingAssignmentCard.tsx"),
    source("services/dsh/frontend/app-field/stores/DshFieldPartnersScreen.tsx"),
    source("services/dsh/frontend/control-panel/partners/field-assignment/FieldAssignmentWorkspace.tsx"),
  ]);

  assert.match(queueScreen, /disabled=\{isStale\}/);
  assert.match(queueScreen, /!isStale && onOpenVisit/);
  assert.match(queueScreen, /!isStale && onOpenEscalation/);
  assert.match(queueController, /isAuthenticated\(authKind\)/);
  assert.match(queueApi, /\/dsh\/field\/work-queue/);
  assert.match(queueScreen, /listFieldOnboardingAssignments/);
  assert.match(queueScreen, /<FieldOnboardingAssignmentCard/);
  assert.match(partnersScreen, /<FieldOnboardingAssignmentCard/);
  assert.doesNotMatch(partnersScreen, /onboarding المسندة/);
  assert.match(assignmentCard, /الموقع مثبت/);
  assert.match(assignmentWorkspace, /GoogleMapsWebCanvas/);
  assert.match(assignmentWorkspace, /locationLatitude/);
  assert.doesNotMatch(assignmentWorkspace, /إسناد مهمة onboarding/);
});
