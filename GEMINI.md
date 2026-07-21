# Gemini CLI Instructions

Status: ADAPTER

This file is a thin tool adapter. It may not create or override repository policy.

Apply authority in this order:

1. `governance/authority/authority-precedence.json`
2. `AGENTS.md`
3. applicable active canonical governance and machine-readable contracts
4. applicable active or conditional governed owner skills under `.agents/skills`

If this file conflicts with any higher source, the higher source wins.

All commands must follow `.agents/COMMAND_SAFETY_POLICY.md` and the derived execution guidance in `.agents/AUTOMATED_EXECUTION_POLICY.md`.

For repository tasks:

- pin the exact repository, explicitly named branch, and resolved commit through `bthwani-current-workspace-authority`;
- never substitute the default branch, another branch, stale evidence, or a prior PR;
- use Product Truth before implementing user-visible, role-sensitive, cross-surface, commercial, or workflow changes;
- route governance contracts and CI workflow policy through separate owner skills and separate approvals;
- treat SaaS readiness and commercial activation values as states, not canonical decisions;
- use only active or conditional governed skills required by the task;
- map decisions through `governance/contracts/decision-vocabulary.json`.

Graphify is a conditional tool, not an agent. Use it only when ownership, routing, dependency, duplication, or dead-code relationships are unclear. Do not create duplicate Graphify skills under `.gemini/skills` or `.claude/skills`.

## Smart Execution Model

| Tier | When | Action |
|---|---|---|
| Instant | isolated wording or one-line safe fix | direct scoped execution |
| Focused | one module or owner boundary | one owner skill |
| Standard | cross-layer or multi-file work | workspace authority plus required owner skills |
| Escalated | product, finance, security, tenant isolation, governance, CI, SaaS activation, migration, release, production, or closure | formal authority, evidence routing, and independent review as applicable |

Use the smallest sufficient action. Do not overclaim `static`, `product`, `runtime`, `visual`, `qa`, `security`, `finance`, `isolation`, `governance`, `ci`, `release`, `production`, or final closure evidence. A pass in one scope never upgrades another scope.
