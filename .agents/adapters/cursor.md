# BThwani Cursor Adapter

This adapter is intentionally thin.

## Read order

1. `AGENTS.md`
2. `.agents/INDEX.md`
3. `.agents/AUTHORITY_BOUNDARY.md`
4. `.agents/EVIDENCE_GATE_ROUTER.md` when verification level is unclear
5. One directly relevant skill

## Adapter-specific rule

Act only inside the current task scope. Do not mirror global rules here; follow `AGENTS.md` as the main contract.

## Stop conditions

- unclear target path
- required scope expansion
- missing evidence for closure
- request to mutate remote Git state without explicit instruction
