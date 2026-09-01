# BThwani Engineering Constitution

Status: ACTIVE_CANONICAL

## Governing law

> **Correct root, correct owner, correct layer, correct standard, minimum necessary complexity, complete vertical integrity, complete cutover, zero parallel truth, zero known material residue tied to the change.**

A change is not engineering-correct merely because it compiles, passes tests, makes a screen work, reduces a diff, or removes one symptom. It must preserve the platform's canonical ownership and invariants through the complete affected cone.

## Policy ownership

This file owns cross-cutting engineering law and routes detailed durable requirements to:

- `architecture-and-fullstack.md` — architecture, layer responsibility, dependencies, contracts/generated boundaries and full-stack integrity;
- `data-and-migrations.md` — schemas, constraints, migrations, backfills, seeds/fixtures and data cutovers;
- `frontend-and-client.md` — screens/controllers/adapters, local state/readback, mobile/client lifecycle and resource correctness;
- `runtime-reliability.md` — runtime/config/providers, observability, resilience, performance/capacity and recovery;
- `standards-and-quality.md` — context-appropriate Best Practice/standards adequacy and quality.

Security/privacy remains owned by `security.md`; delivery/promotion/release by `delivery.md`; Product/System semantics by `../product/**`.

## Universal engineering invariants

- Every durable fact and mutation has one authoritative owner and one canonical write path.
- Cross-domain access uses explicit contracts; no direct cross-service table mutation or copied business authority.
- Projections, caches, read models, mocks, local UI state and generated outputs remain subordinate and reconstructable.
- Source-of-Fix is the highest actual owner capable of removing the defect; do not patch descendants when an upstream owner is wrong.
- Reusable logic belongs at the smallest stable owner with real multiple consumers; `shared`, `common`, `utils` or a wrapper name never creates authority.
- Generated artifacts are changed through their canonical source/generator, then regenerated and consumers verified.
- Breaking ownership/contract/data changes require complete writer/reader/consumer migration, safe cutover and retirement of the superseded path.
- Known obsolete compatibility, duplicate authority, stale aliases, dead fallback or half-migration tied to the change is not acceptable final residue.
- Task/process terminology, branch names, prompt concepts and verification mechanics must not leak into Product/runtime architecture.

## Vertical outcome rule

When a material product outcome crosses layers, correctness is proven vertically through every affected layer rather than declaring success after one horizontal slice:

```text
Product/Journey
-> Surface
-> Controller/ViewModel
-> Contract Adapter/Generated Client
-> Canonical Contract
-> Auth/Authz
-> Backend/Application Boundary
-> Domain Owner
-> Persistence/Event/Provider Boundary
-> Schema/Constraints/Migration when applicable
-> Persisted/External Result
-> Canonical Readback
-> All affected Consumers/Surfaces
```

Only materially applicable links are required, but filesystem or app boundaries may not truncate a proven dependency.

## Verification law

Use the smallest evidence capable of falsifying the affected claim, then expand by risk/evidence. Static reachability is not semantic correctness; build success is not runtime proof; runtime success is not authorization/security/data-migration proof; tool green is not system closure.

Do not create meta-guards, duplicate diagnostics or assurance bureaucracy when existing compiler/test/runtime/security capabilities can prove the same invariant more directly.

## Cleanup law

Prefer deletion/consolidation after proven cutover over indefinite compatibility. Before move/delete/merge, prove real consumers, generated/runtime dependencies, migration/data consequences and recovery. Git is history; active backup copies and task artifacts are not architecture.
