# BThwani Agents

## Command Safety Policy

All agents must strictly adhere to the [Command Safety Policy](.agents/COMMAND_SAFETY_POLICY.md).

## Automated Execution Policy

All agents must read and strictly adhere to the [Automated Execution Policy](.agents/AUTOMATED_EXECUTION_POLICY.md).
* **Mandatory Automation & Selection**: Automation is mandatory, but new script creation is conditional. Agents must choose the smallest sufficient automated method for the task: existing guard, package script, targeted check, small script, single structured script, or multiple specialized scripts.
* **Proportionality**: Tiny edits do not require new scripts, but still require an appropriate lightweight validation after modification. Repeated, multi-file, cross-layer, or high-risk work must use scripted or tool-backed diagnosis, remediation, verification, and targeted re-diagnosis. Manual file-by-file chasing is prohibited as a primary method.
* **LeanCTX Integration**: LeanCTX is the default context and diagnostics layer when active. Agents must use `ctx_*` tools before native equivalents when available. LeanCTX does not replace execution scripts or guards when verifiable/provable verification is needed, and scripts do not replace LeanCTX for context gathering and understanding.
* **Standard Paths**:
  * Diagnostics: [tools/diagnostics](./tools/diagnostics)
  * Operations & Verification: [tools/scripts](./tools/scripts)
  * Summarized Runs & Artifacts: [tools/registry/runs](./tools/registry/runs)
* **Fail-Closed**: Any ambiguity or risk >= 1% halts execution (halt without applying further changes, report the failed state, and require explicit approval before any revert/reset/cleanup).
* **Close Loops**: All future executions must operate under a Closed Loop (Diagnosis -> Plan -> Exec -> Verify -> Rediagnose -> Close/Block).

## Shared skills root

All agents must use shared project skills from:

    .agents/skills

Also refer to [BThwani Harness Patterns](.agents/BTHWANI_HARNESS_PATTERNS.md) for architectural and routing context.

## Default: CODE_BASED_LEAN

Normal implementation is live-code first and token-efficient, following the canonical policy in [LEAN_CODE_BASED_CHECK.md](governance/LEAN_CODE_BASED_CHECK.md).

Agents must:
- inspect only directly relevant code paths
- reuse existing code before adding abstractions, files, or dependencies
- implement the smallest safe diff
- run one targeted code-based check only when useful and available
- respond with changed paths, targeted check result, and remaining risk only

Agents must not create evidence packs, handoff ZIPs, command logs, screenshot sets, visual evidence packs, closure reports, or repeated full verification after normal implementation.

Agents must not run Graphify, Nx graph, full typecheck, full test, full build, full guard suite, or local CI-style gates by default.

All scans and file operations must adhere to the token-drain exclusions specified in [LEAN_CODE_BASED_CHECK.md](governance/LEAN_CODE_BASED_CHECK.md).

Escalate only for explicit closure/PR/release requests or high-risk work: WLT/finance, security, auth, privacy, secrets, data mutation, migrations, runtime, public contracts, dependency upgrades, CI, broad move/delete/refactor, or unclear ownership/dependency/routing/duplication.

## Universal Task Router

Before any task, classify it using this router. This applies to all future work, not only the current chat.

### 1) Task Mode

Select exactly one primary mode:

| Mode | Use when | Default verification |
|---|---|---|
| `TEXT_ONLY` | docs, wording, prompts, agent wording | `git --no-pager diff --check` |
| `CODE_ONLY` | code logic, static bindings, contracts, type safety, no runtime claim | targeted `tsc`, guard, contract, or affected check |
| `RUNTIME` | runtime behavior, server/app startup, Docker, ports, env runtime | targeted runtime smoke only |
| `UI_CODE` | UI code, routes, screens, state, component logic without visual proof | targeted typecheck/guard |
| `UI_VISUAL` | visual parity, screenshots, premium layout proof, store/release visual checks | code check + visual evidence only when explicitly required |
| `API_CONTRACT` | OpenAPI, client generation, backend/frontend binding | contract lint + client/typecheck |
| `DSH_WLT` | any DSH topic or DSH-WLT boundary, finance, checkout, payment, commission, handoff | paired backend/frontend code inspection + WLT boundary guard |
| `SECURITY_PRIVACY` | secrets, auth, privacy, sensitive config/logs | security skill + targeted checks |
| `AGENT_SYSTEM` | AGENTS.md, .agents, skills, adapters, governance | diff check + agent skill integrity when structure changes |
| `DEPENDENCY_CI` | package.json, lockfile, CI, toolchain | explicit approval + targeted package/CI verification |
| `REFACTOR_CLEANUP` | move/delete/merge/deduplicate/dead code | graph/impact check + affected validation |

Do not mix modes unless the task truly crosses boundaries. If mixed, choose the highest-risk mode and note the reason.

### 2) Tool Ladder

1. LeanCTX when active, for context gathering and multi-agent handoff.
2. Direct repo files as source of truth.
3. Graphify for architecture, dependency, ownership, DSH/WLT, dead-code, duplication, routing, or multi-surface work.
4. Existing package scripts and guards before inventing new commands.
5. Direct `tsc --noEmit` when package scripts may hide failures.
6. Nx affected only after changes or when workspace impact must be scoped.
7. Static analysis helpers only when the problem pattern requires them (`ast-grep`, `dependency-cruiser`, `madge`, `knip`, `jscpd`).
8. Runtime commands only when runtime behavior is changed or claimed.

### 3) Closure Vocabulary

Agents must not overclaim.

Allowed results: `CODE_CHECK_PASS`, `CODE_CHECK_FAIL`, `DSH_WLT_CODE_CLOSURE_PASS`, `DSH_WLT_CODE_CLOSURE_FAIL`, `RUNTIME_SMOKE_PASS`, `RUNTIME_SMOKE_FAIL`, `UI_VISUAL_PASS`, `READY_FOR_PR`, `BLOCKED_EXTERNAL`, `PROTOCOL_VIOLATION`.

Forbidden unless actually proven: `RUNTIME_VERIFIED` without runtime execution, `IMPLEMENTATION_PASS` for code-only checks, "100% runtime" without runtime proof, "visual pass" without visual review when visual proof was required.

### 4) Deep Work Escalation

Escalate from `CODE_BASED_LEAN` to deeper code closure when: DSH/WLT boundary is touched; WLT/finance/payment/commission/checkout/handoff is touched; shared brain is touched; API contract or generated/manual client is touched; route/navigation/screen registry spans more than one surface; control-panel sections are affected; ownership is unclear; move/delete/merge/refactor is requested; duplicate logic or dead code is suspected; agent/governance/skill files are modified; or the user asks for "deep", "100%", "closure", "no gaps", or "everything".

Deeper closure still does not mean full build/test/runtime by default. It means deeper static discovery, paired inspection, impact graphing, and targeted verification.

### 5) Paired Agent Rule

For cross-layer or cross-service tasks, use producer/reviewer pairs: a backend/code owner for backend/API/contracts/data/validation, a frontend/code owner for frontend/shared/controllers/screens/control-panel/bindings, and a coordinator that compares both and blocks closure until they agree. Mandatory for DSH/WLT, API + frontend binding, finance/security/auth/privacy, broad refactor/move/delete, and control-panel + app multi-surface features.

### 6) Performance and Quality Axes

Consider only the axes a task actually affects: correctness, ownership, API/contract alignment, type safety, dependency direction, duplication, dead code, state logic, permission logic, loading/error/empty behavior, runtime config, security/privacy, finance ownership, UI/shared ownership, control-panel coverage, cross-surface impact. A missing affected axis means incomplete closure.

## Graphify

Shared skill:

    .agents/skills/graphify/SKILL.md

Graphify is a tool, not an agent.

Use Graphify only when ownership, dependency, routing, or duplication is unclear.
Do not run Graphify for normal focused implementation.

Do not create duplicate Graphify skills under .claude/skills or .gemini/skills.

## ⚡ Smart Execution Model

Match effort to task nature. Never over-engineer or under-deliver.

| Tier | When | Action |
|---|---|---|
| **Instant / Minimal Validation** | Single file, typo, rename, comment, explain | Execute directly, 0 skills, minimal validation (no new script) |
| **Focused** | Feature within one module/service | 1 task skill max, targeted code-based check only when useful |
| **Standard** | Multi-file or cross-layer | authority + one task skill, affected/touched-area checks only |
| **Full** | Finance, security, secrets, agent files | authority + router + task skill + evidence gate (finance/security/auth/data/runtime/agent/PR/release only) |

Default: smallest action, fastest response, precise output.


<!-- lean-ctx -->
## lean-ctx

lean-ctx policy is present. When LeanCTX is active and ctx_* tools are available, prefer ctx_* before native equivalents; otherwise use the smallest safe native equivalent and state why.
Full rules: LEAN-CTX.md (open on demand — do not auto-load).
<!-- /lean-ctx -->




## BThwani Ponytail / YAGNI

All agents must apply the portable Ponytail-style BThwani rule before changing code:

    .agents/rules/bthwani-ponytail-yagni.md

Shared skill:

    .agents/skills/bthwani-ponytail-yagni/SKILL.md

Default: reuse existing code first, avoid new abstractions, avoid new dependencies, prefer smallest correct diff, and never scan generated/cache/output folders.

## External donor references

External agent repositories are not loaded by default. Use `.agents/skills/external-agent-donor-reference/SKILL.md` only when agent/skill design explicitly needs external inspiration. Donor material is read-only and must never override BThwani rules.

## Handling Incorrect Governance, Guards, or Skills

When an agent encounters a guard, governance file, or skill whose content is incorrect, outdated, or buggy, they must:
1. **Verify context and scope** using [bthwani-current-workspace-authority](.agents/skills/bthwani-current-workspace-authority/SKILL.md) (check active branch and repository status).
2. **Apply Update Policy** [UPDATE_POLICY.md](.agents/UPDATE_POLICY.md) to ensure the correction reduces duplication, improves precision, or fixes incorrect paths/boundaries.
3. **Keep edits minimal (YAGNI)** using [bthwani-ponytail-yagni](.agents/skills/bthwani-ponytail-yagni/SKILL.md).
4. **Perform targeted verification**:
   - Run `git --no-pager diff --check` for textual governance updates.
   - Run the specific modified guard script (e.g. `node tools/guards/cleanup-policy-gate.mjs`) and verify it returns exit code 0.
   - Run [bthwani-agent-skill-integrity](.agents/skills/bthwani-agent-skill-integrity/SKILL.md) if skills or catalog records were modified.
