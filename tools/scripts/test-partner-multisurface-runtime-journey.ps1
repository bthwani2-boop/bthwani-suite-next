[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:58080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:58082",
  [string]$IdentityPassword = "",
  [string]$StoreId = "store-test-grocery"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if ([string]::IsNullOrWhiteSpace($IdentityPassword)) {
  $IdentityPassword = if ([string]::IsNullOrWhiteSpace($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD)) { "123456" } else { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD }
}
$RunId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

function Get-Value([object]$Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $Property = $Object.PSObject.Properties[$Name]
  if ($null -eq $Property) { return $null }
  return $Property.Value
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )
  $Request = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    TimeoutSec = 45
    SkipHttpErrorCheck = $true
  }
  if ($null -ne $Body) {
    $Request.ContentType = "application/json"
    $Request.Body = $Body | ConvertTo-Json -Depth 20
  }
  $Response = Invoke-WebRequest @Request
  $Json = $null
  if (-not [string]::IsNullOrWhiteSpace($Response.Content)) {
    try { $Json = $Response.Content | ConvertFrom-Json } catch { }
  }
  return [pscustomobject]@{
    Status = [int]$Response.StatusCode
    Json = $Json
    Content = $Response.Content
  }
}

function Require-Status([object]$Response, [int[]]$Expected, [string]$Name) {
  if ($Expected -notcontains $Response.Status) {
    throw "$Name expected HTTP $($Expected -join '/') but received $($Response.Status): $($Response.Content)"
  }
}

function Require([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

function Login-Actor([string]$Username) {
  $Login = Invoke-Api POST "$IdentityBaseUrl/auth/login" @{} @{
    username = $Username
    password = $IdentityPassword
    deviceFingerprint = "partner-journey-$RunId-$Username"
  }
  Require-Status $Login @(200) "login $Username"
  $Token = "$(Get-Value $Login.Json 'accessToken')"
  Require (-not [string]::IsNullOrWhiteSpace($Token)) "login returned no token for $Username"
  return [pscustomobject]@{ Username = $Username; Token = $Token }
}

function Headers([object]$Actor, [string]$Operation, [switch]$ReadOnly, [string]$FixedIdempotencyKey = "") {
  $Result = @{
    Authorization = "Bearer $($Actor.Token)"
    "X-Correlation-ID" = "partner-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))"
  }
  if (-not $ReadOnly) {
    $Result["Idempotency-Key"] = if ([string]::IsNullOrWhiteSpace($FixedIdempotencyKey)) {
      "partner-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))"
    } else {
      $FixedIdempotencyKey
    }
  }
  return $Result
}

$Partner = Login-Actor "bthwani"
$Field = Login-Actor "field"
$Operator = Login-Actor "operator"

$PartnerStatus = Invoke-Api GET "$DshBaseUrl/dsh/partner/activation/status" (Headers $Partner "activation-status" -ReadOnly)
Require-Status $PartnerStatus @(200) "partner activation status"
$PartnerReadiness = Invoke-Api GET "$DshBaseUrl/dsh/partner/activation/readiness" (Headers $Partner "activation-readiness" -ReadOnly)
Require-Status $PartnerReadiness @(200) "partner activation readiness"
$Scopes = Invoke-Api GET "$DshBaseUrl/dsh/partner/scopes" (Headers $Partner "scopes" -ReadOnly)
Require-Status $Scopes @(200) "partner scopes"
Require ($Scopes.Content -match [regex]::Escape($StoreId)) "partner scopes do not include $StoreId"

$SettingsBefore = Invoke-Api GET "$DshBaseUrl/dsh/partner/stores/$StoreId/settings" (Headers $Partner "settings-before" -ReadOnly)
Require-Status $SettingsBefore @(200) "partner store settings read"
$VersionBefore = [int](Get-Value $SettingsBefore.Json 'version')
$StoreStatus = "$(Get-Value $SettingsBefore.Json 'status')"
$DeliveryModes = @((Get-Value $SettingsBefore.Json 'deliveryModes'))
Require ($VersionBefore -gt 0) "partner settings returned no positive version"
Require (-not [string]::IsNullOrWhiteSpace($StoreStatus)) "partner settings returned no lifecycle status"
Require ($DeliveryModes.Count -gt 0) "partner settings returned no delivery modes"

$SettingsBody = @{
  expectedVersion = $VersionBefore
  status = $StoreStatus
  deliveryModes = $DeliveryModes
  reason = "runtime partner settings readback $RunId"
}
$SettingsKey = "partner-settings-$RunId"
$SettingsUpdate = Invoke-Api PATCH "$DshBaseUrl/dsh/partner/stores/$StoreId/settings" (Headers $Partner "settings-update" -FixedIdempotencyKey $SettingsKey) $SettingsBody
Require-Status $SettingsUpdate @(200) "partner settings update"
$SettingsReplay = Invoke-Api PATCH "$DshBaseUrl/dsh/partner/stores/$StoreId/settings" (Headers $Partner "settings-replay" -FixedIdempotencyKey $SettingsKey) $SettingsBody
Require-Status $SettingsReplay @(200) "partner settings idempotency replay"
$SettingsAfter = Invoke-Api GET "$DshBaseUrl/dsh/partner/stores/$StoreId/settings" (Headers $Partner "settings-after" -ReadOnly)
Require-Status $SettingsAfter @(200) "partner settings readback"
$VersionAfter = [int](Get-Value $SettingsAfter.Json 'version')
Require ($VersionAfter -eq ($VersionBefore + 1)) "partner settings update/replay changed version unexpectedly: before $VersionBefore after $VersionAfter"
Require ((@((Get-Value $SettingsAfter.Json 'deliveryModes')) -join ',') -eq ($DeliveryModes -join ',')) "partner settings readback delivery modes mismatch"

$TeamBefore = Invoke-Api GET "$DshBaseUrl/dsh/partner/stores/$StoreId/team" (Headers $Partner "team-before" -ReadOnly)
Require-Status $TeamBefore @(200) "partner team read"
$InviteIdentity = "+9677$($RunId.ToString().Substring($RunId.ToString().Length - 8))"
$InviteKey = "partner-team-invite-$RunId"
$Invite = Invoke-Api POST "$DshBaseUrl/dsh/partner/stores/$StoreId/team/invites" (Headers $Partner "team-invite" -FixedIdempotencyKey $InviteKey) @{
  identity = $InviteIdentity
}
Require-Status $Invite @(200, 201) "partner team invite"
$InviteReplay = Invoke-Api POST "$DshBaseUrl/dsh/partner/stores/$StoreId/team/invites" (Headers $Partner "team-invite-replay" -FixedIdempotencyKey $InviteKey) @{
  identity = $InviteIdentity
}
Require-Status $InviteReplay @(200, 201) "partner team invite replay"
$TeamAfter = Invoke-Api GET "$DshBaseUrl/dsh/partner/stores/$StoreId/team" (Headers $Partner "team-after" -ReadOnly)
Require-Status $TeamAfter @(200) "partner team readback"
Require ($TeamAfter.Content -match [regex]::Escape($InviteIdentity)) "partner team readback missed invited identity"

$Taxonomy = Invoke-Api GET "$DshBaseUrl/dsh/partner/catalog/taxonomy" (Headers $Partner "catalog-taxonomy" -ReadOnly)
Require-Status $Taxonomy @(200) "partner catalog taxonomy"
$Domains = @((Get-Value $Taxonomy.Json 'domains'))
$Nodes = @((Get-Value $Taxonomy.Json 'nodes'))
Require ($Domains.Count -gt 0) "partner taxonomy returned no domains"
$DomainId = "$(Get-Value $Domains[0] 'id')"
Require (-not [string]::IsNullOrWhiteSpace($DomainId)) "partner taxonomy domain has no id"
$CategoryNodeId = $null
if ($Nodes.Count -gt 0) { $CategoryNodeId = "$(Get-Value $Nodes[0] 'id')" }

$MasterProducts = Invoke-Api GET "$DshBaseUrl/dsh/partner/catalog/master-products?limit=20" (Headers $Partner "catalog-products" -ReadOnly)
Require-Status $MasterProducts @(200) "partner master products"
Require ($MasterProducts.Content -match 'masterProducts') "partner master-products response shape is missing"
$Assortment = Invoke-Api GET "$DshBaseUrl/dsh/partner/stores/$StoreId/assortment" (Headers $Partner "catalog-assortment" -ReadOnly)
Require-Status $Assortment @(200) "partner store assortment"

$Proposal = Invoke-Api POST "$DshBaseUrl/dsh/partner/catalog/product-proposals" (Headers $Partner "catalog-proposal") @{
  proposedNameAr = "منتج رحلة الشريك $RunId"
  proposedNameEn = "Partner journey product $RunId"
  domainId = $DomainId
  categoryNodeId = $CategoryNodeId
  brand = "BThwani Runtime"
  barcode = $null
  imageObjectKey = $null
  sourceSurface = "app-partner"
}
Require-Status $Proposal @(200, 201) "partner product proposal"
$ProposalRecord = Get-Value $Proposal.Json 'proposal'
$ProposalId = "$(Get-Value $ProposalRecord 'id')"
Require (-not [string]::IsNullOrWhiteSpace($ProposalId)) "partner product proposal returned no id"

$PartnerOrders = Invoke-Api GET "$DshBaseUrl/dsh/partner/orders" (Headers $Partner "orders" -ReadOnly)
Require-Status $PartnerOrders @(200) "partner orders inbox"
$PartnerAnalytics = Invoke-Api GET "$DshBaseUrl/dsh/partner/analytics/performance?period=today" (Headers $Partner "analytics" -ReadOnly)
Require-Status $PartnerAnalytics @(200) "partner performance analytics"

$PartnerSettlements = Invoke-Api GET "$DshBaseUrl/dsh/partner/me/finance/settlements" (Headers $Partner "settlements" -ReadOnly)
Require-Status $PartnerSettlements @(200) "partner settlement references"
$PartnerSettlementSummary = Invoke-Api GET "$DshBaseUrl/dsh/partner/me/finance/settlements/summary" (Headers $Partner "settlement-summary" -ReadOnly)
Require-Status $PartnerSettlementSummary @(200) "partner settlement summary"

$Notifications = Invoke-Api GET "$DshBaseUrl/dsh/notifications" (Headers $Partner "notifications" -ReadOnly)
Require-Status $Notifications @(200) "partner notifications"
$NotificationPreferences = Invoke-Api GET "$DshBaseUrl/dsh/notifications/preferences" (Headers $Partner "notification-preferences" -ReadOnly)
Require-Status $NotificationPreferences @(200) "partner notification preferences"

$OperatorPartners = Invoke-Api GET "$DshBaseUrl/dsh/operator/partners?limit=100" (Headers $Operator "operator-partners" -ReadOnly)
Require-Status $OperatorPartners @(200) "control-panel partner list"
$FieldPartners = Invoke-Api GET "$DshBaseUrl/dsh/field/partners?limit=100" (Headers $Field "field-partners" -ReadOnly)
Require-Status $FieldPartners @(200) "field partner list"

[ordered]@{
  state = "PASS"
  runId = $RunId
  journey = "partner-multisurface"
  storeId = $StoreId
  settingsVersionBefore = $VersionBefore
  settingsVersionAfter = $VersionAfter
  invitedIdentity = $InviteIdentity
  proposalId = $ProposalId
  surfaces = @("app-partner", "app-field", "control-panel", "app-client-order-origin", "app-captain-delivery-intersection")
  boundaries = @("dsh", "wlt-read-model", "identity")
} | ConvertTo-Json -Depth 10

Write-Host "Partner multi-surface runtime journey: PASS"
