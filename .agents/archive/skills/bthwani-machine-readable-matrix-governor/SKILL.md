---
name: bthwani-machine-readable-matrix-governor
version: 2026.06.19-clean
summary: Use machine-readable matrices for planning, coverage, and closure checks.
---

# bthwani-machine-readable-matrix-governor

## Invoke when

- CSV matrices are used for journey planning, screen coverage, extraction, DSH/WLT logic, or control-panel coverage
- a task asks for numerical closure or gap analysis

## Read before

`machine-readable/*.csv`, `governance/15_MATRIX_NORMALIZATION_RULES.md`, relevant owner files

## Execution contract

Treat matrices as structured evidence inputs. Cross-check claims against actual owner files and runtime evidence. Do not treat display artifacts or stale exports as canonical implementation.

## Forbidden

- do not close a journey from matrix status alone
- do not ignore repo files that contradict a matrix
- do not convert exploratory rows into implemented truth

## Required evidence

- matrix path
- row/key identifiers used
- matching repository file evidence
- closure state and missing proof

## Failure decision

- matrix says implemented but files missing -> `FIX_REQUIRED`
- files exist but matrix stale -> `FIX_REQUIRED`
- no row/key for requested scope -> `NEEDS_EVIDENCE`

## Notes

No extra notes.
