[CmdletBinding()]
param(
  [string]$StoreId = "store-test-grocery"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
. (Join-Path $RepoRoot "tools/dev/local-workforce-actors.ps1")

foreach ($RequiredPath in @($ComposeFile, $EnvFile)) {
  if (-not (Test-Path -LiteralPath $RequiredPath -PathType Leaf)) {
    throw "governed runtime authority is missing: $RequiredPath"
  }
}

$CaptainProvider = Get-ProvisionedWorkforceActor -Kind "captain"
$CaptainId = ([string]$CaptainProvider.actorId).Trim()
if ([string]::IsNullOrWhiteSpace($CaptainId)) {
  throw "provisioned runtime captain has no actor id"
}

$SafeCaptainId = $CaptainId.Replace("'", "''")
$SafeStoreId = $StoreId.Replace("'", "''")
$FixtureActor = "runtime-multisurface-fixture"

# This establishes only DSH-owned operational readiness for the seeded runtime
# captain. Financial eligibility is deliberately NOT written here: assignment
# creation must refresh and verify the short-lived decision from WLT itself.
$Statement = @"
INSERT INTO dsh_captain_dispatch_profiles (
  operator_context_id,
  captain_id,
  accreditation_status,
  availability_status,
  max_active_assignments,
  priority_score,
  updated_by,
  updated_at
)
SELECT
  s.operator_context_id,
  '$SafeCaptainId',
  'approved',
  'available',
  1,
  100,
  '$FixtureActor',
  NOW()
FROM dsh_stores s
WHERE s.id = '$SafeStoreId'
ON CONFLICT (operator_context_id, captain_id) DO UPDATE SET
  accreditation_status = EXCLUDED.accreditation_status,
  availability_status = EXCLUDED.availability_status,
  max_active_assignments = EXCLUDED.max_active_assignments,
  priority_score = EXCLUDED.priority_score,
  updated_by = EXCLUDED.updated_by,
  version = dsh_captain_dispatch_profiles.version + 1,
  updated_at = NOW()
RETURNING operator_context_id || '|' || captain_id || '|' || accreditation_status || '|' || availability_status;
"@

$Output = docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
  psql -X -v ON_ERROR_STOP=1 -U dsh_runtime -d dsh_runtime -qAt -c $Statement
if ($LASTEXITCODE -ne 0) {
  throw "governed runtime captain dispatch fixture failed with exit code $LASTEXITCODE"
}

$Row = (($Output -join "`n").Trim())
if ([string]::IsNullOrWhiteSpace($Row)) {
  throw "governed runtime captain dispatch fixture did not resolve store OperatorContext"
}
$Parts = $Row.Split("|", [StringSplitOptions]::None)
if ($Parts.Count -ne 4 -or $Parts[1] -ne $CaptainId -or $Parts[2] -ne "approved" -or $Parts[3] -ne "available") {
  throw "governed runtime captain dispatch fixture readback is invalid: $Row"
}

Write-Host "DSH runtime captain dispatch fixture: PASS operatorContext=$($Parts[0]) captain=$CaptainId"
