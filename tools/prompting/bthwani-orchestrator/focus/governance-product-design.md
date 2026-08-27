# Focus — Product Meaning, UX Semantics and Durable Governance

## 1. Purpose

Apply when scope touches Product/System semantics, actors, authorities, journeys, states, responsibilities, information architecture, UX meaning, governance, durable project memory or engineering policy.

Governance records proven durable truth; it does not invent truth and does not substitute for fixing the actual system.

## 2. Product/System truth

Reconcile materially applicable:

`Product Outcome | Actor | Responsibility | Authority | Journey | State/Transition | Preconditions | Decision Rules | Invariants | Handoffs | Canonical Owner | Writers/Readers/Consumers | Contract/Data/Runtime ownership | Cross-surface meaning`.

A local implementation or objective wording cannot silently redefine these.

## 3. UX is operational meaning

Treat UX as:

`entry -> understanding -> discoverability -> available actions -> authorization -> decision -> state change -> feedback -> handoff -> later readback -> failure -> recovery -> terminal outcome`.

A cross-surface difference is material when it expresses a different state, responsibility, permission, canonical fact or handoff even if each screen works locally.

Product/UX semantics are settled here; concrete component/layout/accessibility implementation is owned by `focus/code-architecture-organization.md`.

## 4. Actor/authority discipline

For each material capability/journey prove:

- who initiates;
- who decides;
- who owns canonical truth;
- who writes it;
- who may read/project it;
- who may cancel/recover/intervene;
- who receives the next handoff;
- which permissions/object scopes enforce it.

Do not solve ambiguous ownership by synchronizing multiple authorities indefinitely.

## 5. Canonical Product/System target

Before semantic mutation establish enough of:

`Target Outcome | Canonical Owner | Allowed Writers | Consumers | Actor/Permission Scope | State Machine | Invariants | Contract/Event Meaning | Data Ownership | Handoff Model | Failure/Recovery | Cross-surface Readback | Security/Audit | Migration/Cutover | Legacy Removal Condition`.

Model only what is material to the root; do not speculate for unrelated domains.

## 6. Governance is durable memory, not execution authority

Classify current governance representations as materially applicable:

`CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | MISSING_BUT_PROVEN | DECISION_REQUIRED | N/A_PROVEN`.

Governance may be proven stale by live system/product evidence. Implementation may also be proven wrong by durable product authority. Reconcile to one truth; do not preserve both.

```text
DOCUMENTATION RECORDS THE FIX
DOCUMENTATION MUST NOT SUBSTITUTE FOR THE FIX
```

## 7. Governance write gate

A governance mutation is allowed only when:

```text
truth is materially proven
AND durable across expected implementation change
AND reusable across future objectives/agents/sessions
AND material to Product/Operations/Ownership/Boundaries/Policy
AND absence/ambiguity can materially misdirect future work
AND no unresolved contradiction/decision can change it
AND the smallest current canonical governance owner is proven live
```

Do not create new governance files merely because a fact is important if an existing owner can represent it clearly.

## 8. Live-path verification

Historical expected paths are discovery anchors only. Before any governance write, verify live existence/ownership/current repository truth.

Possible current homes may include product PRD/platform model/product-truth contracts/policies, but **never recreate a missing historical path automatically**. If ownership moved, follow the live canonical owner.

## 9. Decision gaps

A human decision is required only when multiple materially valid Product/System/architectural semantics remain after all derivable evidence is exhausted.

Do not ask for implementation details that can be derived. Do not use external best practice to invent product behavior.

After a human semantic decision:

`propagate -> invalidate affected assumptions -> re-diagnose affected cone -> update target/ownership/migration -> execute actual system -> prove runtime -> reconcile governance`.

## 10. Information architecture and design semantics

When navigation/discoverability/design is material, prove:

- actor's mental/operational model;
- responsibility grouping;
- information hierarchy;
- action discoverability;
- terminology/state labels;
- handoff/feedback semantics;
- consistent meaning across surfaces.

Do not improve visual arrangement by creating a new local Product/System truth.

Concrete UI implementation details route additionally to the code/architecture focus module.

## 11. Governance/control artifacts must justify themselves

Policies, registries, checklists, prompt adapters, design docs and control artifacts are subject to the same necessary-value test:

`Necessary Purpose | Canonical Owner | Real Consumer | Unique Authority/Assurance Value | Correct Placement | No Duplicated Rule`.

A control artifact that only mirrors another rule without unique value is duplication and should be merged/deleted after reference proof.

## 12. Durable-knowledge finishing

Before closure:

- no materially touched governance points to stale owner/path/semantics;
- no newly proven durable truth with material future-misdirection risk remains missing/ambiguous;
- no task-local/runtime/transient fact is promoted into durable governance unnecessarily;
- no competing governance representation remains for the same material truth.

Governance cleanliness is a closure property only where the root materially touched durable meaning/policy; it is not permission for unrelated documentation sweeps.

## 13. Human-experience, brand and design authority

When a user-facing experience is material, reconcile one coherent authority chain rather than treating screens as isolated styling targets:

```text
PRODUCT / BRAND TRUTH
-> USER / ACTOR NEED
-> JOURNEY / TASK
-> INFORMATION ARCHITECTURE
-> INTERACTION / FEEDBACK / RECOVERY
-> VISUAL LANGUAGE
-> CONTENT / TERMINOLOGY
-> SEMANTIC DESIGN-SYSTEM AUTHORITY
-> CROSS-SURFACE EXPERIENCE
```

The durable visual-language model, where materially required, may include:

`brand principles | semantic color | typography | spacing/grid/sizing | shape/radius/elevation | iconography | imagery/illustration | motion | density | component anatomy/states | content/microcopy style | platform adaptation`.

Do not invent these dimensions merely to fill a checklist. When a dimension materially affects identity, comprehension, interaction or cross-surface consistency, it requires a canonical owner/source and explicit disposition under `01`.

A design/prototype file, token source, component library, implementation and rendered screen must not survive as competing authorities for the same concept. Determine which representation owns the durable decision and which are derived/evidentiary, then reconcile all affected representations to it.

`VISUAL IDENTITY != LOCAL SCREEN STYLING`. A local screen may adapt to platform or task constraints, but any divergence from the canonical language requires a proven Product/UX/platform reason rather than convenience.

## 14. Content design and terminology authority

Labels, state names, errors, confirmations, destructive-action copy, help text, empty states and recovery guidance are Product/UX semantics when they can change user understanding or action.

For materially shared concepts, establish one canonical terminology/content meaning across surfaces and languages while allowing platform-appropriate phrasing that preserves the same semantics. Localization must not create a different Product truth.

## 15. Usability evidence and controlled experimentation

A design is not proven usable because it is attractive, internally consistent or preferred by an agent/designer. When a material claim depends on real-user comprehension, discoverability or task completion and existing evidence cannot establish it, require appropriate usability/research evidence under `04`.

Experiments, feature flags or staged UX variants are bounded transition/evidence mechanisms only. A material experiment requires a defined owner, hypothesis/decision purpose, audience/scope, measurement/evidence plan, canonical winner/cutover rule and removal/expiry condition. Do not allow an experiment or flag to become permanent parallel Product/UX truth.

External design/platform practice may inform a solution when research is permitted, but it cannot override BThwani Product/Brand authority or justify copying another product's identity.