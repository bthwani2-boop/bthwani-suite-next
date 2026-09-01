# BThwani Product Truth Specification

Status: ACTIVE_CANONICAL

## Purpose

Capability/journey Product Truth records durable Product/System meaning that must survive implementation refactors. It defines **what the capability means, who owns it, who may act, what states/transitions/invariants are legal, how truth is written/read back, and what outcomes are forbidden**. It is not an implementation registry or execution plan.

There is one durable Product Truth identity per material capability/journey. Split files only when concepts have genuinely independent Product semantics/owners; merge overlapping contracts that compete for the same semantic authority after migration proof.

## Canonical semantic envelope

A materially complete Product Truth defines, when applicable:

1. stable capability/journey identity and outcome/problem;
2. affected actors and their responsibilities;
3. canonical Product/domain owners and authority boundaries;
4. required surfaces/consumers and explicit exclusions with reasons;
5. preconditions and trusted context/object-scope requirements;
6. durable states, legal transitions and forbidden transitions;
7. business/negative invariants and decision semantics;
8. canonical write intent/path semantics and committed readback semantics;
9. cross-surface/service handoffs and durable event/contract meaning;
10. canonical data ownership and material persistence/migration implications;
11. idempotency/concurrency/retry/replay semantics where material;
12. external-provider unknown-result/reconciliation/recovery semantics where material;
13. security/privacy/financial classification and restrictions where material;
14. loading/empty/offline/forbidden/conflict/partial/error/recovery semantics when user-visible;
15. acceptance criteria and negative/failure states;
16. evidence classes needed to prove the capability, without hard-coding one tool as semantic authority;
17. legacy/superseded authority removal condition when a semantic migration exists;
18. explicit `DECISION_REQUIRED` gaps when durable behavior cannot be derived safely.

Do not manufacture irrelevant fields merely to fill a template.

## Representation versioning

Current repository contracts contain more than one historical JSON shape. Syntax divergence alone does not invalidate otherwise proven Product meaning, and **blind mass conversion that risks semantic loss is forbidden**.

For any new Product Truth or any materially edited existing Product Truth, converge toward a single canonical semantic representation with an explicit schema/version marker and the envelope above. Migration must preserve every still-valid durable rule, distinguish intentionally removed semantics, and avoid converting replaceable implementation identifiers into durable Product authority.

Legacy representations remain `LEGACY_REPRESENTATION` until touched/migrated; they must not gain new incompatible ad-hoc grammar. Their semantic content is reconciled using this specification.

## Durable versus traceability fields

Durable fields own meaning. Implementation traceability may reference current routes, operation IDs, screens, tables or paths **only as derived locators** and must be clearly non-authoritative. Such identifiers may change without changing Product truth.

If a contract currently contains `operationIds`, route/screen paths, filenames or implementation statuses, treat them as `DERIVED_TRACEABILITY` unless the public identifier itself is intentionally a durable external contract. Never infer Product semantics from their presence alone.

Task/campaign terms such as `fix`, `rescue`, `closure`, current branch state, current bug status or migration workstream do not belong in a durable capability identity. When encountered in a legacy Product Truth, classify durable semantics separately and migrate/retire the task-local naming after reference proof.

## Ownership and writers/readers

Product Truth names semantic owners and allowed actor responsibilities; executable service/API/data contracts own concrete technical interfaces. A surface can be required without becoming the owner. A projection/read model can be required without becoming a writer.

Ambiguous ownership must not be solved by permanent synchronization between two authorities. Resolve one owner, define migration/cutover, and make other copies subordinate/reconstructable or remove them.

## State and failure semantics

Happy-path acceptance alone is incomplete when retries, concurrency, authorization, offline behavior, provider unknown outcomes, partial failure or recovery can change the user/business result. Record materially required failure/unknown/recovery semantics so implementations cannot invent divergent behavior per surface.

## Product Truth changes

A Product Truth change requires a proven durable semantic reason, not merely current code shape. When meaning changes, identify affected actors/surfaces/owners/contracts/data/migrations/readbacks/legacy consumers and propagate the change through the real system before claiming closure.

A human decision is required only when multiple materially valid Product semantics remain after derivable evidence is exhausted. External Best Practice may inform engineering technique but cannot invent BThwani Product behavior.

## Acceptance and verification boundary

Product Truth states what must be proven; exact evidence is chosen by engineering/security/delivery policy and the execution orchestrator. Static success, runtime success, visual success and security/finance/isolation proof are distinct evidence classes.

Do not create a workflow or semantic linter that declares Product Truth itself correct. Structural schema checks may detect malformed representation, but semantic correctness requires reconciliation with authorized intent, governance, implementation and evidence.
