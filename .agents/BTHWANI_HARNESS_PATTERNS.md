# BThwani Harness Patterns

This document defines which design patterns from `revfactory/harness` are adopted or rejected in `bthwani-suite-next`, and how they are mapped to local practical benefits.

## Adopted Patterns

| Pattern | Applied? | Target File / Area | Practical Benefit for BThwani |
| :--- | :--- | :--- | :--- |
| **Progressive Disclosure** | Yes | `.agents/README.md`, `.agents/INDEX.md` | Prevents agents from loading all instructions/skills into the context at once. Limits active context to what is strictly necessary, reducing token waste. |
| **Orchestrator / Supervisor Routing** | Yes | `.agents/INDEX.md`, `AGENTS.md` | Guides top-level agent routing to specific sub-skills rather than using a single monolithic instructions block. |
| **Producer-Reviewer Pattern** | Yes | `.agents/skills/bthwani-patch-review-evidence` | Separates change proposal (producer) from verification/evidence collection (reviewer) for critical updates. |
| **QA-after-each-unit** | Yes | `.agents/EVIDENCE_GATE_ROUTER.md` | Enforces running verification tests immediately after modifying any unit/component, preventing regression accumulation. |
| **Final Closure Judge** | Yes | `.agents/skills/bthwani-final-journey-closure-judge` | Restricts declaring a task complete without multi-dimensional evidence (visual, backend, contract, etc.). |
| **Skill References Structure** | Yes | `.agents/skills/` | Standardizes each skill into a standalone directory containing a `SKILL.md` file and optional supporting assets. |
| **Minimal Active Skill Set** | Yes | `.agents/INDEX.md` | Enforces a rule where an agent may activate at most three skills per task, maintaining focus. |

## Rejected Patterns

| Pattern | Rejection Reason |
| :--- | :--- |
| **Installing `revfactory/harness` as-is** | We do not want external dependencies, scripts, or agent systems that override BThwani project ownership. |
| **Copying generated generic agents** | Generic agent files contain generic prompts that conflict with WLT/DSH financial rules and local Windows paths. |
| **Duplicating skills under `.claude` or `.gemini`** | Duplication leads to configuration drift and increased maintenance. `.agents` must remain the Single Source of Truth (SSOT). |
| **Generic agent hierarchy** | BThwani rules must always override generic agent rules. Monolithic hierarchic structures introduce token overhead. |
| **Model-heavy defaults (e.g. Opus-for-everything)** | Leads to high latency and excessive token usage without providing functional improvements for simple tasks. |
| **Patterns increasing token load without proof** | Any automated loading of large repositories or multiple skill catalogs is rejected to control token expenditure. |
