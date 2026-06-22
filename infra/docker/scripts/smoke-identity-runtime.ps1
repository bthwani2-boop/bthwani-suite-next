$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\bthwani-suite-next"

pwsh -NoProfile -ExecutionPolicy Bypass -File .\infra\docker\scripts\runtime.ps1 -Action smoke -Profiles identity
if ($LASTEXITCODE -ne 0) {
  throw "Identity runtime smoke failed."
}
