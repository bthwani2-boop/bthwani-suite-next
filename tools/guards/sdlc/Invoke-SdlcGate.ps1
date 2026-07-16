param(
  [string]$Capability,
  [string]$Stage,
  [string]$Artifact,
  [string]$Impact,
  [switch]$Affected
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location -LiteralPath $Root

$commonArgs = @()
if ($Capability) { $commonArgs += "--capability=$Capability" }
if ($Stage) { $commonArgs += "--stage=$Stage" }
if ($Artifact) { $commonArgs += "--artifact=$Artifact" }
if ($Impact) { $commonArgs += "--impact=$Impact" }
if ($Affected) { $commonArgs += "--affected" }

$validators = @(
  "validate-sdlc-manifest.mjs",
  "validate-stage-transition.mjs",
  "validate-role-separation.mjs",
  "validate-traceability.mjs",
  "validate-quality-profile.mjs",
  "validate-security-profile.mjs",
  "validate-sdlc-artifact-inputs.mjs"
)

foreach ($validator in $validators) {
  node (Join-Path "tools/guards/sdlc" $validator) @commonArgs
}

Write-Host "sdlc-gate: PASS"
