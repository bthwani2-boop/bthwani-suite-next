# Closure — Verification and Repository Fixed Point

Green builds are necessary evidence, not proof of canonical closure.

## 1. Evidence provenance

Every material closure claim must be supported by fresh evidence tied to exact current `h`.

Evidence must state or allow reconstruction of:

```text
EXACT_H_SHA
CLAIM
COMMAND/INSPECTION/TEST
RESULT
FRESHNESS
AFFECTED_CONE
```

Stale evidence is invalid after material head movement in its cone.

## 2. Positive verification

As applicable execute and prove:

```text
Go build/test/race-sensitive tests where material
TypeScript typecheck/build/tests
Expo/Next app build/source verification
OpenAPI ref resolution/operation uniqueness/schema conflict checks
contract composition and deterministic client generation
DB reset/upgrade/migration/backfill behavior
constraints/indexes/idempotency
runtime startup/health/readiness
worker/outbox/retry/reconciliation behavior
auth acceptance/rejection/session lifecycle
provider sandbox/local-simulator adapter behavior
webhook verification/replay/idempotency
mobile/web route composition
real rendered/device behavior when materially changed
notification event→delivery→native route when affected
search owner→query→results when affected
financial mutation→provider/reconciliation→ledger/readback
security/secret negative tests
```

A passing check proves only the claim it exercises.

## 3. Required negative-space census

After each unit and globally search for:

```text
OLD core/ PATHS
OLD shared/ PATHS
OLD apps/*/runtime PATHS
OLD core-* PACKAGE NAMES
OLD *-runtime APP PACKAGE NAMES
OLD Go replace PATHS
OLD Docker contexts
OLD workspace/tsconfig/Nx/CI/script paths
SERVICE→APP IMPORTS
APP_SHAPED_DSH_EXPORTS
Dsh*Application MONOLITHIC COMPOSITION
DSH frontend/shared
DSH frontend/wlt-boundary feature ownership
GENERIC PROVIDERS SERVICE/API/CLIENT
credentials JSONB PROVIDER SECRET AUTHORITY
SECRET VALUES IN GIT/API/CLIENT/AUDIT
GENERIC Provider.execute ABSTRACTION
BLIND FINANCIAL FALLBACK
WORKFORCE employee/captain/field MUTUAL-EXCLUSIVE RELATIONSHIP MODEL
DUPLICATE AUTH/SESSION AUTHORITIES
GENERIC common/shared/core PACKAGE OR CONTRACT DUMPS
MANUAL MASTER OPENAPI INDEX
MANUAL DTO/ENUM/STATUS/ACTION/OPERATION MIRRORS
DUPLICATE MUTABLE WRITERS
FINANCIAL SHADOW REFERENCES
APP HOME/ACCOUNT/SETTINGS/SEARCH FALSE DOMAINS
ACTOR-PREFIXED DUPLICATE CAPABILITIES
STALE TESTS/FIXTURES/MOCKS
WRAPPERS/ALIASES/REEXPORTS
EMPTY/MEANINGLESS PARENTS
UNJUSTIFIED OVERSIZED/MULTI-RESPONSIBILITY FILES
UNUSED DEPENDENCIES
ORPHAN ROUTES/APIS/BINDINGS/DATA
```

Positive proof of a winner is insufficient while a loser remains reachable.

## 4. Structural target gates

### Repository topology

```text
core/=ABSENT
shared/=ABSENT
apps/* ARE DIRECT DEPLOYABLE ROOTS
packages/ CONTAINS ONLY PROVEN TECHNICAL PACKAGES
contracts/ OWNS NO BUSINESS API SEMANTICS
infra/ OWNS NO BUSINESS SEMANTICS
```

### Providers/integrations

```text
GENERIC_PROVIDER_GOD_SERVICE=0
RAW_PROVIDER_SECRETS_IN_GENERAL_DB=0
SECRET_REF_MODEL=PASS
DOMAIN-SPECIFIC_PORTS=PASS
CONTROL_PLANE/DATA_PLANE_SPLIT=PASS
FINANCIAL_UNKNOWN_OUTCOME_RECONCILIATION=PASS
```

### Workforce

```text
PERSON/ENGAGEMENT/OPERATIONAL_ROLE_SEPARATION=PASS
FALSE_EMPLOYEE_VS_CAPTAIN/FIELD_EXCLUSIVITY=0
IDENTITY_SINGLE_AUTHORITY=PASS
DSH_OPERATIONAL_AUTHORITY=PASS
WLT_FINANCIAL_AUTHORITY=PASS
```

### Design system

```text
ONE_SEMANTIC_DESIGN_TOKEN_AUTHORITY=PASS
WEB/NATIVE PLATFORM BOUNDARIES=PASS
DUPLICATE_BRAND_SYSTEMS=0
DOMAIN_TRANSLATIONS_IN_DESIGN_SYSTEM=0
shared/control-panel RESIDUE=0
```

### Contracts

```text
SERVICE_CONTRACT_SOVEREIGNTY=PASS
ROOT_PROTOCOL_PRIMITIVES_ONLY=PASS
CATALOG_GENERATED_OR_ABSENT=PASS
UNRESOLVED_REFS=0
MANUAL_GENERATED_MIRRORS=0
```

## 5. Per-capability closure

A material capability is closed only when all applicable links are accounted for:

```text
CANONICAL_NAME
PRODUCT MEANING
OWNER
STORAGE/WRITER
BACKEND
TRANSPORT/EVENT
CONTRACT
GENERATED LINEAGE
SERVICE FRONTEND
APP/SURFACE CONSUMERS
CROSS-SERVICE BOUNDARIES
SECURITY
FINANCIAL INVARIANTS
MIGRATION/CUTOVER
LOSER DELETION
RUNTIME READBACK
NEGATIVE SPACE
PREVENTION
FRESH RE-CENSUS
```

## 6. Repository Level-4 fixed point

Completion requires a fresh adversarial full-repository census proving:

```text
KNOWN_MATERIAL_FINDINGS=0
KNOWN_MATERIAL_UNKNOWNS=0
KNOWN_MATERIAL_PARTIAL_CUTOVERS=0
KNOWN_MATERIAL_PARALLEL/SHADOW_TRUTH=0
KNOWN_MATERIAL_LOSING_CONTAINERS=0
KNOWN_MATERIAL_WRAPPERS/ALIASES/REEXPORTS=0
KNOWN_MATERIAL_DUPLICATE_CONTRACT_AUTHORITIES=0
KNOWN_MATERIAL_MANUAL_GENERATED_MIRRORS=0
KNOWN_MATERIAL_DUPLICATE_WRITERS=0
KNOWN_MATERIAL_RUNTIME_CONFIG_DRIFT=0
KNOWN_MATERIAL_STALE_TEST/TOOL/EXPORT/DEPENDENCY_RESIDUE=0
KNOWN_MATERIAL_BACKEND↔CONTRACT↔FRONTEND↔APP MISMATCH=0
KNOWN_MATERIAL_SECURITY/FINANCIAL_GAPS=0
KNOWN_REQUIRED_CAPABILITIES_OR_JOURNEYS_LOST=0
FRESH_FALSIFICATION=PASS
MATERIAL_BUILD/DB/RUNTIME/E2E=PASS
```

The first green build, commit, or empty local task list is not completion.

## 7. Temporary package self-deletion

Only after Section 6 passes and no open unit depends on this package:

```text
VERIFY_NO_SCRIPT_READS tools/prompting/bthwani-refoundation
VERIFY_NO_CI/BUILD/RUNTIME/GENERATOR/TEST READS IT
VERIFY_NO_PROMPT ROUTER REQUIRES IT
VERIFY_NO_OPEN_UNIT DEPENDS ON IT
→ DELETE ENTIRE tools/prompting/bthwani-refoundation/
→ RE_PIN_LIVE_h
→ VERIFY_PATH_ABSENT
→ VERIFY_ZERO_REFERENCES
→ FINAL_FIXED_POINT_CONFIRMATION
```

Do not retain a README, archive copy, compatibility stub, or legacy plan after closure.