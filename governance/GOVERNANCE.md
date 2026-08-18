# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

`governance/` contains only durable human/product policy truth. It is not an execution engine and must not grow registries, guard catalogs, workflow catalogs, approval state machines, or SDLC bureaucracy.

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

## Execution model

Use the smallest complete affected scope:

`objective → authoritative owner → highest proven root cause → direct fix → migrate consumers → remove obsolete truth → affected verification → broader proof only when risk/closure requires it`

Do not scan or run every tool merely because a task is described as deep or complete. Depth means reaching the real root and proving the affected outcome.

## Truth hierarchy

For a concrete engineering claim, prefer:

1. current authorized task instruction and exact repository/ref;
2. applicable Product Truth/policy;
3. actual contracts, code, migrations, configuration, tests, and live platform state;
4. same-candidate runtime evidence when runtime behavior is claimed.

Plans, prompts, fixtures, diagnostics, generated reports, and historical results are support/evidence only. They never substitute for implementation or runtime truth.

## One-source rules

- one authoritative owner per durable fact;
- one canonical write path per state transition;
- one migration history per service;
- one API contract provenance path;
- one Product Truth identity per capability;
- no parallel runtime truth, fallback truth, or duplicated business logic;
- no machine governance control plane parallel to code/runtime.

## Verification boundary

Guards and workflows exist only for executable engineering truth: source integrity, architecture/imports, API/contracts, migrations/data, runtime/config, frontend binding/accessibility, security/dependencies, and executable CI.

Do not create a guard or workflow merely to validate governance text, agent instructions, plans, approval metadata, registries, or evidence bookkeeping. If a check adds no unique material assurance, remove it.

## Repository safety

Pin the exact user-named branch and current SHA before writes. Re-resolve after material write batches and before the final claim. Reconcile concurrent movement; never overwrite newer unrelated work or infer branch-specific truth from default-branch search alone.

## Orchestrator package

`tools/prompting/bthwani-orchestrator/**` is a separate self-contained textual execution package. It is read-only unless the current human instruction explicitly authorizes changes to that package.
