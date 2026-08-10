[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:58080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:58082",
  [string]$WorkforceBaseUrl = "http://127.0.0.1:58086",
  [string]$IdentityPassword = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "../dev/local-actors.ps1")
. (Join-Path $PSScriptRoot "../dev/local-workforce-actors.ps1")
if ([string]::IsNullOrWhiteSpace($IdentityPassword)) {
  $IdentityPassword = Get-LocalPassword
}
$RunId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimeComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$RuntimeEnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"

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
  $Request = @{ Method = $Method; Uri = $Url; Headers = $Headers; TimeoutSec = 30; SkipHttpErrorCheck = $true }
  if ($null -ne $Body) {
    $Request.ContentType = "application/json"
    $Request.Body = $Body | ConvertTo-Json -Depth 15
  }
  $Response = Invoke-WebRequest @Request
  $Json = $null
  if (-not [string]::IsNullOrWhiteSpace($Response.Content)) {
    try { $Json = $Response.Content | ConvertFrom-Json } catch { }
  }
  return [pscustomobject]@{ Status = [int]$Response.StatusCode; Json = $Json; Content = $Response.Content }
}

function Require-Status([object]$Response, [int[]]$Expected, [string]$Name) {
  if ($Expected -notcontains $Response.Status) {
    throw "$Name expected HTTP $($Expected -join '/') but received $($Response.Status): $($Response.Content)"
  }
}

function Require([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

function Invoke-DshRuntimeScalar {
  param([Parameter(Mandatory = $true)][string]$Statement)

  foreach ($required in @($RuntimeComposeFile, $RuntimeEnvFile)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
      throw "governed runtime authority is missing: $required"
    }
  }

  $Output = docker compose --env-file $RuntimeEnvFile -f $RuntimeComposeFile exec -T postgres `
    psql -X -v ON_ERROR_STOP=1 -U dsh_runtime -d dsh_runtime -qAt -c $Statement
  if ($LASTEXITCODE -ne 0) {
    throw "governed DSH runtime SQL readback failed with exit code $LASTEXITCODE"
  }
  return (($Output -join "`n").Trim())
}

function Resolve-GovernedStoreServicePoint {
  param([Parameter(Mandatory = $true)][string]$StoreId)

  $SafeStoreId = $StoreId.Replace("'", "''")
  $Statement = @"
WITH target_store AS (
  SELECT latitude, longitude
  FROM dsh_stores
  WHERE id = '$SafeStoreId'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
),
effective_versions AS (
  SELECT DISTINCT ON (service_area_code)
         service_area_code, polygon, active, priority, effective_from, expires_at, version
  FROM dsh_service_area_versions
  WHERE effective_from <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY service_area_code, effective_from DESC, version DESC
)
SELECT v.service_area_code || '|' || s.latitude::text || '|' || s.longitude::text
FROM target_store s
JOIN effective_versions v
  ON v.active = TRUE
 AND ST_Contains(v.polygon, ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326))
ORDER BY v.priority DESC, v.service_area_code ASC
LIMIT 1;
"@
  $Row = Invoke-DshRuntimeScalar -Statement $Statement
  Require (-not [string]::IsNullOrWhiteSpace($Row)) "store $StoreId is outside every effective active DSH service-area geofence"
  $Parts = $Row.Split("|", [StringSplitOptions]::None)
  Require ($Parts.Count -eq 3) "governed service-area readback returned an invalid row for $StoreId"

  $Latitude = 0.0
  $Longitude = 0.0
  Require ([double]::TryParse($Parts[1], [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$Latitude)) "invalid governed latitude for $StoreId"
  Require ([double]::TryParse($Parts[2], [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$Longitude)) "invalid governed longitude for $StoreId"
  return [pscustomobject]@{
    StoreId = $StoreId
    ServiceAreaCode = $Parts[0]
    Latitude = $Latitude
    Longitude = $Longitude
  }
}

function Login-Actor([string]$Username, [string]$ExpectedRole) {
  $Login = Invoke-Api POST "$IdentityBaseUrl/auth/login" @{} @{
    username = $Username
    password = $IdentityPassword
    deviceFingerprint = "lian-multisurface-$RunId-$Username"
  }
  Require-Status $Login @(200) "login $Username"
  $Token = "$(Get-Value $Login.Json 'accessToken')"
  Require (-not [string]::IsNullOrWhiteSpace($Token)) "login returned no token for $Username"
  $Session = Invoke-Api GET "$IdentityBaseUrl/auth/session" @{ Authorization = "Bearer $Token" }
  Require-Status $Session @(200) "session $Username"
  $Subject = "$(Get-Value $Session.Json 'subject')"
  Require (-not [string]::IsNullOrWhiteSpace($Subject)) "session returned no subject for $Username"
  return [pscustomobject]@{ Username = $Username; Role = $ExpectedRole; Token = $Token; Subject = $Subject }
}

function Headers([object]$Actor, [string]$Operation, [switch]$ReadOnly) {
  $Result = @{
    Authorization = "Bearer $($Actor.Token)"
    "X-Correlation-ID" = "lian-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))"
  }
  if (-not $ReadOnly) { $Result["Idempotency-Key"] = "lian-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))" }
  return $Result
}

function Find-Id([object[]]$Items, [string]$Id) {
  return @($Items | Where-Object { "$(Get-Value $_ 'id')" -eq $Id })
}

function Ensure-ClientAddress([object]$Client, [object]$ServicePoint) {
  $List = Invoke-Api GET "$DshBaseUrl/dsh/client/addresses" (Headers $Client "address-list" -ReadOnly)
  Require-Status $List @(200) "client address list"
  $Addresses = @((Get-Value $List.Json 'addresses'))
  $Matching = @($Addresses | Where-Object {
    "$(Get-Value $_ 'serviceAreaCode')" -eq $ServicePoint.ServiceAreaCode -and
    [math]::Abs([double](Get-Value $_ 'latitude') - $ServicePoint.Latitude) -lt 0.000001 -and
    [math]::Abs([double](Get-Value $_ 'longitude') - $ServicePoint.Longitude) -lt 0.000001
  })
  if ($Matching.Count -gt 0) { return "$(Get-Value $Matching[0] 'id')" }

  $Create = Invoke-Api POST "$DshBaseUrl/dsh/client/addresses" (Headers $Client "address-create") @{
    label = "runtime-$RunId"
    recipientName = "Runtime Client"
    phoneE164 = "+967711111111"
    addressLine = "Governed runtime address $RunId"
    serviceAreaCode = $ServicePoint.ServiceAreaCode
    latitude = $ServicePoint.Latitude
    longitude = $ServicePoint.Longitude
    makeDefault = $true
  }
  Require-Status $Create @(200, 201) "client address create"
  $AddressId = "$(Get-Value (Get-Value $Create.Json 'address') 'id')"
  Require (-not [string]::IsNullOrWhiteSpace($AddressId)) "client address returned no id"

  $ReplayHeaders = Headers $Client "address-create-replay"
  $ReplayHeaders["Idempotency-Key"] = "lian-address-replay-$RunId"
  $ReplayBody = @{
    label = "runtime-replay-$RunId"
    recipientName = "Runtime Client"
    phoneE164 = "+967711111111"
    addressLine = "Governed runtime replay address $RunId"
    serviceAreaCode = $ServicePoint.ServiceAreaCode
    latitude = $ServicePoint.Latitude
    longitude = $ServicePoint.Longitude
    makeDefault = $false
  }
  $ReplayFirst = Invoke-Api POST "$DshBaseUrl/dsh/client/addresses" $ReplayHeaders $ReplayBody
  Require-Status $ReplayFirst @(201) "address idempotency first write"
  $ReplaySecond = Invoke-Api POST "$DshBaseUrl/dsh/client/addresses" $ReplayHeaders $ReplayBody
  Require-Status $ReplaySecond @(200) "address idempotency replay"
  Require ("$(Get-Value (Get-Value $ReplayFirst.Json 'address') 'id')" -eq "$(Get-Value (Get-Value $ReplaySecond.Json 'address') 'id')") "address replay created a duplicate"
  return $AddressId
}

$Client = Login-Actor (Get-LocalUsername "client") "client"
$Partner = Login-Actor (Get-LocalUsername "partner") "partner"
$Operator = Login-Actor (Get-LocalUsername "operator") "operator"
$CaptainProvider = Get-ProvisionedWorkforceActor -Kind "captain"
$Captain = [pscustomobject]@{
  Username = [string]$CaptainProvider.workforceCode
  Role = "captain"
  Token = Get-ProvisionedWorkforceActorToken `
    -Kind "captain" `
    -OperatorToken $Operator.Token `
    -WorkforceBaseUrl $WorkforceBaseUrl `
    -IdentityBaseUrl $IdentityBaseUrl `
    -DeviceFingerprint "dsh-multisurface"
  Subject = [string]$CaptainProvider.actorId
}
$FieldProvider = Get-ProvisionedWorkforceActor -Kind "field"
$Field = [pscustomobject]@{
  Username = [string]$FieldProvider.workforceCode
  Role = "field"
  Token = Get-ProvisionedWorkforceActorToken `
    -Kind "field" `
    -OperatorToken $Operator.Token `
    -WorkforceBaseUrl $WorkforceBaseUrl `
    -IdentityBaseUrl $IdentityBaseUrl `
    -DeviceFingerprint "dsh-multisurface"
  Subject = [string]$FieldProvider.actorId
}
$StorePoint = Resolve-GovernedStoreServicePoint -StoreId "store-test-grocery"

$Anonymous = Invoke-Api GET "$DshBaseUrl/dsh/client/orders"
Require-Status $Anonymous @(401) "anonymous client orders"
$CrossRole = Invoke-Api GET "$DshBaseUrl/dsh/client/orders" (Headers $Partner "cross-role" -ReadOnly)
Require-Status $CrossRole @(403) "partner reading client orders"

$AddressId = Ensure-ClientAddress $Client $StorePoint
$ExistingCart = Invoke-Api GET "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" (Headers $Client "cart-read" -ReadOnly)
Require-Status $ExistingCart @(200) "client cart read"
if ($null -ne (Get-Value $ExistingCart.Json 'cart')) {
  $Clear = Invoke-Api DELETE "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" (Headers $Client "cart-clear")
  Require-Status $Clear @(204) "client cart clear"
}

$Catalog = Invoke-Api GET "$DshBaseUrl/dsh/stores/store-test-grocery/catalog"
Require-Status $Catalog @(200) "published catalog"
$Products = @((Get-Value $Catalog.Json 'products'))
Require ($Products.Count -gt 0) "published catalog has no products"
$ProductId = "$(Get-Value $Products[0] 'masterProductId')"
if ([string]::IsNullOrWhiteSpace($ProductId)) { $ProductId = "$(Get-Value $Products[0] 'id')" }
Require (-not [string]::IsNullOrWhiteSpace($ProductId)) "catalog product has no governed id"

$Cart = Invoke-Api POST "$DshBaseUrl/dsh/client/cart/items" (Headers $Client "cart-upsert") @{
  storeId = "store-test-grocery"
  fulfillmentMode = "bthwani_delivery"
  masterProductId = $ProductId
  quantity = 1
}
Require-Status $Cart @(200) "client cart upsert"
$CartId = "$(Get-Value $Cart.Json 'cartId')"
Require (-not [string]::IsNullOrWhiteSpace($CartId)) "cart returned no id"

$Checkout = Invoke-Api POST "$DshBaseUrl/dsh/client/checkout-intents" (Headers $Client "checkout") @{
  cartId = $CartId
  storeId = "store-test-grocery"
  fulfillmentMode = "bthwani_delivery"
  paymentMethod = "cod"
  deliveryAddressId = $AddressId
  note = "lian multi-surface closure $RunId"
}
Require-Status $Checkout @(200, 201) "client checkout"
$Intent = Get-Value $Checkout.Json 'intent'
$CheckoutId = "$(Get-Value $Intent 'id')"
$WltPaymentSessionId = "$(Get-Value $Intent 'wltPaymentSessionId')"
Require (-not [string]::IsNullOrWhiteSpace($CheckoutId)) "checkout returned no intent id"
Require (-not [string]::IsNullOrWhiteSpace($WltPaymentSessionId)) "checkout returned no WLT payment session"

$OrderCreate = Invoke-Api POST "$DshBaseUrl/dsh/client/orders" (Headers $Client "order-create") @{ checkoutIntentId = $CheckoutId }
Require-Status $OrderCreate @(201) "client order create"
$OrderId = "$(Get-Value (Get-Value $OrderCreate.Json 'order') 'id')"
Require (-not [string]::IsNullOrWhiteSpace($OrderId)) "order returned no id"
$DuplicateOrder = Invoke-Api POST "$DshBaseUrl/dsh/client/orders" (Headers $Client "order-duplicate") @{ checkoutIntentId = $CheckoutId }
Require-Status $DuplicateOrder @(409) "duplicate order from checkout"

$ClientOrders = Invoke-Api GET "$DshBaseUrl/dsh/client/orders" (Headers $Client "client-orders" -ReadOnly)
Require-Status $ClientOrders @(200) "client orders"
Require ((Find-Id @((Get-Value $ClientOrders.Json 'orders')) $OrderId).Count -eq 1) "client order list missed created order"
$PartnerOrders = Invoke-Api GET "$DshBaseUrl/dsh/partner/orders" (Headers $Partner "partner-orders" -ReadOnly)
Require-Status $PartnerOrders @(200) "partner orders"
Require ((Find-Id @((Get-Value $PartnerOrders.Json 'orders')) $OrderId).Count -eq 1) "partner did not receive order"

$Accepted = Invoke-Api POST "$DshBaseUrl/dsh/partner/orders/$OrderId/accept" (Headers $Partner "partner-accept")
Require-Status $Accepted @(200) "partner accept"
Require ("$(Get-Value (Get-Value $Accepted.Json 'order') 'status')" -eq "store_accepted") "partner accept status mismatch"
$Preparing = Invoke-Api POST "$DshBaseUrl/dsh/partner/orders/$OrderId/preparing" (Headers $Partner "partner-preparing")
Require-Status $Preparing @(200) "partner preparing"
$Ready = Invoke-Api POST "$DshBaseUrl/dsh/partner/orders/$OrderId/ready" (Headers $Partner "partner-ready")
Require-Status $Ready @(200) "partner ready"
Require ("$(Get-Value (Get-Value $Ready.Json 'order') 'status')" -eq "ready_for_pickup") "ready status mismatch"

$OperatorOrders = Invoke-Api GET "$DshBaseUrl/dsh/operator/orders" (Headers $Operator "operator-orders" -ReadOnly)
Require-Status $OperatorOrders @(200) "operator orders"
Require ((Find-Id @((Get-Value $OperatorOrders.Json 'orders')) $OrderId).Count -eq 1) "operator did not read ready order"

$AssignmentCreate = Invoke-Api POST "$DshBaseUrl/dsh/operator/dispatch/assignments" (Headers $Operator "assignment-create") @{
  orderId = $OrderId
  captainId = $Captain.Subject
}
Require-Status $AssignmentCreate @(201) "operator assignment"
$AssignmentId = "$(Get-Value (Get-Value $AssignmentCreate.Json 'assignment') 'id')"
Require (-not [string]::IsNullOrWhiteSpace($AssignmentId)) "assignment returned no id"
$DuplicateAssignment = Invoke-Api POST "$DshBaseUrl/dsh/operator/dispatch/assignments" (Headers $Operator "assignment-duplicate") @{
  orderId = $OrderId
  captainId = $Captain.Subject
}
Require-Status $DuplicateAssignment @(409) "duplicate assignment"

$CaptainAssignments = Invoke-Api GET "$DshBaseUrl/dsh/captain/dispatch/assignments" (Headers $Captain "captain-assignments" -ReadOnly)
Require-Status $CaptainAssignments @(200) "captain assignments"
Require ((Find-Id @((Get-Value $CaptainAssignments.Json 'assignments')) $AssignmentId).Count -eq 1) "captain did not receive assignment"

$BeforeAcceptLocation = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" (Headers $Captain "location-before-accept") @{
  latitude = $StorePoint.Latitude; longitude = $StorePoint.Longitude; recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Require-Status $BeforeAcceptLocation @(409) "location before accept"
$Accept = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/accept" (Headers $Captain "captain-accept")
Require-Status $Accept @(200) "captain accept"
$InvalidLocation = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" (Headers $Captain "location-invalid") @{
  latitude = 95; longitude = $StorePoint.Longitude; recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Require-Status $InvalidLocation @(400) "invalid captain latitude"
$OutOfOrder = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" (Headers $Captain "pickup-out-of-order") @{ status = "picked_up" }
Require-Status $OutOfOrder @(409) "pickup before store arrival"
$Location = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" (Headers $Captain "location-valid") @{
  latitude = $StorePoint.Latitude; longitude = $StorePoint.Longitude; recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Require-Status $Location @(200) "valid captain location"
$Tracking = Invoke-Api GET "$DshBaseUrl/dsh/client/orders/$OrderId/tracking" (Headers $Client "tracking" -ReadOnly)
Require-Status $Tracking @(200) "client tracking"
$TrackingAssignment = Get-Value $Tracking.Json 'assignment'
Require ([math]::Abs([double](Get-Value $TrackingAssignment 'lastLatitude') - $StorePoint.Latitude) -lt 0.000001) "tracking latitude mismatch"

foreach ($Status in @("driver_arrived_store", "picked_up", "arrived_customer")) {
  $Progress = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" (Headers $Captain "delivery-$Status") @{ status = $Status }
  Require-Status $Progress @(200) "delivery status $Status"
  Require ("$(Get-Value (Get-Value (Get-Value $Progress.Json 'assignment') 'delivery') 'status')" -eq $Status) "delivery did not reach $Status"
}

$PoDReference = "runtime://pod/$AssignmentId/$RunId"
$Delivered = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/pod" (Headers $Captain "pod") @{
  method = "photo"; reference = $PoDReference; note = "lian governed delivery proof"
}
Require-Status $Delivered @(200) "proof of delivery"
$DeliveredAssignment = Get-Value $Delivered.Json 'assignment'
Require ("$(Get-Value $DeliveredAssignment 'status')" -eq "completed") "assignment did not complete"
$Delivery = Get-Value $DeliveredAssignment 'delivery'
Require ("$(Get-Value $Delivery 'status')" -eq "delivered") "delivery did not complete"
Require ($null -eq (Get-Value $DeliveredAssignment 'lastLatitude')) "captain location was not purged"
Require ("$(Get-Value $Delivery 'podReference')" -eq $PoDReference) "PoD reference mismatch"
$RepeatedPoD = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/pod" (Headers $Captain "pod-repeat") @{
  method = "photo"; reference = $PoDReference
}
Require-Status $RepeatedPoD @(409) "repeated PoD"

$FinalClient = Invoke-Api GET "$DshBaseUrl/dsh/client/orders/$OrderId" (Headers $Client "client-final" -ReadOnly)
Require-Status $FinalClient @(200) "client delivered readback"
Require ("$(Get-Value (Get-Value $FinalClient.Json 'order') 'status')" -eq "delivered") "client did not read delivered status"
$FinalPartner = Invoke-Api GET "$DshBaseUrl/dsh/partner/orders" (Headers $Partner "partner-final" -ReadOnly)
Require-Status $FinalPartner @(200) "partner delivered readback"
$PartnerMatch = Find-Id @((Get-Value $FinalPartner.Json 'orders')) $OrderId
Require ($PartnerMatch.Count -eq 1 -and "$(Get-Value $PartnerMatch[0] 'status')" -eq "delivered") "partner did not read delivered status"

$OutboxSql = "SELECT COUNT(*) FROM dsh_wlt_outbox_events WHERE event_type='delivery_completed' AND order_id='$OrderId'::uuid AND status IN ('pending','processing','sent');"
$OutboxCount = Invoke-DshRuntimeScalar -Statement $OutboxSql
Require ([int]$OutboxCount -eq 1) "delivery did not create exactly one WLT outbox event"

$MockedVisit = Invoke-Api POST "$DshBaseUrl/dsh/field/stores/store-test-grocery/visits" (Headers $Field "field-mocked") @{
  visitType = "periodic"; storeLatitude = $StorePoint.Latitude; storeLongitude = $StorePoint.Longitude
  startLocation = @{
    latitude = $StorePoint.Latitude; longitude = $StorePoint.Longitude; accuracyMeters = 5
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    provider = "android-fused"; deviceReference = "lian-field-$RunId"; isMocked = $true
  }
}
Require-Status $MockedVisit @(400) "mocked field GPS"
Require ("$(Get-Value $MockedVisit.Json 'code')" -eq "LOCATION_MOCKED") "mocked GPS code mismatch"

$ValidVisit = Invoke-Api POST "$DshBaseUrl/dsh/field/stores/store-test-grocery/visits" (Headers $Field "field-visit") @{
  visitType = "periodic"; storeLatitude = $StorePoint.Latitude; storeLongitude = $StorePoint.Longitude
  startLocation = @{
    latitude = $StorePoint.Latitude; longitude = $StorePoint.Longitude; accuracyMeters = 5
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    provider = "android-fused"; deviceReference = "lian-field-$RunId"; isMocked = $false
  }
}
Require-Status $ValidVisit @(201) "field visit create"
$VisitId = "$(Get-Value (Get-Value $ValidVisit.Json 'visit') 'id')"
Require (-not [string]::IsNullOrWhiteSpace($VisitId)) "field visit returned no id"
$Queue = Invoke-Api GET "$DshBaseUrl/dsh/field/work-queue" (Headers $Field "field-queue" -ReadOnly)
Require-Status $Queue @(200) "field work queue"
Require ((Find-Id @((Get-Value $Queue.Json 'visits')) $VisitId).Count -eq 1) "field work queue missed visit"

$EscalationCreate = Invoke-Api POST "$DshBaseUrl/dsh/field/stores/store-test-grocery/escalations" (Headers $Field "field-escalation") @{
  visitId = $VisitId
  severity = "medium"
  category = "other"
  description = "lian multi-surface governed escalation $RunId"
}
Require-Status $EscalationCreate @(201) "field escalation create"
$EscalationId = "$(Get-Value (Get-Value $EscalationCreate.Json 'escalation') 'id')"
Require (-not [string]::IsNullOrWhiteSpace($EscalationId)) "field escalation returned no id"
$OperatorEscalations = Invoke-Api GET "$DshBaseUrl/dsh/operator/field-readiness/escalations" (Headers $Operator "operator-escalations" -ReadOnly)
Require-Status $OperatorEscalations @(200) "operator escalation list"
Require ((Find-Id @((Get-Value $OperatorEscalations.Json 'escalations')) $EscalationId).Count -eq 1) "operator did not read field escalation"
$Resolve = Invoke-Api PATCH "$DshBaseUrl/dsh/operator/field-readiness/escalations/$EscalationId" (Headers $Operator "operator-resolve") @{
  status = "resolved"
  resolutionNote = "resolved by lian runtime closure"
}
Require-Status $Resolve @(200) "operator escalation resolution"
Require ("$(Get-Value (Get-Value $Resolve.Json 'escalation') 'status')" -eq "resolved") "escalation did not resolve"

$PrematureCompletion = Invoke-Api POST "$DshBaseUrl/dsh/field/visits/$VisitId/complete" (Headers $Field "field-complete-early") @{
  completionLocation = @{
    latitude = $StorePoint.Latitude; longitude = $StorePoint.Longitude; accuracyMeters = 5
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    provider = "android-fused"; deviceReference = "lian-field-$RunId"; isMocked = $false
  }
}
Require-Status $PrematureCompletion @(409) "premature field completion"
Require ("$(Get-Value $PrematureCompletion.Json 'code')" -eq "CHECKLIST_INCOMPLETE") "premature completion code mismatch"

[ordered]@{
  state = "PASS"
  runId = $RunId
  surfaces = @("app-client", "app-partner", "app-captain", "app-field", "control-panel")
  serviceAreaCode = $StorePoint.ServiceAreaCode
  addressId = $AddressId
  checkoutIntentId = $CheckoutId
  wltPaymentSessionId = $WltPaymentSessionId
  orderId = $OrderId
  assignmentId = $AssignmentId
  fieldVisitId = $VisitId
  escalationId = $EscalationId
  proven = @(
    "authentication and role isolation",
    "governed service-area resolution",
    "address idempotency and ownership",
    "central catalog cart checkout and WLT handoff",
    "duplicate order and assignment rejection",
    "partner order lifecycle",
    "operator dispatch",
    "captain state order location tracking and PoD",
    "location purge on terminal delivery",
    "exactly one durable DSH-to-WLT delivery event",
    "field mocked-GPS rejection and work queue",
    "field-to-control-panel escalation and resolution",
    "field checklist fail-closed completion"
  )
} | ConvertTo-Json -Depth 10
Write-Host "DSH five-surface governed runtime matrix v2: PASS"
