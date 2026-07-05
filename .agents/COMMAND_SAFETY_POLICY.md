# BThwani Agent Command Safety Policy

Allowed by default:
- git status
- git diff
- git log
- git show
- read-only graphify commands (graphify read-only analysis)
- read-only nx inspection (nx show projects, nx graph/read-only project inspection)
- git grep / ripgrep / ast-grep search (read-only)
- dependency-cruiser/madge/knip/jscpd in report-only mode
- typecheck/test/build when non-destructive
- pnpm scripts that do not alter dependencies or delete data

Requires explicit user approval:
- git push
- git reset
- git clean
- delete/move/rename files or folders
- dependency changes
- lockfile changes
- codemods or generated client regeneration
- docker destructive reset/down with data loss
- force operations
- remote writes
- modifying GitHub PRs/issues/branches
- changing secrets, env files, or credentials
- deleting evidence or generated artifacts unless replacement proof exists
