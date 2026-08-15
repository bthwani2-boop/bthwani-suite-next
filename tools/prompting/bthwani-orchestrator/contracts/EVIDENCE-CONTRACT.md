# Evidence Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: evidence sections inside each Sequence file and final global evidence summary in `00-OVERVIEW.md`.

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

Allowed status: `PASS / FAIL / MISSING / STALE / BLOCKED / CANCELLED_OR_SUPERSEDED / NOT_APPLICABLE_WITH_PROOF`.

## Detailed Evidence

```text
EVIDENCE_ID
SEQUENCE_ID
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

Rules:
- Search/discovery is not final proof.
- Evidence binds to exact candidate when code state matters.
- Static/build/unit/mock proof is not runtime/E2E proof.
- Cancelled/missing/stale/pending/superseded is not PASS.
- Writes invalidate affected evidence.
- Deterministic failures require root fix/new SHA, not blind rerun.
- Sequence PASS proves only that Sequence claims; final TARGET closure requires global reconciliation and all applicable scopes.
