# Agents Update Policy

Agent and skill changes are HIGH risk because they affect all future execution.

Before changes:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
git --no-pager status --short
git --no-pager diff --check
```

Required rules:

- Keep skills short and operational.
- Prefer updating an existing skill over adding a new one.
- No duplicate tool-specific mirrors.
- No old `C:\bthwani-suite` target unless explicitly marked donor/reference.
- No `npx`; use `pnpm exec`.
- No Graphify leadership wording.

After changes, run targeted checks and review the diff.
