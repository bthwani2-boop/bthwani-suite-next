# Residual execution plan

## Execution law

Only one work item may be open. Before each item, fetch the latest `smsm` head, compare it to the package pin, and refresh any stale evidence. After implementation, run the linked verification after the last write, create one logical commit, push, re-pin the remote head, and record evidence against that exact commit.

## Phases

| Phase | Work items | Exit condition |
|---|---|---|
| PHASE-00 | Evidence and authority freeze | Package passes strict structural validation and branch pin is current |
| PHASE-01 | TASK-0001, TASK-0002 | One canonical role authority; assignment and rollback have real effect |
| PHASE-02 | TASK-0003 | Administration contract and handlers have executable parity |
| PHASE-03 | TASK-0004 | Registry, authority files, clients, and operation ownership compile and reconcile |
| PHASE-04 | TASK-0005 | One same-commit DSH readiness ledger drives every projection |
| PHASE-05 | TASK-0006 | WLT non-production financial gates close with evidence |
| PHASE-06 | TASK-0007 | Full dependency runtime evidence is unambiguous and reproducible |
| PHASE-07 | TASK-0008 | FOUNDATION-00 and J001 through J107 close sequentially with complete evidence |

## Global stop conditions

Stop the current work item and keep it open when any required check fails, evidence is stale, the remote head changes unexpectedly, the canonical authority cannot be identified, a migration is not reversible, a production mutation would be enabled, or runtime readback contradicts the claimed result.

## Evidence policy

Static source proves only source state. Typecheck proves only the compiled scope. Unit tests prove only their fixtures. Runtime proof requires real dependency health and readback. Journey closure requires all automated checks plus manual acceptance, runtime readback, cleanup, and same-commit evidence.
