import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL("../../../infra/docker/scripts/wlt-migration-probes.ps1", import.meta.url),
  "utf8",
);

function probe(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^\\s*"${escaped}"\\s*=\\s*"([^"]*)"\\s*$`, "m"));
  assert.ok(match, `missing WLT migration probe for ${name}`);
  return match[1];
}

describe("WLT migration ledger probes", () => {
  it("contains no tautological duplicate object alternatives", () => {
    assert.doesNotMatch(
      source,
      /to_regclass\('([^']+)'\) IS NOT NULL OR to_regclass\('\1'\) IS NOT NULL/,
    );
    assert.doesNotMatch(source, /table_name IN \('([^']+)','\1'\)/);
  });

  it("requires the full settlement and commission governance footprint", () => {
    const value = probe("wlt-090_settlement_commission_governance.sql");
    for (const objectName of [
      "wlt_settlement_requests",
      "wlt_settlement_source_evidence",
      "wlt_settlement_policy_versions",
      "wlt_commission_policy_versions",
      "wlt_commission_evidence",
      "wlt_commission_adjustments",
    ]) {
      assert.match(value, new RegExp(`public\\.${objectName}`));
    }
    assert.match(value, /wlt_audit_events/);
    assert.match(value, /wlt_finance_audit_events/);
  });

  it("requires mutation receipts and both governed lookup indexes", () => {
    const value = probe("wlt-093_mutation_receipts.sql");
    assert.match(value, /public\.wlt_mutation_receipts/);
    assert.match(value, /wlt_mutation_receipts_aggregate_idx/);
    assert.match(value, /wlt_mutation_receipts_context_aggregate_idx/);
    assert.match(value, /wlt_mutation_receipts_request_hash_idx/);
    assert.match(value, /wlt_mutation_receipts_context_request_hash_idx/);
  });

  it("requires the complete payout governance state and transition trigger", () => {
    const value = probe("wlt-098_payout_destination_governance.sql");
    for (const fieldName of [
      "owner_actor_id",
      "owner_actor_type",
      "payout_destination_id",
      "request_hash",
      "reconciliation_status",
    ]) {
      assert.match(value, new RegExp(fieldName));
    }
    for (const objectName of [
      "wlt_payout_audit_events",
      "wlt_payout_outbox",
      "wlt_payout_reconciliations",
    ]) {
      assert.match(value, new RegExp(`public\\.${objectName}`));
    }
    assert.match(value, /wlt_payout_transition_trigger/);
    assert.match(value, /wlt_payout_transition_audit_trigger/);
  });

  it("requires non-null OperatorContext commission ownership and indexes", () => {
    const value = probe("wlt-107_commission_operator_context.sql");
    assert.match(value, /table_name = 'wlt_commission_policy_versions'/);
    assert.match(value, /column_name = 'operator_context_id'/);
    assert.match(value, /is_nullable = 'NO'/);
    assert.match(value, /wlt_commission_policy_active_context_uidx/);
    assert.match(value, /wlt_commissions_operator_context_idempotency_idx/);
    assert.match(value, /wlt_commission_adjustments_operator_context_idempotency_uq/);
  });
});
