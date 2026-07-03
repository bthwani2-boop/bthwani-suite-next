# marketing_visibility_gate_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
marketing_visibility_gate_matrix:
  - target_type: store
    gate: status='active' AND is_visible=true AND serviceability_status IN (serviceable,limited)
      AND partner_readiness='ready' AND catalog_approval_status='approved' AND marketing_visibility='visible'
    logged_to: dsh_marketing_visibility_gates (entity_type/target_type/target_id/gate_name/passed/reason)
    tested: TestMarketingTargetVisibilityGateDBIntegration — PASS (both pass and fail paths), re-run live in this pass.
    result: PASS
  - target_type: category / subcategory
    gate: category active AND parent store passes the same 6-condition store gate
    tested: not directly exercised by an HTTP smoke in this pass; covered by ValidateTarget code path only.
    result: PLAUSIBLE (code-reviewed, not independently HTTP-tested this pass)
  - target_type: product
    gate: product active AND parent store passes the same 6-condition store gate
    tested: same as category — code-reviewed only in this pass.
    result: PLAUSIBLE
  - target_type: campaign
    gate: referenced campaign status='active' AND archived_at IS NULL
    tested: code-reviewed only in this pass.
    result: PLAUSIBLE
  - target_type: offer
    gate: always rejected — "offer targeting is not yet backed by a partner-offer table"
    tested: TestMarketingTargetVisibilityGateDBIntegration/gate-offer-campaign — PASS, re-run live.
    result: PASS (rejects rather than silently allows)
  - target_type: home / stores / search / custom
    gate: trivial pass (no entity reference to gate)
    tested: code-reviewed only.
    result: PLAUSIBLE
```
