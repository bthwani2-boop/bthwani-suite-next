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

lean-ctx is active — the MCP tools replace native equivalents.
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
