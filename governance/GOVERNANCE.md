# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

`governance/` contains durable human/product policy truth and acts as BThwani's progressively clarified **durable project memory**. It is not an execution engine and must not grow registries, guard catalogs, workflow catalogs, approval state machines, task state, implementation inventories, or SDLC bureaucracy.

BThwani is governed as one platform. A current `OBJECTIVE` selects work priority inside that platform; it does not redefine Product/System truth, ownership, architecture or another journey around itself unless an explicit authorized semantic decision changes durable truth.

Governance is expected to become clearer over time as execution proves reusable platform facts. Discovery alone never authorizes a governance write; only proven durable material truth that belongs in a canonical governance owner may be reconciled or added.

## Structure

- `product/PRD.md` — platform-wide product meaning and ownership.
- `product/platform-model.yaml` — compact stable platform model when machine-readable product context is useful.
- `product/contracts/` — capability-specific Product Truth.
- `policies/engineering.md` — architecture, contracts, data, runtime, quality, and cleanup.
- `policies/security.md` — authentication, authorization, secrets, privacy, isolation, and sensitive operations.
- `policies/delivery.md` — branch safety, affected verification, CI evidence, release/deployment boundaries.

Everything else belongs with its executable owner:

- code verification configuration: `tools/verification/`;
- executable guards: `tools/guards/`;
- CI: `.github/workflows/` and `.github/actions/`;
- agent routing: `AGENTS.md` and `.agents/`;
- service/API/data contracts: their owning `core/**` or `services/**` trees.

## Project-frame execution model

Every task is judged inside one current project-wide Canonical frame reconciled from authorized intent, applicable Product Truth/policies and live system evidence.

```text
project-wide frame
→ current objective priority
→ authoritative semantic/operational parent
→ highest proven root cause
→ smallest complete affected working cone
→ direct root-correct fix
→ migrate all affected consumers/data/contracts/runtime
→ remove obsolete truth
→ classify newly proven knowledge for durable project memory
→ reconcile/enrich affected governance when required
→ affected verification + touched project-invariant proof
→ broader proof only when risk/closure requires it
```

Project-wide context does not mean repository-wide mutation or mechanically running every tool. A narrow working cone does not permit a narrow worldview. Depth means reaching the real root and proving both the affected outcome and the materially touched platform invariants.

## Truth reconciliation

For a concrete engineering/product claim, reconcile rather than blindly prefer one representation:

1. current authorized human intent, distinguishing work priority from an explicit durable Product/System decision;
2. applicable Product Truth/policy and previously proven canonical closures still valid on current evidence;
3. actual contracts, code, migrations, configuration, tests, data and live platform state;
4. same-candidate runtime evidence when runtime behavior is claimed;
5. authoritative external technical/standard evidence where required, without importing external product semantics.

Governance may be `CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | MISSING_BUT_PROVEN | DECISION_REQUIRED` against current reconciled truth. Code may also be wrong. Neither representation wins by existence or recency alone.

Plans, prompts, fixtures, diagnostics, generated reports, and historical results are support/evidence only. They never substitute for implementation or runtime truth.

## Progressive project memory

Every materially relevant fact exposed by audit, diagnosis or execution is classified before it can become durable governance:

```text
EPHEMERAL_IMPLEMENTATION_FACT
CURRENT_RUNTIME_FACT
TASK_LOCAL_FACT
DURABLE_PROJECT_TRUTH
DURABLE_POLICY_INVARIANT
DECISION_REQUIRED
```

A fact becomes a governance-enrichment candidate only when all materially applicable conditions hold:

```text
PROVEN
+ DURABLE ACROSS EXPECTED IMPLEMENTATION CHANGE
+ MATERIAL TO PRODUCT / OPERATIONS / OWNERSHIP / BOUNDARIES / POLICY
+ REUSABLE ACROSS OBJECTIVES / AGENTS / SESSIONS
+ ABSENCE OR AMBIGUITY CAN MATERIALLY MISLEAD FUTURE UNDERSTANDING OR EXECUTION
+ CANONICAL GOVERNANCE HOME EXISTS
+ NO UNRESOLVED CONTRADICTION OR DECISION GAP CAN CHANGE IT
```

`DISCOVERED ≠ GOVERNANCE WORTHY` and `CURRENT CODE ≠ DURABLE PROJECT TRUTH`.

Examples of governance-worthy facts when proven include platform/surface identity, durable actors and role boundaries, authority/responsibility, canonical ownership, domain/service boundaries, durable journeys and handoffs, material state/invariant semantics, security/financial boundaries and stable product policy. Function names, SHAs, temporary paths, task status, bug lists, transient runtime state and replaceable implementation detail do not belong here merely because they were observed.

Route durable knowledge to the smallest existing canonical owner:

```text
platform-wide meaning / surfaces / actors / durable ownership
→ product/PRD.md

compact stable platform model used for rapid orientation
→ product/platform-model.yaml

capability/journey-specific Product Truth
→ product/contracts/*.product-truth.json

durable engineering/security/delivery policy
→ policies/**
```

Prefer enriching an existing canonical owner. Create a new governance file only when a distinct durable concept cannot be represented cleanly by an existing owner and the new artifact passes the same non-duplication/value discipline.

Governance clarification is progressive, not exhaustive. Unknown or unresolved areas may remain explicit; they must never be filled with guesses simply to make the model look complete.

## One-source rules

- one authoritative owner per durable fact;
- one canonical write path per state transition;
- one migration history per service;
- one API contract provenance path;
- one Product Truth identity per capability;
- no parallel runtime truth, fallback truth, or duplicated business logic;
- no machine governance control plane parallel to code/runtime;
- no objective-, agent-, or session-local Product/System truth that competes with the shared project frame.

## Governance convergence

A material semantic system change requires governance impact classification. If the proven Canonical Product/System truth changes an actor, authority, responsibility, journey, state, transition, invariant, canonical owner, API/data ownership or durable policy meaning, reconcile the affected governance after the actual system treatment is proven.

The same convergence requirement applies when execution proves a durable material truth that was already true in the system but is missing, incomplete or materially ambiguous in governance. Governance clarification is therefore not limited to documenting newly changed semantics.

```text
wrong system + corrected governance = NOT CLOSED
correct system + materially stale/misleading governance = NOT CLOSED
correct system + proven durable truth materially missing from governance = NOT CLOSED when the gap can mislead future execution
correct system + reconciled governance + required evidence = closure candidate
```

Do not update governance merely to mirror current code, and do not leave stale or materially incomplete governance capable of directing future work toward an obsolete or ambiguous owner/path/semantic model.

## Verification boundary

Guards and workflows exist only for executable engineering truth: source integrity, architecture/imports, API/contracts, migrations/data, runtime/config, frontend binding/accessibility, security/dependencies, and executable CI.

Do not create a guard or workflow merely to validate governance text, agent instructions, plans, approval metadata, registries, or evidence bookkeeping. If a check adds no unique material assurance, remove it.

## Repository safety

Pin the exact user-named branch and current SHA before writes. Re-resolve after material write batches and before the final claim. Reconcile concurrent movement; never overwrite newer unrelated work or infer branch-specific truth from default-branch search alone.

## Orchestrator package

`tools/prompting/bthwani-orchestrator/**` is a separate self-contained textual execution package. It is read-only unless the current human instruction explicitly authorizes changes to that package. The package owns execution method; `governance/` owns durable Product/policy truth. Neither duplicates the other's responsibility.
