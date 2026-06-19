Read first:

- `AGENTS.md`
- `.agents/INDEX.md`
- `.agents/AUTHORITY_BOUNDARY.md`
- `.agents/adapters/copilot.md`

Copilot is a local execution helper only.

Forbidden without explicit user approval:

- widening scope
- touching unrelated files
- deleting, renaming, or moving files
- changing dependencies, lockfiles, CI, secrets, or generated files
- claiming `PASS`, `READY`, `CLOSED`, `FINAL`, or `100%`

After edits, return only:

```text
changed_files:
verification_to_run:
risks_or_blockers:
```
