import assert from "node:assert/strict";
import test from "node:test";

const policyUrl = new URL(
  "../../../../services/dsh/frontend/shared/support/support.partner-policies.ts",
  import.meta.url,
);

const {
  isCommandCenterInlineManagedRoute,
  resolveIssueCategoryFromOperationalFlow,
  resolveIssueCategoryFromRoute,
  resolveSupportFilterFromOperationalFlow,
  resolveSupportFilterFromRoute,
} = await import(policyUrl.href);

test("partner operational flows route to the correct support queues", () => {
  assert.equal(resolveSupportFilterFromOperationalFlow("order-chat-send"), "conversations");
  assert.equal(resolveSupportFilterFromOperationalFlow("inventory-update"), "inventory-branch");
  assert.equal(resolveSupportFilterFromOperationalFlow("partner-settlement-summary"), "escalation");
  assert.equal(resolveSupportFilterFromOperationalFlow("order-reject"), "order-issues");
});

test("partner support routes preserve issue categories", () => {
  assert.equal(resolveIssueCategoryFromOperationalFlow("order-sla-risk"), "delayed-preparation");
  assert.equal(resolveIssueCategoryFromOperationalFlow("order-handoff"), "handoff-mismatch");
  assert.equal(resolveIssueCategoryFromOperationalFlow("inventory-adjust"), "item-unavailable");
  assert.equal(resolveIssueCategoryFromOperationalFlow("partner-finance-bridge"), "payment-refund-review");
  assert.equal(resolveIssueCategoryFromRoute("chat-send"), "customer-not-responding");
  assert.equal(resolveIssueCategoryFromRoute("order-reject"), "partner-reject-request");
});

test("partner command center keeps inline-managed routes deterministic", () => {
  assert.equal(isCommandCenterInlineManagedRoute("order-issue-queue"), true);
  assert.equal(isCommandCenterInlineManagedRoute("order-reject"), true);
  assert.equal(isCommandCenterInlineManagedRoute("chat-send"), false);
  assert.equal(resolveSupportFilterFromRoute("inventory-adjust"), "inventory-branch");
});
