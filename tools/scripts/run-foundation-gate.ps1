Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Continue"
$SessionId = "FOUNDATION-GATE-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$EvidenceRoot = Join-Path "tools\registry\runs" $SessionId
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null

function Write-EvidenceText {
  param(
    [Parameter(Mandatory=$true)][string]$FileName,
    [Parameter(Mandatory=$true)][string[]]$Lines
  )
  $Lines | Set-Content -LiteralPath (Join-Path $EvidenceRoot $FileName) -Encoding UTF8
}

function Run-Step {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Command,
    [Parameter(Mandatory=$true)][string]$OutputFile
  )

  $Path = Join-Path $EvidenceRoot $OutputFile
  "COMMAND: $Command" | Set-Content -LiteralPath $Path -Encoding UTF8
  "" | Add-Content -LiteralPath $Path

  pwsh -NoProfile -Command $Command 2>&1 |
    Tee-Object -FilePath $Path -Append |
    Out-Null

  return $LASTEXITCODE
}

$NodeVersion = (node -v 2>&1).Trim()
$PnpmVersion = (pnpm -v 2>&1).Trim()

Write-EvidenceText "toolchain.txt" @(
  "node=$NodeVersion",
  "pnpm=$PnpmVersion",
  "expected_node=v24.17.0",
  "expected_pnpm=11.7.0"
)

$Results = @()

$Results += [pscustomobject]@{
  name = "node-version"
  code = if ($NodeVersion -eq "v24.17.0") { 0 } else { 1 }
}

$Results += [pscustomobject]@{
  name = "pnpm-version"
  code = if ($PnpmVersion -eq "11.7.0") { 0 } else { 1 }
}

$Results += [pscustomobject]@{
  name = "git-status-clean-before"
  code = Run-Step -Name "git-status-clean-before" -Command "if ((git --no-pager status --short).Count -eq 0) { exit 0 } else { git --no-pager status --short; exit 1 }" -OutputFile "git-status-before.txt"
}

$Results += [pscustomobject]@{
  name = "git-diff-check"
  code = Run-Step -Name "git-diff-check" -Command "git --no-pager diff --check" -OutputFile "git-diff-check.txt"
}

$Results += [pscustomobject]@{
  name = "pnpm-install"
  code = Run-Step -Name "pnpm-install" -Command "pnpm install" -OutputFile "pnpm-install.txt"
}

$Results += [pscustomobject]@{
  name = "pnpm-typecheck"
  code = Run-Step -Name "pnpm-typecheck" -Command "pnpm typecheck" -OutputFile "pnpm-typecheck.txt"
}

$Results += [pscustomobject]@{
  name = "git-status-clean-after"
  code = Run-Step -Name "git-status-clean-after" -Command "if ((git --no-pager status --short --untracked-files=no).Count -eq 0) { exit 0 } else { git --no-pager status --short --untracked-files=no; exit 1 }" -OutputFile "git-status-after-tracked.txt"
}

$Failed = @($Results | Where-Object { $_.code -ne 0 })
$Status = if ($Failed.Count -eq 0) { "PASS" } else { "FAIL" }

@"
status: $Status
session_id: $SessionId
repo: C:\bthwani-suite-next
evidence_root: $EvidenceRoot
handoff_zip: $EvidenceRoot\_HANDOFF.zip
node: $NodeVersion
pnpm: $PnpmVersion
failed_checks: $($Failed.name -join ", ")
"@ | Set-Content -LiteralPath (Join-Path $EvidenceRoot "summary.txt") -Encoding UTF8

$Results | ConvertTo-Json -Depth 5 |
  Set-Content -LiteralPath (Join-Path $EvidenceRoot "evidence.json") -Encoding UTF8

Compress-Archive -Path (Join-Path $EvidenceRoot "*") -DestinationPath (Join-Path $EvidenceRoot "_HANDOFF.zip") -Force

Write-Host ""
Write-Host "RESULT: $Status"
Write-Host "SESSION: $SessionId"
Write-Host "EVIDENCE: $EvidenceRoot"
Write-Host "HANDOFF: $EvidenceRoot\_HANDOFF.zip"
Write-Host ""

if ($Failed.Count -gt 0) { exit 1 }
exit 0
