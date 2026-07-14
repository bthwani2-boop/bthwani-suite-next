# Generator Output Policy

- Generated outputs go to `.diagnostics/operational-journey-factory/`.
- Raw reports must not be committed.
- Only bounded summaries may be committed when the factory itself requires them.
- Every generated output must contain `head_sha`.
- Stale generated output is invalid.
- Generated outputs do not declare journey readiness.
- Outputs are used later to fill the 3 unified schemas (`01_EXECUTION_LEDGER`, `02_VERIFICATION_CLOSURE`, `03_RUNTIME_EVIDENCE_INDEX`), not from opinion.
- Maximum committed output files per journey is 3. Fragmenting outputs into many files is strictly prohibited.
- The committed factory contains templates, schemas, scripts, guard, package bindings, registry bindings, and `.gitkeep` only.
