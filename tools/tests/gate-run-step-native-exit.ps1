$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "..\scripts\gate-run-step.ps1")

$EvidenceRoot = Join-Path $env:TEMP ("bthwani-gate-run-step-" + [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
$LogPath = Join-Path $EvidenceRoot "commands.log"
Set-Content -LiteralPath $LogPath -Value "" -Encoding UTF8

try {
  $success = Invoke-GateStep "native-success" { node -e "process.exit(0)" } $EvidenceRoot $LogPath
  $failure = Invoke-GateStep "native-failure" { node -e "process.exit(7)" } $EvidenceRoot $LogPath

  if (-not $success) {
    throw "Expected zero native exit code to pass."
  }

  if ($failure) {
    throw "Expected non-zero native exit code to fail."
  }

  $log = Get-Content -LiteralPath $LogPath -Raw
  if ($log -notmatch "PASS: native-success" -or $log -notmatch "FAIL: native-failure") {
    throw "Gate log did not record native success/failure correctly."
  }

  Write-Host "gate-run-step-native-exit: PASS"
} finally {
  $ResolvedEvidenceRoot = [System.IO.Path]::GetFullPath($EvidenceRoot)
  $ResolvedTempRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd("\") + "\"

  if (-not $ResolvedEvidenceRoot.StartsWith($ResolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove test evidence outside the system temp directory."
  }

  Remove-Item -LiteralPath $ResolvedEvidenceRoot -Recurse -Force
}
