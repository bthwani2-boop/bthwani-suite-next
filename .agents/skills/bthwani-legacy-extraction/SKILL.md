---
name: bthwani-legacy-extraction
version: 2026.06.19-clean
summary: Extract from donor or realtest only after conflict review.
---

# bthwani-legacy-extraction

## Invoke when

- donor zip, old repo, `realtest`, old screens, old services, or archived code are referenced
- the user asks to migrate old functionality
- a tool proposes copying old files

## Read before

`governance/01_REPO_BOUNDARIES.md`, `governance/99_LEGACY_EXTRACTION_LEDGER.md`, relevant new owner files

## Execution contract

Classify each donor item as design reference, domain reference, API reference, adopt after rewrite, reject noise, reject duplicate, reject demo/preview, or out of scope. Rewrite for the new structure.

## Forbidden

- no folder dump
- no old path assumptions
- no donor runtime dependency
- no preview/demo/mock runtime content

## Required evidence

- donor source path
- new target owner
- classification
- conflict review
- changed file evidence

## Failure decision

- copied old code without rewrite -> `REVERT_REQUIRED`
- missing classification -> `NEEDS_EVIDENCE`
- preview/demo runtime imported -> `FIX_REQUIRED`

## Notes

No extra notes.
