---
name: bthwani-dsh-wlt-finance-boundary
version: 2026.06.19-clean
summary: Protect WLT financial truth and DSH/WLT integration boundaries.
---

# bthwani-dsh-wlt-finance-boundary

## Invoke when

- DSH checkout, payment status, COD, commission, refund, settlement, payout, wallet, ledger, or order financial state is touched
- a slice crosses DSH and WLT

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

## Notes

No extra notes.
