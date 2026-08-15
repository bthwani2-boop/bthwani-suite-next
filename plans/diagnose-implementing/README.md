# Diagnose / Implement

One task = one `<task>/PACKAGE.md`.

One public tool = `orchestrator.mjs`.

One governing contract =
`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`.

Create:

`node plans/diagnose-implementing/orchestrator.mjs new --name <task> --target "<target>" --mode <PREPARE_ONLY|EXECUTE_END_TO_END> --integration-branch A --task-branch <branch> --base-sha <sha>`

Validate:

`node plans/diagnose-implementing/orchestrator.mjs check --package <PACKAGE.md> --head <live-sha> --phase <diagnose|execute|close>`

`check` is fail-closed. Execute/close require current head, reconciled
root/landscape/frontier, zero unaccounted findings, and closure requires
implementation, cleanup, and evidence.

Only packages with `SCHEMA: BTHWANI_PACKAGE_V4` are executable authority.
Older packages remain historical evidence only.
