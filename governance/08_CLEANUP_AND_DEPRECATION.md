# 08 — Cleanup and Deprecation

Status: CANONICAL

## Cleanup rules

No global delete. No blind replace. No donor folder dump.

## Classification

Every cleanup or extraction target receives one decision:

- KEEP_ACTIVE
- ADOPT_AS_IS
- ADOPT_AFTER_REWRITE
- DESIGN_REFERENCE_ONLY
- DOMAIN_REFERENCE_ONLY
- API_REFERENCE_ONLY
- MOVE_TO_NONCANONICAL
- REJECT_NOISE
- REJECT_DEMO_PREVIEW
- REJECT_DUPLICATE
- REJECT_BROKEN
- OUT_OF_SCOPE_FOR_THIS_SLICE

## Runtime forbidden

- preview data
- demo data inside frontend code
- mock success paths
- fake actor IDs
- fixture fallback

## Acceptance condition

Accepted only when donor extraction is classified and recorded in `99_LEGACY_EXTRACTION_LEDGER.md`.