# Focus — Product Meaning, UX Semantics and Durable Governance

## 1. Purpose

Execution lens for Product/System semantics, actors, authorities, journeys, states, responsibilities, information architecture, UX/design meaning and governance reconciliation.

Durable authority is owned by:

- `governance/GOVERNANCE.md`;
- `governance/product/PRD.md`;
- `governance/product/PRODUCT-TRUTH-SPEC.md`;
- applicable `governance/product/contracts/*.product-truth.json`;
- `governance/product/EXPERIENCE-AND-DESIGN.md`;
- applicable `governance/policies/**`.

This module owns only **how execution applies/reconciles** those authorities inside the root loop.

## 2. Reconciliation

For the material cone reconcile:

`Outcome | Actor | Responsibility | Authority | Journey | State/Transition | Preconditions | Decision Rules | Invariants | Handoffs | Owner | Writers/Readers/Consumers | Contract/Data/Runtime ownership | Cross-surface meaning`.

Classify governance representations as `CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | MISSING_BUT_PROVEN | DECISION_REQUIRED | N/A_PROVEN`.

A local implementation/objective cannot silently redefine durable meaning, and governance text cannot substitute for fixing the actual system.

## 3. Governance write gate

Use the write gate in `governance/GOVERNANCE.md`. Before writing, verify the live smallest canonical owner and that the truth is proven, durable, reusable, materially important and not subject to an unresolved decision.

Do not promote operation IDs, file paths, current bugs, branch state, task status or temporary runtime facts into governance merely because they were discovered.

## 4. UX/design execution

Treat UX as operational meaning and use `EXPERIENCE-AND-DESIGN.md` for durable journey/IA/content/design/accessibility/localization semantics. Concrete implementation routes additionally through `focus/code-architecture-organization.md`.

A design/prototype/tool map/token source/component implementation may be derived evidence; it does not become durable authority merely because a tool calls it canonical.

## 5. Decision gaps

Require human durable Product/System decision only when multiple materially valid semantics remain after derivable evidence is exhausted. External Best Practice may inform engineering technique but cannot invent Product behavior.

After a durable decision: propagate -> invalidate affected assumptions -> re-diagnose -> update target/ownership/migration -> execute actual system -> prove required behavior -> reconcile governance.

## 6. Finishing

Before closure, ensure materially touched governance no longer points to a stale owner/semantic model, no proven durable truth with future-misdirection risk remains missing, no transient/task fact was promoted unnecessarily, and no competing durable representation remains for the same material concept.
