import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const DSH_ROOT = new URL("../", import.meta.url);
const readDsh = (path) => fs.readFileSync(new URL(path, DSH_ROOT), "utf8");

function assertAll(source, markers, label) {
  for (const marker of markers) assert.match(source, marker, `${label} is missing ${marker}`);
}

function assertNone(source, markers, label) {
  for (const marker of markers) assert.doesNotMatch(source, marker, `${label} contains forbidden ${marker}`);
}

test("JRN-012 persists timing issues decisions alerts audit history and replay keys", () => {
  const timing = readDsh("database/migrations/dsh-095_order_preparation_timing.sql");
  const issues = readDsh("database/migrations/dsh-126_order_preparation_issues.sql");
  const itemBinding = readDsh("database/migrations/dsh-127_preparation_issue_item_binding.sql");
  const decisions = readDsh("database/migrations/dsh-128_preparation_issue_customer_decision.sql");
  const alerts = readDsh("database/migrations/dsh-129_order_preparation_alerts.sql");
  assertAll(timing, [
    /dsh_store_order_preparation_policies/,
    /estimated_ready_at/,
    /dsh_order_preparation_estimate_events/,
    /UNIQUE \(order_id, correlation_id\)/,
  ], "preparation timing migration");
  assertAll(issues, [
    /dsh_order_preparation_issues/,
    /missing_item/,
    /substitution_required/,
    /quality_issue/,
    /uq_dsh_order_preparation_open_issue/,
    /dsh_order_preparation_issue_events/,
    /UNIQUE \(issue_id, correlation_id\)/,
  ], "preparation issues migration");
  assertAll(itemBinding, [
    /dsh_order_preparation_issues_item_binding_check/,
    /issue_kind = 'other' OR order_item_id IS NOT NULL/,
  ], "preparation issue item binding migration");
  assertAll(decisions, [
    /customer_decision/,
    /pending/,
    /approved/,
    /rejected/,
    /customer_decision_shape_check/,
    /event_type IN \('opened', 'customer_decision', 'resolved'\)/,
  ], "customer substitution decision migration");
  assertAll(alerts, [
    /dsh_order_preparation_alerts/,
    /due_soon/,
    /overdue/,
    /customer_decision_pending/,
    /uq_dsh_order_preparation_active_alert/,
  ], "preparation alert migration");
  assertNone(
    `${issues}\n${itemBinding}\n${decisions}\n${alerts}`,
    [/wallet/i, /ledger/i, /settlement/i, /refund_amount/i, /captured_amount/i],
    "DSH preparation migrations",
  );
});

test("JRN-012 backend owns decisions issue lifecycle alerts permissions and atomic readiness", () => {
  const domain = readDsh("backend/internal/orders/preparation_issues.go");
  const alerts = readDsh("backend/internal/orders/preparation_alerts.go");
  const guard = readDsh("backend/internal/orders/preparation_ready_guard.go");
  const lifecycle = readDsh("backend/internal/orders/lifecycle.go");
  const handler = readDsh("backend/internal/http/order_preparation_issues.go");
  const timingHandler = readDsh("backend/internal/http/order_preparation.go");
  const alertHandler = readDsh("backend/internal/http/order_preparation_alerts.go");
  const access = readDsh("backend/internal/http/order_preparation_access.go");
  const routes = readDsh("backend/internal/http/order_journey_routes.go");
  const workboard = readDsh("backend/internal/http/partner_order_workboard.go");

  assertAll(domain, [
    /CreatePreparationIssue/,
    /DecidePreparationIssue/,
    /ResolvePreparationIssue/,
    /customer substitution decision is still pending/,
    /WHERE id=\$1::uuid AND order_id=\$2::uuid/,
    /affected quantity exceeds ordered quantity/,
    /FOR UPDATE/,
    /order\.preparation_issue_customer_decided/,
    /order\.preparation_issue_resolved/,
  ], "preparation issue domain");
  assertAll(alerts, [
    /RefreshPreparationAlerts/,
    /ListPreparationAlerts/,
    /AcknowledgePreparationAlert/,
    /alert condition no longer active/,
    /order\.preparation_alert_opened/,
    /order\.preparation_alert_acknowledged/,
  ], "preparation alert domain");
  assertAll(guard, [
    /FOR UPDATE/,
    /countOpenPreparationIssuesTx/,
    /preparation issues must be resolved before readiness/,
    /StatusReadyForPickup/,
  ], "readiness guard");
  assert.match(lifecycle, /return MarkReadyWithIssueGuard\(db, orderID, actorID\)/);
  assertAll(handler, [
    /handleListPreparationIssues/,
    /handleCreatePreparationIssue/,
    /handleDecidePreparationIssue/,
    /handleResolvePreparationIssue/,
    /captainCanReadOrderPreparation/,
    /OperationsPermissionRead/,
    /pendingCustomerDecisionCount/,
    /X-Correlation-ID/,
    /ExpectedVersion/,
  ], "preparation issue handlers");
  assertAll(timingHandler, [
    /"client", "partner", "captain", "operator"/,
    /captainCanReadOrderPreparation/,
    /OperationsPermissionRead/,
  ], "preparation timing authorization");
  assertAll(access, [
    /dsh_assignments/,
    /captain_id=\$3/,
    /status IN \('offered','accepted','completed'\)/,
  ], "captain preparation access");
  assertAll(alertHandler, [
    /OperationsPermissionManage/,
    /OperationsPermissionRead/,
    /handleRefreshPreparationAlerts/,
    /handleAcknowledgePreparationAlert/,
  ], "preparation alert handlers");
  assertAll(routes, [
    /GET \/dsh\/orders\/\{orderId\}\/preparation-issues/,
    /POST \/dsh\/client\/orders\/\{orderId\}\/preparation-issues\/\{issueId\}\/decision/,
    /POST \/dsh\/operator\/order-preparation\/alerts\/refresh/,
    /GET \/dsh\/operator\/order-preparation\/alerts/,
  ], "preparation routes");
  assertAll(workboard, [
    /PendingCustomerDecisionCount/,
    /ResolvablePreparationIssueCount/,
    /customerDecision/,
    /resolvable_count/,
    /openPreparationIssueCount > 0/,
  ], "partner workboard");
});

test("JRN-012 OpenAPI declares every live preparation capability and projection", () => {
  const contract = readDsh("contracts/fragments/order-preparation-handoff.fragment.yaml");
  assertAll(contract, [
    /\/dsh\/partner\/order-workboard:/,
    /\/dsh\/orders\/\{orderId\}\/preparation:/,
    /\/dsh\/partner\/orders\/\{orderId\}\/preparation-estimate:/,
    /\/dsh\/orders\/\{orderId\}\/preparation-issues:/,
    /\/dsh\/client\/orders\/\{orderId\}\/preparation-issues\/\{issueId\}\/decision:/,
    /\/dsh\/operator\/order-preparation\/alerts\/refresh:/,
    /\/dsh\/operator\/order-preparation\/alerts:/,
    /DshPreparationIssueCustomerDecision:/,
    /DshDecidePreparationIssueInput:/,
    /DshPreparationAlert:/,
    /pendingCustomerDecisionCount/,
    /resolvablePreparationIssueCount/,
    /openStoreCaptainHandoffExceptionId/,
  ], "preparation OpenAPI fragment");
});

test("JRN-012 shared brain rejects incomplete truth and exposes recovery states", () => {
  const types = readDsh("frontend/shared/orders/orders.types.ts");
  const api = readDsh("frontend/shared/orders/orders.api.ts");
  const adapter = readDsh("frontend/shared/partner/partner.adapters.ts");
  const readback = readDsh("frontend/shared/orders/use-order-preparation-readback.ts");
  const card = readDsh("frontend/shared/orders/OrderPreparationReadbackCard.tsx");
  const alertController = readDsh("frontend/shared/orders/use-operator-preparation-alerts.ts");
  assertAll(types, [
    /DshPreparationIssueCustomerDecision/,
    /DshDecidePreparationIssueInput/,
    /pendingCustomerDecisionCount/,
    /resolvablePreparationIssueCount/,
  ], "shared preparation types");
  assertAll(api, [
    /fetchOrderPreparationIssues/,
    /decideOrderPreparationIssue/,
    /resolveOrderPreparationIssue/,
    /pendingCustomerDecisionCount/,
  ], "shared preparation API");
  assertAll(adapter, [
    /pending customer decision count is inconsistent/,
    /resolvable preparation issue count is inconsistent/,
    /preparation decision counts exceed open issues/,
    /missing immutable order items/,
  ], "partner adapter");
  assertAll(readback, [
    /kind: 'offline'/,
    /kind: 'forbidden'/,
    /kind: 'not_found'/,
    /pollIntervalMs/,
    /Promise\.all/,
  ], "cross-surface readback controller");
  assertAll(card, [
    /PREPARATION_SLA_LABELS/,
    /pendingCustomerDecisionCount/,
    /actionLabel: 'إعادة المحاولة'/,
  ], "cross-surface readback card");
  assertAll(alertController, [
    /kind: 'conflict'/,
    /refreshOrderPreparationAlerts/,
    /acknowledgeOrderPreparationAlert/,
  ], "operator alert controller");
  assertNone(
    `${api}\n${readback}\n${alertController}`,
    [/mock/i, /fixture/i, /wallet\.debit/, /wallet\.credit/],
    "shared preparation brain",
  );
});

test("JRN-012 partner and client perform real issue and substitution workflows", () => {
  const partnerPanel = readDsh("frontend/app-partner/orders/PreparationIssuesPanel.tsx");
  const partnerScreen = readDsh("frontend/app-partner/orders/GovernedPartnerOrdersScreen.tsx");
  const partnerInbox = readDsh("frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx");
  const clientPanel = readDsh("frontend/app-client/orders/ClientPreparationDecisionPanel.tsx");
  const clientTracking = readDsh("frontend/app-client/orders/OrderTrackingScreen.tsx");
  const clientController = readDsh("frontend/shared/orders/use-client-order-journey-controller.ts");
  assertAll(partnerPanel, [
    /createOrderPreparationIssue/,
    /resolveOrderPreparationIssue/,
    /selectedIssue\.customerDecision !== 'pending'/,
    /orderItemId: selectedOrderItem\.id/,
    /بانتظار قرار العميل/,
  ], "partner issue panel");
  assertAll(partnerScreen, [
    /resolve_issue/,
    /report_issue/,
    /مشكلة تمنع الجاهزية/,
    /item\.preparationIssues/,
  ], "partner order screen");
  assertAll(partnerInbox, [
    /<PreparationIssuesPanel/,
    /setIssueOrderId/,
    /openPreparationIssueCount/,
  ], "partner operational inbox");
  assertAll(clientPanel, [
    /decideOrderPreparationIssue/,
    /expectedVersion: issue\.version/,
    /decision: 'approved' \| 'rejected'/,
    /لم يتم حفظ أي قرار/,
  ], "client substitution decision panel");
  assertAll(clientTracking, [
    /<ClientPreparationDecisionPanel/,
    /PREPARATION_SLA_LABELS/,
    /openPreparationIssueCount/,
  ], "client order tracking");
  assertAll(clientController, [
    /fetchOrderPreparationIssues/,
    /pendingCustomerDecisionCount/,
    /Promise\.all/,
  ], "client journey controller");
});

test("JRN-012 captain and operator surfaces read the same preparation truth", () => {
  const captain = readDsh("frontend/app-captain/orders/OperationalCaptainExecutionScreen.tsx");
  const operator = readDsh("frontend/control-panel/operations/OrderJourneyLiveOrdersScreen.tsx");
  const alerts = readDsh("frontend/control-panel/operations/OrderPreparationAlertsPanel.tsx");
  assertAll(captain, [
    /useOrderPreparationReadback/,
    /<OrderPreparationReadbackCard/,
    /جاهزية الطلب لدى المتجر/,
  ], "captain execution surface");
  assertAll(operator, [
    /useOrderPreparationReadback/,
    /<OrderPreparationReadbackCard/,
    /<OrderPreparationAlertsPanel/,
  ], "operator live orders surface");
  assertAll(alerts, [
    /فحص SLA الآن/,
    /controller\.acknowledge/,
    /onOpenOrder\(alert\.orderId\)/,
  ], "operator preparation alerts");
});
