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
  const [queueScreen, queueController, queueApi] = await Promise.all([
    source("services/dsh/frontend/app-field/escalation/DshFieldWorkQueueScreen.tsx"),
    source("services/dsh/frontend/shared/field-readiness/use-field-readiness-controller.tsx"),
    source("services/dsh/frontend/shared/field-readiness/field-readiness.api.ts"),
  ]);

  assert.match(queueScreen, /disabled=\{isStale\}/);
  assert.match(queueScreen, /!isStale && onOpenVisit/);
  assert.match(queueScreen, /!isStale && onOpenEscalation/);
  assert.match(queueController, /isAuthenticated\(authKind\)/);
  assert.match(queueApi, /\/dsh\/field\/work-queue/);
});
