# 10 — Toolchain Version Lock

Project: bthwani-suite-next
Stage: Phase 2 — Toolchain Lock
Status: PENDING_VERIFICATION
Last updated: 2026-06-18

## Purpose

Lock the development toolchain before product slices, design foundation, backend features, or runtime implementation.

## Locked versions

| Tool | Locked version | Status |
|---|---:|---|
| Node.js | 24.17.0 | Locked LTS |
| pnpm | 11.7.0 | Locked |
| TypeScript | 5.9.3 | Locked where package requires TypeScript |
| Go | 1.26.4 | Locked for new Go services when introduced |
| PostgreSQL | Pinned Docker image required before DB runtime | Pending |
| MinIO | Pinned Docker image required before object storage runtime | Pending |
| Docker Desktop | Stable patched local install | Verify locally |
| Expo SDK | Pin when Expo surface is introduced | Pending |
| React | Pin when React surface is introduced | Pending |
| React Native | Pin when RN surface is introduced | Pending |
| Next.js | Pin when web surface is introduced | Pending |
| Playwright | Pin when e2e/browser tests are introduced | Pending |
| Nx | Pin if Nx is introduced | Pending |
| Spectral | Pin when OpenAPI linting is introduced | Pending |
| openapi-typescript | Pin when API generation is introduced | Pending |

## Current root lock

- packageManager: pnpm@11.7.0
- engines.node: >=24.17.0 <25
- engines.pnpm: 11.7.0
- .node-version: 24.17.0
- .nvmrc: 24.17.0

## Required rules

- No latest in dependencies, devDependencies, optionalDependencies, peerDependencies, overrides, or resolutions.
- No wildcard dependency versions.
- packageManager must be present.
- engines.node and engines.pnpm must be present.
- pnpm-workspace.yaml must be present.
- .npmrc must enforce reproducible behavior.
- Docker images must not be untagged or latest.
- Go version must be unified when Go services are introduced.

## Known warning

.npmrc sets auto-install-peers=false, while pnpm-lock.yaml may still show settings.autoInstallPeers=true.
Do not manually edit pnpm-lock.yaml unless pnpm install --lockfile-only produces a clean, reviewable diff.

## Acceptance evidence

- node --version
- pnpm --version
- pnpm install --lockfile-only
- pnpm typecheck
- git --no-pager status --short
- git --no-pager diff --check
