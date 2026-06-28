---
name: bthwani-final-slice-closure-judge
description: Judge if a slice is fully closed and ready by verifying multi-dimensional evidence before claiming closure.
version: 2026.06.24-v1
---

# bthwani-final-slice-closure-judge

Do not invoke during normal implementation.
Invoke only when the user explicitly asks for CLOSED, READY, final closure, PR readiness, merge readiness, or release readiness.

## Purpose

Enforce strict multi-dimensional evidence requirements before any slice is declared `CLOSED` or `READY`. No slice can be marked closed based on assumption or single-source evidence.

## Mandatory Evidence Rules

Mandatory only for final closure or escalated review.
Not required for normal implementation.

1. **API / Contracts**: Requires contract proof (e.g., OpenAPI lint check or schema compliance).
2. **Backend Logic**: Requires backend/domain proof (e.g., unit tests or local integration execution).
3. **Frontend Binding**: Requires generated/typed client proof (e.g., verifying compiled clients or views).
4. **Service Adapters**: Requires service adapter/view-model proof.
5. **UI / Screen Flow**: Requires screen state proof and visual evidence (screenshot/recording).
6. **Runtime Smoke**: Requires runtime evidence from integration/live-like smoke tests.
7. **Architectural Routing**: Requires Graphify/Nx evidence when project routing is touched.
8. **CI System**: Requires CI evidence ONLY if CI is intentionally configured and active. If not active, explicitly document as an exception (do not claim CI pass).

## Disallowed Actions
- No "almost ready" or "implemented technically = closed".
- No old PASS over a newer FAIL.
- No single file of evidence (e.g., just a text report) to claim complete closure.

## Allowed Judgments
- `CLOSED`
- `FIX_REQUIRED`
- `BLOCKED`
- `NEEDS_VISUAL_EVIDENCE`
- `NEEDS_RUNTIME_EVIDENCE`
- `NEEDS_CONTRACT_EVIDENCE`
- `NEEDS_BACKEND_EVIDENCE`
- `NEEDS_FRONTEND_EVIDENCE`
- `NEEDS_CI_EVIDENCE`

## Output Format

Use this full output only during final closure review.
For normal implementation, do not output this block.

```text
skill: bthwani-final-slice-closure-judge
slice_touched: <path/component>
evidence_checked:
  - contract: <path or none>
  - backend: <test output or none>
  - frontend: <compilation or none>
  - visual: <image path or none>
  - runtime: <smoke output or none>
judgment: <judgment>
rationale: <why>
```
