# Diagnose / Implement

One task = one `<task>/PACKAGE.md`.

One public tool = `orchestrator.mjs`.

One governing contract =
`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`.

Create:

`node plans/diagnose-implementing/orchestrator.mjs new --name <task> --target "<target>" --mode <PREPARE_ONLY|EXECUTE_END_TO_END> --integration-branch A --task-branch <branch> --base-sha <sha>`

Validate:

`node plans/diagnose-implementing/orchestrator.mjs check --package <PACKAGE.md> --head <live-sha> --phase <diagnose|prepare|execute|close>`

`check` is fail-closed. `prepare`/`execute` require isolation, complete root/landscape/priority/frontier/negative-space/adversarial/verification readiness, and zero unaccounted findings/decisions/consumers/dependencies/scope deltas. `close` additionally requires complete implementation/consumer/cleanup/verification/evidence/governance/fresh-head/final-adversarial proof and runtime evidence when required.

`PREPARE_ONLY` terminates at `PREPARED`; it never claims execution closure.

Only packages with `SCHEMA: BTHWANI_PACKAGE_V4` are executable authority.
Older packages remain historical evidence only.
