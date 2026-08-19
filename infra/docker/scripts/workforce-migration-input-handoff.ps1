Set-StrictMode -Version Latest

function Resolve-BthwaniWorkforceMigrationInputHandoff {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]+$')][string]$ServiceName,
    [Parameter(Mandatory = $true)][string]$Sql
  )

  if ($ServiceName -ne 'workforce') {
    return $Sql
  }

  $migrationMarker = '-- BEGIN GOVERNED MIGRATION: workforce-020_operator_context_scope_boundary.sql'
  if (-not $Sql.Contains($migrationMarker)) {
    return $Sql
  }

  $handoffMarker = '-- BTHWANI WORKFORCE IDENTITY INPUT HANDOFF'
  if ($Sql.Contains($handoffMarker)) {
    return $Sql
  }

  # The Identity import authority stages its snapshot outside public so the
  # governed preflight cannot classify migration input as untracked Workforce
  # schema. Historical Workforce-020 consumes unqualified relation names. Move
  # exactly the two reserved staging relations at the governed migration marker,
  # which is inside the runner-managed transaction. Failure rolls the move back;
  # success lets Workforce-020 consume and drop the promoted relations itself.
  $handoff = @'
-- BTHWANI WORKFORCE IDENTITY INPUT HANDOFF
ALTER TABLE bthwani_migration_input.workforce_identity_operator_context_import SET SCHEMA public;
ALTER TABLE bthwani_migration_input.workforce_identity_operator_context_import_proof SET SCHEMA public;
'@

  return $Sql.Replace($migrationMarker, "$handoff`n$migrationMarker")
}
