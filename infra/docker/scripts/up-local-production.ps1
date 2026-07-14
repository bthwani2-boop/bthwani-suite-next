#!/usr/bin/env pwsh
# up-local-production.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Starts the local production-like stack using a securely generated env file.
# Run generate-local-production-env.ps1 first if the env file does not exist.
# Usage: .\infra\docker\scripts\up-local-production.ps1 [-Profiles dsh,media]
# ─────────────────────────────────────────────────────────────────────────────

param(
  [string]$Profiles = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

$ComposeFile  = "infra\docker\compose.runtime.yml"
$EnvFile      = "infra\docker\env\runtime.local-production.env"

# ── Guard: require real env file (not example) ────────────────────────────────
if (-not (Test-Path -LiteralPath $EnvFile)) {
  Write-Error @"
runtime.local-production.env not found.
Run first:
  .\infra\docker\scripts\generate-local-production-env.ps1
"@
  exit 1
}

# ── Guard: no placeholder secrets in the env file ─────────────────────────────
$Raw = Get-Content -LiteralPath $EnvFile -Raw
if ($Raw -match "REPLACE_WITH_GENERATED_") {
  Write-Error "runtime.local-production.env still contains REPLACE_WITH_GENERATED_ placeholders. Re-run generate-local-production-env.ps1."
  exit 1
}

# ── Docker daemon check ───────────────────────────────────────────────────────
docker info | Out-Null

# ── Build profile args ────────────────────────────────────────────────────────
$ProfileList = @()
if ($Profiles -ne "") {
  $ProfileList = $Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

$AllowedProfiles = @("media", "dsh")
foreach ($profile in $ProfileList) {
  if ($AllowedProfiles -notcontains $profile) {
    throw "Unsupported profile: $profile. Allowed: media, dsh"
  }
}

$ComposeArgs = @("--env-file", $EnvFile, "-f", $ComposeFile)
$ProfileArgs = @()
foreach ($profile in $ProfileList) { $ProfileArgs += @("--profile", $profile) }

Write-Host "[local-production] Starting stack: profiles=[$($ProfileList -join ',')]"
docker compose @ComposeArgs @ProfileArgs up -d --remove-orphans

Write-Host "[local-production] Running smoke..."
& "infra\docker\scripts\smoke-runtime.ps1" -Profiles ($ProfileList -join ",")

Write-Host "[local-production] Stack UP — PASS"
