# BThwani Codex Adapter

This adapter is intentionally thin.

## Read order

1. `AGENTS.md`
2. `.agents/INDEX.md`
3. `.agents/AUTHORITY_BOUNDARY.md`
4. `.agents/EVIDENCE_GATE_ROUTER.md` when verification level is unclear
5. One directly relevant skill

## Adapter default

- follow CODE_BASED_LEAN
- read AGENTS.md and INDEX only when needed
- read EVIDENCE_GATE_ROUTER only when escalation level is unclear
- load at most one directly relevant skill for normal work
- do not auto-load closure/evidence/visual-surgery skills after normal implementation
- do not request evidence unless escalation applies

## Adapter-specific rule

Act only inside the current task scope. Do not mirror global rules here; follow `AGENTS.md` as the main contract.

## Stop conditions

- unclear target path
- required scope expansion
- missing required evidence only when final closure or escalation was requested
- request to mutate remote Git state without explicit instruction
