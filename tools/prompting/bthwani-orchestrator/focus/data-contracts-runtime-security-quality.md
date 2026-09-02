# Focus — Data, Contracts, Runtime, Security, Quality and Tool Evidence

## 1. Purpose

Execution lens for data/database, contracts/API/events, runtime/infrastructure, security/auth, finance, testing/quality and tool/CI evidence.

Durable policy authority is owned by:

- `governance/policies/engineering.md`;
- `governance/policies/architecture-and-fullstack.md`;
- `governance/policies/data-and-migrations.md`;
- `governance/policies/runtime-reliability.md`;
- `governance/policies/standards-and-quality.md`;
- `governance/policies/security.md`;
- `governance/policies/delivery.md` where delivery/release evidence is material;
- applicable Product Truth for domain/financial meaning.

Do not split one cross-boundary root into independent pseudo-projects.

## 2. Data/contracts/runtime execution lens

Trace the materially applicable path from canonical contract through auth/authz, handler/domain, persistence/event/provider, response/error and canonical readback to all consumers. For data changes include owner/schema/constraints/migration/backfill/reconciliation/cutover/concurrency/restart and old-writer elimination according to governance.

For runtime claims prove current candidate/process/config/schema/provider identity and failure/recovery behavior sufficient to exclude stale execution.

## 3. Security and finance

Apply `security.md` and applicable Product Truth. UI visibility is never authorization. Caller-authored financial authority, direct balance/ledger truth outside WLT, unauthenticated provider evidence and unresolved external unknown results are forbidden final states where applicable.

## 4. Tools are evidence producers

CI, tests, Sonar, CodeQL, Semgrep, scanners, reviews and similar tools are sensors/analyzers, not Product/System authority.

For every material output:

```text
retrieve raw result
-> account for findings/warnings/coverage limitations
-> validate/falsify/correlate/deduplicate
-> map to Root Graph
-> fix actual Source-of-Fix when relevant/authorized
-> rerun only invalidated/newly required proof
```

`GREEN != CLOSED`; a tool failure is evidence, not automatically a separate objective or stop state.

Do **not** turn normal product/root work into CI/workflow/scanner/toolchain remediation unless that is the explicit objective or a proven indispensable evidence blocker prevents the required claim. Do not create bypass or shadow assurance paths.

## 5. Testing/verification

Tests are falsifiable evidence, not Product Truth. Select the smallest claim-specific unit/domain, contract/database, generated consistency, integration/journey, runtime/readback, security/isolation, migration, concurrency/restart, visual/accessibility/performance evidence capable of proving the affected claim; expand by risk and `04` closure requirements.

Do not weaken valid tests/scanners or suppress material findings merely to obtain green.

## 6. Operational lenses

When material, deepen using governance for observability, privacy/data lifecycle, backup/restore, performance/capacity/resilience, supply-chain/provenance and human-experience telemetry. Do not invent numeric SLO/RPO/RTO targets or collect telemetry without a real decision/operations consumer.

## 7. Closure

Close this focus only when affected data/contract/runtime/security/quality truth is consistent through consumers, required migration/cutover/recovery paths are proven, material tool evidence is accounted for, obsolete/shadow authority is removed and the exact candidate satisfies the applicable durable policies.
