# Diagnose/Implementing framework

Model: **Operational-First Progressive Narrowing + Root-Cause Closure + Task Isolation**.

```text
NEW INVOCATION → NEW PACKAGE + TASK BRANCH
TOP-DOWN OPERATIONAL BREADTH
→ MACHINE COVERAGE
→ COMPETITIVE DEEPENING
→ ROOT-CAUSE LANDSCAPE
→ SYSTEMIC PRIORITY
→ FRONTIER
→ EXECUTE / VERIFY / RE-RANK
```

Package files:

```text
00-OVERVIEW.md
operational-root.json
lower-layer-observations.json
root-cause-landscape.json
NNN-<sequence>.md
```

Canonical gates live under `tools/guards/orchestrator/`; old gate paths in this folder are compatibility wrappers only.

Create a package from its isolated Task Branch/worktree with `new-package.mjs`. Fill machine registries from evidence; do not manually manufacture PASS. Run gates in this order: task isolation → root anchor → operational root → root-cause priority → frontier derivation. Create Sequences JIT only from machine-selected `RC-NNN` frontier.

Technical observations discovered before root placement go to `lower-layer-observations.json` with `HOLD`; they are not lost and cannot steal execution priority.
