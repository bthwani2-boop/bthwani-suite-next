# OpenCodeReview Tool Adapter

Status: OPTIONAL_EVIDENCE_TOOL

## Purpose

OpenCodeReview (`ocr`) is an optional deterministic inspection tool. It may:

- select a bounded review scope;
- apply include/exclude rules;
- resolve file-specific review guidance;
- expose exact diff/context for a pinned candidate.

It owns no Product/System truth, repository architecture, campaign stage, mutation order, canonical target, CI authority, approval, release decision, Stage-A/Stage-B transition or completion claim.

Canonical repository execution/closure authority for branch `h` is:

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`

OCR output is evidence only and must be causally classified and consumed under the orchestrator.

## Credential and mutation boundary

The adapter must not depend on an embedded LLM provider or model-specific secret merely to produce deterministic review context.

The tool must not mutate repository source while inspecting it. Setup/repair actions that change local tool configuration are operational maintenance only and are not repository refoundation authority.

## Use when

- a bounded deterministic pre-review is materially useful;
- exact inclusion/exclusion and rule mapping are useful;
- the current execution unit needs another falsification/evidence source.

## Do not use as

- Product/System truth;
- root/systemic-unit selector;
- CI or Final Closure controller;
- security/finance/governance approval authority;
- substitute for compiler/test/runtime/device evidence;
- substitute for negative-space or migration/cutover proof.

## Workflow

1. Pin the exact subject being inspected.
2. Run only the minimum OCR operation needed (`preview`, `rules`, `audit`, or `verify`).
3. Preserve exact scope, rules, diff/context and tool identity when materially relevant.
4. Map any material finding to the current Stage-A systemic catastrophe, Stage-B root, or an independently classified finding.
5. Keep OCR limitations explicit; deterministic review context does not prove semantic correctness.

There is no required `.github/workflows/open-code-review.yml` authority on `h`. If a future workflow invokes OCR, that workflow must independently re-earn unique assurance value under the orchestrator and remains an evidence producer only.
