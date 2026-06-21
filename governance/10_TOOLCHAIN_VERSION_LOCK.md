# 10 — Toolchain Version Lock

Status: CANONICAL

## Source of truth

`package.json` at the repository root is the **operative source of truth** for locked tool versions.
This file documents those values and enforces the invariant that they must agree.

Any future change to pnpm, TypeScript, or Node versions **must** update both `package.json` **and** this file in the same commit.
A mismatch between the two fails the phase gate.

## Locked baseline

| Tool | Version | Source | State |
|---|---:|---|---|
| Node.js | >=24.17.0 <25 | engines.node in package.json | LOCKED |
| pnpm | 10.34.2 | packageManager + engines.pnpm in package.json | LOCKED |
| TypeScript | ~6.0.3 | devDependencies.typescript in package.json | LOCKED |
| Go | 1.26.4 | LOCKED_WHEN_GO_SERVICES_ARE_INTRODUCED | LOCKED_WHEN_GO_SERVICES_ARE_INTRODUCED |
| PostgreSQL | BLOCKED_NEEDS_RUNTIME_EVIDENCE | BLOCKED_NEEDS_RUNTIME_EVIDENCE | BLOCKED_NEEDS_RUNTIME_EVIDENCE |
| MinIO | BLOCKED_NEEDS_RUNTIME_EVIDENCE | BLOCKED_NEEDS_RUNTIME_EVIDENCE | BLOCKED_NEEDS_RUNTIME_EVIDENCE |
| Expo SDK | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE |
| React | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE |
| React Native | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE |
| Next.js | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE | OUT_OF_SCOPE_FOR_THIS_SLICE |

## Rules

- no `latest`
- no wildcard versions
- `packageManager` must be set in package.json
- `engines.node` and `engines.pnpm` must be set in package.json
- Docker images must be tagged
- This file and package.json must always agree — divergence fails the phase gate

## Sync invariant

When bumping any locked tool:
1. Update `package.json` (packageManager, engines, devDependencies as applicable)
2. Update this file in the same commit
3. Verify with `git diff --check` and foundation gate

## Acceptance condition

Accepted only when local versions and package metadata match the lock, and `git diff --check` passes.
