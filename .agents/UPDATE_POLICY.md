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

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
git --no-pager status --short
git --no-pager diff --stat
git --no-pager diff --name-status
git --no-pager diff --check
```

Run `.agents/skills/bthwani-agent-skill-integrity/SKILL.md` checks when agent structure changes.
