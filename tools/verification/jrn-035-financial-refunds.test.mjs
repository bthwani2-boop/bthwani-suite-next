import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const mustContain = (path, patterns) => {
  const content = read(path);
  for (const pattern of patterns) assert.match(content, pattern, `${path} is missing ${pattern}`);
};

const paths = {
  productTruth: "governance/product/contracts/jrn-035-financial-refunds.product-truth.json",
  contract: "services/wlt/contracts/jrn-035-refund-governance.json",
  migration: "services/wlt/database/migrations/wlt-037_jrn_035_refund_governance.sql",
  core: "services/wlt/backend/internal/refund/governed_refund.go",
  tenantGuard: "services/wlt/backend/internal/refund/tenant_guard.go",
  router: "services/wlt/backend/internal/http/server.go",
  outbox: "services/wlt/backend/internal/dshoutbox/dshoutbox.go",
  worker: "services/wlt/backend/internal/dshoutbox/worker.go",
  dshHandlers: "services/dsh/backend/internal/http/refund_finance_handlers.go",
  dshRoutes: "services/dsh/backend/internal/http/refund_finance_routes.go",
  dshProxy: "services/dsh/backend/internal/wlt/refund_proxy.go",
  sharedApi: "services/dsh/frontend/shared/finance-wlt-link/wlt-refund/wlt-refund.api.ts",
  sharedController: "services/dsh/frontend/shared/finance-wlt-link/wlt-refund/use-wlt-refund-controller.tsx",
  controlPanel: "services/dsh/frontend/control-panel/finance/RefundsCommandPanel.tsx",
  financeDashboard: "services/dsh/frontend/control-panel/finance/FinanceDashboardScreen.tsx",
  mobileCard: "services/dsh/frontend/shared/finance-wlt-link/wlt-refund/OrderRefundStatusCard.tsx",
  clientOrders: "services/dsh/frontend/app-client/orders/OrdersListScreen.tsx",
  partnerOrders: "services/dsh/frontend/app-partner/orders/GovernedPartnerOrdersScreen.tsx",
};

test("JRN-035 governed product truth is explicit and not self-approved", () => {
  const truth = JSON.parse(read(paths.productTruth));
  assert.equal(truth.capabilityId, "JRN_035_FINANCIAL_REFUNDS");
  assert.equal(truth.state, "DISCOVERY");
  assert.equal(truth.owners.productManagerApproval, "PENDING");
  assert.equal(truth.owners.productOwnerApproval, "PENDING");
  assert.equal(truth.acceptance.runtimeEvidenceRequired, true);
  assert.equal(truth.acceptance.visualEvidenceRequired, true);
  assert.ok(truth.surfaces.some((surface) => surface.id === "control-panel" && surface.required));
  assert.ok(truth.surfaces.some((surface) => surface.id === "app-client" && surface.required));
  assert.ok(truth.surfaces.some((surface) => surface.id === "app-partner" && surface.required));
});

test("state machine forbids over-refund, self approval and unknown retry", () => {
  const contract = JSON.parse(read(paths.contract));
  assert.deepEqual(contract.amountPolicy.supports, ["partial", "full"]);
  assert.ok(contract.transitions.some((transition) => transition.to === "provider_unknown" && transition.requiresReconciliation));
  assert.ok(contract.transitions.some((transition) => transition.to === "completed" && transition.requiresLedger && transition.requiresDshOutbox));
  assert.ok(contract.forbidden.some((entry) => entry.includes("maker")));
  assert.ok(contract.forbidden.some((entry) => entry.includes("provider_unknown")));
});

test("database persists amount, audit, provider and readback evidence", () => {
  mustContain(paths.migration, [
    /requested_by_operator_id/, /approved_by_operator_id/, /provider_idempotency_key/,
    /provider_unknown/, /wlt_refund_audit_events/, /wlt_reconciliation_cases_operation_chk/,
    /wlt_dsh_outbox_events_refund_event_idx/, /partially_refunded/, /wlt_refunds_maker_checker_chk/,
    /NEW\.amount_minor_units <= 0 OR NEW\.amount_minor_units > v_amount/,
    /wlt_sync_refund_provider_reference/,
  ]);
  assert.doesNotMatch(read(paths.migration), /NEW\.amount_minor_units := v_amount/);
  assert.doesNotMatch(read(paths.migration), /CREATE UNIQUE INDEX[^;]*payment_session_id\s*\)\s*WHERE status IN \('requested','approved'\)/s);
});

test("WLT claims provider once and commits ledger plus durable DSH event", () => {
  mustContain(paths.core, [
    /FOR UPDATE/, /status IN \('requested','approved','processing','provider_unknown','completed'\)/,
    /status='processing'/, /ErrRefundProviderUnknown/, /INSERT INTO wlt_reconciliation_cases/,
    /AccountType: "platform_payable", DebitCredit: "debit"/,
    /AccountType: "provider_clearing", DebitCredit: "credit"/,
    /dshoutbox\.EnqueueRefund/, /refund_completed/,
  ]);
  mustContain(paths.tenantGuard, [/X-Tenant-ID/, /SELECT tenant_id FROM wlt_refunds/, /TENANT_MISMATCH/]);
  mustContain(paths.router, [/refund\.RequireTenantScope/, /HandleReconcileGovernedRefund/, /HandleListGovernedRefundAudit/]);
  mustContain(paths.outbox, [/EventTypeRefunded/, /func EnqueueRefund/, /refund_reference/]);
  mustContain(paths.worker, [/NotifyEvent/, /RefundReference/]);
});

test("DSH enforces actor, tenant, idempotency and privacy boundaries", () => {
  mustContain(paths.dshHandlers, [
    /FinancePermissionManage/, /requestedByOperatorId/, /requiredPaymentTenant/,
    /SELECT tenant_id FROM dsh_orders/, /partnerStore/, /privacyRefund/, /FinanceRefundWrite/,
  ]);
  mustContain(paths.dshRoutes, [
    /control-panel\/finance\/refunds/, /client\/orders\/\{orderId\}\/refunds/,
    /partner\/orders\/\{orderId\}\/refunds/,
  ]);
  mustContain(paths.dshProxy, [/Idempotency-Key/, /X-Tenant-ID/, /FinanceRefundWrite/]);
  const privacyShape = read(paths.dshHandlers).split("type privacyRefund struct")[1].split("}")[0];
  assert.doesNotMatch(privacyShape, /provider|operator/i);
});

test("all required surfaces bind canonical states and commands", () => {
  mustContain(paths.sharedApi, [/provider_unknown/, /createDshWltRefund/, /reconcileDshWltRefund/, /fetchClientOrderRefunds/, /fetchPartnerOrderRefunds/]);
  mustContain(paths.sharedController, [/useWltRefundController/, /useWltRefundsByOrderController/, /useWltRefundAuditController/]);
  mustContain(paths.controlPanel, [/إنشاء طلب استرداد/, /اعتماد مستقل/, /تنفيذ لدى المزود/, /مصالحة النتيجة غير المحسومة/, /سجل التدقيق/]);
  mustContain(paths.financeDashboard, [/RefundsCommandPanel/, /refunds-disputes-holds/]);
  mustContain(paths.mobileCard, [/OrderRefundStatusCard/, /provider_unknown/, /الحالة من WLT/]);
  mustContain(paths.clientOrders, [/OrderRefundStatusCard/, /surface="client"/]);
  mustContain(paths.partnerOrders, [/OrderRefundStatusCard/, /surface="partner"/]);
});
