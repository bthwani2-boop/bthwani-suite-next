# Canonical PowerShell accessor for Workforce-provisioned local actors.
#
# Field agents and captains are never password-bootstrap actors. Workforce
# creates their Identity records with generated ids/usernames, writes those
# bindings to .artifacts/local-dev/workforce-actors.json, and issues a fresh
# activation code whenever a runtime proof needs a session.

$script:LocalWorkforceActorRegistryPath = Join-Path $PSScriptRoot "../../.artifacts/local-dev/workforce-actors.json"

function Get-ProvisionedWorkforceActor {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("field", "captain")]
    [string]$Kind,

    [string]$RegistryPath = $script:LocalWorkforceActorRegistryPath
  )

  if (-not (Test-Path -LiteralPath $RegistryPath -PathType Leaf)) {
    throw "Provisioned Workforce actor registry not found at $RegistryPath. Run the governed runtime bootstrap first."
  }

  $registry = Get-Content -LiteralPath $RegistryPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $providerProperty = $registry.actors.PSObject.Properties[$Kind]
  if ($null -eq $providerProperty) {
    throw "Provisioned Workforce actor registry has no '$Kind' entry."
  }

  $provider = $providerProperty.Value
  foreach ($required in @("actorId", "phoneE164", "workforceCode")) {
    if ([string]::IsNullOrWhiteSpace([string]$provider.$required)) {
      throw "Provisioned Workforce '$Kind' entry is missing '$required'."
    }
  }
  return $provider
}

function Get-ProvisionedWorkforceActorToken {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("field", "captain")]
    [string]$Kind,

    [Parameter(Mandatory = $true)]
    [string]$OperatorToken,

    [string]$WorkforceBaseUrl = "http://localhost:58086",
    [string]$IdentityBaseUrl = "http://localhost:58082",
    [string]$DshBaseUrl = "http://localhost:58080",
    [string]$OperatorContextId = "local-dsh",
    [string]$DeviceFingerprint = "local-workforce-runtime",
    [string]$RegistryPath = $script:LocalWorkforceActorRegistryPath
  )

  if ([string]::IsNullOrWhiteSpace($OperatorToken)) {
    throw "OperatorToken is required to issue a governed Workforce activation code."
  }

  $provider = Get-ProvisionedWorkforceActor -Kind $Kind -RegistryPath $RegistryPath
  $endpoint = if ($Kind -eq "field") { "field-agents" } else { "captains" }
  $encodedActorId = [Uri]::EscapeDataString([string]$provider.actorId)
  $operatorHeaders = @{ Authorization = "Bearer $OperatorToken" }

  $detail = Invoke-RestMethod `
    -Method Get `
    -Uri "$WorkforceBaseUrl/workforce/$endpoint/$encodedActorId" `
    -Headers $operatorHeaders `
    -TimeoutSec 20 `
    -ErrorAction Stop
  if ($null -eq $detail.version) {
    throw "Workforce '$Kind' detail did not return a version."
  }

  # Captain activation depends on a short-lived DSH/WLT financial decision.
  # Refresh it at the issuance boundary so a long preceding smoke journey
  # cannot turn an otherwise valid provider into a misleading PROFILE_INCOMPLETE
  # failure. This is an explicit governed refresh, never a local fallback.
  if ($Kind -eq "captain") {
    $financialRefresh = Invoke-RestMethod `
      -Method Post `
      -Uri "$DshBaseUrl/dsh/operator/dispatch/captains/$encodedActorId/financial-eligibility/refresh" `
      -Headers @{
        Authorization = "Bearer $OperatorToken"
        "X-Operator-Context-ID" = $OperatorContextId
        "X-Correlation-ID" = "local-workforce-captain-financial-refresh-$([guid]::NewGuid().ToString('N'))"
      } `
      -ContentType "application/json" `
      -Body "{}" `
      -TimeoutSec 20 `
      -ErrorAction Stop
    $financialEligibility = $financialRefresh.financialEligibility
    if ($null -eq $financialEligibility -or $financialEligibility.eligible -ne $true -or
        [string]::IsNullOrWhiteSpace([string]$financialEligibility.expiresAt)) {
      throw "DSH/WLT financial eligibility refresh was not eligible and time-bounded for captain '$($provider.actorId)'."
    }
  }

  $attempt = [Guid]::NewGuid().ToString("N")
  $issued = Invoke-RestMethod `
    -Method Post `
    -Uri "$WorkforceBaseUrl/workforce/$endpoint/$encodedActorId/activation-codes" `
    -Headers @{
      Authorization = "Bearer $OperatorToken"
      "X-Correlation-ID" = "local-workforce-$Kind-activation-$attempt"
      "Idempotency-Key" = "local-workforce-$Kind-activation-$attempt"
    } `
    -ContentType "application/json" `
    -Body (@{ expectedVersion = [int]$detail.version } | ConvertTo-Json) `
    -TimeoutSec 20 `
    -ErrorAction Stop
  if ([string]::IsNullOrWhiteSpace([string]$issued.code)) {
    throw "Workforce did not return an activation code for '$Kind'."
  }

  $activated = Invoke-RestMethod `
    -Method Post `
    -Uri "$IdentityBaseUrl/auth/activate" `
    -ContentType "application/json" `
    -Body (@{
      actorType = $Kind
      phone = [string]$provider.phoneE164
      code = [string]$issued.code
      deviceFingerprint = "$DeviceFingerprint-$Kind"
    } | ConvertTo-Json) `
    -TimeoutSec 20 `
    -ErrorAction Stop

  if ([string]::IsNullOrWhiteSpace([string]$activated.accessToken)) {
    throw "Identity activation for '$Kind' did not return an access token."
  }
  if ([string]$activated.identity.subject -ne [string]$provider.actorId) {
    throw "Identity activation for '$Kind' returned a divergent actor subject."
  }
  if (-not (@($activated.identity.roles) -contains $Kind)) {
    throw "Identity activation for '$Kind' did not return the required role."
  }

  return [string]$activated.accessToken
}
