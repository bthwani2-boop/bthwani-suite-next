# Focus — Data, Contracts, Runtime, Security and Assurance

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER

## 1. Data ownership

For every material persisted fact prove:

```text
CANONICAL DOMAIN OWNER
CANONICAL WRITE PATH
CANONICAL STORAGE
INVARIANTS/CONSTRAINTS
READBACK PATH
LIFECYCLE/RETENTION WHEN MATERIAL
SECURITY/FINANCIAL CLASSIFICATION WHEN MATERIAL
```

Multiple mutable stores for one business truth are forbidden unless one is explicitly derived and non-authoritative.

`ONE TRUTH` does not mean one table; correct normalization may use multiple tables. What is forbidden is multiple mutable authorities for the same meaning.

## 2. Schema and migration refoundation

Migration history is executable architecture, not sacred chronology.

Audit:

```text
SCHEMA OWNERSHIP
MIGRATION ORDER / EPOCHS
DUPLICATE TABLE/COLUMN AUTHORITIES
OBSOLETE COMPATIBILITY COLUMNS
BACKFILLS
SEEDS / BOOTSTRAP
CONSTRAINTS / INDEXES
POLICIES / TRIGGERS
MIGRATION MANIFESTS / ORDERING AUTHORITIES
GENERATED DB CONTRACTS
UPGRADE/RESET ASSUMPTIONS
```

If the migration epoch itself is structurally corrupt, do not patch hundreds of migrations by default.

```text
DETERMINE REQUIRED DURABLE TRUTH
→ DETERMINE RESET VS CONTROLLED CUTOVER CONSTRAINTS
→ DESIGN CANONICAL EPOCH/OWNERSHIP
→ MIGRATE/BACKFILL/RECONCILE
→ CUT OVER
→ DELETE SHADOW/OBSOLETE MIGRATION AUTHORITIES
→ PROVE REAL UPGRADE/READBACK WHERE REQUIRED
```

No destructive data transformation without deterministic evidence.

## 3. Contracts and generated lineage

```text
ONE CANONICAL SOURCE CONTRACT
ONE GENERATOR/TRANSFORM LINEAGE WHEN GENERATED
JUSTIFIED CANONICAL OUTPUT SET
ZERO HAND-MAINTAINED MIRRORS
ZERO STALE GENERATED OUTPUT
ZERO DUPLICATE DTO/ENUM/API-TYPE AUTHORITIES
```

Generated code may contain many files when they are derived from one source. Do not force one-file output; eliminate parallel hand-maintained truth.

Migrate all consumers and delete old contracts/mirrors after cutover unless a proven live external consumer requires bounded compatibility.

## 4. Backend/frontend/data parity

For every exposed material meaning prove the applicable lineage:

```text
PERSISTED TRUTH
→ CANONICAL WRITER
→ DOMAIN SEMANTICS
→ API/EVENT CONTRACT
→ GENERATED CLIENT/BINDING
→ REQUIRED FRONTEND/OTHER CONSUMERS
→ USER ACTION/MUTATION
→ PERSISTED READBACK
```

Manual frontend business mappings, enums, DTOs, allowed-action logic or status interpretations that duplicate canonical semantics are shadow-truth candidates.

A clean backend and clean frontend that disagree semantically are not closed.

## 5. Runtime/config/infra

Audit every material runtime authority:

```text
ENV VARIABLES
CONFIG FILES
FEATURE FLAGS
PORTS/ENDPOINTS
CONTAINER/COMPOSE/DEPLOYMENT
STARTUP/BOOTSTRAP
HEALTH/READINESS
QUEUES/JOBS
SECRET REFERENCES
OBSERVABILITY
ROUTING/PROXY
```

Eliminate competing authorities and stale runtime paths after cutover. Do not preserve scripts/config merely because historical tooling depends on them; migrate the consumer or refound the tooling.

## 6. Security and financial truth

Authentication, authorization, sessions, secrets, PII, provider credentials, isolation and financial mutation receive heightened proof.

```text
SERVER-SIDE AUTHORITY FOR SECURITY DECISIONS
NO CLIENT-ONLY AUTHORIZATION
LEAST PRIVILEGE
NO SECRET MATERIAL IN REPOSITORY OUTPUTS
IDEMPOTENT/TRACEABLE FINANCIAL MUTATION WHERE REQUIRED
NO PARALLEL BALANCE/LEDGER WRITERS
NO FLOATING FINANCIAL SOURCE OF TRUTH
AUDITABLE CANONICAL READBACK
```

Aggressive structural deletion never waives truth-preservation/migration proof for security or money.

## 7. Tests are consumers, not truth by themselves

Inherited tests can encode obsolete architecture.

Classify each material test expectation:

```text
VALID_CANONICAL_SPEC
OBSOLETE_BEHAVIOR
DUPLICATE_COVERAGE
WRONG_LAYER_SPEC
MISSING_PREVENTION
BROKEN_TEST_INFRA
```

Update/delete tests with the refoundation unit. Never weaken a valid assertion merely to obtain green output.

Tests, fixtures, mocks, snapshots and helpers tied only to losing containers must migrate or be deleted in the same unit.

## 8. CI/assurance control-plane refoundation

CI is not privileged structure. `.github/**`, assurance scripts, custom guards, scanner adapters and evidence collectors must re-earn existence.

Audit for:

```text
DUPLICATE VERIFICATION AUTHORITY
PR-ONLY ASSUMPTIONS IN h
DEFAULT/OLD-BRANCH TRUST
STALE g/master AUTHORITY
UNCONSUMED SCANNER OUTPUT
SUPPRESSION / ALLOW-FAIL MASKING
DUPLICATE CUSTOM GUARDS
FAKE HUMAN/COMMENT ATTESTATION USED AS EXECUTION PROOF
CAMPAIGN-ONLY RESIDUE
EXCESSIVE INDIRECTION/COST WITHOUT UNIQUE CLAIM
```

When the control plane is the root, refound it as one surface rather than patching workflows one-by-one.

Preferred durable shape:

```text
ONE CANONICAL EXACT-h CONTROLLER PER DISTINCT ASSURANCE ROLE
→ REUSABLE WORKERS WITH UNIQUE CLAIMS
→ NO PR REQUIREMENT
→ NO OLD-BRANCH AUTHORITY
→ FAIL-CLOSED MATERIAL NOT_COVERED
→ CAMPAIGN-ONLY WORKFLOWS DELETED AFTER USE
```

Do not preserve `repository-baseline`, PR dispatcher, PR comment evidence or other historical structures unless they independently prove unique required value for the final `h` baseline.

## 9. Verifier/admission-hole law

When a defect was accepted because verification was weak, closure requires fixing both product/structure and detector/admission authority.

If the verifier itself is wrong:

```text
DEFINE CANONICAL CLAIM
→ REBUILD VERIFIER
→ PROVE GOOD CASE PASSES
→ PROVE KNOWN BAD CASE FAILS
→ THEN USE IT AS EVIDENCE
```

Never weaken a gate to obtain green.

## 10. GitHub Actions on h

`h` may create, rewrite, run and delete actions as needed.

Persistent workflows survive only with unique durable baseline value. Diagnostic/campaign workflows are temporary by default.

Every authoritative `h` workflow must prove exact candidate identity and must not depend on PR/default-branch semantics unless an actual external requirement makes that necessary.

If real rendered/device/runtime evidence is required but unavailable:

```text
CLAIM=NOT_COVERED
```

Do not replace it with a PR comment or self-attestation.

## 11. Evidence ingestion

Every material tool result must be consumed:

```text
FINDING
MATERIALITY
AFFECTED CLAIM
CAUSAL ROOT/UNIT MAPPING
DISPOSITION
REVERIFY REQUIREMENT
LIMITATION
```

Scanner execution is not finding closure.

## 12. Dependencies and toolchain

Every dependency, workspace edge, toolchain pin and custom script must re-earn existence.

Delete unused dependencies after migration. Consolidate duplicated tooling/libraries when they encode the same responsibility. Remove custom automation when native compiler/test/build/runtime/security tooling gives the same or stronger unique claim more simply.

## 13. Runtime and experience proof

When behavior is runtime-material, static evidence is insufficient.

Prove startup/request/persistence/readback/experience at the highest material boundary affected by the refoundation unit.

For mobile/web, distinguish source/config correctness from actual rendered/device execution; do not claim one as the other.

## 14. Final assurance cleanliness

At fixed point:

```text
NO DUPLICATE MATERIAL CI AUTHORITIES
NO PR/DEFAULT/OLD-BRANCH h TRUST ASSUMPTIONS
NO CAMPAIGN-ONLY WORKFLOW/TOOL RESIDUE
NO FAKE EXPERIENCE ATTESTATION
NO UNCONSUMED MATERIAL STATIC/SECURITY FINDINGS
NO UNUSED MATERIAL DEPENDENCIES
NO DUPLICATE CONTRACT/MIGRATION/RUNTIME AUTHORITIES
NO KNOWN UNVERIFIED MATERIAL DATA/SECURITY/FINANCIAL CLAIMS
```
