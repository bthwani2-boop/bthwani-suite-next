---
name: bthwani-platform-runtime-config
version: 2026.06.19-clean
summary: Control environment, providers, service slots, and runtime configuration boundaries.
---

# bthwani-platform-runtime-config

## Invoke when

- env/config/provider/service slot/base URL/runtime map files change
- a screen or service needs runtime configuration
- provider control plane is touched

## Read before

`governance/04_API_RUNTIME_BINDING.md`, `governance/05_DOCKER_AND_DATA_PLANE.md`, `shared/app-shell`, provider/core config files

## Execution contract

Keep configuration centralized and owner-specific. Service slots must point to declared service owners. Runtime URLs must come from approved config surfaces, not screen-local constants.

## Forbidden

- no screen-local runtime config
- no preview/demo/mock runtime data in live paths
- no provider mutation hidden in frontend
- no broad CORS or unsafe default config

## Required evidence

- config owner path
- consumer path
- runtime evidence when behavior changes
- security review when sensitive values are involved

## Failure decision

- hardcoded runtime path in screen -> `FIX_REQUIRED`
- config owner unclear -> `NEEDS_EVIDENCE`
- sensitive config leaked -> `BLOCKED_SECURITY_RISK`

## Notes

No extra notes.
