# Evidence, SDLC, and Release Policy

Status: ACTIVE_CANONICAL

The governed lifecycle is:

```text
G0_INTAKE → G1_PRODUCT_MODEL_APPROVED → G2_DESIGN_APPROVED
→ G3_READY_FOR_IMPLEMENTATION → G4_IMPLEMENTATION_VERIFIED
→ G5_PRODUCT_ACCEPTED → G6_QA_APPROVED → G7_SECURITY_APPROVED
→ G8_RELEASE_APPROVED → G9_DEPLOYED → G10_PRODUCTION_VERIFIED
→ CLOSED_WITH_EVIDENCE
```

Evidence scopes are `static`, `product`, `runtime`, `visual`, `qa`, `security`,
`finance`, `isolation`, `governance`, `ci`, `release`, and `production`.
Each scope is independent and tied to one immutable commit. A skipped stage is
valid only with an explicit reason and evidence that the change impact makes it
not applicable; exclusion is not a pass.

Lifecycle artifacts encode excluded stages in `notApplicableStages` and record
their reasons and evidence in `stageExclusions`.

Direct work uses the explicitly named branch as source and target. Before and
after each batch, re-resolve the remote SHA. Do not create another branch or PR,
merge, deploy, or rewrite history unless explicitly authorized. CI verifies
source and never mutates it.

Protected approvals cannot be issued by the executor. Missing independent
security, finance, isolation, migration, release, production, or residual-risk
evidence keeps that scope at `NEEDS_EVIDENCE`, `SECURITY_BLOCK`, or
`RELEASE_BLOCK`. Final closure requires all applicable scopes and no open
failure, blocker, pending decision, stale evidence, or branch mismatch.

`FINANCIAL_CONTROL_AUTHORITY` independently owns WLT financial approval and
cannot be replaced by engineering, product, governance, or the sole-owner
exception.
