# Evidence Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: verification/evidence sections of `03-VERIFICATION-CLOSURE.md`

## Evidence Record

```text
EVIDENCE_ID
CLAIM / SCOPE
APPLICABLE? + reason
SOURCE_TYPE
COMMAND / WORKFLOW / RUN / ARTIFACT
CANDIDATE_SHA
ENVIRONMENT / PROFILE / RUNNER
STARTED_AT / COMPLETED_AT when available
STATUS
EXIT / RESULT
PROVES
DOES_NOT_PROVE
PROVENANCE
INVALIDATION_TRIGGERS
REQUIRED_CAPABILITY
APPROVAL_BINDING when applicable
```

Allowed status:

```text
PASS
FAIL
MISSING
STALE
BLOCKED
CANCELLED_OR_SUPERSEDED
NOT_APPLICABLE_WITH_PROOF
```

## Evidence Rules

- Search/discovery is not final proof.
- Evidence must be candidate-bound when the claim depends on code state.
- Static/build/unit/mock proof cannot be upgraded to runtime/E2E proof without real evidence.
- A cancelled, missing, stale, pending, or superseded run is not PASS.
- If the evidence-producing environment may be stale, runtime freshness must be proven.
- If a later write changes an input, owner, contract, schema, runtime, config, permission, or shared consumer relation covered by evidence, mark affected evidence stale and reacquire it.
- Do not rerun unaffected evidence blindly.

## Final Evidence Matrix

For every applicable closure scope:

```text
scope
applicable + reason
status
source
candidate_sha
environment
proof_limit
required capability
required approval if any
```

Final closure cannot rely on mixed SHAs for scopes that require same-candidate proof.