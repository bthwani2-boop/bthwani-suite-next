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

test("JRN-022 client surface exposes creation and owned lifecycle navigation", () => {
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

test("JRN-022 shared API binds information exchange execution and financial readback", () => {
  const api = read("services/dsh/frontend/shared/special-requests/special-requests.api.ts");
  assertIncludesAll(api, [
    "/information-exchange",
    "/information-response",
    "/information-request",
    "/execution",
    "fetchClientSpecialRequestExecution",
    "fetchOperatorSpecialRequestExecution",
    "respondClientSpecialRequestInformation",
    "requestOperatorSpecialRequestInformation",
  ], "special-request API");
});

test("JRN-022 controllers coordinate canonical information and evidence readback", () => {
  const controller = read("services/dsh/frontend/shared/special-requests/use-special-requests-controller.tsx");
  assertIncludesAll(controller, [
    "fetchClientDetailBundle",
    "fetchOperatorDetailBundle",
    "detailsByRequestId",
    "respondInformation",
    "requestInformation",
    "expectedVersion: request.version",
    "await loadDetailBundle",
    "financial: execution.financial",
  ], "special-request controllers");
});

test("JRN-022 client screen answers questions and reads execution proof exceptions and WLT", () => {
  const screen = read("services/dsh/frontend/shared/special-requests/ClientSpecialRequestsScreen.tsx");
  const actions = read("services/dsh/frontend/shared/special-requests/special-requests.actions.ts");
  assertIncludesAll(screen, [
    "canClientRespondToInformation",
    "إرسال المعلومات ومتابعة المراجعة",
    "خط التنفيذ والأدلة",
    "مرجع إثبات التسليم",
    "آخر استثناء تشغيلي",
    "القراءة المالية من WLT",
    "قابلية التسوية",
    "اعتماد العرض والدفع",
    "جاري رفض العرض",
  ], "client special-request screen");
  assertIncludesAll(actions, [
    'request.workflowStage === "customer_information"',
    'request.workflowStage === "customer_approval"',
    'return isClientQuoteDecisionPending(request) ? "رفض العرض" : "إلغاء الطلب"',
  ], "client special-request actions");
  assert.ok(!screen.includes('role="headingXs"'), "client screen must only use governed typography roles");
});

test("JRN-022 operator workbench requests information and reads evidence through UI Kit", () => {
  const workbench = read("services/dsh/frontend/shared/special-requests/OperatorSpecialRequestsWorkbench.tsx");
  assertIncludesAll(workbench, [
    "expectedVersion: selectedRequest.version",
    "workflowStage: 'customer_approval'",
    "requestInformation(selectedRequest, question)",
    "طلب المعلومات من العميل",
    "رد العميل",
    "التنفيذ والأدلة والاستثناءات",
    "مرجع إثبات التسليم",
    "القراءة المالية من WLT",
    "assignDispatch(selectedRequest.id, captainId)",
    "<TextField",
    "<Button",
  ], "operator special-request workbench");
  assert.ok(!workbench.includes("<input"), "operator workbench must not bypass governed TextField");
  assert.ok(!workbench.includes("<button"), "operator workbench must not bypass governed Button");
});

test("JRN-022 intake forms use governed UI Kit fields without raw TextInput", () => {
  for (const relativePath of [
    "services/dsh/frontend/shared/shein/SheinForm.tsx",
    "services/dsh/frontend/shared/awnak/AwnakForm.tsx",
  ]) {
    const form = read(relativePath);
    assert.ok(form.includes("TextField"), `${relativePath} must use TextField`);
    assert.ok(!form.includes("TextInput"), `${relativePath} must not use raw TextInput`);
  }
});

test("JRN-022 frontend dispatch adapter matches the backend assignment response", () => {
  const api = read("services/dsh/frontend/shared/special-requests/special-requests.api.ts");
  assertIncludesAll(api, [
    "assignSpecialRequestDispatch",
    "): Promise<void>",
    "readonly assignment: unknown",
    'method: "POST"',
  ], "special-request API adapter");
});

test("JRN-022 backend owns information execution and exception routes", () => {
  const stages = read("services/dsh/backend/internal/specialrequests/workflow_stages.go");
  const routeTests = read("services/dsh/backend/internal/http/jrn_022_special_requests_routes_test.go");
  const information = read("services/dsh/backend/internal/specialrequests/information_exchange.go");
  const execution = read("services/dsh/backend/internal/specialrequests/execution.go");
  const exceptions = read("services/dsh/backend/internal/dispatch/delivery_exceptions_special_requests.go");
  assertIncludesAll(stages, [
    'sheinStageRules["customer_information"]',
    'awnakStageRules["customer_information"]',
    'sheinDefaultStage[StatusInProgress] = "out_for_delivery"',
  ], "canonical workflow stages");
  assertIncludesAll(routeTests, [
    '"GET /dsh/client/special-requests/{requestId}/information-exchange"',
    '"POST /dsh/client/special-requests/{requestId}/information-response"',
    '"GET /dsh/client/special-requests/{requestId}/execution"',
    '"POST /dsh/operator/special-requests/{requestId}/information-request"',
    '"GET /dsh/operator/special-requests/{requestId}/execution"',
  ], "special-request route tests");
  assertIncludesAll(information, [
    "RequestClientInformationInTenant",
    "RespondClientInformationInTenant",
    '"special_request_information_requested"',
    '"special_request_information_responded"',
  ], "information exchange owner");
  assertIncludesAll(execution, ["PoDReference", "LatestException"], "execution evidence projection");
  assertIncludesAll(exceptions, ["resolveSpecialRequestExceptionReassignCaptainTx", '"special_request_reassigned"'], "exception owner extension");
});

test("JRN-022 captain inbox recognizes Awnak and SHEIN final-mile assignments", () => {
  const mapper = read("services/dsh/frontend/shared/delivery/captain-inbox.mapper.ts");
  assertIncludesAll(mapper, [
    "if (assignment.requestType === 'AWNAK_ERRAND') return 'awnak'",
    "if (assignment.requestType === 'SHEIN_ASSISTED_PURCHASE') return 'shein-final-mile'",
    "assignment.specialRequestId",
  ], "captain special-request mapping");
});

test("JRN-022 financial and dispatch boundaries remain explicit", () => {
  const http = read("services/dsh/backend/internal/http/specialrequests.go");
  const executionHttp = read("services/dsh/backend/internal/http/specialrequests_execution.go");
  assertIncludesAll(http, [
    "CreatePaymentSession",
    'PaymentMethod:    "official_wallet"',
    '"WLT_HANDOFF_UNAVAILABLE"',
    '"SPECIAL_REQUEST_NOT_READY_FOR_DISPATCH"',
    '"blockingReasons": notReady.Readiness.BlockingReasons',
    'req.WorkflowStage == nil || *req.WorkflowStage != "customer_approval"',
  ], "special-request HTTP boundary");
  assertIncludesAll(executionHttp, [
    '"owner":                   "WLT"',
    '"settlementApplicability": "not_applicable"',
    "GetPaymentSession",
  ], "financial readback boundary");
});

test("JRN-022 execution response contract includes financial readback", () => {
  const schemas = read("services/dsh/contracts/components/schemas/common.schemas.yaml");
  assertIncludesAll(schemas, [
    "DshSpecialRequestFinancialReadback:",
    "DshSpecialRequestPaymentSessionReadback:",
    "required: [execution, financial]",
    'settlementApplicability: { type: string, enum: [not_applicable] }',
  ], "special-request execution contract");
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
  for (const phrase of [
    "Operator can request missing information",
    "Client and operator can read assignment, delivery, proof of delivery and latest exception evidence",
    "partner settlement not applicable",
    "Binary media is not required",
  ]) {
    assert.ok(
      productTruth.acceptance.criteria.some((criterion) => criterion.includes(phrase)),
      `product truth acceptance is missing ${phrase}`,
    );
  }
});
