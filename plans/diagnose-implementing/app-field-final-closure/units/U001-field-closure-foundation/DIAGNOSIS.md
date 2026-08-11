# U001 — field-closure-foundation

## Current-BB diagnosis

The previous foundation result is historical and cannot close current BB. Current inspection confirms one concrete blocker: `apps/app-field/runtime/package.json` points Vitest at `src/__tests__`, while the complete current `apps/app-field/runtime/src` tree has no `__tests__` directory or test files. The package itself also drifted from the strict validator; root structural defects are repaired by this reconciliation, but the product test-gate defect remains execution work. The correct root fix is not `passWithNoTests`, skipping Vitest or deleting the gate. Establish a real app-field behavioral suite covering readiness failure/composition plus navigation/session boundaries, bind the canonical `test` command to those tests and the generic runtime contract, and prove failure propagation. Preserve existing generic runtime checks.

Execution starts by reproducing current behavior on the exact candidate. Historical `RESULT.json` is provenance only. If the acceptance state already holds due to concurrent work, record verification and do not touch product code. Otherwise change the narrowest authoritative test/runtime owner; do not broaden into unrelated applications.
