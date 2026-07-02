# 01 — Repo Boundaries

Status: CANONICAL

## Purpose

Separate the donor repository from the new canonical repository.

## Rules

- `C:\bthwani-suite` is donor/reference/evidence only.
- `C:\bthwani-suite-next` is the canonical implementation target.
- No runtime dependency on the donor repository.
- No blind copy from the donor repository.
- No folder dump from donor to new repo.
- Every donor-derived item must be classified in `99_LEGACY_EXTRACTION_LEDGER.md`.

## Donor decisions

Allowed decisions:

- ADOPT_AS_IS
- ADOPT_AFTER_REWRITE
- DESIGN_REFERENCE_ONLY
- DOMAIN_REFERENCE_ONLY
- API_REFERENCE_ONLY
- REJECT_NOISE
- REJECT_DEMO_PREVIEW
- REJECT_DUPLICATE
- REJECT_BROKEN
- OUT_OF_SCOPE_FOR_THIS_JOURNEY

## Acceptance condition

Accepted only when no runtime file imports from the donor repo and every donor extraction has a ledger entry.