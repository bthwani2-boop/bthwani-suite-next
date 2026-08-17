# Diagnose, Coverage and Root-Cause Protocol

## 1. Purpose

Diagnosis exists to choose and prove the correct treatment, not to generate a report or enumerate every low-level defect before work can begin.

Use:

```text
DISCOVER → MODEL → HYPOTHESIZE → CROSS-CHECK → CHALLENGE → PROVE/DISPROVE → CLUSTER → RANK → EXECUTE WHEN READY
```

## 2. Whole-system semantic descent

For broad/project closure, diagnose top-down:

`Mission/Product Outcomes → Domains/Capabilities → Actors/Identities → Authorities/Responsibilities → Journeys → States/Transitions/Preconditions/Decision Rules/Invariants → Handoffs/Cross-Surface Meaning → Canonical Owners/Writers/Readers/Consumers → Contracts/APIs/Events → Data/Persistence/Readback → Services → Surfaces → Runtime/Config/Infrastructure → Code → Tests/CI/Observability`.

For a narrow target, start at the highest material meaning inside that target and expand only when evidence requires it.

## 3. Material coverage ledger

Coverage is a live diagnostic model, not necessarily a repository file.

Material nodes progress through:

`UNKNOWN → DISCOVERED → INSPECTED → MODELED → FINDINGS_MAPPED → ROOTS_PROVEN → FIXED → VERIFIED → CLOSED`

or `N/A_PROVEN`.

Required coverage dimensions when materially applicable:

- product/business outcome and semantic intent;
- actors, identities, roles, authorities and responsibilities;
- journeys, states, transitions, decision rules and invariants;
- failure/recovery and unknown-result behavior;
- handoffs and cross-surface behavior;
- canonical ownership, writers, readers and consumers;
- frontend/backend vertical binding;
- contracts, APIs, generated clients, schemas and events;
- data, database, migrations, consistency and readback;
- runtime, configuration, infrastructure and providers;
- security/isolation/privacy;
- testing, CI, observability and operational proof;
- repository structure/duplication/dead/stale/legacy paths;
- governance/product/policy consistency.

Missing required coverage remains open. Coverage complete is not the same as closure complete.

## 4. Journey matrix

For each material journey, account for where applicable:

`Journey | Actor | Entry | Preconditions | Available Action | Validation | Authorization | Decision Rule | Current State | Transition | Next State | Invariants | Side Effects | Persisted Change | Handoff | Next Actor/Surface | Outcome | Failure | Recovery | Later Readback | Canonical Owner | Evidence`.

A surface opening a screen is not journey proof. A required surface must perform its correct operational role and remain semantically consistent with the canonical state.

## 5. Diagnostic passes

Select the passes required by risk/scope; do not blindly execute every expensive technique.

Core passes:

- forward trace: entry → action → mutation → outcome/readback;
- reverse trace: outcome/data → writers → decision/authority → initiating actor;
- temporal trace: before/during/after/retry/restart/reconciliation;
- actor/responsibility trace;
- state/transition/invariant trace;
- cross-surface differential;
- cross-layer vertical trace;
- failure/recovery trace;
- counterfactual trace: what must be impossible if the model is correct;
- negative-space trace: expected but missing route/state/consumer/surface/error/recovery;
- adversarial trace: assume the current explanation is wrong and seek contradictory evidence.

Add security/isolation, concurrency/idempotency, finance, offline/reconnect, provider failure, compatibility/migration passes when materially applicable.

## 6. Full-stack vertical trace

A material operation should be traceable, as applicable, through:

`Product intent → actor/session/scope → UI control/route → surface binding → shared/controller/domain layer → canonical/generated client → API contract → auth/authz → backend route/handler → validation → domain service → repository/transaction → data/event/outbox/provider → canonical readback → all required consuming surfaces → runtime/observability evidence`.

Frontend and backend are not independent projects for one operational feature. A frontend-only success or backend-only capability without its required consumer/readback is incomplete.

## 7. Findings are evidence until promoted

Every early technical finding starts as `EVIDENCE/HOLD`.

Promote it only after proving enough of:

`operational parent + semantic meaning + causal chain + highest proven root + affected graph + comparative priority`.

A local compiler/test/API/UI error may be a symptom of a higher model, ownership, contract or data error.

The only exception is a proven diagnostic blocker that prevents acquisition of truth; fix it minimally and immediately return to the higher diagnosis.

## 8. Root-cause proof

For every material root candidate establish:

- problem/outcome violated;
- direct evidence and contradictory evidence checked;
- competing hypotheses considered;
- operational parent;
- canonical truth/owner/write path involved;
- upstream dependencies;
- downstream writers/readers/consumers;
- blast radius and unlock value;
- security/data/finance/runtime risk;
- target truth;
- proof that treatment at this level removes the cause rather than suppresses a symptom.

Try to disprove a candidate before declaring it proven.

## 9. Root clusters and systemic leverage

Cluster dependent findings under the highest proven common causes.

Do not prioritize by first discovery, easiest fix, file count, finding count, latest commit or first CI failure.

Prefer, in order of material relevance:

`upstream depth → blocking power → canonical authority/foundation importance → blast radius → security/data/finance/operational risk → unlock value → cross-surface/journey effect → recurrence → structural-debt multiplier → local cosmetic impact`.

## 10. Competitive deepening and progressive narrowing

Start broad enough to identify roots that could materially outrank each other. Deepen only candidates capable of changing priority or invalidating treatment.

Before execution, the winning root must be `DEEPENED_ENOUGH_TO_RANK`, and no known higher root may materially change its correct treatment.

Do not perform exhaustive low-level scans merely to feel comprehensive when they cannot change the next correct action.

## 11. When diagnosis yields execution

In execution modes, begin treatment when:

```text
ROOT = PROVEN
AND DEEPENED_ENOUGH_TO_RANK
AND HIGHEST_CURRENT_SYSTEMIC_LEVERAGE
AND EXECUTABLE
AND NO_KNOWN_HIGHER_ROOT_CAN_CHANGE_TREATMENT
```

Then execute. Do not create a plan package first.

## 12. JIT execution frontier

Derive only the next coherent treatment frontier from the currently proven root and dependencies.

Do not create large speculative future sequences whose assumptions can be invalidated by the current root fix.

After treatment and verification, re-diagnose and derive the next frontier from the new live state.

## 13. Ambiguity protocol

Never leave material uncertainty as “needs review”, “probably”, “may be correct”, or “later”.

Convert it to:

`missing_item | path_or_scope | why_it_matters/blocks | required_evidence | how_to_verify | safe_interim_state`.

If evidence can resolve it, resolve it. If only a human semantic decision can resolve it, raise `DECISION_REQUIRED`.

## 14. Exclusion proof

Every candidate surface/domain/layer excluded from a material journey or root blast radius requires a reason and sufficient evidence of non-impact. Silence is not exclusion proof.

## 15. Re-diagnosis after every material root

After each coherent root treatment:

- invalidate stale assumptions/evidence in the affected cone;
- rebuild affected coverage;
- verify descendant findings again instead of blindly fixing them;
- discover newly exposed roots;
- rerank.

A fixed root may eliminate many lower findings; do not preserve obsolete work merely because it was previously listed.