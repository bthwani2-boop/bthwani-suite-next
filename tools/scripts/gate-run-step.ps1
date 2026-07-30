function Invoke-GateStep {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Command,
    [Parameter(Mandatory = $true)][string]$EvidenceRoot,
    [Parameter(Mandatory = $true)][string]$LogPath
  )

  $out = Join-Path $EvidenceRoot "$Name.txt"
  Add-Content -LiteralPath $LogPath -Value "RUN: $Name" -Encoding UTF8

  $previousExitCode = $global:LASTEXITCODE
  $global:LASTEXITCODE = 0

  try {
    & $Command *> $out
    $nativeExitCode = $global:LASTEXITCODE

    if ($nativeExitCode -ne 0) {
      throw "Native command exited with code $nativeExitCode."
    }

    Add-Content -LiteralPath $LogPath -Value "PASS: $Name" -Encoding UTF8
    return $true
  } catch {
    $_ | Out-String | Add-Content -LiteralPath $out -Encoding UTF8
    Add-Content -LiteralPath $LogPath -Value "FAIL: $Name" -Encoding UTF8
    return $false
  } finally {
    $global:LASTEXITCODE = $previousExitCode
  }
}
