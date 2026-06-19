# BThwani Suite Next — Main Agent Contract

This file is the main agent entrypoint for `bthwani-suite-next`.

```text
LOCAL_ROOT: C:\bthwani-suite-next
REPO: bthwani2-boop/bthwani-suite-next
DEFAULT_BRANCH: master
AGENT_SOURCE: .agents/
GOVERNANCE_SOURCE: governance/
EVIDENCE_ROOT: tools/registry/runs/{SESSION_ID}
```

## Non-negotiable rules

1. Read current repository evidence before changing files. Never rely on donor memory.
2. GitHub is read-only unless the user explicitly asks for a write action.
3. Use PowerShell for user-facing Windows commands. Scripts must start with `Set-Location -LiteralPath "C:\bthwani-suite-next"` as the first executable line.
4. Use `pnpm`, `pnpm exec`, `pnpm dlx`, or `pnpm nx`. Do not use `npx`.
5. Do not claim `PASS`, `READY`, `CLOSED`, `FINAL`, `SAFE`, `DONE`, or `100%` without git diff evidence and verification output.
6. Do not copy donor/realtest files directly. Extract only after conflict review and target-path ownership proof.
7. `apps/*/runtime` are runtime shells only. Service logic belongs under `services/*`; reusable UI belongs under `shared/ui-kit` and is exported as `@bthwani/ui-kit`.
8. Tamagui is allowed only inside `shared/ui-kit`. No direct Tamagui imports in apps, services, screens, or surface logic.
9. WLT owns financial truth. DSH may hold references/status only, not ledger/payment/refund/settlement mutation logic.
10. Graphify is a repository context/navigation tool. It is not an agent, not an orchestrator, and not acceptance evidence.
11. Use the smallest relevant skill set. Read `AGENTS.md`, `.agents/INDEX.md`, then one router skill and one task skill only unless the task proves more are needed.
12. No all-tools-at-once runs, no full-repo lint/typecheck by default, no evidence ZIP by default unless the task risk or user request requires it.

## Skill selection budget

```text
LOW       -> AGENTS.md + .agents/INDEX.md only, then direct answer/command.
MEDIUM    -> + bthwani-evidence-gate-router + one task skill.
UI        -> + bthwani-ui-kit-design-lock or bthwani-screen-flow-binding.
BACKEND   -> + bthwani-api-runtime-binding or bthwani-service-fullstack-slice.
RUNTIME   -> + bthwani-docker-slice-runtime or bthwani-platform-runtime-config.
HIGH      -> + bthwani-patch-review-evidence and targeted guards.
DONOR     -> + bthwani-legacy-extraction.
UNKNOWN   -> + bthwani-graphify-context-tool, then route.
```

## Minimum verification after code changes

Use PowerShell for user-facing Windows commands. Scripts must start with `Set-Location -LiteralPath "C:\bthwani-suite-next"` as the first executable line.

Default after code writes:
- git status
- git diff --check
- targeted type/syntax/test check for touched package/surface

Run full workspace typecheck only when:
- shared contracts changed
- shared/ui-kit exports changed
- service boundary changed
- multi-package impact is proven
- human explicitly requests it

## Heavy commands require justification

Do not run these automatically for docs, prompts, agents, or governance-only changes:

```text
pnpm -w run build
pnpm -w run guard:foundation
pnpm -w run guard:slice
pnpm -w run docker:runtime:reset
```

## Read order for all agents

1. `AGENTS.md`
2. `.agents/README.md`
3. `.agents/AUTHORITY_BOUNDARY.md`
4. `.agents/INDEX.md`
5. `.agents/SKILL_CATALOG.md` only if skill choice is unclear
6. 1-2 relevant `.agents/skills/*/SKILL.md` files
7. Relevant `governance/*` files
8. Relevant `machine-readable/*` rows

## Prohibited output behavior

- No long ceremonial reports when a direct decision is enough.
- No vague “everything is 100%” wording.
- No broad Copilot prompts such as “fix the whole repo”.
- No repeated waiting messages.
- No hidden architecture decisions outside governance.
