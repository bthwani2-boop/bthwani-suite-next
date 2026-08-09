# Control Panel — START HERE

This package is the implementation handoff for the entire Control Panel on branch `abbas`, pinned at `69abee4dc54601fbf5a8ad8a5c486d708ee4ae39`. It was produced under `tools/prompting/01-diagnose-plan-package.md`; no runtime/product file is changed by this package.

## Scope rule

Start from every current Control Panel section and expand only through proven direct dependencies. The mandatory inventory is DSH `administration`, `analytics`, `catalogs`, `dashboard`, `hr`, `login`, `marketing`, `operations`, `partners`, `platform`, `support`, plus WLT `finance`. Coverage also includes nested/detail routes, `src/shell`, `src/app/api`, `src/server`, every module under `services/dsh/frontend/control-panel` (including `carts`, DSH-facing `finance`, and `maps`), WLT shared financial presentation, DSH/WLT backend+database ownership, and direct readbacks on Client/Partner/Captain/Field.

The SMSM Control Panel section registry and journey registry are completeness aids only. `docs/architecture.drawio` is empty on the pinned head and therefore supplies no architectural evidence.

## Execution

Follow `EXECUTION-ORDER.json`. Each unit contains diagnosis, precise tasks, non-negotiable boundaries and verification. Correct the earliest authoritative divergence rather than patching UI symptoms. Never create parallel DSH/WLT truth, never trust operator-selected scope without server authorization, and never treat a successful mutation response as sufficient without canonical readback.

## Package validation

Run:

`node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/control-panel-all-sections-surfaces --strict`

Implementation remains `NOT_STARTED` until the unit results are populated from candidate-bound evidence.
