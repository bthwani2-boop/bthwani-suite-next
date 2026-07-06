# Evidence And Closure Template

<!-- markdownlint-disable MD060 -->

This factory does not close journeys. It defines the evidence that a future journey must collect before any closure claim.

| Field | Required value |
|---|---|
| evidence current HEAD | Evidence SHA equals current HEAD |
| evidence cannot be only docs | Source, command, guard, runtime, contract, or CI evidence is required |
| evidence type | code, contract, guard, runtime, visual, security, performance, CI, external blocker |
| command | Command that produced evidence |
| output summary | Small bounded summary, not raw logs |
| file path | Evidence path outside committed raw diagnostics or direct source path |
| stale check | SHA and timestamp verification |
| CI result | CI evidence or explicit not-proven blocker |
| runtime result | Runtime evidence or explicit not-proven blocker |
| final decision | Ready candidate, blocked, fix required, or external blocker |
| pass_allowed | `false` by default |

No future journey may rely on a single document as closure evidence.
