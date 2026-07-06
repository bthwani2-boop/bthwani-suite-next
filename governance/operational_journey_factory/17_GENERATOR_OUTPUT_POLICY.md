# Generator Output Policy

- Generated outputs go to `.diagnostics/operational-journey-factory/`.
- Raw reports must not be committed.
- Only bounded summaries may be committed when the factory itself requires them.
- Every generated output must contain `head_sha`.
- Stale generated output is invalid.
- Generated outputs do not declare journey readiness.
- Outputs are used later to fill templates from evidence, not from opinion.
- The committed factory contains templates, scripts, guard, package bindings, registry bindings, and `.gitkeep` only.
