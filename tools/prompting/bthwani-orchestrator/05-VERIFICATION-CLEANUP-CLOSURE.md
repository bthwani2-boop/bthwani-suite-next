# 05 — Verification, Cleanup & Closure

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

## Verification hierarchy

Verify the claim at the same semantic altitude where the root was proven, then descend through implementation and readback:

```text
operational outcome / authority / journey / state / handoff
→ canonical owner / contract / data
→ implementation
→ runtime/readback/consumers
→ failure/edge/adversarial
```

Static/test green is never a substitute for required runtime/operational proof.

## Operational closure prerequisites

No handoff/closure unless `operational-root-gate --phase closure` passes on current final candidate and machine registries show zero unaccounted material operational entries.

Required challenge:

```text
negative-space PASS
operational adversarial PASS
root-cause landscape current
zero unclustered material findings
zero unranked material roots
frontier empty
```

## Cleanup

Cleanup remains part of DONE: dead/stale/duplicate/legacy truth, obsolete paths/contracts/config/deps, orphan refs, wrong ownership/placement/naming, workarounds/fallbacks/TODO/FIXME/HACK and temporary/debug residue related to the proven closure cone. Prove consumers before removal and reverify after mutation.

## Fresh-head / integration

Any latest-target movement that changes authority, operational behavior, root placement, dependency, blast radius or evidence invalidates the affected operational/priority cone. Unrelated delta is preserved without becoming work.

## Final equation

```text
OPERATIONAL_ROOT_MACHINE_PASS
AND ROOT_CAUSE_PRIORITY_MACHINE_PASS
AND FRONTIER_DERIVATION_MACHINE_PASS
AND ACTIVE_EXECUTION_FRONTIER=NONE
AND ACCOUNTING_COMPLETE
AND IMPLEMENTATION/CLEANUP/EVIDENCE/GOVERNANCE_COMPLETE as applicable
AND INTEGRATION_COMPLETE
AND FRESH_HEAD_VALID
AND FINAL_ADVERSARIAL_PASS
AND FINAL_CANDIDATE_SHA = live target HEAD at decision
```

Bounded material completeness is required; absolute unknowable completeness is never fabricated.
