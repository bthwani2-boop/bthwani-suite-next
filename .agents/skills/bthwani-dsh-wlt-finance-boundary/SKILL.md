---
name: bthwani-dsh-wlt-finance-boundary
version: 2026.07.17-v1
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

- `governance/02_SERVICES_AND_SURFACES.md`
- `governance/06_EVIDENCE_AND_GATES.md`
- `services/dsh/SERVICE_BLUEPRINT.md`
- `services/wlt/SERVICE_BLUEPRINT.md`
- applicable DSH and WLT contracts, manifests, backend, database, clients, and shared frontend paths

## Authority boundary

This skill verifies ownership and evidence routing. WLT owns financial mutation and truth. DSH may request a financial operation and retain references or projected status only. This skill cannot grant finance, QA, security, release, production, or final-closure approval.

## Required invariants

1. Ledger, wallet, payment, refund, settlement, payout, commission, COD financial truth, and reconciliation mutations remain in WLT.
2. DSH contains no duplicate financial calculation or authoritative financial balance.
3. DSH surfaces consume shared contracts/controllers and do not fabricate payment success.
4. Cross-service identifiers and statuses are contract-bound and read back from the owning service.
5. Static evidence is reported as `PASS` with a static scope only; runtime financial claims require same-commit runtime and persistence readback.
6. High-risk financial closure requires independent finance, QA, security, and release evidence as applicable.

## Forbidden

- Reading `_noncanonical` or historical files as active financial authority.
- Mutating financial truth in DSH.
- Using seed, fixture, in-memory, preview, or mock success as real financial proof.
- Returning deprecated `DSH_WLT_CODE_CLOSURE_PASS` or `DSH_WLT_CODE_CLOSURE_FAIL` from new work.
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
