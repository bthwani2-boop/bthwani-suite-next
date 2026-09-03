# H Verification, Re-Diagnosis and Fixed-Point Closure

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER
Owner: exact-h evidence, finding accounting, falsification, deletion proof, admission proof, fresh full recensus and Level-4 fixed-point qualification.

## 1. Evidence proves claims, not architecture or activity

CI, tests, scanners, linters, builds, runtime probes, rendered/device checks and reviews are evidence producers only.

```text
GREEN != CANONICAL
GREEN != CLOSED
ZERO_EXIT != FINDINGS_DISPOSITIONED
UPLOADED_ARTIFACT != EVIDENCE_CONSUMED
STATIC_PASS != RUNTIME_PROOF
SOURCE_CONFIG_CORRECT != RENDERED/DEVICE_CORRECT
```

Never turn a failed check directly into the next patch without causal classification.

Use the cheapest proof that can actually falsify the claim, then escalate by material risk and root breadth. A whole-surface/root refoundation may require broad verification immediately; this rule is for speed without under-verification, not conservative execution.

## 2. Exact-h evidence provenance

Every material closure claim remains reconstructable with:

```text
EXACT_H_SHA
CLAIM / ROOT / UNIT
EVIDENCE_SOURCE
COMMAND / RUN / JOB / CHECK / ARTIFACT / SCENARIO
BASE / INPUTS WHEN APPLICABLE
RUNNER / ENVIRONMENT / PROFILE / DEVICE WHEN RELEVANT
RESULT / DISPOSITION
WHAT_IT_PROVES
WHAT_IT_DOES_NOT_PROVE
CONFIG/RULE/WORKFLOW_PROVENANCE WHEN MATERIAL
FRESHNESS
INVALIDATION_TRIGGER
RAW_FINDINGS_AND_DISPOSITIONS
```

Evidence without adequate provenance cannot support a stronger claim than its provenance.

Changed candidate, input, environment, authority, generator, schema, runtime, security boundary or consumer cone invalidates dependent proof. Re-pin remote `h` after every material push.

## 3. Evidence dispositions are fail-closed

Every materially applicable claim ends in exactly one current disposition:

```text
PASS
FAIL
BLOCKED_BY
N/A_PROVEN
NOT_COVERED
STALE
SUPERSEDED
BLOCKED_UNKNOWN
```

Definitions:

- `PASS`: exact current claim executed and not falsified.
- `FAIL`: current claim produced material failure evidence.
- `BLOCKED_BY`: a proven prerequisite prevented execution; never PASS.
- `N/A_PROVEN`: materiality analysis proves the claim does not apply.
- `NOT_COVERED`: material claim lacks adequate executed evidence; closure forbidden.
- `STALE`: previously useful proof was invalidated.
- `SUPERSEDED`: newer exact evidence replaces the older item.
- `BLOCKED_UNKNOWN`: unresolved material uncertainty can change closure or safety.

Missing output, skipped execution, missing device/runtime, cancelled run or a green sibling check must never be translated to PASS.

## 4. Raw finding total accounting

Every material raw finding/warning from tests, CI, Sonar, CodeQL, Semgrep, OpenCodeReview, security/dependency tools, runtime probes, reviews or equivalent must be consumed into the causal model.

Each finding receives one traceable disposition:

```text
MAPPED_TO_ROOT_OR_FINDING
DUPLICATE_OF
FALSE_POSITIVE_PROVEN
AUTHORIZED_INTENTIONAL_CONDITION
TOOL_LIMITATION_PROVEN
STALE_OR_SUPERSEDED_WITH_PROOF
N/A_PROVEN
```

```text
UNMAPPED != RESOLVED
DISAPPEARED_FROM_LATER_RUN != RESOLVED
GREEN_TOOL != ALL_FINDINGS_DISPOSITIONED
```

Do not rerun every broad tool wave after every tiny commit. Re-run invalidated/newly required proof, and reserve fresh broad waves for broad structural roots and final fixed-point qualification.

## 5. Root/execution-unit closure gate

As applicable, prove:

```text
ACTUAL_SOURCE_OF_DEFECT_REMOVED
REQUIRED_SOURCE_OF_FIX_IS_CANONICAL
CANONICAL_OWNER/WRITER/BOUNDARY_EXISTS
REQUIRED_TRUTH_PRESERVED
REQUIRED_DATA/CONTRACT_MIGRATION_COMPLETE
ALL_REQUIRED_CONSUMERS_CUT_OVER
END_TO_END_PRODUCT_PARITY=PASS_OR_NA
OLD_WRITES=0
OLD_READERS/CONSUMERS=0
OLD_IMPORTS/EXPORTS/ALIASES/ROUTES=0
LOSING_AUTHORITIES=0
LOSING_FILES/DIRECTORIES/PACKAGES/SERVICES/SUBTREES=0
OBSOLETE_BRIDGES/COMPENSATIONS=0
RESPONSIBILITY_LESS_PARENTS=0
DEPENDENCY/WORKSPACE_RESIDUE=0
GENERATED_LINEAGE_REPRODUCIBLE
RUNTIME_READBACK_CORRECT
SECURITY/FINANCIAL_INVARIANTS_HOLD
ADMISSION/PREVENTION_HOLE_CLOSED
ZERO_UNDISPOSITIONED_MATERIAL_FINDINGS
ZERO_UNJUSTIFIED_OR_EXPIRED_MATERIAL_SUPPRESSIONS
```

Negative-space proof is mandatory for deletion/cutover claims.

## 6. Failure classification before mutation

Classify every material verification failure as:

```text
ACTIVE_UNIT_SYMPTOM
NEW_HIGHER_ROOT_EVIDENCE
INHERITED_INDEPENDENT_ROOT
VERIFIER_IMPLEMENTATION_FAILURE
EVIDENCE_COLLECTOR_FAILURE
ENV/INFRA_FAILURE
AUTHORITY/PERMISSION/CREDENTIAL_FAILURE
EXTERNAL_PROVIDER_FAILURE
FLAKY_OR_NONDETERMINISTIC
STALE_TEST_SEMANTICS
STALE_EVIDENCE
CANCELLED_OR_SUPERSEDED
EXPECTED_TRANSITIONAL_FAILURE_INSIDE_OPEN_UNIT
UNKNOWN
```

If evidence reveals a higher causal root, stop local patching and re-rank. Flakiness is a defect until controlled/proven; cancelled/superseded/stale is neither PASS nor current product FAIL.

## 7. Falsification is mandatory

Actively attempt to disprove closure:

```text
SEARCH_OLD_AUTHORITY_REFERENCES
SEARCH_SECOND_WRITERS
SEARCH_DUPLICATE_SEMANTICS_UNDER_DIFFERENT_NAMES/PATHS
SEARCH_SHADOW_CONFIG/CONTRACT/DTO/ENUM/MAPPINGS
SEARCH_MANUAL_GENERATED_MIRRORS
SEARCH_COMPAT/FORWARDER/REEXPORT/ALIAS_PATHS
SEARCH_EMPTY/MEANINGLESS_PARENT_CONTAINERS
SEARCH_ORPHAN_SCREENS/APIs/BINDINGS/DATA
SEARCH_TESTS/FIXTURES/MOCKS_FOR_RETIRED_TOPOLOGY
SEARCH_CI/GOVERNANCE_SUPPRESSIONS_OR_PARALLEL_AUTHORITIES
SEARCH_CAMPAIGN_ONLY_TOOL/WORKFLOW_RESIDUE
SEARCH_RUNTIME_REGISTRATION_OF_DELETED_PATHS
SEARCH_STALE_CONFIG/ENV/FLAGS/SCRIPTS
SEARCH_UNUSED_DEPENDENCIES
SEARCH_HALF_MIGRATIONS_AND_OLD_CUTOVER_PATHS
```

Textual zero-reference search alone is insufficient where runtime registration, generated wiring, database state, build manifests or external consumers can keep an old authority reachable.

## 8. Admission-hole proof

For every material defect prove both:

```text
DEFECT_REMOVED
+
SYSTEM_THAT_ADMITTED/ACCEPTED/FAILED_TO_DETECT_IT_REFOUNDED_OR_PROVEN_CORRECT
```

Use the simplest durable prevention capable of falsifying recurrence: schema constraint, type system, canonical ownership, contract generation, compiler, test, runtime assertion, static/security check or CI gate.

If the verifier itself is wrong:

```text
DEFINE_CANONICAL_CLAIM
→ REBUILD_VERIFIER
→ PROVE_GOOD_CASE_PASSES
→ PROVE_KNOWN_BAD_CASE_FAILS
→ THEN_USE_VERIFIER_AS_EVIDENCE
```

Do not create governance machinery merely to validate governance prose.

## 9. Suppression law

A suppression/ignore/allow-fail/exception cannot be self-authorized merely to obtain green output.

A material intentional exception requires:

```text
NARROW_SCOPE
PROVEN_RATIONALE
CANONICAL_OWNER_OR_EXPLICIT_HUMAN_AUTHORITY
PROOF_IT_DOES_NOT_HIDE_REQUIRED_PATH
EXPIRY_OR_REMOVAL_CONDITION_WHEN_TEMPORARY
```

At closure:

```text
ZERO_UNJUSTIFIED_OR_EXPIRED_MATERIAL_SUPPRESSIONS
```

## 10. GitHub Actions on h

`h` may create/modify/dispatch/delete workflows as required.

Requirements:

```text
EXACT_H_SHA_IDENTITY
NO_PR_DEPENDENCY_FOR_h_CAMPAIGN_EVIDENCE
NO_DEFAULT/OLD_BRANCH_AUTHORITY_ASSUMPTION
NO_DUPLICATE_CI_LOGIC_WITHOUT_UNIQUE_CLAIM
FAILURES_CONSUMED_INTO_CAUSAL_GRAPH
TEMPORARY_CAMPAIGN_WORKFLOWS_DELETED_WHEN_OBSOLETE
PERSISTENT_WORKFLOWS_RE_EARN_DURABLE_VALUE
```

If material rendered/device/runtime evidence cannot be produced, mark the claim `NOT_COVERED`; never substitute PR comments, prose or human attestation as fake execution proof.

## 11. Human-experience evidence

For materially user-facing roots distinguish claims explicitly:

```text
SOURCE/TYPE_CORRECTNESS
RENDERED_WEB_CORRECTNESS
REAL_DEVICE/MOBILE_EXECUTION
ACCESSIBILITY
LOCALIZATION/RTL WHEN MATERIAL
PERCEIVED/MEASURED PERFORMANCE WHEN MATERIAL
USABILITY/COMPREHENSION WHEN THE CLAIM DEPENDS ON HUMAN SUCCESS
```

A source build does not prove rendered/device behavior. Agent confidence does not prove usability. If a material human-experience claim has no adequate evidence, use `NOT_COVERED` rather than inventing certainty.

This does not require formal user research for every UI change; only claims whose correctness materially depends on actual human comprehension/task success require appropriate evidence.

## 12. Re-diagnose after every material unit

```text
RE-PIN h
→ REFRESH_AFFECTED_CENSUS
→ UPDATE_CURRENT_MODEL
→ INVALIDATE_STALE_EVIDENCE
→ INGEST_NEW_FINDINGS
→ REBUILD_ROOT_GRAPH
→ RE-SYNTHESIZE_EXECUTION_UNITS
→ RE-RANK
```

No frozen objective queue survives structural change.

## 13. First empty graph is not completion

When no known executable root remains, start a fresh repository-wide adversarial census from zero.

Required fresh sweep:

```text
FULL_TRACKED_TREE / TOP_LEVEL_SURFACES
ARTIFACT_DISPOSITIONS / FILE_VERDICTS / CONTAINER_VERDICTS
SEMANTIC_AUTHORITY / WINNER_LOSER / MUTABLE_WRITERS
CANONICAL_CONTAINER_MAP
FILES / DIRECTORIES / PACKAGES / SERVICES / TOPOLOGY
PARALLEL / SHADOW / DUPLICATE_RESPONSIBILITY
DATABASE / MIGRATION_EPOCHS
CONTRACT / GENERATED_LINEAGE
BACKEND / FRONTEND / SCREEN / JOURNEY_PARITY
RUNTIME / CONFIG / INFRA
DEPENDENCIES / WORKSPACES / LOCKFILE
TEST / CI / ASSURANCE
.agents / .github / .opencodereview / docs / tools / governance
DEAD / ORPHAN / STALE / COMPAT / FORWARDER / RESIDUE
ADMISSION/PREVENTION_SURFACES
```

Rebuild CURRENT and CANONICAL from fresh evidence and compare again.

## 14. Final structural cleanliness gate

Required evidence-bounded zero-known state:

```text
UNREVIEWED_TRACKED_ARTIFACTS=0
UNDISPOSITIONED_MATERIAL_ARTIFACTS=0
UNRESOLVED_FILE_VERDICTS=0
UNRESOLVED_CONTAINER_VERDICTS=0
UNRESOLVED_SEMANTIC_AUTHORITIES=0
UNRESOLVED_WINNER_LOSER_GROUPS=0
UNRESOLVED_CANONICAL_CONTAINER_ASSIGNMENTS=0
UNMAPPED_MATERIAL_CAPABILITIES=0
KNOWN_MATERIAL_PARALLEL_TRUTH=0
KNOWN_MATERIAL_SHADOW_AUTHORITY=0
KNOWN_DUPLICATE_MUTABLE_WRITERS=0
KNOWN_DUPLICATE_RESPONSIBILITY_TREES=0
KNOWN_WRONG_OWNERSHIP=0
KNOWN_NONCANONICAL_TOPOLOGY=0
KNOWN_REACHABLE_SUPERSEDED_RUNTIME=0
KNOWN_OBSOLETE_COMPATIBILITY=0
KNOWN_MANUAL_GENERATED_MIRRORS=0
KNOWN_RESPONSIBILITY_LESS_FILES=0
KNOWN_RESPONSIBILITY_LESS_DIRECTORIES=0
KNOWN_REDUNDANT_PACKAGES/SERVICES=0
KNOWN_REEXPORT_FORWARDER_SHIM_ALIAS_RESIDUE=0
KNOWN_UNJUSTIFIED_FILE_FRAGMENTATION=0
KNOWN_DEAD_OR_ORPHANED_MATERIAL=0
KNOWN_UNCLASSIFIED_MATERIAL_CONTAINERS=0
KNOWN_LOSING_SUBTREES=0
KNOWN_CAMPAIGN_ONLY_WORKFLOW/TOOL_RESIDUE=0
KNOWN_PARALLEL_GOVERNANCE/AGENT/DOC_AUTHORITY=0
KNOWN_UNRESOLVED_E2E_PARITY_GAPS=0
KNOWN_UNRESOLVED_CURRENT_TO_CANONICAL_DELTA=0
KNOWN_MATERIAL_ADMISSION_HOLES=0
KNOWN_MATERIAL_DEFECTS=0
KNOWN_MATERIAL_UNKNOWNS=0
UNDISPOSITIONED_MATERIAL_TOOL_FINDINGS=0
UNJUSTIFIED_OR_EXPIRED_MATERIAL_SUPPRESSIONS=0
```

## 15. Final full-surface death test

At fixed point, every top-level control/support surface must justify existence and shape:

```text
.agents
.github
.opencodereview
docs
tools
governance
```

If a surface remains larger, duplicated or more confusing than necessary, fixed point has not been reached.

## 16. Final qualification

Run all materially applicable exact-h compile/type/lint/test/build/backend/data/runtime/security/contract/experience/dependency/workflow checks after the fresh recensus.

Then adversarially falsify the fixed-point claim one final time.

Only when every material claim is `PASS` or `N/A_PROVEN` may the orchestrator emit:

```text
H_TRUSTWORTHY_CANONICAL_BASELINE_REFOUNDATION_COMPLETE
EXACT_H_SHA=<immutable_sha>
LEVEL_4_EVIDENCE_STATE=PASS
KNOWN_REMAINING_ROOTS=0
KNOWN_MATERIAL_DEFECTS=0
KNOWN_MATERIAL_UNKNOWNS=0
```

New evidence reopens the graph. Completion is evidence-bounded, never based on confidence alone.
