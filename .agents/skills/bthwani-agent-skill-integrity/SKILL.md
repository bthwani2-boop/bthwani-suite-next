---
name: bthwani-agent-skill-integrity
version: 2026.07.17-v1
summary: Reconcile active governed skills, retired legacy references, agent roles, adapters, and routing without inventing authority.
---

# bthwani-agent-skill-integrity

## Purpose

Own structural integrity checks for `AGENTS.md`, `.agents`, agent and skill registries, governed skill contracts, adapters, and routing indexes.

## Invoke when

- Agent, skill, adapter, registry, or routing-index files change.
- A skill is added, promoted, retired, renamed, or removed.
- Agent-system quality or authority drift is being audited.

## Do not invoke when

- No agent-system contract, registry, adapter, or routing file is affected.
- The task is only about application behavior with no agent-governance impact.

## Read before

- `governance/authority/authority-precedence.json`
- `AGENTS.md`
- `governance/agents/agent-registry.json`
- `governance/skills/skills-registry.json`
- `.agents/INDEX.md`

## Authority boundary

This skill owns registry and routing integrity only. It cannot approve its own governance change, grant product, architecture, QA, security, CI, release, or closure approval, or make a retired skill active without a complete governed contract.

## Required checks

1. Every skill directory has `SKILL.md` and exactly one registry entry.
2. Every `active` or `conditional` skill is `governed`, version-aligned, and has all mandatory contract sections.
3. Every `legacy` skill is `retired`, owns no authority, is not a dependency, and is absent from active routing.
4. Agent primary skill files reference active governed skills only.
5. Skill dependencies resolve to active or conditional governed skills and contain no cycles.
6. Adapters remain thin and own no approval domain.

## Forbidden

- Using `.agents/SKILL_CATALOG.md` or another stale catalog as authority.
- Listing a retired skill as active, mandatory, default, owner, or approval authority.
- Keeping placeholder or orphan skill directories active.
- Treating tool wrappers such as Graphify or Nx as owner skills.
- Self-approving the registry or routing change being inspected.

## Required output

```text
resolved_commit_sha:
active_governed_skills:
conditional_governed_skills:
retired_legacy_skills:
agent_mapping:
dependency_violations:
routing_violations:
checks:
decision:
remaining_gaps:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, and `PROTOCOL_VIOLATION`.
