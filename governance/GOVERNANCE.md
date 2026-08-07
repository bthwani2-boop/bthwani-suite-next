# BThwani Governance

Status: ACTIVE_CANONICAL

## Purpose

This document is the human-readable governance index. Directory boundaries and content classes are described in `governance/README.md`; authority conflicts are resolved only by `governance/authority/authority-precedence.json`.

## Authority

The current user instruction owns current-task scope and requested actions, subject to platform safety and repository permissions. Repository authority then follows `governance/authority/authority-precedence.json`, `AGENTS.md`, the six active policies below, and the machine-readable contracts registered by the authority map.

Prompts, plans, diagnostics, runbooks, generated evidence, historical Git content, adapters and support packages do not create policy merely because they are committed.

## Repository execution

- Pin the named repository, branch and remote SHA before each logical write batch.
- Write only to the user-named branch; never substitute a default branch.
- Never force-push, overwrite concurrent movement, auto-create a task branch, auto-open a pull request, merge, release or deploy without current-task authority.
- Re-resolve the remote head before a write batch and after the final write; if it moved unexpectedly, reconcile the semantic diff before continuing.
- Classify cleanup targets and prove consumer impact before delete, move, merge or replacement. Git history is the default archive.
- Verification and CI are read-only with respect to source; a verifier must not repair what it verifies.

## Decisions and evidence

All final decision labels come from `governance/contracts/decision-vocabulary.json`.

- `PASS` is scoped evidence, not final closure.
- `READY_FOR_REVIEW` is not approval.
- `NEEDS_EVIDENCE` is used when implementation may be correct but required proof is unavailable or stale.
- `BLOCKED_EXTERNAL` is reserved for a genuine external blocker after all safe independent internal work is exhausted.
- `CLOSED_WITH_EVIDENCE` requires every applicable evidence scope on the same immutable commit and every required protected approval, with no fail, blocked or pending class remaining.

Static declarations or guards cannot imply runtime, visual, QA, security, finance, isolation, CI, release, production or final-closure evidence outside the assurance explicitly registered for them.

## Authority separation and sole-owner mode

Product, architecture, governance, CI, engineering, QA, security, finance, release, production and risk acceptance remain logically distinct approval domains.

`governance/authority/single-owner-mode.json` may satisfy only its explicitly allowed owner-approval domains and only under its recorded requirements. Protected domains remain protected. A reusable prompt or implementation agent cannot convert blanket authorization into final outcome acceptance or impersonate an independent/protected approver.

## Active canonical policies

Only these durable human-readable policies are the core policy set:

- `governance/policies/product.md`
- `governance/policies/contracts.md`
- `governance/policies/security.md`
- `governance/policies/data.md`
- `governance/policies/runtime.md`
- `governance/policies/release.md`

Domain decisions, machine contracts and derived support must not masquerade as an additional general policy.

## Registered machine and support paths

The authority registry currently classifies the following paths; exact authority and scope are determined by `governance/authority/authority-precedence.json`:

- `governance/GOVERNANCE.md`
- `governance/README.md`
- `AGENTS.md`
- `governance/contracts/**`
- `governance/agents/**`
- `governance/skills/**`
- `governance/guards/**`
- `governance/guards/guard-sets.json`
- `governance/authority/**`
- `governance/authority/direct-work-branch-execution-policy.json`
- `governance/authority/single-owner-mode.json`
- `governance/authority/single-owner-mode.schema.json`
- `governance/product/product-truth.schema.json`
- `governance/product/platform-model.yaml`
- `governance/product/contracts/**`
- `governance/tools/agent-tool-registry.json`
- `governance/github/**`
- `governance/github/repository-enforcement.json`
- `governance/operational_journey_protocol_package/**`
- `.agents/skills/**`
- `.agents/tools/**`
- `.agents/AUTHORITY_BOUNDARY.md`
- `.agents/EVIDENCE_GATE_ROUTER.md`
- `.agents/INDEX.md`
- `.agents/SKILL_CATALOG.md`
- `CLAUDE.md`
- `GEMINI.md`
- `LEAN-CTX.md`
- `opencode.json`

## Support content boundary

The following are explicitly not governance authority:

- `tools/prompting/**` — reusable execution prompts;
- `tools/plans/**` — plans and journey planning packages, including `tools/plans/smsm-dsh-wlt-journeys/**`;
- `tools/diagnostics/**` — diagnostic/status reports;
- `docs/runbooks/**` — operational procedures;
- CI artifacts, logs, screenshots, generated reports and historical state.

`governance/operational_journey_protocol_package/**` is currently retained only as registered `DERIVED_SUPPORT` while its consumers are migrated. It may not describe itself as final/non-bypassable/canonical authority and may not override the six policies, machine contracts, live implementation truth or same-commit runtime evidence.

## Governance change invariant

A governance reorganization is complete only when authority paths, references, guard registrations, commands and CI consumers agree in both directions. Moving a file without migrating its consumers is a defect; keeping duplicate writable authorities after migration is also a defect.
