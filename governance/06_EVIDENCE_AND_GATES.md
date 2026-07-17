# 06 — Evidence and Gates

Status: ACTIVE_CANONICAL

## Default rule

Normal implementation uses `CODE_BASED_LEAN` according to [LEAN_CODE_BASED_CHECK.md](LEAN_CODE_BASED_CHECK.md).

Inspect relevant live code, make the smallest correct change, and run the smallest sufficient targeted check. A check proves only its declared assurance scope.

Evidence files and screenshots are not required for normal implementation. Scans must obey the token-drain exclusions unless an excluded path is actually affected.

## Evidence escalation

Additional same-commit evidence is required when applicable to:

- Product Truth, product-model approval, or product acceptance;
- independent governance-contract or CI-workflow approval;
- final `CLOSED_WITH_EVIDENCE` judgment;
- independent review, QA, security, release, deployment, or production verification;
- WLT or financial truth;
- authentication, authorization, privacy, secrets, or sensitive data;
- database mutations, migrations, or production data;
- runtime, Docker, provider, persistence, or live API behavior;
- public OpenAPI or contract changes;
- dependency and toolchain upgrades;
- broad ownership refactors or destructive cleanup;
- explicit user requests.

Evidence is not valid when stale, branch-mismatched, merge-ref-only, generated from declarations, or detached from the resolved commit.

## Stage-gate escalation

Governed SDLC stages are defined in [26_SDLC_TEAM_AND_STAGE_GATES.md](26_SDLC_TEAM_AND_STAGE_GATES.md).

Use formal stage routing when impact requires product, architecture, governance, CI, independent QA, security, finance, release, rollback, production, tenant-isolation, or residual-risk decisions.

Lean code-based changes still use targeted checks unless a formal stage or broader assurance scope applies.

## Normal output

For regular implementation report:

- resolved repository branch and commit when repository truth is claimed;
- changed paths;
- targeted checks and their assurance scopes;
- decision mapped through the canonical vocabulary;
- remaining risk or missing evidence.

Do not create duplicated command logs, handoff archives, screenshot sets, or long closure reports unless an applicable evidence scope requires them.

## Closure claims

- `PASS` means only the explicitly declared scope passed.
- `READY_FOR_REVIEW` means independent review is still required.
- `NEEDS_EVIDENCE` means the required proof is missing or stale.
- `CLOSED_WITH_EVIDENCE` requires every applicable evidence scope, approval, and stage on the same immutable commit with no open blocker.
- Deprecated aliases such as `CLOSED`, `READY_FOR_PR`, `GATE_PASS`, and `BLOCKED_NEEDS_EVIDENCE` must not be introduced in active artifacts.

## Acceptance condition

Accepted only when evidence scope is proportional to actual risk, every result maps to the canonical decision vocabulary, static checks are not upgraded into runtime or closure proof, and no applicable Product Truth, governance, CI, SDLC, security, finance, release, or production gate is bypassed.
