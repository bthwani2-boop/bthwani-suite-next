<#
.SYNOPSIS
  Shared, dot-sourceable WLT migration-ledger legacy-backfill logic.

.DESCRIPTION
  Extracted out of runtime.ps1's Invoke-WltMigrate so that both the real
  runtime (docker-exec'd psql) and tools/scripts/test-wlt-migration-ledger.ps1
  (native psql) exercise the exact same probe map and backfill decision,
  instead of the test re-implementing logic that could silently drift from
  production. This file has no side effects when dot-sourced: it only defines
  data and pure-ish functions.
#>

# Per-migration "does this migration's schema already exist" probe, used only
# to decide which prefix of migrations may be safely ledger-backfilled for a
# legacy pre-ledger database (see Get-WltLegacyBackfillList). Every WLT
# migration file must have exactly one entry here; Invoke-WltMigrate refuses
# to run if a file is missing one. Each probe is a SQL boolean expression
# evaluated as `SELECT (<expr>)::text;` and must return 't' or 'f'.
#
# wlt-007 is deliberately probed as "false": it only re-asserts a column
# DEFAULT 'YER' and backfills stray SAR rows on tables that already declared
# DEFAULT 'YER' at CREATE TABLE time (wlt-002..wlt-006), so there is no
# schema state that distinguishes "wlt-007 ran" from "it didn't". Rather than
# guess, it is always left to genuinely (re-)run via the normal apply loop,
# which is safe because its SQL is idempotent.
$script:WltMigrationProbes = [ordered]@{
  "wlt-000_financial_references.sql"             = "to_regclass('public.wlt_field_commission_refs') IS NOT NULL"
  "wlt-001_payment_sessions.sql"                  = "to_regclass('public.wlt_payment_sessions') IS NOT NULL"
  "wlt-002_payment_capture.sql"                   = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payment_sessions' AND column_name = 'captured_at')"
  "wlt-003_refunds.sql"                           = "to_regclass('public.wlt_refunds') IS NOT NULL"
  "wlt-004_settlements.sql"                       = "to_regclass('public.wlt_settlements') IS NOT NULL"
  "wlt-005_cod.sql"                               = "to_regclass('public.wlt_cod_records') IS NOT NULL AND to_regclass('public.wlt_commissions') IS NOT NULL"
  "wlt-006_ledger.sql"                            = "to_regclass('public.wlt_ledger_entries') IS NOT NULL"
  "wlt-007_default_currency_yer.sql"              = "false"
  "wlt-008_payment_session_handoff_controls.sql"  = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payment_sessions' AND column_name = 'idempotency_key')"
  "wlt-009_dsh_notify_outbox.sql"                 = "to_regclass('public.wlt_dsh_outbox_events') IS NOT NULL"
  "wlt-010_payout_destinations.sql"               = "to_regclass('public.wlt_payout_destinations') IS NOT NULL"
  "wlt-011_field_finance.sql"                     = "to_regclass('public.wlt_payout_requests') IS NOT NULL"
  "wlt-012_payout_idempotency_hash.sql"           = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payout_requests' AND column_name = 'payload_hash')"
  "wlt-013_wallet_actor_unique_and_field_commission_effect.sql" = "EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wlt_wallets_actor_type_actor_id_key')"
  "wlt-014_refund_session_idempotency.sql"        = "to_regclass('public.wlt_refunds_active_session_idx') IS NOT NULL"
  "wlt-015_provider_result_unknown_and_reconciliation.sql" = "to_regclass('public.wlt_reconciliation_cases') IS NOT NULL"
  "wlt-017_ledger_kernel.sql"                     = "to_regclass('public.wlt_ledger_accounts') IS NOT NULL"
  "wlt-018_payout_destination_encryption.sql"     = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payout_destinations' AND column_name = 'account_number_encrypted')"
  "wlt-019_payout_operator_audit.sql"             = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payout_requests' AND column_name = 'approved_by_operator_id')"
  "wlt-020_payment_pending_states.sql"            = "EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wlt_payment_sessions_status_chk' AND pg_get_constraintdef(oid) LIKE '%authorization_pending%')"
  "wlt-021_reconciliation_resolution.sql"         = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_reconciliation_cases' AND column_name = 'assigned_to_operator_id')"
  "wlt-022_commission_lifecycle.sql"              = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_commissions' AND column_name = 'updated_at')"
  "wlt-023_special_request_payment_sessions.sql"  = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payment_sessions' AND column_name = 'special_request_id')"
  "wlt-024_payment_session_tenancy.sql"           = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payment_sessions' AND column_name = 'tenant_id') AND to_regclass('public.wlt_payment_sessions_tenant_checkout_intent_idx') IS NOT NULL"
  "wlt-025_ledger_integrity.sql"                  = "to_regclass('public.wlt_ledger_transactions_source_uq') IS NOT NULL"
  "wlt-026_cash_in_transit_account.sql"           = "EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wlt_ledger_accounts_type_chk' AND pg_get_constraintdef(oid) LIKE '%cash_in_transit%')"
  "wlt-027_payout_provider_proof.sql"             = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payout_requests' AND column_name = 'provider_reference') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payout_requests' AND column_name = 'provider_status')"
  "wlt-028_commercial_benefits.sql"               = "to_regclass('public.wlt_commercial_products') IS NOT NULL AND to_regclass('public.wlt_loyalty_accounts') IS NOT NULL AND to_regclass('public.wlt_client_subscriptions') IS NOT NULL"
  "wlt-029_payment_session_tenant_lock.sql"       = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payment_sessions' AND column_name = 'tenant_id' AND is_nullable = 'NO') AND to_regclass('public.wlt_payment_sessions_tenant_checkout_uq') IS NOT NULL"
  "wlt-030_subscription_payment_source.sql"       = "EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payment_sessions' AND column_name = 'subscription_purchase_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_payment_sessions' AND column_name = 'commercial_product_reference') AND to_regclass('public.uq_wlt_client_subscription_purchase') IS NOT NULL"
  "wlt-031_governed_settlement_sources.sql"       = "to_regclass('public.wlt_settlement_policies') IS NOT NULL AND to_regclass('public.wlt_settlement_source_orders') IS NOT NULL"
}

function Test-WltMigrationProbeCoverage {
  param([System.IO.FileInfo[]]$MigrationFiles)

  $numbers = @{}
  $fileNames = @{}
  foreach ($f in $MigrationFiles) {
    $fileNames[$f.Name] = $true
    if ($f.Name -notmatch '^wlt-(\d{3})_[a-z0-9_]+\.sql$') {
      throw "Invalid WLT migration filename: $($f.Name). Expected wlt-NNN_snake_case.sql."
    }
    $number = $Matches[1]
    if ($numbers.ContainsKey($number)) {
      throw "Duplicate WLT migration number $number: $($numbers[$number]) and $($f.Name)."
    }
    $numbers[$number] = $f.Name

    if (-not $script:WltMigrationProbes.Contains($f.Name)) {
      throw "No legacy-detection probe registered for $($f.Name) in `$script:WltMigrationProbes (infra/docker/scripts/wlt-migration-probes.ps1). Add one before merging a new WLT migration."
    }
  }

  foreach ($registeredName in $script:WltMigrationProbes.Keys) {
    if (-not $fileNames.ContainsKey($registeredName)) {
      throw "Stale WLT migration probe registered for missing file $registeredName."
    }
  }
}

# Returns the ordered prefix of $MigrationFiles whose schema objects already
# exist (per $script:WltMigrationProbes), stopping at the first migration
# whose probe is false. Migrations apply in file order, so a gap means every
# later migration must be genuinely (re-)applied rather than assumed present.
# $PsqlRunner is a [scriptblock] taking a single SQL string and returning its
# scalar text result, so this stays testable against either a docker-exec'd
# psql (production) or a native psql connection (tests).
function Get-WltLegacyBackfillList {
  param(
    [System.IO.FileInfo[]]$MigrationFiles,
    [scriptblock]$PsqlRunner
  )
  $backfillList = @()
  foreach ($f in $MigrationFiles) {
    $probe = $script:WltMigrationProbes[$f.Name]
    $probeResult = & $PsqlRunner "SELECT ($probe)::text;"
    if ($probeResult -ne "t") {
      break
    }
    $backfillList += $f
  }
  return $backfillList
}
