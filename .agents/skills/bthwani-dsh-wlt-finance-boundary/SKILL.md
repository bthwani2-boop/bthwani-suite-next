---
name: bthwani-dsh-wlt-finance-boundary
version: 2026.06.19-clean
summary: Protect WLT financial truth and DSH/WLT integration boundaries.
---

# bthwani-dsh-wlt-finance-boundary

## Invoke when

- DSH checkout, payment status, COD, commission, refund, settlement, payout, wallet, ledger, or order financial state is touched
- a journey crosses DSH and WLT

## Read before

`governance/_noncanonical/10_DSH_WLT_FINANCIAL_BOUNDARY.md` if present, DSH/WLT service files, service contracts, machine-readable DSH/WLT matrices

## Execution contract

DSH may request or display payment state but WLT owns financial mutation and truth. Verify contracts and service ownership before implementing cross-service behavior.

## Forbidden

- no ledger/payment/refund/settlement/payout mutation in DSH
- no duplicated financial calculations
- no fake payment success
- no financial closure without WLT evidence when final closure is requested

## Required evidence

- DSH touched paths
- WLT touched paths
- contract paths
- runtime or test evidence for financial behavior (when final closure is requested or escalation applies)
- guard output when available

## Failure decision

- WLT mutation outside WLT -> `FIX_REQUIRED`
- financial truth duplicated -> `FIX_REQUIRED`
- payment success without WLT proof when final closure or escalation is requested -> `NEEDS_EVIDENCE`

## DSH/WLT Code Closure Mode

Invoke not only for direct finance edits, but for any DSH topic that may affect checkout handoff, payment state, wallet interaction, commission, payout, settlement, refund, order financial state, field commission, finance hub, WLT DSH reference state, or DSH surfaces consuming financial truth.

Required code-only closure:

1. Identify the DSH topic from `services/dsh/service.manifest.ts`.
2. Identify DSH owner paths.
3. Identify WLT related paths under `services/wlt/frontend/shared/dsh`.
4. Identify DSH link paths under `services/dsh/frontend/shared/finance-wlt-link`.
5. Verify DSH does not own financial truth.
6. Verify surfaces only consume shared/controller boundaries.
7. Reject direct payment/wallet/commission logic inside DSH UI surfaces.
8. Reject fake payment success or duplicated financial calculations.
9. Report `DSH_WLT_CODE_CLOSURE_PASS` or `DSH_WLT_CODE_CLOSURE_FAIL`.

Do not claim runtime proof unless runtime was actually executed.

## Notes

No extra notes.
