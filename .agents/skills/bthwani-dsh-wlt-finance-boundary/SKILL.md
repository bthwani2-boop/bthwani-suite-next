---
name: bthwani-dsh-wlt-finance-boundary
version: 2026.08.18-v3
summary: Protect WLT financial truth and verify affected DSH/WLT financial handoffs with code and runtime evidence.
---

# bthwani-dsh-wlt-finance-boundary

## Invoke when

Checkout, payment, COD, commission, refund, settlement, payout, wallet, ledger, reconciliation, or financial reporting changes or crosses DSH/WLT.

## Invariants

1. WLT owns financial mutation and authoritative financial state.
2. DSH may request bounded operations and retain contract-permitted references/projections only.
3. No duplicate balance, ledger, settlement, payout, refund, commission, or payment calculation becomes authoritative in DSH.
4. Surfaces consume canonical contracts/controllers and never fabricate financial success.
5. Cross-service identifiers/statuses are contract-bound and read back from the owning service.

## Verification

- Use targeted static ownership/contract checks for the affected code cone.
- Use same-candidate WLT/DSH runtime and persistence readback when runtime financial behavior is claimed or changed.
- Add reconciliation evidence when ledger/payment/settlement correctness depends on it.
- Do not require unrelated approval/stage artifacts or governance gates.

## Output

```text
resolved_commit_sha:
dsh_owner_paths:
wlt_owner_paths:
contract_paths:
financial_invariants:
static_checks:
runtime_evidence:
missing_evidence:
decision:
remaining_risk:
```
