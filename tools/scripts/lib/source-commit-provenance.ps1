Set-StrictMode -Version Latest

function Resolve-BthwaniCheckedOutSourceCommitSha {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [AllowEmptyString()]
    [string]$ExpectedSourceCommitSha = ""
  )

  $resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
  $output = @(& git -C $resolvedRoot rev-parse --verify HEAD 2>&1)
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    $detail = (($output | ForEach-Object { "$_" }) -join " ").Trim()
    throw "Unable to resolve checked-out source commit SHA from '$resolvedRoot' (exit $exitCode): $detail"
  }

  $actual = (($output | Select-Object -Last 1) -join "").Trim().ToLowerInvariant()
  if ($actual -notmatch '^[0-9a-f]{40}$') {
    throw "Checked-out source commit SHA must be an exact 40-character commit SHA, got '$actual'."
  }

  if (-not [string]::IsNullOrWhiteSpace($ExpectedSourceCommitSha)) {
    $expected = $ExpectedSourceCommitSha.Trim().ToLowerInvariant()
    if ($expected -notmatch '^[0-9a-f]{40}$') {
      throw "Expected source commit SHA must be an exact 40-character commit SHA, got '$ExpectedSourceCommitSha'."
    }
    if ($expected -ne $actual) {
      throw "SOURCE_COMMIT_PROVENANCE_MISMATCH: expected=$expected checked_out=$actual"
    }
  }

  return $actual
}
