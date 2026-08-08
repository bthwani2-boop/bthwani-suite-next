import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  classifyGovernedError,
  createGovernedProblem,
} = await import(
  "../dist/services/dsh/frontend/shared/field-readiness/field-readiness.problem.js"
);
const {
  visitActionErrorState,
} = await import(
  "../dist/services/dsh/frontend/shared/field-readiness/field-readiness.states.js"
);
const {
  buildGovernedProblemView,
} = await import(
  "../dist/services/dsh/frontend/shared/field-readiness/field-readiness.problem-view.js"
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
const problemViewSource = await readFile(
  new URL(
    "../frontend/shared/field-readiness/field-readiness.problem-view.ts",
    import.meta.url,
  ),
  "utf8",
);
const transportSource = await readFile(
  new URL(
    "../frontend/shared/_kernel/dsh-http-request.ts",
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
      classifyGovernedError({
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

    const geofence = classifyGovernedError({
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
    const forbidden = classifyGovernedError({ kind: "http", status: 403 });
    assert.equal(forbidden.kind, "permission_denied");
    assert.equal(forbidden.nextAction, "refresh_scope");

    const offline = classifyGovernedError({ kind: "network", message: "socket closed" });
    assert.equal(offline.kind, "offline");
    assert.equal(offline.retryable, true);
    assert.equal(offline.code, "NETWORK_UNAVAILABLE");

    const missing = classifyGovernedError({ kind: "http", status: 404 });
    assert.equal(missing.kind, "not_found");
    assert.equal(missing.nextAction, "refresh_record");

    const conflict = classifyGovernedError({ kind: "http", status: 409 });
    assert.equal(conflict.kind, "conflict");
    assert.equal(conflict.code, "STATE_CONFLICT");
  });

  test("keeps structured problem metadata in controller error states", () => {
    const problem = createGovernedProblem(
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

describe("field problem support reference", () => {
  test("transport attaches the request correlation id to failures", () => {
    // Without this the employee and support have no shared reference for the
    // failed request.
    assert.match(transportSource, /parseResponse<T>\(response, correlationId\)/);
    assert.match(transportSource, /kind: "http", status: response\.status, body, code, message, correlationId/);
  });

  test("classifier preserves the correlation id alongside the reason code", () => {
    const problem = classifyGovernedError({
      kind: "http",
      status: 409,
      code: "OPEN_ESCALATION",
      correlationId: "field-readiness-8f3a2c",
    });
    assert.equal(problem.code, "OPEN_ESCALATION");
    assert.equal(problem.nextAction, "resolve_escalation");
    assert.equal(problem.correlationId, "field-readiness-8f3a2c");
  });

  test("absent correlation id does not fabricate one", () => {
    const problem = classifyGovernedError({ kind: "http", status: 403 });
    assert.equal(problem.correlationId, undefined);
    assert.equal(buildGovernedProblemView(problem).correlationId, null);
  });
});

describe("field problem view model", () => {
  test("labels every declared next action", () => {
    // An unlabeled next action would render a button with no text, so the map
    // must stay exhaustive as the taxonomy grows.
    const declared = [
      ...problemSource.matchAll(/^\s*\|\s*"([a-z_]+)"$/gm),
    ].map((match) => match[1]);
    const nextActions = declared.filter((value) =>
      new RegExp(`^\\s*${value}:`, "m").test(problemViewSource),
    );
    assert.ok(nextActions.length >= 12, "next action labels must be present");

    for (const code of BACKEND_CODES) {
      const view = buildGovernedProblemView(classifyGovernedError({ code }));
      assert.ok(view.title, `${code} must produce a title`);
      assert.ok(view.description, `${code} must produce a description`);
      assert.equal(view.code, code);
    }
  });

  test("a non-retryable blocker offers its recovery action and no bare retry", () => {
    const view = buildGovernedProblemView(
      classifyGovernedError({ code: "CHECKLIST_INCOMPLETE" }),
    );
    assert.equal(view.retryable, false);
    assert.deepEqual(view.primaryAction, {
      actionId: "complete_checklist",
      label: "استكمال قائمة التحقق",
    });
  });

  test("a retryable failure stays retryable", () => {
    const view = buildGovernedProblemView(
      classifyGovernedError({ kind: "network", message: "socket closed" }),
    );
    assert.equal(view.retryable, true);
    assert.equal(view.primaryAction?.actionId, "retry");
  });

  test("client-detected refusals reuse the governed server taxonomy", () => {
    // A locally detected location or media refusal must read the same as the
    // equivalent server refusal on every surface.
    for (const [code, expectedAction] of [
      ["LOCATION_PERMISSION_DENIED", "enable_location"],
      ["LOCATION_SERVICES_DISABLED", "enable_location"],
      ["MEDIA_PERMISSION_DENIED", "add_evidence"],
      ["OFFLINE_QUEUE_CORRUPT", "recover_queue"],
    ]) {
      const problem = classifyGovernedError({ code });
      assert.equal(problem.code, code);
      assert.equal(problem.nextAction, expectedAction);
      assert.equal(problem.retryable, false, `${code} must not offer a bare retry`);
    }
  });

  test("an unmapped code degrades to a diagnosable internal problem", () => {
    const problem = classifyGovernedError({
      kind: "http",
      status: 500,
      code: "SOME_FUTURE_CODE",
      correlationId: "cid-1",
    });
    const view = buildGovernedProblemView(problem);
    assert.equal(view.code, "SOME_FUTURE_CODE");
    assert.equal(view.correlationId, "cid-1");
    assert.ok(view.supportHint, "internal failures must point at support");
  });
});
