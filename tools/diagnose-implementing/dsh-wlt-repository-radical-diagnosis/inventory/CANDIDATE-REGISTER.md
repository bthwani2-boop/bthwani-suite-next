# سجل المرشحين والقرارات

| ID | العنصر | القرار المخطط | الثقة | شرط القرار |
|---|---|---|---|---|
| C-001 | Journey subsystem كامل | REMOVE_AS_ONE_ATOMIC_SUBSYSTEM | عالية | harvest + zero references + CI replacement |
| C-002 | سلطات الرحلات/الخطط المتوازية | MERGE_UNIQUE_MEANING_THEN_REMOVE | عالية | semantic harvest + owner acceptance |
| C-003 | `.wlt-mutation-approved` | REPLACE_ALLOWLIST_THEN_DELETE | عالية | operation-level negative tests |
| C-004 | TS7/TS6/.pnpmfile split | REDESIGN_TOOLCHAIN_BOUNDARY | عالية | Next/mobile/contracts green |
| C-005 | Workforce bootstrap 500 | FIX_SOURCE_ERROR | عالية للفشل، منخفضة للسبب | service logs + fresh reproduction |
| C-006 | Gitleaks historical findings | TRIAGE_ROTATE_SEPARATE_SCANS | عالية | security disposition بلا كشف قيم |
| C-007 | `next.config.mjs` + `.ts` | CONVERGE_TO_ONE | عالية | prove loaded config + merge settings |
| C-008 | operational policy compat | RETIRE_AFTER_MIGRATION | عالية | consumers + telemetry zero window |
| C-009 | legacy contract routes/tombstones | RETIRE_OR_CENTRALIZE | عالية | external compatibility decision |
| C-010 | unified handler aliases | MOVE_LOGIC_DELETE_FORWARDERS | عالية | route bindings/tests |
| C-011 | postinstall client generation | REPLACE_EXPLICIT_NX_TARGET | عالية | fresh install/build proof |
| C-012 | TS upgrade scripts | EXTRACT_ASSERTIONS_THEN_DELETE | عالية | branch-neutral readiness test |
| C-013 | `refactor-wlt-dsh.mjs` | DELETE_AFTER_ZERO_REFERENCE | عالية | final grep/registry |
| C-014 | Foundation snapshot/bundle workflows | REMOVE_OR_MANUALIZE | عالية | workflow registry update |
| C-015 | `gate-build-test.ps1` stale caller | REWRITE | عالية | supported scoped command/all modules |
| C-016 | duplicate DSH/WLT HTTP helpers | CENTRALIZE_OR_GENERATE | عالية | sovereign ownership/no reverse dep |
| C-017 | Knip findings/ignores | VALIDATE_THEN_REMOVE_OR_CONFIGURE | متوسطة | dynamic usage tests |
| C-018 | source-text contract tests | REPLACE_BEHAVIORAL_TESTS | عالية | invariant coverage retained |
| C-019 | populated `.gitkeep` | DELETE_BATCHED_BY_DOMAIN | عالية | tracked siblings proof |
| C-020 | duplicated mobile configs/assets | GENERATE_OR_KEEP_JUSTIFIED | متوسطة | Expo/EAS proof |
| C-021 | giant prompt under `tools/` | MOVE_TO_AUTHORITY_OR_DELETE | عالية | zero references/authority decision |
| C-022 | Sonar workflow | DELETE_IF_UNUSED_OR_SCHEDULE | منخفضة | verify vars/service |
| C-023 | compatibility entrypoint 16 | DELETE_AFTER_REFERENCE_MIGRATION | عالية | unique meaning already harvested |
| C-024 | stale FOUNDATION reports/SHAs | EXTRACT_OPEN_FACTS_THEN_DELETE | عالية | no live authority links |

## تصنيفات الجرد

`ACTIVE_AUTHORITY | ACTIVE_IMPLEMENTATION | DERIVED | DUPLICATE | COMPATIBILITY | ONE_OFF_MIGRATION | HISTORICAL | ORPHAN | EMPTY_NOISE | PROTECTED_MIGRATION | PROTECTED_TEST | UNPROVEN`

## حقول أي سجل تنفيذ مشتق

`path, classification, references, runtime_entrypoints, data_or_contract_ownership, replacement, migration, deletion_risk, verification, rollback, decision, evidence_sha, status`.
