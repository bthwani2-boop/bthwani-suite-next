function Login-PlatformLocalActor {
  param(
    [Parameter(Mandatory = $true)][string]$Username,
    [Parameter(Mandatory = $true)][string]$Password,
    [Parameter(Mandatory = $true)][string]$DeviceFingerprint
  )
  $body = @{
    username = $Username
    password = $Password
    deviceFingerprint = $DeviceFingerprint
  } | ConvertTo-Json
  $login = Invoke-RestMethod "http://localhost:58082/auth/login" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 10
  if ([string]::IsNullOrWhiteSpace($login.accessToken)) { throw "$Username login did not return an access token" }
  return $login.accessToken
}

function New-PlatformAuthHeaders {
  param(
    [Parameter(Mandatory = $true)][string]$AccessToken,
    [Parameter(Mandatory = $true)][string]$CorrelationId
  )
  return @{
    Authorization = "Bearer $AccessToken"
    "X-Correlation-ID" = $CorrelationId
  }
}

function Assert-PlatformHttpFailureStatus {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Operation,
    [Parameter(Mandatory = $true)][int]$ExpectedStatus
  )
  try {
    & $Operation | Out-Null
    throw "expected HTTP $ExpectedStatus but request succeeded"
  } catch {
    if ($null -eq $_.Exception.Response) { throw }
    $status = [int]$_.Exception.Response.StatusCode
    if ($status -ne $ExpectedStatus) { throw }
  }
}

function Invoke-PlatformP3Smoke {
  Start-PlatformP3Runtime
  $health = Invoke-RestMethod "http://localhost:58088/platform/health" -TimeoutSec 10
  if ($health.status -ne "healthy") { throw "platform health is not healthy" }
  $readiness = Invoke-RestMethod "http://localhost:58088/platform/readiness" -TimeoutSec 10
  if ($readiness.status -ne "ready") { throw "platform readiness is not ready" }

  $password = if ($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD) { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD } else { "123456" }
  $correlationId = "platform-p3-smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  $operatorToken = Login-PlatformLocalActor -Username "operator" -Password $password -DeviceFingerprint "$correlationId-operator"
  $approverToken = Login-PlatformLocalActor -Username "platform-approver" -Password $password -DeviceFingerprint "$correlationId-approver"
  $applierToken = Login-PlatformLocalActor -Username "platform-applier" -Password $password -DeviceFingerprint "$correlationId-applier"
  $rolloutToken = Login-PlatformLocalActor -Username "platform-rollout-manager" -Password $password -DeviceFingerprint "$correlationId-rollout"
  $operatorHeaders = New-PlatformAuthHeaders -AccessToken $operatorToken -CorrelationId $correlationId
  $approverHeaders = New-PlatformAuthHeaders -AccessToken $approverToken -CorrelationId $correlationId
  $applierHeaders = New-PlatformAuthHeaders -AccessToken $applierToken -CorrelationId $correlationId
  $rolloutHeaders = New-PlatformAuthHeaders -AccessToken $rolloutToken -CorrelationId $correlationId

  $snapshot = Invoke-RestMethod "http://localhost:58088/platform/v1/runtime-config" -Headers $operatorHeaders -TimeoutSec 10
  if ($snapshot.status -ne "OPERATIONAL" -or $snapshot.rolloutsState -ne "OPERATIONAL") {
    throw "platform runtime snapshot is not fully OPERATIONAL: status=$($snapshot.status) rollouts=$($snapshot.rolloutsState)"
  }
  $aggregatedHealth = Invoke-RestMethod "http://localhost:58088/platform/v1/health" -Headers $rolloutHeaders -TimeoutSec 10
  if ($aggregatedHealth.state -ne "OPERATIONAL") { throw "aggregated platform health is not OPERATIONAL" }

  $flagKey = "PLATFORM_P3_SMOKE_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  $changeBody = @{
    title = "Platform P3 rollout smoke"
    reason = "Prove separated maker checker applier and progressive delivery"
    impactAssessment = "Temporary disabled feature flag rolled out through governed percentages"
    rollbackPlan = "Restore the captured disabled baseline"
    items = @(
      @{
        targetType = "feature_flag"
        targetKey = $flagKey
        ownerService = "dsh"
        scopeType = "global"
        valueType = "boolean"
        classification = "internal"
        expectedRevision = 0
        proposedValue = $false
      }
    )
  } | ConvertTo-Json -Depth 8
  $created = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body $changeBody -TimeoutSec 10
  $changeSetId = $created.changeSet.id
  if ([string]::IsNullOrWhiteSpace($changeSetId) -or $created.changeSet.status -ne "draft") { throw "change-set creation readback is invalid" }

  $validated = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/validate" -Method Post -Headers $operatorHeaders -TimeoutSec 10
  if ($validated.changeSet.status -ne "validated") { throw "change set was not validated" }
  $submitted = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/submit" -Method Post -Headers $operatorHeaders -TimeoutSec 10
  if ($submitted.changeSet.status -ne "submitted") { throw "change set was not submitted" }

  Assert-PlatformHttpFailureStatus -ExpectedStatus 403 -Operation {
    Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/approve" -Method Post -Headers $operatorHeaders -TimeoutSec 10
  }
  Assert-PlatformHttpFailureStatus -ExpectedStatus 403 -Operation {
    Invoke-RestMethod "http://localhost:58088/platform/v1/rollouts" -Method Post -Headers $operatorHeaders -ContentType "application/json" -Body "{}" -TimeoutSec 10
  }
  $approved = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/approve" -Method Post -Headers $approverHeaders -TimeoutSec 10
  if ($approved.changeSet.status -ne "approved") { throw "change set was not approved" }
  $applied = Invoke-RestMethod "http://localhost:58088/platform/v1/change-sets/$changeSetId/apply" -Method Post -Headers $applierHeaders -TimeoutSec 10
  if ($applied.changeSet.status -ne "applied") { throw "change set was not applied" }

  $rolloutBody = @{
    changeSetId = $changeSetId
    featureFlagKey = $flagKey
    targetScope = @{ surface = "app-captain"; city = "sanaa" }
    steps = @(10, 100)
    healthGate = @{
      requiredState = "OPERATIONAL"
      requiredServices = @("identity", "providers", "wlt", "dsh")
      maxLatencyMs = 5000
    }
  } | ConvertTo-Json -Depth 8
  $rolloutCreated = Invoke-RestMethod "http://localhost:58088/platform/v1/rollouts" -Method Post -Headers $rolloutHeaders -ContentType "application/json" -Body $rolloutBody -TimeoutSec 10
  $rolloutId = $rolloutCreated.rollout.id
  if ([string]::IsNullOrWhiteSpace($rolloutId) -or $rolloutCreated.rollout.status -ne "running") { throw "rollout creation readback is invalid" }

  $tenPercent = Invoke-RestMethod "http://localhost:58088/platform/v1/rollouts/$rolloutId/advance" -Method Post -Headers $rolloutHeaders -TimeoutSec 10
  if ($tenPercent.rollout.currentPercentage -ne 10 -or $tenPercent.rollout.status -ne "running") { throw "rollout did not advance to 10 percent" }
  $paused = Invoke-RestMethod "http://localhost:58088/platform/v1/rollouts/$rolloutId/pause" -Method Post -Headers $rolloutHeaders -TimeoutSec 10
  if ($paused.rollout.status -ne "paused") { throw "rollout was not paused" }
  $completed = Invoke-RestMethod "http://localhost:58088/platform/v1/rollouts/$rolloutId/advance" -Method Post -Headers $rolloutHeaders -TimeoutSec 10
  if ($completed.rollout.currentPercentage -ne 100 -or $completed.rollout.status -ne "completed") { throw "rollout did not complete" }
  $rolledBack = Invoke-RestMethod "http://localhost:58088/platform/v1/rollouts/$rolloutId/rollback" -Method Post -Headers $rolloutHeaders -TimeoutSec 10
  if ($rolledBack.rollout.status -ne "rolled_back") { throw "rollout was not rolled back" }

  $flags = Invoke-RestMethod "http://localhost:58088/platform/v1/feature-flags" -Headers $operatorHeaders -TimeoutSec 10
  $flag = @($flags.flags | Where-Object { $_.key -eq $flagKey })[0]
  if ($null -eq $flag -or $flag.enabled -ne $false -or $flag.revision -ne "4") { throw "rolled-back feature flag readback is invalid" }
  $audit = Invoke-RestMethod "http://localhost:58088/platform/v1/audit-events" -Headers $rolloutHeaders -TimeoutSec 10
  $journeyEvents = @($audit.events | Where-Object { $_.correlationId -eq $correlationId })
  if ($journeyEvents.Count -ne 10) { throw "expected ten persisted P3 workflow events, got $($journeyEvents.Count)" }
  Write-Host "Platform-control P3 multi-service runtime smoke: PASS"
}
