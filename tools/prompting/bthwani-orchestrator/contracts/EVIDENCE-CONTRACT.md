# Evidence Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: evidence sections of `03-VERIFICATION-CLOSURE.md`

## Evidence Matrix Record

```text
SCOPE
APPLICABLE + REASON
STATUS
SOURCE / COMMAND / WORKFLOW / RUN / ARTIFACT
CANDIDATE_SHA
ENVIRONMENT / PROFILE / RUNNER
PROOF_LIMIT
REQUIRED_CAPABILITY
APPROVAL_BINDING when applicable
```

Allowed evidence status:

```text
PASS
FAIL
MISSING
STALE
BLOCKED
CANCELLED_OR_SUPERSEDED
NOT_APPLICABLE_WITH_PROOF
```

## Detailed Evidence Record

```text
EVIDENCE_ID
VERIFICATION_ID
CLAIM
CANDIDATE_SHA
SOURCE/RUN/ARTIFACT
RESULT
FAILURE_CLASS
FIRST_CAUSAL_FAILURE / ROOT_CAUSE
PROVENANCE
INVALIDATION_TRIGGER
```

## Rules

- Search/discovery is not final proof.
- Evidence is bound to the exact candidate when code state matters.
- Static/build/unit/mock proof cannot become runtime/E2E proof without real evidence.
- Cancelled, missing, stale, pending or superseded evidence is not PASS.
- Prove runtime/process/artifact/schema/config freshness before runtime claims.
- Later writes invalidate affected evidence; rerun only invalidated scopes unless policy/risk requires broader proof.
- Deterministic failures require root-cause fix/new SHA, not blind rerun.
- Final closure must use all applicable scopes required by current decision vocabulary/delivery policy and actual blast radius.
- Required independent review/approval must be candidate-bound and provenance-proven.
- Final closure must not mix incompatible SHAs.
