# BThwani Governance

Status: ACTIVE_CANONICAL

## Authority

The current user instruction owns task scope. Repository conflicts are resolved
by `governance/authority/authority-precedence.json`, followed by `AGENTS.md`,
these policies, and the machine-readable contracts they name. Skills, adapters,
diagnostics, generated files, and historical Git content cannot create policy.

## Repository execution

- Pin the named repository, branch, and remote SHA before every write batch.
- Write only to the named branch; never force-push, substitute another branch,
  open or merge a pull request, or deploy without explicit current-task authority.
- Stop and re-diagnose if the remote head moves unexpectedly.
- Use repository-relative paths. Local roots, caches, archives, and diagnostics
  are never runtime or product truth.
- Classify a cleanup target and prove its consumer impact before delete, move,
  merge, or replacement. Git history is the default archive.

## Decisions and evidence

All decisions come from `governance/contracts/decision-vocabulary.json`.
`PASS` is scoped. `READY_FOR_REVIEW` is not approval. `CLOSED_WITH_EVIDENCE`
requires every applicable same-commit scope and independent protected approval.
Static declarations cannot prove runtime, security, finance, release, or
production behavior.

## Authority separation

Product, architecture, governance, CI, engineering, QA, security, finance,
release, production, and risk acceptance remain logically separate. The
single-owner contract may satisfy only its declared eligible human roles.
Authentication, privacy, isolation, WLT finance, migrations, production data,
security, release, production, residual risk, and final closure remain protected.

## Policies

- `governance/policies/product.md`
- `governance/policies/contracts.md`
- `governance/policies/security.md`
- `governance/policies/data.md`
- `governance/policies/runtime.md`
- `governance/policies/release.md`

Machine-readable state may remain outside these documents only when it is a
unique executable contract, schema, lock, or current state record.

## Registered machine and support paths

- `governance/GOVERNANCE.md`
- `AGENTS.md`
- `governance/contracts/**`
- `governance/policies/**`
- `governance/agents/**`
- `governance/skills/**`
- `governance/guards/**`
- `governance/authority/**`
- `governance/authority/direct-work-branch-execution-policy.json`
- `governance/authority/single-owner-mode.json`
- `governance/authority/single-owner-mode.schema.json`
- `governance/product/product-truth.schema.json`
- `governance/product/platform-model.yaml`
- `governance/product/contracts/**`
- `governance/product/**`
- `tools/guards/guard-manifest.json`
- `.agents/skills/**`
- `GEMINI.md`
- `governance/github/**`
- `governance/github/repository-enforcement.json`
- `governance/operational_journey_protocol_package/**`
- `governance/runbooks/**`
