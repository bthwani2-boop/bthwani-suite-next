---
name: bthwani-docker-slice-runtime
version: 2026.06.19-clean
summary: Verify Docker, data-plane, and live-like runtime only when relevant.
---

# bthwani-docker-slice-runtime

## Invoke when

- task touches `infra/docker`, data-plane, runtime smoke, service runtime, database, Redis, MinIO, or live-like behavior
- the user asks for runtime proof

## Read before

`package.json`, `governance/05_DOCKER_AND_DATA_PLANE.md`, `infra/docker`, `infra/data-plane`, service database paths

## Execution contract

Run only runtime-relevant scripts from `package.json`. Keep service business schema inside service database folders and infrastructure provisioning inside infra owners.

## Forbidden

- do not run runtime gates for docs-only/agent-only changes
- do not use memory repository as live-like proof
- do not use untagged or floating Docker images
- do not move business schema into infra provisioning

## Required evidence

- runtime command output
- smoke logs
- changed infra/service database paths
- Git diff checks

## Failure decision

- runtime required but not run -> `NEEDS_EVIDENCE`
- runtime script fails -> `FIX_REQUIRED`
- live-like shortcut found -> `FIX_REQUIRED`

## Notes

No extra notes.
