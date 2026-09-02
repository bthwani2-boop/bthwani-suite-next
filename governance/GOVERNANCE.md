# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

`governance/` is BThwani's self-contained durable Product/System/Experience/Engineering/Security/Delivery authority. It records what must remain true across implementations, teams, tools, agents, branches, refactors, providers and execution methods.

Governance is not an execution engine, task tracker, tool registry, workflow catalog, finding database, branch/PR record, runtime snapshot, implementation inventory or archive of current code shape.

BThwani is one platform. A temporary objective, implementation, branch, prompt, tool or session cannot redefine durable Product/System truth merely because it is current.

## Independence and dependency direction

Governance is intentionally independent from execution machinery.

```text
ALLOWED:   execution / agents / prompts / workflows / tools / code -> consume governance
FORBIDDEN: governance -> require an agent / prompt / orchestrator / workflow / scanner / guard to retain its meaning
```

Deleting, replacing or redesigning any execution framework, AI-agent package, prompt set, CI workflow, scanner, guard, IDE integration or automation must not make governance semantically incomplete. Those systems may enforce, inspect or apply governance; they do not define it.

Governance may refer to other files **inside `governance/`** when responsibility is intentionally split. References to executable artifacts outside governance are explanatory/traceability-only and never prerequisites for understanding a durable rule.

## Typed authority model

Authority is typed; it is not one simplistic precedence ladder.

| Question | Canonical authority |
|---|---|
| What product capability/journey means | `product/PRD.md` + applicable Product Truth |
| Who may act and who owns durable Product/System truth | applicable Product Truth + PRD domain ownership |
| Durable UX/content/brand/accessibility meaning | `product/EXPERIENCE-AND-DESIGN.md` |
| Architecture/layers/data/runtime/quality engineering law | `policies/engineering.md` and its specialized policies |
| Security/privacy law | `policies/security.md` |
| Delivery/promotion/release law | `policies/delivery.md` |
| Concrete executable API/schema/event/interface | its owning executable contract/source |
| Concrete current runtime state | exact attributable runtime/data evidence |
| Mutable external legal/platform/vendor requirement | current authoritative external source |

An executable contract, code path or runtime fact cannot silently rewrite Product meaning. Conversely, governance cannot make a runtime claim true merely by documenting it. Contradictions require reconciliation at the owner of the affected meaning.

Applicable non-waivable legal, regulatory, contractual and platform obligations cannot be overridden by an internal convenience decision. Current external requirements are revalidated when they materially govern a decision rather than copied into governance as timeless version numbers.

## Structure

### Product/System authority

- `product/PRD.md` — platform-wide Product/System meaning, actors, domains, surfaces and major ownership.
- `product/PRODUCT-TRUTH-SPEC.md` — semantic and representation rules for capability/journey Product Truth.
- `product/PRODUCT-TRUTH.schema.json` — structural representation schema only; it does not certify semantics.
- `product/contracts/*.product-truth.json` — capability/journey-specific durable Product Truth.
- `product/EXPERIENCE-AND-DESIGN.md` — durable cross-surface experience, content, brand/design, accessibility and localization authority.
- `product/platform-model.yaml` — explicitly derived machine-readable orientation; it must contain no unique Product truth.

### Engineering/Security/Delivery authority

- `policies/engineering.md` — engineering constitution and specialized-policy routing.
- `policies/architecture-and-fullstack.md` — architecture, layer ownership, dependency direction and full-stack vertical integrity.
- `policies/data-and-migrations.md` — data/database ownership, migrations, backfills, seeds/fixtures and data cutover/recovery.
- `policies/frontend-and-client.md` — frontend/mobile/client responsibilities, state/readback, lifecycle/resources, accessibility/localization implementation law.
- `policies/runtime-reliability.md` — runtime/config/providers, reliability, observability, performance/capacity and recovery.
- `policies/standards-and-quality.md` — context-appropriate standards, Best-Practice adequacy, minimum necessary complexity and quality.
- `policies/security.md` — authentication, authorization, secrets, privacy, isolation and sensitive operations.
- `policies/delivery.md` — source-candidate identity, CI/review, build/provenance, promotion, release and environment boundaries.

## Durable versus derived representations

Every materially relevant representation belongs to one class:

```text
DURABLE_PROJECT_TRUTH
DURABLE_POLICY_INVARIANT
DERIVED_NON_NORMATIVE_MAP
EXECUTABLE_SOURCE
GENERATED_DERIVED_OUTPUT
CURRENT_RUNTIME_FACT
TASK_LOCAL_FACT
HISTORICAL_EVIDENCE
DECISION_REQUIRED
```

A derived map may mirror durable truth for tooling or orientation only when it is explicitly subordinate and introduces no unique semantic rule. Generated code, current screen/route/table names, operation IDs, file paths, migration filenames, commands, tool brands, branch names and current environment facts are not durable Product/System authority merely because governance work discovered them.

## One-source laws

- one durable authority per material concept;
- one canonical owner and mutation authority per material state transition;
- one service-owned migration history per data authority;
- one external contract provenance path per boundary;
- one durable Product Truth identity per material capability/journey;
- one semantic design decision owner for cross-surface experience;
- projections/caches/read models are subordinate and reconstructable;
- no permanent parallel/shadow/fallback business truth;
- no task-, branch-, tool-, prompt-, agent- or session-local truth competing with governance;
- no governance document may self-declare executable correctness.

Textual duplication is not automatically a defect, but duplicated **authority, decision rule, writer, state machine, policy or durable meaning** is. Repeated explanatory wording must not create an alternative owner.

## Governance write gate

Discovery alone never authorizes a durable governance write. A fact belongs in governance only when all materially applicable conditions are satisfied:

```text
PROVEN OR EXPLICITLY AUTHORIZED DURABLE DECISION
+ DURABLE ACROSS EXPECTED IMPLEMENTATION CHANGE
+ MATERIAL TO PRODUCT / OPERATIONS / OWNERSHIP / ENGINEERING / SECURITY / DELIVERY
+ REUSABLE ACROSS FUTURE OBJECTIVES / TEAMS / TOOLS
+ ITS ABSENCE OR AMBIGUITY CAN MATERIALLY MISDIRECT FUTURE WORK
+ SMALLEST CANONICAL GOVERNANCE HOME IS KNOWN
+ NO UNRESOLVED CONTRADICTION CAN CHANGE THE MEANING
```

`CURRENT_CODE != DURABLE_PRODUCT_TRUTH` and `DISCOVERED != GOVERNANCE_WORTHY`.

If evidence proves a durable decision is genuinely unresolved, record a bounded `DECISION_REQUIRED` only in the smallest owner where its absence blocks safe interpretation; never invent a policy to make the document look complete.

## Conflict and reconciliation rules

When sources disagree:

1. classify what type of truth is disputed;
2. identify the owner of that truth class;
3. determine whether governance is stale, implementation is wrong, runtime has drifted, or an external requirement changed;
4. reconcile to one authoritative meaning;
5. propagate the decision through every materially affected durable governance owner;
6. reclassify or retire the superseded durable representation.

A running implementation is evidence, not automatic permission to rewrite governance. An old governance statement is not protected from correction merely because it is labeled canonical.

## Change-impact and convergence law

A material Product/System/Engineering/Security/Delivery change must classify governance impact. Governance is updated when durable meaning changes or when a previously missing proven durable rule would materially misdirect future work.

```text
wrong implementation + corrected governance = NOT SYSTEM-CLOSED
correct implementation + materially stale governance = NOT GOVERNANCE-CLOSED
correct implementation + missing material durable meaning = NOT GOVERNANCE-CLOSED
correct implementation + reconciled governance + appropriate evidence = closure candidate
```

Governance must not mirror every code change. It must also not leave a competing durable authority elsewhere after semantic cutover.

## Verification boundary

Governance defines durable requirements; executable evidence proves implementation and runtime claims. Structural schema validation may prove that a governance representation is well-formed, but no schema, test, workflow, scanner, AI agent or approval registry can semantically self-certify governance correctness.

Evidence may reveal that governance is wrong or incomplete; the correction still requires reconciliation at the appropriate durable owner.

## Governance quality bar

`governance/**` is fit to serve as the project's durable foundation only when:

- every active file has a unique, explicit responsibility;
- no active Product Truth uses an incompatible representation grammar;
- derived files contain no unique durable meaning;
- no governance rule semantically depends on replaceable execution machinery;
- overlaps between policies are routing/reference relationships rather than competing normative copies;
- known contradictions, stale authorities and task-local residue are absent;
- any unresolved durable decision is explicit rather than hidden behind an invented default.
