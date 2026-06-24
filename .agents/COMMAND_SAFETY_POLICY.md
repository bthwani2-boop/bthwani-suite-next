# BThwani Agent Command Safety Policy

Allowed by default:
- git status
- git diff
- git log
- git show
- read-only graphify commands
- read-only nx inspection
- typecheck/test/build when non-destructive
- pnpm scripts that do not alter dependencies or delete data

Requires explicit user approval:
- git push
- git reset
- git clean
- delete/move/rename files or folders
- dependency changes
- lockfile changes
- docker destructive reset/down with data loss
- force operations
- remote writes
- modifying GitHub PRs/issues/branches
- changing secrets, env files, or credentials
- deleting evidence or generated artifacts unless replacement proof exists
