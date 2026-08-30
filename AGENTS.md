# BThwani Agents

`AGENTS.md` is a thin coding-agent adapter. Keep work direct, evidence-driven, root-correct, and proportional to the material cone.

## Authority

Resolve each task from the current human instruction, the exact pinned repository/ref, canonical Product/System Truth where applicable, and actual implementation/runtime evidence.

Do not create a parallel authority layer in prompts, plans, guards, workflows, registries, or agent metadata.

Agent routing lives only in:

- `.agents/INDEX.md`
- `.agents/skills/**`
- `.agents/tools/**`

There is intentionally no agent-role registry, skill registry, tool registry, guard registry, workflow registry, SDLC stage registry, or governance-validation workflow.

## Execution

Use **wide discovery; narrow complete execution**:

1. Pin the exact repository, user-named branch/ref, live SHA, and PR identity when applicable.
2. Orient broadly enough across the Project Frame to avoid a narrow local diagnosis. Use parallel read-only investigation when it materially accelerates discovery.
3. Prove the highest material root cause and actual Source-of-Fix. Discovery breadth must not be confused with mutation breadth.
4. Mutate only the smallest causally complete working cone required to remove that root from the canonical owner: code, contract, data, configuration, runtime, or consumer.
5. Migrate affected writers/readers/consumers/readbacks, perform the canonical cutover, and remove obsolete parallel behavior in the same root closure.
6. Run the smallest verification set that adds unique assurance for claims invalidated by the actual treatment cone.
7. Expand verification only when risk, new evidence, uncertainty, or final closure requires it.
8. Re-pin after material writes and before every final remote claim.

“Deep”, “complete”, and “100%” raise the evidence standard and discovery altitude; they do not justify unrelated mutation, every available tool, or repository-wide verification after every write.

## Verification

Do not create repository-specific guards, verification scripts, or workflows by default.

Prefer existing compiler, typecheck, lint, test, build, database, runtime, contract, and security-tool capabilities directly. Keep custom automation only when it provides unique executable assurance that cannot be obtained more simply and when its ongoing cost is justified.

Do not create guards or workflows to validate governance prose, agent instructions, prompt packages, approval metadata, registries, stage metadata, or evidence bookkeeping.

Prefer:

`wide enough discovery -> root proof -> smallest complete treatment -> invalidated claims only -> runtime proof when applicable -> broad/full verification only at fixed point, closure, or material risk`

A newer commit invalidates only evidence whose covered claim, inputs, environment, authority, or consumer cone changed. When independence cannot be proven, widen verification rather than guess.

## Repository safety

Before every logical write batch, re-resolve the user-named branch. Reconcile unexpected branch movement; never overwrite unrelated newer work. No force push unless the current human instruction explicitly requires it.

## Full-stack work

For product behavior, trace the complete affected path when the behavior actually crosses those layers:

`surface → shared controller/adapter → generated contract/client → backend/domain → persistence/events/integration → canonical readback → affected surfaces`

A local UI success is not closure when persisted or cross-surface truth is required.

## Security, finance, and domain ownership

Derive security, financial, and domain ownership from the current canonical implementation/contracts and explicit Product/System Truth. Do not restate mutable domain authority in this adapter.

Authentication, authorization, sessions, secrets, PII, provider credentials, isolation, and financial mutation paths require risk-appropriate verification.

Static/security analysis is remote-owned. Do not launch a local SonarQube server, Sonar CLI/MCP process, CodeQL scanner, Trivy, OSV Scanner, or Gitleaks as an agent/workspace prerequisite. SonarQube IDE/agent access uses the hosted MCP configuration; repository security gates execute on GitHub-hosted runners.

## Delegation

Delegation is optional and only for bounded work that materially benefits from it.

Use maximum useful parallelism for read-only discovery. Parallel mutation is allowed only for Closure Units proven independent in canonical authority, write set, contracts/data, migration/cutover, runtime effects, and evidence dependencies. At most one writer may modify an overlapping work unit at a time. When delegation is used, use one integration/push owner for the combined result.

The active executor owns reconciliation and final verification unless those responsibilities are explicitly assigned within a delegated workflow.

## Tools

Use `.agents/INDEX.md` only when routing is not obvious. Load the smallest relevant skill/tool set. Prefer direct scoped inspection and existing affected/runtime commands; use Graphify, LeanCTX, or OpenCodeReview only when they materially reduce uncertainty or repeated work.

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` is the canonical repository execution/closure authority for repository work. `AGENTS.md` and `.agents/**` are thin execution adapters only: they must load/apply the orchestrator and may not redefine its scope, root-ranking, evidence, delegation, PR lifecycle, or closure semantics. The package remains read-only unless current human intent explicitly authorizes package maintenance.

## Final response

For repository writes, report the exact target branch/SHA, changed paths, verification performed, and any remaining unproven risk. Do not claim more than the exact candidate proves.
