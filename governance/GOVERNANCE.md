# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

`governance/` contains only durable human/product policy truth. It is not an execution engine and must not grow registries, guard catalogs, workflow catalogs, approval state machines, or SDLC bureaucracy.

BThwani is governed as one platform. A current `OBJECTIVE` selects work priority inside that platform; it does not redefine Product/System truth, ownership, architecture or another journey around itself unless an explicit authorized semantic decision changes durable truth.

## Structure

- `product/PRD.md` — platform-wide product meaning and ownership.
- `product/platform-model.yaml` — compact platform model when machine-readable product context is useful.
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
→ reconcile affected governance
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

Governance may be `CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | DECISION_REQUIRED` against current reconciled truth. Code may also be wrong. Neither representation wins by existence or recency alone.

Plans, prompts, fixtures, diagnostics, generated reports, and historical results are support/evidence only. They never substitute for implementation or runtime truth.

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

```text
wrong system + corrected governance = NOT CLOSED
correct system + materially stale/misleading governance = NOT CLOSED
correct system + reconciled governance + required evidence = closure candidate
```

Do not update governance merely to mirror current code, and do not leave stale governance capable of directing future work toward an obsolete owner/path/semantic model.

## Verification boundary

Guards and workflows exist only for executable engineering truth: source integrity, architecture/imports, API/contracts, migrations/data, runtime/config, frontend binding/accessibility, security/dependencies, and executable CI.

Do not create a guard or workflow merely to validate governance text, agent instructions, plans, approval metadata, registries, or evidence bookkeeping. If a check adds no unique material assurance, remove it.

## Repository safety

Pin the exact user-named branch and current SHA before writes. Re-resolve after material write batches and before the final claim. Reconcile concurrent movement; never overwrite newer unrelated work or infer branch-specific truth from default-branch search alone.

## Orchestrator package

`tools/prompting/bthwani-orchestrator/**` is a separate self-contained textual execution package. It is read-only unless the current human instruction explicitly authorizes changes to that package. The package owns execution method; `governance/` owns durable Product/policy truth. Neither duplicates the other's responsibility.