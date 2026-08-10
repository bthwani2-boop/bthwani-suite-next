# Start here — TASK_NAME

## Objective

TASK_OBJECTIVE

## Required reading order

1. `MANIFEST.json`
2. `GLOBAL-DIAGNOSIS.md`
3. `COVERAGE.json`
4. `EXECUTION-ORDER.json`
5. the first unit whose dependencies are complete and whose status is `READY`
6. that unit's `DIAGNOSIS.md`, `EXECUTION.json`, and `VERIFICATION.json`
7. write actual outcomes only to that unit's `RESULT.json`
8. continue in dependency order
9. complete `CLOSURE.md` only after every unit is done and verified

## Execution constraints

- Do not redesign the solution or rediscover scope when the package already specifies it.
- Do not expand or reduce execution scope without recording new evidence in `COVERAGE.json` and updating unit links.
- Do not modify paths or symbols outside the current task unless `EXECUTION.json` explicitly permits it.
- Do not start a unit while a dependency is incomplete or a blocking verification has failed.
- Do not claim closure from build success alone.
