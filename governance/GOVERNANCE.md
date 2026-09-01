# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

`governance/` is BThwani's durable Product/System/Engineering/Security/Delivery authority and progressively clarified project memory. It records what must remain true across implementations, agents, branches, objectives, refactors, providers and execution sessions.

It is **not** an execution engine and must not become a registry of guards, workflows, tools, tasks, findings, branches, PRs, SHAs, current bugs, runtime snapshots, migration filenames, implementation inventories or SDLC bureaucracy.

BThwani is one platform. A current `OBJECTIVE` chooses work priority; it does not redefine Product/System truth, ownership, architecture, security, delivery semantics or another journey around itself unless an explicit authorized durable decision changes that truth.

## Canonical authority model

Durable meaning is owned by the smallest applicable governance owner:

```text
current authorized durable human decision
-> governance/product/PRD.md
-> governance/product/PRODUCT-TRUTH-SPEC.md + applicable capability Product Truth
-> governance/product/EXPERIENCE-AND-DESIGN.md when human experience/design meaning is material
-> governance/policies/** for durable engineering/security/delivery law
-> service/core contracts and implementation for executable implementation truth
-> same-candidate runtime/data evidence for runtime claims
-> current authoritative external standards/vendor rules when materially applicable
```

This is a reconciliation order, not permission to ignore contradictions. Governance can be stale; code can be wrong; runtime can expose drift; external standards can change. Reconcile to one current truth instead of blindly preferring the newest file or the running implementation.

A document outside `governance/` may be canonical **only for its bounded executable/implementation artifact** (for example one schema, migration history, runtime configuration or generated source). It cannot establish competing durable Product/System/Engineering policy merely by using words such as `canonical`, `source of truth`, `target architecture`, or `policy`.

## Structure

### Product/System truth

- `product/PRD.md` — platform-wide product meaning, durable actors, domains, surfaces and major ownership.
- `product/platform-model.yaml` — compact stable machine-readable orientation only.
- `product/PRODUCT-TRUTH-SPEC.md` — canonical semantic contract for capability/journey Product Truth.
- `product/EXPERIENCE-AND-DESIGN.md` — durable UX, information architecture, content, brand/design, accessibility, localization and cross-surface experience semantics.
- `product/contracts/*.product-truth.json` — capability/journey-specific durable Product Truth.

### Engineering/Security/Delivery policy

- `policies/engineering.md` — engineering constitution and policy routing.
- `policies/architecture-and-fullstack.md` — architecture, layer ownership, dependency direction and vertical full-stack integrity.
- `policies/data-and-migrations.md` — durable data ownership, schemas, migrations, backfills, cutovers, seeds/fixtures and data recovery.
- `policies/frontend-and-client.md` — frontend/client layer responsibility, state/readback, mobile lifecycle, resources, accessibility and RTL/localization implementation law.
- `policies/runtime-reliability.md` — runtime/config/providers, reliability, observability, performance/capacity and recovery.
- `policies/standards-and-quality.md` — context-appropriate engineering standards, Best-Practice adequacy, minimum necessary complexity and quality law.
- `policies/security.md` — authentication, authorization, secrets, privacy, isolation and sensitive operations.
- `policies/delivery.md` — exact-candidate delivery, CI/review, build, promotion, release and environment boundaries.

Everything executable stays with its executable owner: service/API/data contracts under `core/**` or `services/**`; verification configuration under `tools/verification/`; guards under `tools/guards/`; CI under `.github/**`; operational runbooks under `docs/runbooks/`; agent routing under `AGENTS.md` and `.agents/**`; execution methodology under `tools/prompting/bthwani-orchestrator/**`.

## Durable versus derived representations

Classify a materially relevant representation as one of:

```text
DURABLE_PROJECT_TRUTH
DURABLE_POLICY_INVARIANT
DERIVED_IMPLEMENTATION_MAP
EXECUTABLE_SOURCE
GENERATED_DERIVED_OUTPUT
CURRENT_RUNTIME_FACT
TASK_LOCAL_FACT
HISTORICAL_EVIDENCE
DECISION_REQUIRED
```

A derived map may mirror durable truth for tooling or implementation orientation, but it must declare itself subordinate and must not silently become a second authority. `UX-CONTRACT.md`, `DESIGN.md`, service architecture notes, runbooks, capability maps and generated registries are not durable Product/System authority unless governance explicitly assigns them that bounded role.

## Governance write gate

Discovery alone never authorizes a governance write. A fact becomes a governance candidate only when materially applicable conditions hold:

```text
PROVEN
+ DURABLE ACROSS EXPECTED IMPLEMENTATION CHANGE
+ MATERIAL TO PRODUCT / OPERATIONS / OWNERSHIP / BOUNDARIES / ENGINEERING / SECURITY / DELIVERY
+ REUSABLE ACROSS OBJECTIVES / AGENTS / SESSIONS
+ ABSENCE OR AMBIGUITY CAN MATERIALLY MISDIRECT FUTURE WORK
+ SMALLEST CANONICAL GOVERNANCE HOME IS KNOWN
+ NO UNRESOLVED DECISION OR CONTRADICTION CAN CHANGE IT
```

`DISCOVERED != GOVERNANCE_WORTHY` and `CURRENT_CODE != DURABLE_PROJECT_TRUTH`.

Implementation identifiers such as operation IDs, function names, file paths, package paths, migration filenames, commands and tool brands may appear in governance only when essential explanatory examples; they are never the durable authority unless the policy explicitly owns that identifier as a stable contract.

## Project-frame execution model

```text
project-wide frame
-> current objective priority
-> applicable durable Product/System/Engineering authority
-> highest proven root cause
-> smallest causally complete affected cone
-> standards-grounded root-correct treatment at actual owner
-> full affected writer/reader/consumer/data/contract/runtime migration
-> canonical cutover
-> cleanup/deletion/finishing
-> exact-candidate proof
-> classify newly proven durable knowledge
-> reconcile affected governance when required
```

Wide understanding does not authorize repository-wide mutation. A narrow working cone does not authorize a narrow worldview.

## One-source rules

- one durable authority per material concept;
- one canonical owner and write path per material state transition;
- one service-owned migration history per service/database authority;
- one external API/event contract provenance path per boundary;
- one durable Product Truth identity per material capability/journey;
- projections/caches/read models may not independently redefine truth;
- no parallel/shadow/fallback business truth;
- no objective-, branch-, agent-, prompt- or session-local Product/System truth competing with shared governance;
- no governance control plane parallel to executable code/runtime.

## Governance convergence and residue

A material semantic change requires governance impact classification. Reconcile governance when proven truth changes, or when execution proves an already-existing durable fact whose absence/ambiguity can materially misdirect future work.

```text
wrong system + corrected governance = NOT CLOSED
correct system + materially stale/misleading governance = NOT CLOSED
correct system + materially missing proven durable truth = NOT CLOSED when future execution can be misdirected
correct system + reconciled governance + required exact-candidate evidence = closure candidate
```

Do not update governance merely to mirror code. Do not leave a competing durable authority outside governance after cutover; reclassify it as derived/implementation/historical, or retire it after consumer proof.

## Verification boundary

Governance defines requirements; executable evidence proves implementation. Do not create a guard/workflow merely to validate governance prose, prompt text, agent metadata, approval registries or evidence bookkeeping. Machine checks may validate executable invariants or non-authoritative structure, but they cannot semantically self-certify governance correctness.

## Orchestrator boundary

`tools/prompting/bthwani-orchestrator/**` owns **how execution discovers, ranks, treats, migrates, verifies, re-diagnoses and closes**. It applies governance; it does not own a competing copy of durable engineering/product policy. Focus modules are execution lenses/adapters over the applicable governance owners.

Ordinary project work treats the orchestrator package as read-only unless current human intent explicitly authorizes package maintenance.

## Repository safety

Pin the exact user-named branch/ref and current SHA before writes. Re-resolve after material write batches and before final claims. Reconcile concurrent movement; never overwrite newer unrelated work or infer branch-specific truth from default-branch search alone.
