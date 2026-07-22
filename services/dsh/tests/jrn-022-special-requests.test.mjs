import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "../../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function assertIncludesAll(content, values, label) {
  for (const value of values) {
    assert.ok(content.includes(value), `${label} is missing ${value}`);
  }
}

test("JRN-022 client surface exposes the complete special-request lifecycle", () => {
  const surface = read("services/dsh/frontend/app-client/DshClientSurface.tsx");
  assertIncludesAll(surface, [
    'id: "special"',
    'label: "طلبات خاصة"',
    "<ClientSpecialRequestsScreen",
    'activeSpecialRequest === "shein"',
    'activeSpecialRequest === "awnak"',
    "onViewRequests={openSpecialRequestList}",
  ], "client surface");
});

test("JRN-022 client controller reads back quote approval and cancellation", () => {
  const controller = read("services/dsh/frontend/shared/special-requests/use-special-requests-controller.tsx");
  assertIncludesAll(controller, [
    "useClientSpecialRequestsListController",
    "fetchClientSpecialRequests",
    "cancelSpecialRequest(request.id, request.version)",
    "approveSpecialRequestQuote(request.id, request.version)",
    "await load()",
    "busyRequestId",
  ], "client special-request controller");
});

test("JRN-022 shared client screen binds governed actions and recovery states", () => {
  const screen = read("services/dsh/frontend/shared/special-requests/ClientSpecialRequestsScreen.tsx");
  assertIncludesAll(screen, [
    "canClientApproveSpecialRequestQuote",
    "canClientCancelSpecialRequest",
    "اعتماد العرض والدفع",
    "إلغاء الطلب",
    "إعادة المحاولة",
    "wltPaymentSessionId",
  ], "client special-request screen");
  assert.ok(!screen.includes('role="headingXs"'), "client screen must only use governed typography roles");
});

test("JRN-022 operator workbench performs quote transition and dispatch", () => {
  const workbench = read("services/dsh/frontend/shared/special-requests/OperatorSpecialRequestsWorkbench.tsx");
  assertIncludesAll(workbench, [
    "expectedVersion: selectedRequest.version",
    "workflowStage: 'customer_approval'",
    "quotePreparedAt: new Date().toISOString()",
    "assignDispatch(selectedRequest.id, captainId)",
    "إرسال العرض للعميل",
    "إسناد الطلب للكابتن",
  ], "operator special-request workbench");
  assert.ok(!workbench.includes('role="titleXs"'), "operator workbench must only use governed typography roles");
});

test("JRN-022 frontend dispatch adapter matches the backend assignment response", () => {
  const api = read("services/dsh/frontend/shared/special-requests/special-requests.api.ts");
  assertIncludesAll(api, [
    "assignSpecialRequestDispatch(",
    "): Promise<void>",
    "readonly assignment: unknown",
    'method: "POST"',
  ], "special-request API adapter");
  assert.ok(
    !api.includes("assignSpecialRequestDispatch(\n  id: string,\n  captainId: string,\n): Promise<DshSpecialRequestResponse>"),
    "dispatch adapter must not misrepresent assignment response as a special request",
  );
});

test("JRN-022 backend owns canonical stages and all governed routes", () => {
  const stages = read("services/dsh/backend/internal/specialrequests/workflow_stages.go");
  const stageTests = read("services/dsh/backend/internal/specialrequests/workflow_stages_test.go");
  const routeTests = read("services/dsh/backend/internal/http/jrn_022_special_requests_routes_test.go");
  assertIncludesAll(stages, [
    'sheinDefaultStage[StatusInProgress] = "out_for_delivery"',
    'awnakDefaultStage[StatusNeedsCustomerInput] = "customer_approval"',
  ], "canonical workflow stages");
  assertIncludesAll(stageTests, [
    "TestCanonicalSpecialRequestStagesAreKnownToService",
    "TestDefaultWorkflowStageMatchesCustomerAndDeliveryReadback",
  ], "workflow-stage regression tests");
  assertIncludesAll(routeTests, [
    '"POST /dsh/client/special-requests"',
    '"POST /dsh/client/special-requests/{requestId}/approve-quote"',
    '"PATCH /dsh/operator/special-requests/{requestId}"',
    '"POST /dsh/operator/special-requests/{requestId}/dispatch"',
  ], "special-request route tests");
});

test("JRN-022 captain inbox recognizes Awnak and SHEIN final-mile assignments", () => {
  const mapper = read("services/dsh/frontend/shared/delivery/captain-inbox.mapper.ts");
  assertIncludesAll(mapper, [
    "if (assignment.requestType === 'AWNAK_ERRAND') return 'awnak'",
    "if (assignment.requestType === 'SHEIN_ASSISTED_PURCHASE') return 'shein-final-mile'",
    "assignment.specialRequestId",
  ], "captain special-request mapping");
});

test("JRN-022 WLT approval handoff and structured dispatch blockers remain bound", () => {
  const http = read("services/dsh/backend/internal/http/specialrequests.go");
  assertIncludesAll(http, [
    "CreatePaymentSession",
    'PaymentMethod:    "official_wallet"',
    '"WLT_HANDOFF_UNAVAILABLE"',
    '"SPECIAL_REQUEST_NOT_READY_FOR_DISPATCH"',
    '"blockingReasons": notReady.Readiness.BlockingReasons',
  ], "special-request HTTP boundary");
});

test("JRN-022 product truth is schema-valid and remains independently approvable", () => {
  const schema = JSON.parse(read("governance/product/product-truth.schema.json"));
  const productTruth = JSON.parse(read("governance/product/contracts/jrn-022-special-requests.product-truth.json"));
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  assert.equal(validate(productTruth), true, JSON.stringify(validate.errors));
  assert.equal(productTruth.capabilityId, "JRN_022_SPECIAL_REQUESTS");
  assert.equal(productTruth.state, "DISCOVERY");
  assert.equal(productTruth.owners.productManagerApproval, "PENDING");
  assert.equal(productTruth.owners.productOwnerApproval, "PENDING");
  assert.equal(productTruth.owners.productAcceptanceDecision, "PENDING");
  assert.ok(
    productTruth.acceptance.criteria.some((criterion) => criterion.includes("Binary media is not required")),
    "media applicability decision must remain explicit",
  );
});
