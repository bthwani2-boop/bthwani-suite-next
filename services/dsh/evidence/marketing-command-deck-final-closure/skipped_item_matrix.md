# skipped_item_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

Nothing in scope was silently skipped. Items not fully closed are tracked as FIX_REQUIRED /
BLOCKED_NEEDS_EVIDENCE in zero_defect_closure_matrix.md, each with owner + verification command.
The only true "skip" in this pass is environmental, not scope-related:

```yaml
skipped_item_matrix:
  - item: graphify:code check
    reason: "graphify command not found in this environment (guard printed: 'WARNING: graphify
      command not found. Skipping graphify:code check.')"
    evidence: pwsh -NoProfile -File tools/scripts/run-journey-gate.ps1 output, step graphify-code
    verification_command: (Get-Command graphify -ErrorAction SilentlyContinue)
    impact_if_skipped: CLAUDE.md instructs using Graphify first for repo understanding before
      relying on manual file/grep evidence; this pass used manual file reads and rg/grep/go/pwsh
      evidence instead, cross-checked by re-running live commands rather than trusting static
      claims. No claim in this evidence set depends on graphify output.
    decision: BLOCKED_NEEDS_EVIDENCE — install/configure graphify in this environment is outside
      this pass's authority (tooling install, not a code change to services/dsh).
  - item: full pnpm-based verification suite (contracts:lint, typecheck, build, test, most guard:*
      wrappers, slice:gate)
    reason: repo package.json pins "engines.node": ">=24.17.0 <25"; environment has Node v22.18.0;
      no nvm/volta present to switch versions.
    evidence: verification-output.md (ERR_PNPM_UNSUPPORTED_ENGINE on every pnpm invocation)
    verification_command: node -v; corepack pnpm -v; pnpm run typecheck
    impact_if_skipped: could not directly confirm TypeScript typecheck/build/test for the frontend
      edits made in this pass (marketing-registry.ts, MarketingDashboardScreen.tsx, capability-map.ts,
      runtime-map.ts, index.ts). Mitigated by: (a) these edits are additive/comment-only or narrow,
      type-consistent field additions matching existing patterns used elsewhere in the same files;
      (b) the underlying go-level guards, DB integration tests, and live HTTP smoke all ran and
      passed directly, bypassing pnpm; (c) documented here rather than silently claimed as PASS.
    decision: BLOCKED_NEEDS_EVIDENCE — installing/switching Node to >=24.17.0 is a system-level
      change beyond this pass's scope; flagged for the user/environment owner rather than done
      unilaterally.
```
