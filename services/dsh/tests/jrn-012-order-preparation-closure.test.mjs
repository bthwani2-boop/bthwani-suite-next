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

test("JRN-012 persists preparation timing, issues, item binding, audit history and replay keys", () => {
  const timing = readDsh("database/migrations/dsh-095_order_preparation_timing.sql");
  const issues = readDsh("database/migrations/dsh-126_order_preparation_issues.sql");
  const itemBinding = readDsh("database/migrations/dsh-127_preparation_issue_item_binding.sql");
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
  assertNone(`${issues}\n${itemBinding}`, [/wallet/i, /ledger/i, /settlement/i, /refund/i], "DSH issue migrations");
});

test("JRN-012 backend owns issue lifecycle, item scope, permissions and atomic readiness", () => {
  const domain = readDsh("backend/internal/orders/preparation_issues.go");
  const guard = readDsh("backend/internal/orders/preparation_ready_guard.go");
  const lifecycle = readDsh("backend/internal/orders/lifecycle.go");
  const handler = readDsh("backend/internal/http/order_preparation_issues.go");
  const routes = readDsh("backend/internal/http/order_journey_routes.go");
  const workboard = readDsh("backend/internal/http/partner_order_workboard.go");

  assertAll(domain, [
    /CreatePreparationIssue/,
    /ResolvePreparationIssue/,
    /WHERE id=\$1::uuid AND order_id=\$2::uuid/,
    /affected quantity exceeds ordered quantity/,
    /FOR UPDATE/,
    /dsh_order_preparation_issue_events/,
    /order\.preparation_issue_opened/,
    /order\.preparation_issue_resolved/,
  ], "preparation issue domain");
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
    /handleResolvePreparationIssue/,
    /orderItemId is required for item preparation issues/,
    /OperationsPermissionRead/,
    /X-Correlation-ID/,
    /ExpectedVersion/,
  ], "preparation issue handlers");
  assertAll(routes, [
    /GET \/dsh\/orders\/\{orderId\}\/preparation-issues/,
    /POST \/dsh\/partner\/orders\/\{orderId\}\/preparation-issues/,
    /preparation-issues\/\{issueId\}\/resolve/,
  ], "preparation routes");
  assertAll(workboard, [
    /OpenPreparationIssueCount/,
    /report_issue/,
    /resolve_issue/,
    /openPreparationIssueCount > 0/,
  ], "partner workboard");
});

test("JRN-012 OpenAPI declares every live preparation capability and server action", () => {
  const contract = readDsh("contracts/fragments/order-preparation-handoff.fragment.yaml");
  assertAll(contract, [
    /\/dsh\/partner\/order-workboard:/,
    /\/dsh\/orders\/\{orderId\}\/preparation:/,
    /\/dsh\/partner\/orders\/\{orderId\}\/preparation-estimate:/,
    /\/dsh\/orders\/\{orderId\}\/preparation-issues:/,
    /\/dsh\/partner\/orders\/\{orderId\}\/preparation-issues:/,
    /preparation-issues\/\{issueId\}\/resolve:/,
    /revise_estimate/,
    /report_issue/,
    /resolve_issue/,
    /DshPreparationIssue:/,
    /orderItemId:/,
    /openPreparationIssueCount/,
  ], "preparation OpenAPI fragment");
});

test("JRN-012 shared brain rejects incomplete server truth and binds immutable items", () => {
  const types = readDsh("frontend/shared/orders/orders.types.ts");
  const api = readDsh("frontend/shared/orders/orders.api.ts");
  const adapter = readDsh("frontend/shared/partner/partner.adapters.ts");
  assertAll(types, [
    /DshPreparationIssueKind/,
    /DshCreatePreparationIssueInput/,
    /"report_issue"/,
    /"resolve_issue"/,
    /openPreparationIssueCount/,
  ], "shared preparation types");
  assertAll(api, [
    /fetchOrderPreparationIssues/,
    /createOrderPreparationIssue/,
    /resolveOrderPreparationIssue/,
    /preparation-issues/,
  ], "shared preparation API");
  assertAll(adapter, [
    /missing governed preparation issues/,
    /missing immutable order items/,
    /contains an invalid immutable order item/,
    /preparation issue count is inconsistent/,
    /orderItems/,
    /openPreparationIssueCount > 0/,
    /issueRequired: true/,
  ], "partner adapter");
  assertNone(api, [/mock/i, /fixture/i, /wallet\.debit/, /wallet\.credit/], "shared preparation API");
});

test("JRN-012 partner UI binds, reports and resolves issues without local business truth", () => {
  const panel = readDsh("frontend/app-partner/orders/PreparationIssuesPanel.tsx");
  const screen = readDsh("frontend/app-partner/orders/GovernedPartnerOrdersScreen.tsx");
  const inbox = readDsh("frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx");
  assertAll(panel, [
    /createOrderPreparationIssue/,
    /resolveOrderPreparationIssue/,
    /expectedVersion: selectedIssue\.version/,
    /selectedOrderItemId/,
    /orderItemId: selectedOrderItem\.id/,
    /quantity <= selectedOrderItem\.quantity/,
    /ربطها بالصنف/,
    /substitution_required/,
  ], "partner issue panel");
  assertAll(screen, [
    /resolve_issue/,
    /report_issue/,
    /مشكلة تمنع الجاهزية/,
    /item\.preparationIssues/,
  ], "partner order screen");
  assertAll(inbox, [
    /<PreparationIssuesPanel/,
    /setIssueOrderId/,
    /openPreparationIssueCount/,
  ], "partner operational inbox");
  assertNone(panel, [/fetch\(/, /StyleSheet/, /contentContainerStyle=\{\{/], "partner issue panel");
  assertNone(screen, [/contentContainerStyle=\{\{/], "partner order screen");
});
