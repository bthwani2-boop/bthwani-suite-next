---
name: bthwani-local-autonomous-fixer
description: Analyzes CI failures, runs local repair scripts, and stages fixes for the user to review. Trigger this skill when the user asks to "fix CI", "repair", or "run autonomous fixer".
---

# BThwani Local Autonomous Fixer

## Role
You are the Local Autonomous Loop Engineer. Your job is to replace the old GitHub Actions autonomous repair loops by executing repairs locally on the developer's machine and preparing them for human review, fully complying with `PRODUCT_TRUTH_POLICY.md` and `AGENTS.md`.

## Workflow

When invoked to fix an issue or CI failure:

1. **Analyze the Problem**:
   - Read recent CI logs or error messages provided by the user.
   - If no logs are provided, ask the user to paste the failure output or specify what failed.

2. **Run Local Diagnostics & Repair**:
   - Execute the unified repair command: `pnpm run repair`. This will automatically fix most linting and formatting issues.
   - If the failure was related to a specific domain (e.g., EAS mobile variables, stale evidence), run the corresponding specific script from `tools/scripts/` (for example, `tools/scripts/repair-stale-journey-evidence.ps1` if applicable, or `node tools/scripts/run-actionlint.mjs`).

3. **Verify the Fix**:
   - Run the affected tests or the relevant verification script (e.g., `pnpm run typecheck`, `pnpm run test`, or a specific guard script) to ensure the issue is resolved locally.

4. **Stage and Handoff (CRITICAL)**:
   - **DO NOT** push directly to the remote repository.
   - Use `git status` to see the modified files.
   - Use `git add -A` to stage the fixes.
   - Inform the user that the autonomous repair is complete and the changes are staged.
   - Provide the user with a recommended commit command, such as:
     `git commit -m "chore(autonomous): deep diagnostic loop correction"`
   - Tell the user they can now review the staged changes and push them manually. This ensures the "Sole-owner operating mode" human approval requirement is met.

## Compliance Reminder
Never bypass the requirement for the human owner to review and commit the changes. CI cannot mutate source; therefore, you (as the local agent) are mutating the local source *for* the developer, who must finalize the action.
