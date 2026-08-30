---
name: bthwani-orchestrator
version: 2026.08.30-v1
summary: Thin agent entrypoint into the canonical BThwani Root-Cause Orchestrator.
status: CANONICAL_AGENT_ENTRYPOINT
---

# BThwani Orchestrator Agent Adapter

This file is an adapter, not a semantic owner.

Canonical authority:
`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`

For every repository diagnosis, implementation, verification, cleanup, or closure task:

1. Resolve the exact repository, user-targeted branch/ref, live SHA, and PR identity when applicable.
2. Load `00-ORCHESTRATOR.md`.
3. Follow its ownership graph and load `01`–`05` plus materially applicable `focus/*` owners.
4. Use `.agents/skills/**` and `.agents/tools/**` only as bounded specialists/adapters selected under the orchestrator.
5. Never redefine Product/System Truth, root ranking, Source-of-Fix, evidence dispositions, collision rules, PR lifecycle, or closure.
6. A specialist result is evidence/advice to the active coordinator; it is not an independent approval or closure authority.

Forbidden:
- parallel routing truth;
- parallel closure truth;
- a second evidence policy;
- agent metadata that overrides the orchestrator;
- self-certification of the orchestrator.

Normal path:
`HUMAN INTENT -> AGENT ADAPTER -> 00-ORCHESTRATOR -> applicable owners/focus -> bounded specialists/tools -> exact-candidate closure under 04`.
