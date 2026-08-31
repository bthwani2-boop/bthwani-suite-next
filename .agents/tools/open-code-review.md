# OpenCodeReview Tool Policy

## Purpose

OpenCodeReview (`ocr`) is the canonical deterministic inspection authority for CI and Final Closure. It owns:

- select the bounded review scope;
- apply project include/exclude rules;
- resolve file-specific review rules;
- expose the exact diff/context for the pinned candidate.

OpenCodeReview does not claim semantic reasoning, approval, or human review. It does not own an LLM provider, model credential, or repository authority beyond its deterministic inspection contract.

## Credential boundary

The canonical delegation path must not depend on:

- `COPILOT_GITHUB_TOKEN`;
- `OCR_LLM_*`;
- an OpenAI/Anthropic API key solely for OpenCodeReview;
- a model-specific CLI embedded inside the OCR wrapper.

The reusable `.github/workflows/open-code-review.yml` workflow invokes `tools/scripts/invoke-open-code-review-toolchain.ps1`, verifies the pinned package, and publishes exact-candidate context, resolved rules, reviewable files, diff, hashes, and a consumed evidence envelope. Final Closure requires that workflow and consumes its `opencodereview-context` evidence; it is not an orphan artifact or a second reviewer authority. This context claim cannot satisfy `analysis:opencodereview-semantic`.

## Use when

- reviewing a dirty workspace, one commit, or a branch range;
- deterministic inclusion, exclusion, and rule mapping is useful;
- a bounded pre-review is requested.

## Do not use when

- no code review is requested;
- the CLI is unavailable and installation is outside scope;
- formal product, finance, governance, CI, QA, security, release, risk, or final approval is required.

## Workflow

1. Pin the exact review subject.
2. Run `ocr delegate preview` with `.opencodereview/rule.json`.
3. Record included and excluded paths.
4. Run `ocr delegate rule` for the reviewable paths.
5. Inspect the exact diff and only necessary surrounding context.
6. Preserve the tool output and cryptographic identity as required CI evidence.
7. Keep tests, runtime proof, security scanners, and product decisions separate.

OpenCodeReview may not mutate source during inspection and may not self-promote its output into semantic approval.
