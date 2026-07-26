# Engineering Loop Iteration Records

One JSON record per loop iteration, at `iterations/<task-id>/<NN>.json`, validating against `../iteration-record.schema.json`. Raw logs stay untracked under `.diagnostics/remediation/` and are referenced by sha256.

The governed loop is:

```text
PLAN -> EXECUTE -> OBSERVE -> EVALUATE -> DIAGNOSE -> CORRECT -> VERIFY -> IMPROVE -> REPLAN
```

## Rules enforced by `guard:remediation-governance`

- `iteration` never exceeds 3 (`MAX_REPAIR_ITERATIONS`); a fourth record is schema-invalid.
- A hypothesis hash, patch hash, or failure fingerprint repeated from `antiThrash` forces `decision.status` to `LOOP_NOT_CONVERGING`, `REDIAGNOSE`, or `TASK_SPLIT_REQUIRED` — repeating the same attempt is illegal.
- `regressionCount`, `scopeViolationCount`, and `unexpectedDeletionCount` must be zero for a `CONVERGED` or `PASS` decision.
- `failedGatesAfter` must not exceed `failedGatesBefore` for an `IMPROVING` convergence claim.
- All evidence in one record binds to one `candidateSha`; mixing commits is a same-commit violation.

## The three loops

- `MICRO` — one work unit or assertion; two attempts maximum for the same unchanged assertion, then the hypothesis must change or the loop escalates.
- `GAP_CLOSURE` — integrate, adversarial review, cross-surface verification, remaining-gap detection, corrective work units, re-integrate.
- `PORTFOLIO` — after closure: baseline update, ledger update, lessons, promotion of recurring fixes into guards or repair scripts, re-ranking, next gap selection.
