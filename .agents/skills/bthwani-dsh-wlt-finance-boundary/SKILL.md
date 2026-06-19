---
name: bthwani-dsh-wlt-finance-boundary
description: Protect WLT ownership of financial truth while allowing DSH operational references.
---

# bthwani-dsh-wlt-finance-boundary

## Use when

- DSH/WLT order, payment, COD, refund, settlement, commission, wallet, payout, ledger, or reconciliation logic is involved.

## Procedure

1. Classify field/action as DSH operational or WLT financial.
2. DSH may store references/status only.
3. WLT owns mutation and source of truth for ledger/payment/refund/settlement/payout/commission/COD.
4. Do not duplicate finance state machines in DSH or apps.
5. Ensure API names make boundary explicit.

## Evidence / checks

Run no-financial-mutation-outside-wlt guard when service logic is touched. Add tests for negative authorization and boundary violations when behavior changes.



## Global constraints

- Target root: `C:\bthwani-suite-next`.
- Use PowerShell and `pnpm`; never use `npx`.
- Keep scope narrow; do not touch unrelated files.
- Do not claim closure without evidence.
- Prefer targeted checks over full workspace checks unless risk justifies more.
