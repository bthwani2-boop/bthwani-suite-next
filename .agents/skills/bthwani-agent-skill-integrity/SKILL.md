---
name: bthwani-agent-skill-integrity
version: 2026.06.19-clean
summary: Validate agent files, catalog sync, skill structure, and adapter thinness.
---

# bthwani-agent-skill-integrity

## Invoke when

- `.agents`, `AGENTS.md`, adapters, or tool entry files are changed
- skills are added, removed, renamed, or replaced
- the user asks to audit agent quality

## Read before

`AGENTS.md`, `.agents/SKILL_CATALOG.md`, `.agents/INDEX.md`, `.agents/adapters/*`, `.agents/skills/*/SKILL.md`

## Execution contract

Verify every skill folder has `SKILL.md`, every active skill is listed in the catalog, no orphan catalog entries exist, adapters remain thin, and global policy is centralized.

## Forbidden

- do not duplicate global policy inside every skill
- do not add tool-specific mirror trees
- do not keep placeholder skill folders as active skills
- do not accept unsynced catalog/index references

## Required evidence

- skill folder list
- catalog comparison
- index reference comparison
- diff check
- changed file list

## Failure decision

- missing `SKILL.md` -> `FIX_REQUIRED`
- catalog mismatch -> `FIX_REQUIRED`
- thick adapter drift -> `FIX_REQUIRED`
- unreviewed generated tool files -> `NEEDS_EVIDENCE`

## Notes

No extra notes.
