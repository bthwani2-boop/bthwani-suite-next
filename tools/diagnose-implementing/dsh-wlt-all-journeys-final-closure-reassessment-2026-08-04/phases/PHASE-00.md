# PHASE-00 — Authority, baseline, inventory and plan validation

## Authority and baseline

```yaml
repository: bthwani2-boop/bthwani-suite-next
branch: smsm
pinned_sha: f97dcbc3ecfbc19a130c4dbafef6cb7def9c3eb8
mode: DIAGNOSIS_AND_PLAN_ONLY
status: CLOSED_WITH_EVIDENCE
```

## Scope

This phase owns findings: FND-0001, FND-0018.

## Inputs

- Canonical repository owners and contracts on the pinned SHA.
- Evidence and inventories in `../evidence/`.
- Predecessor phases: none.

## Work items

- `TASK-0001`

## Vertical-slice rule

Open one work item only. Complete owner, contract, data, backend, surface, negative behavior, runtime readback, cleanup, verification, commit and push for that behavior before the next dependent item opens.

## Exit gate

- Exact Git Bundle, complete ledgers, cross references and strict validation pass.
- open internal findings owned by this phase: `0`;
- failed required checks: `0`;
- unverified required behaviors: `0`;
- duplicate truth owners: `0`;
- contract mismatches: `0`;
- unverified deletions: `0`;
- evidence is generated after the last write on the same commit.

## Rollback

Revert only the atomic work-item commit, restore matching contract/data/runtime state, capture failure evidence, and keep the phase open.
