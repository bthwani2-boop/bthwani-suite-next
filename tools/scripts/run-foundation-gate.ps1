Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Continue"
$SessionId = "FOUNDATION-GATE-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$EvidenceRoot = Join-Path "tools\registry\runs" $SessionId
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null

function Run-Step {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Command,
    [Parameter(Mandatory=$true)][string]$OutputFile
  )

  $Path = Join-Path $EvidenceRoot $OutputFile
  "COMMAND: $Command" | Set-Content -LiteralPath $Path -Encoding UTF8
  "" | Add-Content -LiteralPath $Path
  pwsh -NoProfile -Command $Command 2>&1 | Tee-Object -FilePath $Path -Append
  return $LASTEXITCODE
}

$Results = @()

$Results += [pscustomobject]@{
  name = "git-status"
  code = Run-Step -Name "git-status" -Command "git --no-pager status --short" -OutputFile "git-status.txt"
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

$Failed = @($Results | Where-Object { $_.code -ne 0 })

$Status = if ($Failed.Count -eq 0) { "PASS" } else { "FAIL" }

@"
status: $Status
session_id: $SessionId
repo: C:\bthwani-suite-next
evidence_root: $EvidenceRoot
handoff_zip: $EvidenceRoot\_HANDOFF.zip
failed_checks: $($Failed.name -join ", ")
"@ | Set-Content -LiteralPath (Join-Path $EvidenceRoot "summary.txt") -Encoding UTF8

$Results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $EvidenceRoot "evidence.json") -Encoding UTF8

Compress-Archive -Path (Join-Path $EvidenceRoot "*") -DestinationPath (Join-Path $EvidenceRoot "_HANDOFF.zip") -Force

Write-Host ""
Write-Host "RESULT: $Status"
Write-Host "SESSION: $SessionId"
Write-Host "EVIDENCE: $EvidenceRoot"
Write-Host "HANDOFF: $EvidenceRoot\_HANDOFF.zip"
Write-Host ""

if ($Failed.Count -gt 0) {
  exit 1
}

exit 0
