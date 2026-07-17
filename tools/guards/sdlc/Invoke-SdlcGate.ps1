param(
  [string]$Capability,
  [string]$Stage,
  [string]$Artifact,
  [string]$Impact,
  [switch]$Affected
)

$ErrorActionPreference = "Continue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location -LiteralPath $Root

$commonArgs = @()
if ($Capability) { $commonArgs += "--capability=$Capability" }
if ($Stage) { $commonArgs += "--stage=$Stage" }
if ($Artifact) { $commonArgs += "--artifact=$Artifact" }
if ($Impact) { $commonArgs += "--impact=$Impact" }
if ($Affected) { $commonArgs += "--affected" }

$validators = @(
  @{ Name = "governance-schema-and-semantics"; Path = "tools/guards/governance-schema-gate.mjs"; Args = @() },
  @{ Name = "agent-governance"; Path = "tools/guards/agent-governance-gate.mjs"; Args = @() },
  @{ Name = "guard-and-workflow-policy"; Path = "tools/guards/guard-registry-gate.mjs"; Args = @() },
  @{ Name = "sdlc-manifest"; Path = "tools/guards/sdlc/validate-sdlc-manifest.mjs"; Args = $commonArgs },
  @{ Name = "stage-transition"; Path = "tools/guards/sdlc/validate-stage-transition.mjs"; Args = $commonArgs },
  @{ Name = "role-separation"; Path = "tools/guards/sdlc/validate-role-separation.mjs"; Args = $commonArgs },
  @{ Name = "product-truth-linkage"; Path = "tools/guards/sdlc/validate-product-truth.mjs"; Args = $commonArgs },
  @{ Name = "traceability"; Path = "tools/guards/sdlc/validate-traceability.mjs"; Args = $commonArgs },
  @{ Name = "quality-profile"; Path = "tools/guards/sdlc/validate-quality-profile.mjs"; Args = $commonArgs },
  @{ Name = "security-profile"; Path = "tools/guards/sdlc/validate-security-profile.mjs"; Args = $commonArgs },
  @{ Name = "artifact-inputs"; Path = "tools/guards/sdlc/validate-sdlc-artifact-inputs.mjs"; Args = $commonArgs }
)

$results = @()
foreach ($validator in $validators) {
  Write-Host "[ RUN ] $($validator.Name)" -ForegroundColor Cyan
  & node $validator.Path @($validator.Args)
  $code = if ($null -eq $LASTEXITCODE) { 1 } else { $LASTEXITCODE }
  $ok = $code -eq 0
  $results += [pscustomobject]@{
    name = $validator.Name
    ok = $ok
    exitCode = $code
  }
  if ($ok) {
    Write-Host "[ OK  ] $($validator.Name)" -ForegroundColor Green
  } else {
    Write-Host "[ FAIL] $($validator.Name) (exit $code)" -ForegroundColor Red
  }
}

$failed = @($results | Where-Object { -not $_.ok })
Write-Host ""
if ($failed.Count -eq 0) {
  Write-Host "sdlc-gate: PASS" -ForegroundColor Green
  exit 0
}

Write-Host "sdlc-gate: FIX_REQUIRED" -ForegroundColor Red
Write-Host "failed_validators: $($failed.name -join ', ')" -ForegroundColor Red
exit 1
