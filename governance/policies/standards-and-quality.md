# Engineering Standards, Best-Practice Adequacy, and Quality Policy

Status: ACTIVE_CANONICAL

## Standards-Grounded treatment gate

For every material root, functional success or symptom removal is insufficient. The resulting canonical treatment must be the **correct, simplest, durable root solution appropriate to the actual context**, consistent with current materially applicable authoritative engineering/platform standards, Product/System semantics, repository constraints and the owning technology.

Evaluate dimensions only when material:

`correctness | architecture | ownership | API/contract design | data integrity/migrations | security/privacy | concurrency/idempotency | reliability/recovery | performance/resource lifecycle | accessibility/RTL | maintainability | testability | observability | dependency hygiene | clean-state reproducibility`.

## Selection law

When more than one treatment is valid, prefer the one maximizing:

```text
Root Removal
+ Canonical Simplicity
+ Strong Invariants
+ Minimal Necessary Complexity
+ Lowest Long-Term Entropy
+ Safe Migration/Cutover
+ Full Consumer Consistency
+ Verifiable Failure/Recovery Behavior
```

Do not select the smallest diff or fastest local patch when it exports complexity, duplicated authority, migration debt, hidden operational risk or future maintenance entropy to the system.

## Best Practice is context-bound

```text
BEST_PRACTICE != LATEST_PATTERN
BEST_PRACTICE != MORE_ABSTRACTION
BEST_PRACTICE != MORE_LAYERS
BEST_PRACTICE != NEW_DEPENDENCY
BEST_PRACTICE != REWRITE

VALID_PRACTICE = CONTEXT_FIT + MATERIAL_BENEFIT + PROVEN_NEED + CORRECT_AUTHORITY
```

Forbidden as justification by themselves:

- cargo-cult patterns;
- premature abstraction;
- speculative generalization;
- architecture astronautics;
- unnecessary layering/wrapping;
- dependency-for-convenience when existing capability is sufficient;
- rewrite-for-cleanliness;
- optimization without measured/material need;
- local simplification that creates downstream duplication or parallel truth.

An abstraction/service/package/dependency exists only when it has necessary purpose, clear owner, real consumer, unique value and lower total system entropy than the simpler alternative.

## External standards and official guidance

Use current authoritative standards/vendor/platform documentation when they can materially change a design decision, prevent a known class of defect or are required for release/compliance. Examples may include current NIST secure-development guidance, OWASP application/API/mobile guidance, SLSA/supply-chain guidance, language/runtime/database/framework official guidance and current Apple/Google platform rules.

External standards do not create BThwani Product semantics. Mutable version numbers/rules must be revalidated when the decision/release depends on them rather than copied into governance as eternal facts.

## Quality and testability

Design important behavior so its invariants and failure/recovery paths can be falsified. Tests are evidence, not Product Truth, and should target the authority/behavior they prove without hard-coding obsolete implementation structure as semantics.

Do not weaken tests/scanners or create a fake-green compatibility path to accept a design that remains wrong. Conversely, do not introduce a large test/guard framework when a focused existing test/runtime proof gives equivalent assurance more simply.

## Suppressions and intentional conditions

A warning/test/scanner finding may not be hidden merely to obtain green. Material suppression/ignore/allowlist requires one of:

- a proven false positive; or
- an explicitly authorized intentional condition whose risk/behavior is understood.

The suppression must be the narrowest sufficient scope, live at the correct owner, preserve visibility of unrelated paths, record enough rationale for future re-evaluation and have an expiry/removal trigger when temporary. A broad exclusion that hides required analysis, or a local disable used instead of fixing the actual Source-of-Fix, is not acceptable evidence.

An executing agent/tool may propose or technically apply a suppression only when current authority permits; it cannot manufacture business/security risk acceptance merely because the finding is inconvenient.

## Dependency hygiene

Dependencies/tooling must provide material capability not reasonably owned already, be compatible with platform/security/licensing/supply-chain requirements, remain lockable/reproducible and have clear removal/update ownership. Remove unused/obsolete/duplicate dependencies after consumer/build/runtime proof.

## Tools and assurance outputs

CI, Sonar, CodeQL, Semgrep, reviews, scanners and similar systems are **evidence producers**, not Product/System authority. Consume material findings, warnings, execution limitations and coverage gaps; correlate/deduplicate/map them to actual roots; fix the Product/code/data/runtime Source-of-Fix.

Do not turn ordinary product/root work into an assurance-control-plane/toolchain side project merely because a scanner/workflow is imperfect. Repair the assurance machinery only when it is the explicit objective or when a proven indispensable evidence blocker leaves no materially adequate route to the required claim. Do not create bypasses or shadow assurance systems.

## Adequacy proof before closure

A material root is not standards-grounded closed until evidence supports, as applicable:

```text
ROOT_CAUSE_REMOVED
+ CORRECT_OWNER_AND_LAYER
+ CONTEXT_APPROPRIATE_BEST_PRACTICE
+ APPLICABLE_STANDARDS_SATISFIED
+ NO_SIMPLER_EQUIVALENT_ROOT_CORRECT_DESIGN
+ NO_NEW_PARALLEL_TRUTH
+ NO_UNJUSTIFIED_COMPLEXITY
+ FULL_AFFECTED_CONE_CONSISTENCY
+ FAILURE_AND_RECOVERY_BEHAVIOR_VERIFIABLE
+ NO_KNOWN_MATERIAL_RESIDUE_TIED_TO_ROOT
```

A change that works functionally but leaves a known materially fragile design, violates an applicable standard, or replaces the defect with unjustified structural debt returns to diagnosis/treatment rather than qualifying as root-correct closure.
