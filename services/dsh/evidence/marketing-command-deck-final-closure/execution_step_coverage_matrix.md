# execution_step_coverage_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
execution_step_coverage_matrix:
  - step: Fix stale evidence SHA
    status: DONE
    evidence: resolved-commit.txt now pins 5d0d7d0; explains ffefae7 -> e69fa48 -> 5d0d7d0 ancestry.
  - step: Correct stale/false claims in capability-map.ts / runtime-map.ts
    status: DONE
    evidence: "hard DB delete" / "zero test coverage" comments were themselves stale (fixed by commit e69fa48 before this pass); replaced with accurate, dated comments plus two newly-discovered gaps (dead UI consumer, no client-facing read route).
  - step: Disclose the marketing KPI header as non-live
    status: DONE
    evidence: marketing-registry.ts buildMarketingKpiMetrics() now returns isBackedByApi:false + disclosureReason; MarketingDashboardScreen.tsx renders the warning under the KPI strip.
  - step: Verify backend build/tests
    status: DONE
    evidence: "go build ./..." and "go test ./..." clean (verification-output.md); 4 DB integration tests re-run against live Postgres and passed (verification-output.md).
  - step: Verify guards
    status: PARTIAL
    evidence: guard:journey run directly via pwsh (bypassing broken pnpm/Node22 env) — non-pnpm-gated guards PASS (22/22 unified-fullstack-brain checks, 16/16 performance-baseline, canonical-host-ports, no-broken-imports, no-financial-mutation-outside-wlt, no-preview-demo-mock-runtime, no-direct-fetch-in-screen, dsh-frontend-shared-ownership, wlt-dsh-frontend-shared-ownership, docker-runtime-profiles, go-backend-runtime, dsh-service-activation, service-fullstack-linkage). Fixed 2 real findings: no-legacy-slice-labels false positive (self-referencing command name) and git-diff-check trailing-whitespace (CRLF/LF mix introduced by this session's own edits). pnpm-gated steps (contracts-lint, contracts-typecheck, dsh-typecheck, dsh-build, dsh-test, nx-projects) are ENVIRONMENT_BLOCKED — see verification-output.md.
  - step: Runtime evidence (Docker/DB/HTTP)
    status: DONE
    evidence: runtime:migrate, runtime:seed, runtime:status, runtime:smoke all PASS against live containers; fresh authenticated HTTP smoke (create/target-gate-fail/soft-archive/401) re-run and captured in dsh-marketing-http-smoke.txt.
  - step: Investigate app-client / app-partner surface claims
    status: DONE — found FIX_REQUIRED, not silently assumed
    evidence: server.go registers every campaign/banner/promo route under /dsh/operator/... only; no client- or partner-facing read route exists. "surfaces: app-client, app-partner" in capability-map.ts is corrected to note this is aspirational/unevidenced, not deleted from scope.
  - step: Investigate control-panel UI wiring for banners/promos
    status: DONE — found and partially remediated
    evidence: banners-carousel/homepage-promos tabs call the separate, already-verified dsh.home-discovery admin API (dsh_home_banners/promos, the table serving the live app-client homepage), not dsh_marketing_banners/promos. The only UI consumer of the real marketing banners/promos API (MarketingHubScreen.tsx) was dead/unrouted — retired in this pass (dead_code_and_duplication_matrix.md). Which system should be canonical is a product decision NOT resolved unilaterally in this pass.
  - step: Investigate remaining 7 local-only command decks
    status: DONE — already correctly implemented as DISABLED_WITH_BLOCKER before this pass
    evidence: MarketingCommandDecks.tsx disables every mutating button when `!controller.isBackedByApi` and renders a NotBackedNotice with a specific reason; commit e69fa48 already did this work. No further action required for that pattern; visibility-gates tab's bypass buttons remain local-only-and-undisclosed (see zero_defect_closure_matrix.md).
  - step: Build evidence matrices
    status: DONE
    evidence: this directory.
  - step: Update SERVICE_BLUEPRINT.md
    status: DONE
    evidence: verification SHA updated to 5d0d7d0; guard:no-legacy-slice-labels self-reference annotated with the existing ignore marker (see file_decision_matrix.md).
  - step: Docker/hosting/runtime matrix
    status: DONE
    evidence: docker_hosting_runtime_matrix.md.
  - step: Final verdict
    status: FIX_REQUIRED (not PASS)
    evidence: zero_defect_closure_matrix.md.
```
