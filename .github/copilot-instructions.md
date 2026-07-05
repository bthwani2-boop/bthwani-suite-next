# BThwani Suite Next — Copilot Instructions

Read first:

1. `AGENTS.md`
2. `.agents/INDEX.md`
3. `.agents/AUTHORITY_BOUNDARY.md`
4. `.agents/COMMAND_SAFETY_POLICY.md`
5. `.agents/adapters/copilot.md`

Copilot is an implementation assistant only. It must not decide architecture, widen scope, delete/move/rename files, change dependencies, or claim final acceptance. All commands must follow the safety policy.

This adapter is thin. Do not duplicate global policy here. If this file conflicts with `AGENTS.md`, `AGENTS.md` wins.

Before editing, state the exact files you intend to touch. After editing, provide changed paths and ask for Git evidence.



## BThwani Ponytail / YAGNI

Also apply:

1. `.agents/rules/bthwani-ponytail-yagni.md`
2. `.agents/skills/bthwani-ponytail-yagni/SKILL.md`

Default behavior:

- smallest correct diff
- reuse existing code first
- no unrequested abstractions
- no new dependency without proof
- no preview/demo/mock runtime paths
- no scans of generated/cache/output folders
