#!/usr/bin/env pwsh
# generate-local-production-env.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Generates infra/docker/env/runtime.local-production.env with cryptographically
# random secrets. Run once per environment; re-run to rotate all secrets.
# Output file is gitignored — never commit it.
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

function New-Secret([int]$Bytes = 32) {
  $buf = [byte[]]::new($Bytes)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buf)
  return [System.BitConverter]::ToString($buf) -replace "-", "" | ForEach-Object { $_.ToLower() }
}

$OutFile = "infra\docker\env\runtime.local-production.env"

if (Test-Path -LiteralPath $OutFile) {
  Write-Warning "$OutFile already exists. Delete it first to regenerate."
  exit 1
}

$pgPassword          = New-Secret 24
$dshDbPassword       = New-Secret 24
$wltDbPassword       = New-Secret 24
$identityDbPassword  = New-Secret 24
$workforceDbPassword = New-Secret 24
$minioPassword       = New-Secret 24
$wltDshToken         = New-Secret 32
$dshWltToken         = New-Secret 32
$hmacSecret          = New-Secret 32
$workforceToken      = New-Secret 32

$template = Get-Content "infra\docker\env\runtime.local-production.env.example" -Raw

$content = $template `
  -replace "REPLACE_WITH_GENERATED_PG_PASSWORD",              $pgPassword `
  -replace "REPLACE_WITH_GENERATED_DSH_DB_PASSWORD",          $dshDbPassword `
  -replace "REPLACE_WITH_GENERATED_WLT_DB_PASSWORD",          $wltDbPassword `
  -replace "REPLACE_WITH_GENERATED_IDENTITY_DB_PASSWORD",     $identityDbPassword `
  -replace "REPLACE_WITH_GENERATED_WORKFORCE_DB_PASSWORD",    $workforceDbPassword `
  -replace "REPLACE_WITH_GENERATED_MINIO_PASSWORD",           $minioPassword `
  -replace "REPLACE_WITH_GENERATED_WLT_DSH_SERVICE_TOKEN",    $wltDshToken `
  -replace "REPLACE_WITH_GENERATED_DSH_WLT_SERVICE_TOKEN",    $dshWltToken `
  -replace "REPLACE_WITH_GENERATED_HMAC_SECRET_32BYTES",      $hmacSecret `
  -replace "REPLACE_WITH_GENERATED_WORKFORCE_SERVICE_TOKEN",  $workforceToken

$content | Set-Content -LiteralPath $OutFile -Encoding UTF8 -NoNewline
Write-Host "Generated: $OutFile"
Write-Host "IMPORTANT: This file is local only — do not commit it."
