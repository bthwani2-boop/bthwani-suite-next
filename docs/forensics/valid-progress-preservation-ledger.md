# Valid Progress Preservation Ledger (PR #23 - PR #27)

| Source branch | File | Decision | Reason | Destination | Verification |
|---|---|---|---|---|---|
| `brach-validation` | `.agents/AUTOMATED_EXECUTION_POLICY.md` | `ARCHIVE_REFERENCE_ONLY` | Superseded by newer version in `fix/master-pr23-pr27-total-closure` | None | Local git log diff |
| `dependabot/npm_and_yarn/expo/vector-icons-15.1.1` | `.github/workflows/codeql.yml` | `REJECT_DIRTY` | Rejected contaminated deletion of CodeQL file | `.github/workflows/codeql.yml` | CodeQL Actions runs |
| `dependabot/npm_and_yarn/expo/vector-icons-15.1.1` | `infra/docker/scripts/runtime.ps1` | `KEEP_NOW_IF_MINIMAL_AND_VERIFIED` | Extracted Postgres readiness and migration sequencing fixes | `infra/docker/scripts/runtime.ps1` | Docker runtime smoke test |
| `dependabot/npm_and_yarn/expo/vector-icons-15.1.1` | `services/dsh/backend/internal/partner/repository.go` | `KEEP_NOW_IF_TESTED` | Extracted partner field visit status and timestamp persistence fix | `services/dsh/backend/internal/partner/repository.go` | DSH Go backend tests |
| `dependabot/npm_and_yarn/expo/vector-icons-15.1.1` | `apps/app-field/runtime/package.json` | `REJECT_DIRTY` | Rejected contaminated dependency bump | None | None |
| `dependabot/npm_and_yarn/expo/vector-icons-15.1.1` | `shared/ui-kit/package.json` | `REJECT_DIRTY` | Rejected contaminated dependency bump | None | None |
| `dependabot/npm_and_yarn/expo/vector-icons-15.1.1` | `pnpm-lock.yaml` | `REJECT_DIRTY` | Rejected contaminated lockfile updates | None | None |
| `dependabot/npm_and_yarn/expo/vector-icons-15.1.1` | `tools/registry/runs/**` | `REJECT_DIRTY` | Rejected committing execution logs/evidence to repo | None | None |
| `fix/master-pr23-pr27-total-closure` | `.agents/AUTOMATED_EXECUTION_POLICY.md` | `KEEP_NOW_WITH_EDITS` | Core automated execution governance policy | `.agents/AUTOMATED_EXECUTION_POLICY.md` | `guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `.agents/AUTHORITY_BOUNDARY.md` | `KEEP_NOW` | Add rule requiring automation-backed evidence for closure claims | `.agents/AUTHORITY_BOUNDARY.md` | `guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `.agents/EVIDENCE_GATE_ROUTER.md` | `KEEP_NOW` | Add rules for sizing and automated verification constraints | `.agents/EVIDENCE_GATE_ROUTER.md` | `guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `.agents/INDEX.md` | `KEEP_NOW` | Reference Automated Execution Policy and proportional checks | `.agents/INDEX.md` | `guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `.agents/README.md` | `KEEP_NOW` | Update mandatory read order to include the execution policy | `.agents/README.md` | `guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `AGENTS.md` | `KEEP_NOW` | Add execution policy guidelines and incorrect governance rules | `AGENTS.md` | `guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `governance/LEAN_CODE_BASED_CHECK.md` | `KEEP_NOW` | Add Lean Automation over Manual rules | `governance/LEAN_CODE_BASED_CHECK.md` | `guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `package.json` | `KEEP_NOW_MINIMAL` | Add npm script for automated execution policy guard | `package.json` | `pnpm run guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `tools/guards/guard-automated-execution-policy.mjs` | `KEEP_NOW_WITH_EDITS` | লিংক-ইন্টিগ্রিটি ভ্যালিডেশন এবং পলিসি কমপ্লায়েন্স নিশ্চিতকরণ | `tools/guards/guard-automated-execution-policy.mjs` | `pnpm run guard:automated-execution-policy` |
| `fix/master-pr23-pr27-total-closure` | `tools/scripts/Invoke-BthwaniPr23Pr27TotalClosure.ps1` | `KEEP_NOW_WITH_EDITS` | Fail-closed auditor/verifier script (edits for salvage flow) | `tools/scripts/Invoke-BthwaniPr23Pr27TotalClosure.ps1` | Run script |
| `fix/master-pr23-pr27-total-closure` | UI files: `services/dsh/frontend/**`, `services/wlt/frontend/**`, `shared/ui-kit/**`, `apps/**` | `KEEP_LATER_PR` | Defer formatting and styling changes to prevent UI risk in salvage PR | None | List in `dsh-ui-token-cleanup-candidate.md` |
| `fix/master-pr23-pr27-total-closure` | UI helper scripts: `tools/scripts/fix-missing-color-roles.mjs`, `fix-raw-hex.mjs`, `fix-use-client.mjs`, `run-slice-gate.ps1` | `KEEP_LATER_PR` | Defer UI refactoring scripts | None | List in `dsh-ui-token-cleanup-candidate.md` |
