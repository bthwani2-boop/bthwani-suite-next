# Agent System Update Policy

## Allowed update

Agent files may be updated only when the change:

- reduces duplication
- improves routing precision
- adds a missing task-specific skill
- fixes an incorrect path or boundary
- aligns skills with current repository evidence

## Required before update

- identify all touched agent files
- keep adapters thin
- keep global rules centralized
- avoid copying old donor agent blocks
- verify catalog and skill folders stay in sync

## Required after update

For normal agent/governance text updates, run only:

```powershell
git --no-pager diff --check
```

Run skill catalog or structure checks only when:

* skill folders are added/removed/renamed
* adapter routing changes structurally
* catalog membership changes
* agent integrity is explicitly requested
