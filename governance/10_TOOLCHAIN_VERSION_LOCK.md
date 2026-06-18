# 10 — Toolchain Version Lock

Status: CANONICAL

## Locked baseline

| Tool | Version | State |
|---|---:|---|
| Node.js | 24.17.0 | LOCKED |
| pnpm | 11.7.0 | LOCKED |
| TypeScript | 5.9.3 | LOCKED_WHEN_TYPESCRIPT_IS_INTRODUCED |
| Go | 1.26.4 | LOCKED_WHEN_GO_SERVICES_ARE_INTRODUCED |
| PostgreSQL | BLOCKED_NEEDS_RUNTIME_EVIDENCE | BLOCKED_NEEDS_RUNTIME_EVIDENCE |
| MinIO | BLOCKED_NEEDS_RUNTIME_EVIDENCE | BLOCKED_NEEDS_RUNTIME_EVIDENCE |
| Expo SDK | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE |
| React | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE |
| React Native | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE |
| Next.js | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE |

## Rules

- no `latest`
- no wildcard versions
- packageManager must be set
- engines.node and engines.pnpm must be set
- Docker images must be tagged

## Acceptance condition

Accepted only when local versions and package metadata match the lock, and `git diff --check` passes.