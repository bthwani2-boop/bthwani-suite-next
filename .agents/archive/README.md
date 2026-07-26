# Agents Archive

Status: ARCHIVED_REFERENCE (non-authoritative)

This directory preserves retired agent-system material that is no longer part of the active contract. Nothing here may be routed, invoked, registered, or treated as current policy. The active contract is exactly: `governance/skills/skills-registry.json` (registry), `.agents/skills/*` (registered skill directories), and `.agents/INDEX.md` (routing).

Contents:

- `skills/` — retired skill directories moved out of `.agents/skills/`. Their registry entries were removed; the retirement reasons are preserved in each `SKILL.md` and in the git history of `governance/skills/skills-registry.json`.
- `skills-deferred/` — the deferred `monitor-ci` skill package that was never registered.
- `agents-package-manifest.json` — the historical `BTHWANI_NEXT_AGENTS_SKILLS_PACKAGE_20260619` ZIP-delivery manifest (originally at the repository root).

Rules:

- Archiving is the required alternative to permanent deletion for agent-system material: merge, move, or amend — do not destroy history.
- Restoring anything from this archive into the active contract requires re-registration in `governance/skills/skills-registry.json` and a passing `guard:agent-governance`.
- One exception stayed active outside this archive: `.agents/skills/graphify/` remains in place as governed tool documentation referenced by `CLAUDE.md` and `.agents/GRAPHIFY.md`.
