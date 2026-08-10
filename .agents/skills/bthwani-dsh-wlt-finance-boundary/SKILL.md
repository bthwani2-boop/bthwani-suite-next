---
name: bthwani-dsh-wlt-finance-boundary
version: 2026.08.03-v2
summary: Protect WLT financial truth and require explicit evidence for every DSH/WLT financial handoff.
---

# bthwani-dsh-wlt-finance-boundary

## Purpose

Own verification of the DSH/WLT financial boundary for checkout, payments, COD, commission, refunds, settlements, payouts, wallets, ledger, reconciliation, and financial reporting.

## Invoke when

- A change touches checkout handoff, payment state, COD, commission, refund, settlement, payout, wallet, ledger, reconciliation, or finance reporting.
- A journey crosses DSH and WLT or a DSH surface consumes financial truth.

## Do not invoke when

- No financial truth, financial reference, or DSH/WLT handoff is affected.
- The task is unrelated to DSH and WLT finance ownership.

## Read before

- `governance/GOVERNANCE.md`
- `governance/product/PRD.md`
- `governance/policies/engineering.md`
- `governance/policies/security.md`
- `governance/policies/delivery.md`
- `governance/contracts/sdlc/` when formal finance/release evidence is applicable
- `services/dsh/service.manifest.ts` and `services/wlt/service.manifest.ts`
- DSH/WLT contract manifests, current WLT operation-state contract, runtime contracts, backend/database/generated-client/shared-frontend paths materially affected

## Authority boundary

This skill verifies ownership and evidence routing. WLT owns financial mutation and truth. DSH may request a financial operation and retain bounded references or projections permitted by current contracts. This skill cannot grant finance, QA, security, release, production, or final-closure approval.

## Required invariants

1. Ledger, wallet, payment, refund, settlement, payout, commission, COD financial truth, and reconciliation mutations remain in WLT.
2. DSH contains no duplicate financial calculation or authoritative financial balance.
3. DSH surfaces consume canonical contracts/controllers and do not fabricate financial success.
4. Cross-service identifiers and statuses are contract-bound and read back from the owning service.
5. Static evidence is reported only as static scope; runtime financial claims require same-candidate runtime and persistence readback.
6. High-risk financial closure requires independent finance, QA, security, release, and other applicable evidence/approvals.

## Forbidden

- Reading historical or explicitly noncanonical files as active financial authority.
- Mutating financial truth in DSH.
- Using seed, fixture, in-memory, preview, or mock success as real financial proof.
- Returning deprecated decision aliases from new work.
- Claiming runtime or final closure from static boundary checks.

## Required output

```text
resolved_commit_sha:
dsh_owner_paths:
wlt_owner_paths:
contract_paths:
financial_invariants:
static_checks:
runtime_evidence:
required_approvals:
missing_evidence:
decision:
remaining_risk:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.
