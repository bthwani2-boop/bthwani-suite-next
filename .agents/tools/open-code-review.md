
# OpenCodeReview Tool Policy

## Purpose

OpenCodeReview (`ocr`) selects a deterministic bounded review scope and resolves project review rules.
The host agent performs advisory reasoning.

## Use when

- reviewing a dirty workspace, one commit, or a branch range;
- deterministic inclusion, exclusion, and rule mapping is useful;
- a bounded pre-review is requested.

## Do not use when

- no code review is requested;
- the CLI is unavailable and installation is outside scope;
- formal product, finance, governance, CI, QA, security, release, risk, or final approval is required;
- the same author is presenting the result as independent approval.

## Workflow

1. Pin the exact review subject.
2. Preview with `.opencodereview/rule.json`.
3. Record included and excluded paths.
4. Inspect exact diffs and only the necessary surrounding context.
5. Report grounded Critical, High, and Medium findings.
6. Keep registered guards, tests, runtime proof, and independent approval separate.

OpenCodeReview owns no approval or repository authority and may not mutate source during review.
