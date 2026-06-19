# Evidence Gate Router

Use the minimum gate that proves the task. Do not run all tools by default.

| Risk | Typical scope | Minimum gates |
|---|---|---|
| LOW | docs, prompt, read-only command | no write gate; if edited: `git status`, `git diff --check` |
| MEDIUM | one/few files | scope check, `git status`, `git diff --check`, targeted type/syntax |
| UI | visible screen/layout | MEDIUM + screenshot/RTL/overflow note |
| BACKEND/API | contracts, clients, service runtime | OpenAPI/contract check + targeted tests/typecheck |
| RUNTIME | Docker/env/provider | compose/status/smoke/log evidence |
| HIGH | agents, governance, guards, refactor, multi-file | patch review + targeted guard + rollback note |
| CRITICAL | delete/move/rename/dependency/CI/GitHub write | block unless explicitly approved |

Graphify may narrow scope, but it never proves acceptance.
