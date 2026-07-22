import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const includesAll = (source, values, label) => {
  for (const value of values) assert.ok(source.includes(value), `${label} missing ${value}`);
};

const truth = JSON.parse(read("governance/product/contracts/jrn-034-payments-payment-sessions.product-truth.json"));
assert.equal(truth.capabilityId, "JRN_034_PAYMENTS_PAYMENT_SESSIONS");
assert.equal(truth.owners.productManagerApproval, "PENDING");
assert.equal(truth.owners.productOwnerApproval, "PENDING");
assert.equal(truth.owners.productAcceptanceDecision, "PENDING");
assert.ok(truth.acceptance.criteria.length >= 10);
assert.ok(truth.invariants.negative.some((value) => value.includes("captured session")));

const migration = read("services/wlt/database/migrations/wlt-036_payment_session_operations_and_provider_events.sql");
includesAll(migration, [
  "wlt_payment_operation_receipts",
  "wlt_payment_provider_events",
  "capture_ledger_transaction_id",
  "idempotency_key",
  "payload_hash",
  "provider_result_unknown",
], "payment migration");
const probes = read("infra/docker/scripts/wlt-migration-probes.ps1");
assert.ok(probes.includes("wlt-036_payment_session_operations_and_provider_events.sql"));

const router = read("services/wlt/backend/internal/http/server.go");
includesAll(router, [
  "/wlt/payment-sessions/{paymentSessionId}/authorize",
  "/wlt/payment-sessions/{paymentSessionId}/capture",
  "/wlt/payment-sessions/{paymentSessionId}/refresh-provider-status",
  "/wlt/payment-sessions/{paymentSessionId}/timeline",
  "/wlt/provider/webhooks/payment",
  "HandleAuthorizeSessionSovereign",
  "HandleCaptureSessionSovereign",
  "HandleGovernedPaymentOperation",
  "HandleTenantScopedPaymentSession",
], "WLT router");
const operationGuard = read("services/wlt/backend/internal/payment/operation_idempotency.go");
includesAll(operationGuard, ["Idempotency-Key", "X-Tenant-ID", "X-Correlation-ID", "PAYMENT_OPERATION_IN_PROGRESS", "IDEMPOTENCY_CONFLICT"], "operation replay guard");
const webhook = read("services/wlt/backend/internal/payment/provider_webhook.go");
includesAll(webhook, ["hmac.New", "sha256.New", "providerWebhookMaxSkew", "MaxBytesReader", "WLT_PROVIDER_WEBHOOK_SECRET"], "provider webhook");
const providerResults = read("services/wlt/backend/internal/payment/provider_results.go");
includesAll(providerResults, ["ApplyAuthoritativeProviderEvent", "getSessionForUpdateTx", "ErrProviderTenantMismatch", "PostLedgerTransaction", "provider_clearing", "platform_payable", "dshoutbox.Enqueue"], "provider result application");
assert.ok(providerResults.indexOf("getSessionForUpdateTx") < providerResults.indexOf("INSERT INTO wlt_payment_provider_events"), "provider event must validate and lock its payment session before persistence");
const authorize = read("services/wlt/backend/internal/payment/sovereign_authorize.go");
includesAll(authorize, ["AuthorizeSessionWithProviderSovereign", "finalizationFailure", "provider_result_unknown", "markSessionResultUnknownAndOpenCase", "last_provider_status = 'authorized'"], "sovereign authorize");
const capture = read("services/wlt/backend/internal/payment/sovereign_capture.go");
includesAll(capture, ["capture_ledger_transaction_id", "PostLedgerTransaction", "EventTypeCaptured", "finalizationFailure", "markSessionResultUnknownAndOpenCase"], "sovereign capture");

const wltContract = read("services/wlt/contracts/wlt.payments.openapi.yaml");
includesAll(wltContract, [
  "operationId: createWltPaymentSession",
  "operationId: authorizeWltPaymentSession",
  "operationId: captureWltPaymentSession",
  "operationId: refreshWltPaymentSessionProviderStatus",
  "operationId: receiveWltPaymentProviderWebhook",
  "operationId: getWltPaymentSessionTimeline",
], "WLT payment contract");
const dshContract = read("services/dsh/contracts/dsh.payment-sessions.openapi.yaml");
includesAll(dshContract, ["operationId: getDshPaymentSessionTimeline", "operationId: refreshDshPaymentSessionProviderStatus"], "DSH payment contract");
const masterContract = read("contracts/master.openapi.yaml");
includesAll(masterContract, ["dshPaymentSessions:", "wltPayments:"], "master contract index");

const dshRouter = read("services/dsh/backend/internal/http/server.go");
includesAll(dshRouter, [
  "/dsh/control-panel/finance/payment-sessions/{paymentSessionId}/timeline",
  "/dsh/control-panel/finance/payment-sessions/{paymentSessionId}/refresh-provider-status",
], "DSH router");
const dshClient = read("services/dsh/backend/internal/wlt/payment_sessions.go");
includesAll(dshClient, ["ReadPaymentSessionTimeline", "RefreshPaymentSessionProviderStatus", "X-Tenant-ID", "setServiceHeaders"], "DSH WLT client");

const sharedStates = read("services/wlt/frontend/shared/dsh/wlt-dsh-payment-session.states.ts");
includesAll(sharedStates, ["provider_result_unknown", "لا تكرر الدفع", "captured", "expired"], "shared payment states");
const paymentController = read("services/wlt/frontend/shared/dsh/use-wlt-dsh-payment-controller.tsx");
includesAll(paymentController, ["EXPO_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED", "NEXT_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED", "محجوب تشغيليًا"], "client payment decision controller");
const operationsScreen = read("services/dsh/frontend/control-panel/finance/PaymentSessionOperationsScreen.tsx");
includesAll(operationsScreen, ["عمليات جلسات الدفع", "إيصالات العمليات", "أحداث المزود الموقعة", "المطابقة والتسوية", "تحديث حالة المزود"], "control-panel payment operations screen");
assert.ok(!operationsScreen.includes("NEXT_PUBLIC_WLT_API_BASE_URL"), "control panel must not call WLT directly");

console.log("JRN-034 structural closure guard passed");
