---
name: bthwani-agent-skill-integrity
version: 2026.08.06-v2
summary: Reconcile active governed skills, retired lifecycle records, tool policies, agent roles, adapters, and routing without inventing authority.
---

# bthwani-agent-skill-integrity

## Purpose

Own structural integrity checks for `AGENTS.md`, `.agents`, agent and skill registries, the conditional tool registry, governed skill contracts, adapters, and routing indexes.

## Invoke when

- Agent, skill, tool-policy, adapter, registry, or routing-index files change.
- A skill is added, promoted, retired, renamed, or removed.
- Agent-system quality, authority drift, or context waste is audited.

## Do not invoke when

- No agent-system contract, registry, adapter, or routing file is affected.
- The task concerns only application behavior.

## Read before

- `governance/authority/authority-precedence.json`
- `governance/GOVERNANCE.md`
- `AGENTS.md`
- `governance/agents/agent-registry.json`
- `governance/skills/skills-registry.json`
- `governance/tools/agent-tool-registry.json`
- `.agents/INDEX.md`

## Authority boundary

This skill owns registry and routing integrity only. It cannot approve its own governance change, grant product, architecture, QA, security, CI, release, or closure approval, or promote a tool into an owner skill.

## Required checks

1. Every active or conditional skill directory has exactly one `SKILL.md` and one registry entry.
2. Every active or conditional skill is governed, version-aligned, and contract-complete.
3. Every retired skill owns no authority or dependency, is absent from active routing, and has no live skill directory.
4. Every conditional tool is registered under `governance/tools/agent-tool-registry.json`, has one policy under `.agents/tools/`, and owns no authority.
5. Agent primary skill files reference active or conditional governed skills only.
6. Skill dependencies resolve without cycles and conflicts are symmetric.
7. Platform adapters remain thin, contain no machine-specific paths, and own no approval.
8. Backup files, hook-based policy injection, parallel adapter directories, and retired generated routing catalogs are absent.

## Forbidden

- Treating a retired or generated routing catalog as authority.
- Listing a retired skill as active, mandatory, default, owner, or approval authority.
- Keeping retired or tool-wrapper `SKILL.md` files discoverable.
- Treating Graphify, LeanCTX, OpenCodeReview, Nx, or runtime tooling as owner skills.
- Self-approving the registry or routing change being inspected.

## Required output

```text
resolved_commit_sha:
active_governed_skills:
conditional_governed_skills:
retired_lifecycle_records:
registered_tools:
agent_mapping:
dependency_violations:
routing_violations:
checks:
decision:
remaining_gaps:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, and `PROTOCOL_VIOLATION`.
