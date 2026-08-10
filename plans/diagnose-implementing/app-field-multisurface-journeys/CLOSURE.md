# Closure — App Field Multi-Surface Journey Diagnosis and Execution

## Multi-surface closure rule

This dossier is open. Closure is forbidden until every field-related journey and all twenty-four slices converge across `control-panel`, `app-client`, `app-partner`, `app-captain`, and `app-field`. A direct field success without authoritative readback, correct denial, recovery, and downstream state on the other required surfaces is a failure.

## Final decision

`NEEDS_EVIDENCE`

## Baseline and resulting SHAs

- Pinned start: `f1f9664838ddac7dec5cd26cd5fe9dcfdcd84b14`
- Final implementation SHA: not produced
- Final verification SHA: not produced
- Latest observed local SHA: `1e0cd0b0452d2cf2f422b2d5ed74b4d6ef29cf14`

## Required closure counters

- mapped field controls: complete and zero unbound
- parallel product, status, catalog, partner, store, assignment, and financial truths: zero
- direct surface-to-WLT calls: zero
- unauthorized cross-partner, cross-store, cross-area, and cross-actor actions: zero
- lost offline evidence or duplicate effects after reconnect: zero
- unresolved specific backend reason codes hidden behind generic UX: zero
- manual cases `MAN-01` through `MAN-14`: pass on the same SHA
- physical Android and iOS accessibility and lifecycle checks: pass
- provider, push, media, location, background, migration, reconciliation, and rollback evidence: pass
- cross-surface readback after refresh, restart, and policy or assignment change: pass

## Progress recorded so far

One slice has been executed and verified from source: the governed reason code, its allowed next action, its retry semantics, and the support correlation id now survive from the DSH backend response through the transport kernel, the shared classifier, and the shared view model into **every** app-field screen that narrows an error state, plus the control-panel field-readiness reader.

The model was hoisted to `services/dsh/frontend/shared/_kernel/governed-problem.ts` so the partner, catalog, workforce, field-onboarding, and WLT controller families adopt it without an inverted dependency. WLT emits a stable reason code and the DSH surface maps it, preserving the financial boundary. Recovery and queued-operation decisions moved off message-substring matching onto stable codes.

The rule is enforced by `guard:field-surface-truth`, previously orphaned and failing, now registered in the journey guard set with an empty `PROBLEM_RENDERING_DEBT` register. See `units/U001-authority-inventory/RESULT.json`, `units/U003-experience-navigation-accessibility/RESULT.json`, and `units/U005-field-operations-offline/RESULT.json` for the literal command output.

This is scoped static and contract evidence. It is not closure and no unit is `DONE`.

## Remaining blockers and external evidence

- Runtime device, provider credential, production-like data, native release-build, migration upgrade, security, accessibility, and operational approval evidence does not yet exist. These are explicit gates rather than silent assumptions.
- `MAN-01` through `MAN-14` remain `NOT_RUN`.
- No unit is `DONE`. The reason-code slice is closed in source and enforced by a guard, which is scoped static and contract evidence only.

## Disposability proof

No runtime, build, CI, migration, governance, or operational path may depend on this dossier. Durable fixes and tests must be committed to canonical product, contract, service, database, governance, and test paths before this support artifact can be retired.
