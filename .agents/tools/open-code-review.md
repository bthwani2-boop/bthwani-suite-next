# OpenCodeReview Tool Policy

## Purpose

OpenCodeReview (`ocr`) owns deterministic review preparation only:

- select the bounded review scope;
- apply project include/exclude rules;
- resolve file-specific review rules;
- expose the exact diff/context for the pinned candidate.

The host agent owns semantic reasoning. In an interactive ChatGPT or Codex session, that current host agent performs the review. OpenCodeReview itself does not own an LLM provider, model credential, approval, or repository authority.

## Credential boundary

The canonical delegation path must not depend on:

- `COPILOT_GITHUB_TOKEN`;
- `OCR_LLM_*`;
- an OpenAI/Anthropic API key solely for OpenCodeReview;
- a model-specific CLI embedded inside the OCR wrapper.

A GitHub Actions workflow may prepare and publish deterministic delegation context, but it must not claim that an AI semantic review occurred unless a separately authenticated host reviewer actually performed one.

The only accepted semantic attestation is one comment whose body is exactly one marker line followed by one canonical JSON line:

```text
BTHWANI_SEMANTIC_REVIEW:v1
{"schema":"BTHWANI_SEMANTIC_REVIEW","version":1,"candidateSha":"<exact 40-character head SHA>","verdict":"PASS","reviewIdentity":{"kind":"external-authorized-host-agent","provider":"<host provider>"},"reviewProvenance":{"artifactIdentity":"<exact OCR artifact name>","contextSha256":"<64 lowercase hex characters>","packageIntegrity":"<exact pinned package integrity>","toolVersion":"<pinned semantic-review tool version>"}}
```

The closure consumer validates the exact structured contract, the exact candidate SHA, the OCR artifact hashes and package provenance, and the live GitHub permission of the comment author. Malformed, partial, stale, duplicated, conflicting, candidate-authored, or free-form substring imitations fail closed. The comment author is the authority identity; no username embedded in the comment body is trusted.

Automatic GitHub PR AI review belongs to the platform-native host reviewer (for example Codex Code Review) and is separate from the deterministic OpenCodeReview context workflow.

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
2. Run `ocr delegate preview` with `.opencodereview/rule.json`.
3. Record included and excluded paths.
4. Run `ocr delegate rule` for the reviewable paths.
5. Inspect the exact diff and only necessary surrounding context.
6. The current host agent performs the semantic review using those resolved rules.
7. Report grounded Critical, High, and Medium findings.
8. Keep tests, runtime proof, security scanners, and independent approval separate.

OpenCodeReview may not mutate source during review and may not self-promote its output into final approval.