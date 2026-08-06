
# Agent System Update Policy

## Allowed changes

Agent-system files may change only when the change:

- reduces duplication or context cost;
- improves routing precision;
- adds or repairs a bounded owner skill;
- fixes an incorrect path, authority boundary, registry entry, or tool policy;
- removes retired, unreferenced, backup, generated, or parallel instruction sources.

## Before editing

- pin the exact repository, branch, and commit;
- identify every affected canonical source, derived projection, adapter, and guard;
- keep global rules in `AGENTS.md`;
- keep tools under `.agents/tools/` and owner skills under `.agents/skills/`;
- keep platform adapters short;
- prove references before deleting or moving a file.

## Required verification

For any `.agents/**`, root adapter, agent registry, skill registry, tool registry, or authority-precedence change, run:

```powershell
git --no-pager diff --check
pnpm run guard:agent-governance
pnpm run guard:document-authority-conflicts
```

Also run `pnpm run guard:governance-schema` when a machine-readable governance contract or schema changes.

A prose-only diff is not sufficient verification for a change that alters routing, authority, lifecycle, or automatic tool loading.
