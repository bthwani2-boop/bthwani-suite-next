# Decision Output Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: Decision sections inside `01-DIAGNOSIS.md`

## Decision Candidate

Any potential question begins as:

```text
QUESTION_CANDIDATE_ID
RELATED_FINDINGS
AFFECTED_GRAPH
DERIVABLE_FACT? YES|NO
EXTERNAL_EVIDENCE_GAP? YES|NO
TRUE_DECISION_CLASS
STATUS
```

Do not ask the user while `DERIVABLE_FACT=YES`.

## True Decision Record

```text
DECISION_ID
WAVE_ID / JOURNEY / ACTOR / SURFACE / STATE
DECISION_REQUIRED
WHY_EVIDENCE_CANNOT_RESOLVE
CONTRADICTING_OR_MISSING_EVIDENCE
OPTION_A + tradeoffs
OPTION_B + tradeoffs
OPTION_C only when materially distinct
RECOMMENDATION
RECOMMENDATION_REASON
AFFECTED_GRAPH_NODES
USER_OR_AUTHORITY_DECISION
DECISION_SOURCE / DATE when available
DURABILITY_CLASS
GOVERNANCE_OWNER_CANDIDATE
STATUS
```

Allowed true-decision classes:

```text
CONTRADICTION
AMBIGUITY
MISSING_PRODUCT_OR_OPERATIONAL_DECISION
MULTIPLE_VALID_BEHAVIORS
```

Durability classification:

```text
TASK_LOCAL
IMPLEMENTATION_DETAIL
PRODUCT_CAPABILITY_TRUTH
PLATFORM_PRODUCT_TRUTH
ENGINEERING_POLICY
SECURITY_POLICY
DELIVERY_POLICY
AUTHORITY_RULE
MACHINE_CONTRACT
REGISTRY
```

## Sequential Question Rule

Questions follow dependency/wave order. Diagnose the current wave to the evidence limit first, then ask only the smallest deduplicated set of true decisions that unlocks that wave. Do not defer all material questions until the end of the target merely to create one large batch.

A material unresolved decision blocks the affected wave and dependent waves. It does not authorize guessing. After the user/authority answers, do not jump directly to execution or handoff; perform impact propagation and re-diagnosis first.

## After Decision

Every resolved material decision must record:

```text
IMPACT_PROPAGATED = YES|NO
AFFECTED_JOURNEYS_REDIAGNOSED = YES|NO
CROSS_SURFACE_RECHECK = YES|NO|N/A
CROSS_LAYER_RECHECK = YES|NO|N/A
ADVERSARIAL_RECHECK = YES|NO|N/A
NEW_FINDINGS_OR_DECISIONS
GOVERNANCE_PROMOTION_STATUS
```

In `PREPARE_ONLY`, no unresolved material decision required to execute the current wave may be silently carried into its handoff, and final `PACKAGE_READY` requires zero unresolved material decision required for the whole target.

In `EXECUTE_END_TO_END`, no unresolved material decision required for the **current wave** may be carried into live execution; later independent waves may remain unresolved until selected, but final closure still requires zero unresolved material decision for the complete target.
