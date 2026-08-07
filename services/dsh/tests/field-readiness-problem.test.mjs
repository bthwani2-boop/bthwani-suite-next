import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  classifyFieldReadinessError,
  createFieldReadinessProblem,
} = await import(
  "../dist/services/dsh/frontend/shared/field-readiness/field-readiness.problem.js"
);
const {
  visitActionErrorState,
} = await import(
  "../dist/services/dsh/frontend/shared/field-readiness/field-readiness.states.js"
);

const backendSource = await readFile(
  new URL("../backend/internal/http/fieldreadiness.go", import.meta.url),
  "utf8",
);
const problemSource = await readFile(
  new URL(
    "../frontend/shared/field-readiness/field-readiness.problem.ts",
    import.meta.url,
  ),
  "utf8",
);

const BACKEND_CODES = [
  "NOT_FOUND",
  "FORBIDDEN",
  "CHECKLIST_INCOMPLETE",
  "EVIDENCE_REQUIRED",
  "OPEN_ESCALATION",
  "VISIT_ALREADY_COMPLETE",
  "VISIT_ALREADY_IN_PROGRESS",
  "LOCATION_REQUIRED",
  "LOCATION_STALE",
  "LOCATION_ACCURACY",
  "LOCATION_MOCKED",
  "GEOFENCE_VIOLATION",
  "INVALID_INPUT",
  "INTERNAL_ERROR",
];

describe("field readiness problem contract", () => {
  test("keeps every backend field-readiness code in the shared classifier", () => {
    for (const code of BACKEND_CODES) {
      assert.match(backendSource, new RegExp(`"${code}"`), `${code} must remain emitted by the backend`);
      assert.match(problemSource, new RegExp(`\\b${code}\\b`), `${code} must remain classified by the shared frontend brain`);
    }
  });

  test("preserves business blockers and their allowed recovery action", () => {
    assert.deepEqual(
      classifyFieldReadinessError({
        kind: "http",
        status: 409,
        code: "CHECKLIST_INCOMPLETE",
        message: "not all required readiness checks have passed",
      }),
      {
        kind: "blocked",
        code: "CHECKLIST_INCOMPLETE",
        message: "لا يمكن إكمال الزيارة قبل اجتياز جميع عناصر قائمة التحقق الإلزامية.",
        retryable: false,
        nextAction: "complete_checklist",
        status: 409,
        serverMessage: "not all required readiness checks have passed",
      },
    );

    const geofence = classifyFieldReadinessError({
      kind: "http",
      status: 409,
      body: JSON.stringify({
        code: "GEOFENCE_VIOLATION",
        message: "completion location is outside the allowed geofence radius",
      }),
    });
    assert.equal(geofence.kind, "location");
    assert.equal(geofence.nextAction, "move_into_geofence");
    assert.equal(geofence.retryable, true);
    assert.equal(geofence.code, "GEOFENCE_VIOLATION");
  });

  test("distinguishes revocation, offline, not-found, and generic conflicts", () => {
    const forbidden = classifyFieldReadinessError({ kind: "http", status: 403 });
    assert.equal(forbidden.kind, "permission_denied");
    assert.equal(forbidden.nextAction, "refresh_scope");

    const offline = classifyFieldReadinessError({ kind: "network", message: "socket closed" });
    assert.equal(offline.kind, "offline");
    assert.equal(offline.retryable, true);
    assert.equal(offline.code, "NETWORK_UNAVAILABLE");

    const missing = classifyFieldReadinessError({ kind: "http", status: 404 });
    assert.equal(missing.kind, "not_found");
    assert.equal(missing.nextAction, "refresh_record");

    const conflict = classifyFieldReadinessError({ kind: "http", status: 409 });
    assert.equal(conflict.kind, "conflict");
    assert.equal(conflict.code, "STATE_CONFLICT");
  });

  test("keeps structured problem metadata in controller error states", () => {
    const problem = createFieldReadinessProblem(
      "VISIT_NOT_EDITABLE",
      "لا يمكن تعديل الزيارة في حالتها الحالية.",
      { kind: "blocked", nextAction: "refresh_record" },
    );
    const state = visitActionErrorState(problem);
    assert.equal(state.kind, "error");
    assert.equal(state.message, problem.message);
    assert.deepEqual(state.problem, problem);
  });
});
