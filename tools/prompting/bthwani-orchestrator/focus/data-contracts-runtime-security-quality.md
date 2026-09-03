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

Multiple mutable stores for one truth are forbidden unless one is explicitly derived and non-authoritative.

## 2. Schema and migration refoundation

Treat migration history as executable architecture, not sacred chronology.

Audit:

```text
SCHEMA OWNERSHIP
MIGRATION ORDER/EPOCHS
DUPLICATE TABLES/COLUMNS
OBSOLETE COMPATIBILITY COLUMNS
BACKFILLS
SEEDS/BOOTSTRAP
CONSTRAINTS/INDEXES
POLICIES/TRIGGERS
GENERATED DB CONTRACTS
```

If the migration epoch is structurally wrong, refound the epoch/ownership model rather than repeatedly patching later migrations, subject to proven data-safety constraints.

No destructive data transformation without deterministic migration/reconciliation evidence.

## 3. Contracts and generated lineage

Canonical contract law:

```text
ONE SOURCE CONTRACT
ONE GENERATOR/TRANSFORM LINEAGE WHEN GENERATED
ONE CANONICAL OUTPUT LOCATION PER CONSUMER SHAPE
ZERO HAND-MAINTAINED MIRRORS
ZERO STALE GENERATED OUTPUT
ZERO DUPLICATE DTO/ENUM AUTHORITIES
```

Contract consumers migrate as part of the same root. Old contracts are deleted after cutover unless an external live consumer proves bounded compatibility is required.

## 4. Runtime/config/infra

Audit every material runtime authority:

```text
ENVIRONMENT VARIABLES
CONFIG FILES
FEATURE FLAGS
PORTS/ENDPOINTS
CONTAINER/COMPOSE/DEPLOYMENT
STARTUP/BOOTSTRAP
HEALTH/READINESS
QUEUES/JOBS
SECRETS REFERENCES
OBSERVABILITY
ROUTING/PROXY
```

One setting must not have competing authorities across env/config/scripts/workflows unless precedence is canonical, explicit and necessary.

Delete stale runtime paths and configuration after cutover.

## 5. Security and financial truth

Authentication, authorization, sessions, secrets, PII, provider credentials, isolation and financial mutation receive heightened proof.

Required principles:

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

Do not delete or rewrite security/financial data structures until invariants and migration are proven.

## 6. Tests are consumers, not truth by themselves

Tests may reveal required behavior, but inherited tests can encode obsolete architecture.

Classify failing/stale tests by canonical claim:

```text
VALID_CANONICAL_SPEC
OBSOLETE_BEHAVIOR
DUPLICATE_COVERAGE
WRONG_LAYER_SPEC
MISSING_PREVENTION
BROKEN_TEST_INFRA
```

Update/delete tests with the root. Never weaken a valid assertion merely to obtain green output.

## 7. CI and assurance authority

CI exists to produce unique falsifiable evidence.

Audit workflows/scripts/tools for:

```text
DUPLICATE VERIFICATION AUTHORITY
PR-ONLY ASSUMPTIONS IN h CAMPAIGN
STALE BRANCH AUTHORITY
UNCONSUMED SCANNER OUTPUT
SUPPRESSION/ALLOW-FAIL MASKING
DUPLICATE CUSTOM GUARDS
CAMPAIGN-ONLY RESIDUE
EXCESSIVE COST WITHOUT UNIQUE CLAIM
```

Create/modify/delete workflows freely when needed by `h` refoundation. Prefer one durable authority per assurance claim.

## 8. Evidence ingestion

Every material tool result must be consumed:

```text
FINDING
SEVERITY/MATERIALITY
AFFECTED CLAIM
ROOT MAPPING
DISPOSITION
REVERIFY REQUIREMENT
LIMITATION
```

Do not equate scanner execution with finding closure.

## 9. Dependencies and toolchain

Every dependency/toolchain pin/workspace relation must re-earn existence.

Delete unused dependencies after structural migration. Consolidate duplicate libraries when they encode the same responsibility. Keep separate dependencies only when capability/compatibility/risk proves separation is canonical.

Toolchain/generated workflows should be reproducible and pinned appropriately for the assurance claim.

## 10. Runtime and experience proof

When behavior is material at runtime, static evidence alone is insufficient.

Prove actual startup/request/persistence/readback/experience as applicable. Mobile/web rendered flows, backend endpoints, migrations, and integration paths are checked at the highest material boundary affected by the root.

## 11. Final assurance cleanliness

At fixed point:

```text
NO DUPLICATE MATERIAL CI AUTHORITIES
NO CAMPAIGN-ONLY WORKFLOW RESIDUE
NO STALE BRANCH-BOUND TRUST ASSUMPTION FOR h
NO UNCONSUMED MATERIAL SECURITY/STATIC FINDINGS
NO UNUSED MATERIAL DEPENDENCIES
NO DUPLICATE CONTRACT/MIGRATION/RUNTIME AUTHORITIES
NO KNOWN UNVERIFIED MATERIAL DATA/SECURITY/FINANCIAL CLAIMS
```
