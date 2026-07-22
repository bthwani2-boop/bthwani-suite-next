import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

const governedDomain = read("services/dsh/backend/internal/fieldreadiness/journey024_governance.go");
const governedHandlers = read("services/dsh/backend/internal/http/field_readiness_governed_handlers.go");
const routes = read("services/dsh/backend/internal/http/field_readiness_routes.go");
const sharedTypes = read("services/dsh/frontend/shared/field-readiness/field-readiness.types.ts");
const sharedMedia = read("services/dsh/frontend/shared/media/field-document-media.ts");
const visitScreen = read("services/dsh/frontend/app-field/escalation/DshFieldVisitScreen.tsx");
const queueScreen = read("services/dsh/frontend/app-field/escalation/DshFieldWorkQueueScreen.tsx");
const checklistScreen = read("services/dsh/frontend/app-field/escalation/DshFieldReadinessChecklistScreen.tsx");
const operatorScreen = read("services/dsh/frontend/control-panel/partners/field-readiness/FieldReadinessQueueScreen.tsx");

test("JRN-024 routes every write through the governed backend boundary", () => {
  assert.match(routes, /handleCreateGovernedFieldVisit/);
  assert.match(routes, /handleCompleteGovernedFieldVisit/);
  assert.match(routes, /handleUpsertGovernedReadinessCheck/);
  assert.match(routes, /handleCreateGovernedReadinessEscalation/);
  assert.match(routes, /handleUpdateGovernedEscalation/);
  assert.match(routes, /handleGovernedPartnerOnboardingStatus/);
  assert.doesNotMatch(routes, /stores\/\{storeId\}\/media\/uploads/);
  assert.doesNotMatch(governedHandlers, /handleFieldReadinessMediaUpload/);
});

test("JRN-024 uses server-owned store coordinates and governed GPS evidence", () => {
  assert.match(governedDomain, /SELECT latitude, longitude\s+FROM dsh_stores/);
  assert.match(governedDomain, /input\.StoreLatitude = &latitude/);
  assert.match(governedDomain, /ValidateGovernedLocation/);
  assert.match(governedDomain, /GPS capture time is in the future/);
  assert.doesNotMatch(governedHandlers, /StoreLatitude/);
  assert.doesNotMatch(governedHandlers, /StoreLongitude/);
  const createInput = sharedTypes.slice(
    sharedTypes.indexOf("export type DshCreateVisitInput"),
    sharedTypes.indexOf("export type DshCompleteVisitInput"),
  );
  assert.doesNotMatch(createInput, /storeLatitude|storeLongitude/);
  assert.match(createInput, /startLocation/);
});

test("JRN-024 binds readiness evidence to the exact store and owner", () => {
  assert.match(governedDomain, /refs\.store_id = checks\.store_id/);
  assert.match(governedDomain, /purpose = 'field_readiness_evidence'/);
  assert.match(governedDomain, /owner_actor_id = \$4/);
  assert.match(sharedMedia, /form\.append\("storeId", owner\.storeId\)/);
  assert.match(sharedMedia, /\/dsh\/field\/media\/uploads/);
});

test("JRN-024 keeps escalated-further cases blocking and operable", () => {
  assert.match(governedDomain, /status IN \('open','acknowledged','escalated_further'\)/);
  assert.match(governedDomain, /EscalationEscalatedFurther/);
  assert.match(operatorScreen, /value: "escalated_further"/);
  assert.match(operatorScreen, /label="تصعيد أعلى"/);
  assert.match(operatorScreen, /label="حل التصعيد"/);
});

test("JRN-024 affected React Native screens contain no inline style objects", () => {
  for (const [name, source] of [
    ["visit", visitScreen],
    ["queue", queueScreen],
    ["checklist", checklistScreen],
  ]) {
    assert.doesNotMatch(source, /style=\{\{/u, `${name} screen contains an inline style object`);
  }
});
