# 10 — Toolchain Version Lock

Status: ACTIVE_CANONICAL

## Source of truth

The root `package.json`, package lockfile, Go module files, container references, and runtime manifests own the operative installed or declared versions for their ecosystems. This document records cross-tool invariants and must remain consistent with those live sources.

A version change updates every affected live manifest, lockfile, installer, workflow, and documented baseline in the same bounded change.

## Locked baseline

| Tool | Declared baseline | Operative source | Evidence state |
|---|---:|---|---|
| Node.js | `>=24.17.0 <25` | `package.json#engines.node` | `PASS` only when the manifest and active CI setup agree |
| pnpm | `10.34.2` | `packageManager` and `engines.pnpm` | `PASS` only when the manifest, lockfile, and setup action agree |
| TypeScript | `~6.0.3` | `devDependencies.typescript` | `PASS` only when package metadata and lockfile agree |
| Go | repository `go.mod` declarations | applicable `go.mod` files and CI setup | `NEEDS_EVIDENCE` when no applicable module or CI evidence exists |
| PostgreSQL | versioned runtime references | compose and runtime manifests | `NEEDS_EVIDENCE` without same-commit runtime evidence |
| MinIO | versioned runtime references | compose and runtime manifests | `NEEDS_EVIDENCE` without same-commit runtime evidence |
| Expo, React Native, React, Next.js | package manifests and lockfile | applicable app package files | `OUT_OF_SCOPE_FOR_THIS_JOURNEY` only when the current change does not affect them |

The decision terms in the evidence column are scoped. They do not imply final closure.

## Rules

- no `latest`, wildcard, or unbounded version in governed runtime and CI references;
- `packageManager`, `engines.node`, and `engines.pnpm` remain explicit;
- external GitHub Actions use immutable commit SHAs;
- container references follow the applicable version or digest policy;
- package manifests and lockfiles change together;
- installer scripts and CI setup use the same accepted versions;
- a documentation value never overrides a live manifest or lockfile.

## Verification

For each affected ecosystem:

1. compare all operative manifests and lockfiles;
2. verify CI and installer references;
3. run the smallest applicable version or installation check;
4. report `PASS`, `FIX_REQUIRED`, or `NEEDS_EVIDENCE` for the declared scope;
5. do not use deprecated aliases such as `BLOCKED_NEEDS_RUNTIME_EVIDENCE`.

## Acceptance condition

Accepted only when affected version sources agree, immutable references are enforced where required, manifests and lockfiles remain synchronized, missing runtime proof is reported as `NEEDS_EVIDENCE`, and no documentation-only baseline is presented as installed or executed truth.
