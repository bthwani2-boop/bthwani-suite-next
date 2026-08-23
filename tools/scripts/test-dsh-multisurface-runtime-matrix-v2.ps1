[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:58080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:18082",
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

  $Request = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    TimeoutSec = 30
    SkipHttpErrorCheck = $true
  }
  if ($null -ne $Body) {
    $Request.ContentType = "application/json"
    $Request.Body = $Body | ConvertTo-Json -Depth 15
  }
  $Response = Invoke-WebRequest @Request
  $Json = $null
  if (-not [string]::IsNullOrWhiteSpace($Response.Content)) {
    try {
      $Json = $Response.Content | ConvertFrom-Json
    } catch {
      $Json = $null
    }
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

function Invoke-DshRuntimeScalar {
  param([Parameter(Mandatory = $true)][string]$Statement)

  foreach ($RequiredPath in @($RuntimeComposeFile, $RuntimeEnvFile)) {
    if (-not (Test-Path -LiteralPath $RequiredPath -PathType Leaf)) {
      throw "governed runtime authority is missing: $RequiredPath"
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
    deviceFingerprint = "runtime-multisurface-$RunId-$Username"
  }
  Require-Status $Login @(200) "login $Username"
  $Token = "$(Get-Value $Login.Json 'accessToken')"
  Require (-not [string]::IsNullOrWhiteSpace($Token)) "login returned no token for $Username"

  $Session = Invoke-Api GET "$IdentityBaseUrl/auth/session" @{ Authorization = "Bearer $Token" }
  Require-Status $Session @(200) "session $Username"
  $Subject = "$(Get-Value $Session.Json 'subject')"
  Require (-not [string]::IsNullOrWhiteSpace($Subject)) "session returned no subject for $Username"
  return [pscustomobject]@{
    Username = $Username
    Role = $ExpectedRole
    Token = $Token
    Subject = $Subject
  }
}

function Headers([object]$Actor, [string]$Operation, [switch]$ReadOnly) {
  $Result = @{
    Authorization = "Bearer $($Actor.Token)"
    "X-Correlation-ID" = "runtime-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))"
  }
  if (-not $ReadOnly) {
    $Result["Idempotency-Key"] = "runtime-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))"
  }
  return $Result
}

function Find-Id([object[]]$Items, [string]$Id) {
  # PowerShell unwraps a one-element function result into a scalar. Keep the
  # governed readback shape collection-valued so callers can safely inspect
  # .Count for zero, one, or many matches under StrictMode.
  $Matches = @($Items | Where-Object { "$(Get-Value $_ 'id')" -eq $Id })
  return ,$Matches
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
  if ($Matching.Count -gt 0) {
    return "$(Get-Value $Matching[0] 'id')"
  }

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
  $ReplayHeaders["Idempotency-Key"] = "runtime-address-replay-$RunId"
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

# This matrix uses the one provisioned local captain. Repeated failed runs may
# leave an offered/accepted test assignment occupying that captain's governed
# capacity. Reconcile only assignments owned by this exact test captain before
# creating the next isolated run; unrelated captains and orders are untouched.
$CaptainAssignmentsBeforeRun = Invoke-Api GET "$DshBaseUrl/dsh/operator/dispatch/assignments" (Headers $Operator "captain-capacity-reconcile" -ReadOnly)
Require-Status $CaptainAssignmentsBeforeRun @(200) "captain capacity reconciliation read"
foreach ($StaleAssignment in @((Get-Value $CaptainAssignmentsBeforeRun.Json 'assignments') | Where-Object {
  "$(Get-Value $_ 'captainId')" -eq $Captain.Subject -and
  "$(Get-Value $_ 'status')" -notin @("completed", "cancelled")
})) {
  $StaleAssignmentId = "$(Get-Value $StaleAssignment 'id')"
  $StaleCancelHeaders = Headers $Operator "captain-capacity-reconcile-$StaleAssignmentId"
  $StaleCancel = Invoke-Api POST "$DshBaseUrl/dsh/operator/dispatch/assignments/$StaleAssignmentId/cancel" $StaleCancelHeaders @{
    reasonCode = "runtime_test_reset"
    reason = "reconcile stale local runtime matrix assignment before a new isolated run"
  }
  Require-Status $StaleCancel @(204) "stale captain assignment cancellation"
}

$StorePoint = Resolve-GovernedStoreServicePoint -StoreId "store-test-grocery"

$Anonymous = Invoke-Api GET "$DshBaseUrl/dsh/client/orders"
Require-Status $Anonymous @(401) "anonymous client orders"
$CrossRole = Invoke-Api GET "$DshBaseUrl/dsh/client/orders" (Headers $Partner "cross-role" -ReadOnly)
Require-Status $CrossRole @(403) "partner reading client orders"

$AddressId = Ensure-ClientAddress $Client $StorePoint
foreach ($CandidateStoreId in @("store-test-grocery", "store-test-electronics", "store-test-pharmacy", "store-test-restaurant", "store-test-sweets")) {
  $ExistingCart = Invoke-Api GET "$DshBaseUrl/dsh/client/cart?storeId=$CandidateStoreId" (Headers $Client "cart-read-$CandidateStoreId" -ReadOnly)
  Require-Status $ExistingCart @(200) "client cart read $CandidateStoreId"
  if ($null -ne (Get-Value $ExistingCart.Json 'cart')) {
    $Clear = Invoke-Api DELETE "$DshBaseUrl/dsh/client/cart?storeId=$CandidateStoreId" (Headers $Client "cart-clear-$CandidateStoreId")
    Require-Status $Clear @(204) "client cart clear $CandidateStoreId"
  }
}

$Catalog = Invoke-Api GET "$DshBaseUrl/dsh/stores/store-test-grocery/catalog"
Require-Status $Catalog @(200) "published catalog"
$Products = @((Get-Value $Catalog.Json 'products'))
Require ($Products.Count -gt 0) "published catalog has no products"
$ProductId = "$(Get-Value $Products[0] 'masterProductId')"
if ([string]::IsNullOrWhiteSpace($ProductId)) {
  $ProductId = "$(Get-Value $Products[0] 'id')"
}
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
$CartReadback = Invoke-Api GET "$DshBaseUrl/dsh/client/cart?storeId=store-test-grocery" (Headers $Client "cart-readback" -ReadOnly)
Require-Status $CartReadback @(200) "client cart readback"
$CartVersion = [int](Get-Value (Get-Value $CartReadback.Json 'cart') 'version')
Require ($CartVersion -gt 0) "cart returned no governed version"

$Checkout = Invoke-Api POST "$DshBaseUrl/dsh/client/checkout-intents" (Headers $Client "checkout") @{
  cartId = $CartId
  storeId = "store-test-grocery"
  expectedCartVersion = $CartVersion
  fulfillmentMode = "bthwani_delivery"
  paymentMethod = "cod"
  deliveryAddressId = $AddressId
  note = "governed multi-surface closure $RunId"
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
$OrderReplay = Invoke-Api POST "$DshBaseUrl/dsh/client/orders" (Headers $Client "order-replay") @{ checkoutIntentId = $CheckoutId }
Require-Status $OrderReplay @(200) "order replay from checkout"
Require ("$(Get-Value (Get-Value $OrderReplay.Json 'order') 'id')" -eq $OrderId) "order replay created a duplicate order"

$ClientOrders = Invoke-Api GET "$DshBaseUrl/dsh/client/orders" (Headers $Client "client-orders" -ReadOnly)
Require-Status $ClientOrders @(200) "client orders"
Require ((Find-Id @((Get-Value $ClientOrders.Json 'orders')) $OrderId).Count -eq 1) "client order list missed created order"

$PartnerWorkboard = Invoke-Api GET "$DshBaseUrl/dsh/partner/order-workboard?storeId=store-test-grocery" (Headers $Partner "partner-workboard" -ReadOnly)
Require-Status $PartnerWorkboard @(200) "partner order workboard"
$PartnerOrder = Find-Id @((Get-Value $PartnerWorkboard.Json 'orders')) $OrderId
Require ($PartnerOrder.Count -eq 1) "partner workboard did not receive order"
$OrderVersion = [int](Get-Value $PartnerOrder[0] 'version')
Require ($OrderVersion -gt 0) "partner workboard returned no governed order version"
Require (@((Get-Value $PartnerOrder[0] 'allowedActions')) -contains "accept") "partner workboard did not authorize accept"

$DecisionHeaders = Headers $Partner "partner-accept"
$DecisionHeaders["If-Match-Version"] = "$OrderVersion"
$Accepted = Invoke-Api POST "$DshBaseUrl/dsh/partner/orders/$OrderId/decision?storeId=store-test-grocery" $DecisionHeaders @{ decision = "accept" }
Require-Status $Accepted @(200) "partner governed accept"
Require ("$(Get-Value (Get-Value $Accepted.Json 'order') 'status')" -eq "store_accepted") "partner accept status mismatch"

$PreparingHeaders = Headers $Partner "partner-preparing"
$PreparingHeaders["If-Match-Version"] = "$(Get-Value (Get-Value $Accepted.Json 'order') 'version')"
$Preparing = Invoke-Api POST "$DshBaseUrl/dsh/partner/orders/$OrderId/preparing?storeId=store-test-grocery" $PreparingHeaders
Require-Status $Preparing @(200) "partner preparing"
$ReadyHeaders = Headers $Partner "partner-ready"
$ReadyHeaders["If-Match-Version"] = "$(Get-Value (Get-Value $Preparing.Json 'order') 'version')"
$Ready = Invoke-Api POST "$DshBaseUrl/dsh/partner/orders/$OrderId/ready?storeId=store-test-grocery" $ReadyHeaders
Require-Status $Ready @(200) "partner ready"
Require ("$(Get-Value (Get-Value $Ready.Json 'order') 'status')" -eq "ready_for_pickup") "ready status mismatch"

$OperatorOrders = Invoke-Api GET "$DshBaseUrl/dsh/operator/orders" (Headers $Operator "operator-orders" -ReadOnly)
Require-Status $OperatorOrders @(200) "operator orders"
Require ((Find-Id @((Get-Value $OperatorOrders.Json 'orders')) $OrderId).Count -eq 1) "operator did not read ready order"

$AssignmentCreate = Invoke-Api POST "$DshBaseUrl/dsh/operator/dispatch/assignments" (Headers $Operator "assignment-create") @{
  orderId = $OrderId
  captainId = $Captain.Subject
  serviceAreaCode = $StorePoint.ServiceAreaCode
}
Require-Status $AssignmentCreate @(201) "operator assignment"
$AssignmentId = "$(Get-Value (Get-Value $AssignmentCreate.Json 'assignment') 'id')"
Require (-not [string]::IsNullOrWhiteSpace($AssignmentId)) "assignment returned no id"

$DuplicateAssignment = Invoke-Api POST "$DshBaseUrl/dsh/operator/dispatch/assignments" (Headers $Operator "assignment-duplicate") @{
  orderId = $OrderId
  captainId = $Captain.Subject
  serviceAreaCode = $StorePoint.ServiceAreaCode
}
Require-Status $DuplicateAssignment @(409) "duplicate assignment"

$CaptainAssignments = Invoke-Api GET "$DshBaseUrl/dsh/captain/dispatch/assignments" (Headers $Captain "captain-assignments" -ReadOnly)
Require-Status $CaptainAssignments @(200) "captain assignments"
Require ((Find-Id @((Get-Value $CaptainAssignments.Json 'assignments')) $AssignmentId).Count -eq 1) "captain did not receive assignment"

$BeforeAcceptLocation = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" (Headers $Captain "location-before-accept") @{
  latitude = $StorePoint.Latitude
  longitude = $StorePoint.Longitude
  accuracyMeters = 5
  recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Require-Status $BeforeAcceptLocation @(409) "location before accept"

$Accept = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/accept" (Headers $Captain "captain-accept")
Require-Status $Accept @(200) "captain accept"

$InvalidLocation = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" (Headers $Captain "location-invalid") @{
  latitude = 95
  longitude = $StorePoint.Longitude
  accuracyMeters = 5
  recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Require-Status $InvalidLocation @(400) "invalid captain latitude"

$OutOfOrderHeaders = Headers $Captain "pickup-before-arrival"
$OutOfOrderHeaders["If-Match-Version"] = "$(Get-Value (Get-Value $Accept.Json 'assignment') 'version')"
$OutOfOrder = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" $OutOfOrderHeaders @{
  status = "picked_up"
  version = [int](Get-Value (Get-Value $Accept.Json 'assignment') 'version')
}
Require-Status $OutOfOrder @(409) "pickup before store arrival"

$Location = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" (Headers $Captain "location-valid") @{
  latitude = $StorePoint.Latitude
  longitude = $StorePoint.Longitude
  accuracyMeters = 5
  recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Require-Status $Location @(200) "valid captain location"

$Tracking = Invoke-Api GET "$DshBaseUrl/dsh/client/orders/$OrderId/tracking" (Headers $Client "tracking" -ReadOnly)
Require-Status $Tracking @(200) "client tracking"
$TrackingAssignment = Get-Value $Tracking.Json 'assignment'
Require ("$(Get-Value (Get-Value $Tracking.Json 'tracking') 'locationVisibility')" -eq "hidden_until_pickup") "tracking exposed captain location before pickup"
Require ($null -eq (Get-Value $TrackingAssignment 'lastLatitude')) "tracking exposed captain latitude before pickup"

$ArrivedStoreHeaders = Headers $Captain "arrived-store"
$ArrivedStoreHeaders["If-Match-Version"] = "$(Get-Value (Get-Value $Location.Json 'assignment') 'version')"
$ArrivedStore = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" $ArrivedStoreHeaders @{
  status = "driver_arrived_store"
  latitude = $StorePoint.Latitude
  longitude = $StorePoint.Longitude
  version = [int](Get-Value (Get-Value $Location.Json 'assignment') 'version')
}
Require-Status $ArrivedStore @(200) "captain store arrival"

$PickupWithoutHandoffHeaders = Headers $Captain "pickup-without-handoff"
$PickupWithoutHandoffHeaders["If-Match-Version"] = "$(Get-Value (Get-Value $ArrivedStore.Json 'assignment') 'version')"
$PickupWithoutHandoff = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" $PickupWithoutHandoffHeaders @{
  status = "picked_up"
  version = [int](Get-Value (Get-Value $ArrivedStore.Json 'assignment') 'version')
}
Require-Status $PickupWithoutHandoff @(409) "pickup without partner handoff"
Require ("$(Get-Value $PickupWithoutHandoff.Json 'code')" -eq "STORE_HANDOFF_REQUIRED") "pickup without handoff did not fail closed"

$Handoff = Invoke-Api POST "$DshBaseUrl/dsh/partner/orders/$OrderId/captain-handoff/confirm?storeId=store-test-grocery" (Headers $Partner "partner-handoff")
Require-Status $Handoff @(200) "partner captain handoff"
$HandoffBody = Get-Value $Handoff.Json 'handoff'
Require ("$(Get-Value $HandoffBody 'assignmentId')" -eq $AssignmentId) "handoff assignment mismatch"
Require ("$(Get-Value $HandoffBody 'status')" -eq "partner_confirmed") "handoff status mismatch"

$PickedUpHeaders = Headers $Captain "picked-up"
$PickedUpHeaders["If-Match-Version"] = "$(Get-Value (Get-Value $ArrivedStore.Json 'assignment') 'version')"
$PickedUp = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" $PickedUpHeaders @{
  status = "picked_up"
  version = [int](Get-Value (Get-Value $ArrivedStore.Json 'assignment') 'version')
}
Require-Status $PickedUp @(200) "captain pickup after handoff"

$TrackingAfterPickup = Invoke-Api GET "$DshBaseUrl/dsh/client/orders/$OrderId/tracking" (Headers $Client "tracking-after-pickup" -ReadOnly)
Require-Status $TrackingAfterPickup @(200) "client tracking after pickup"
Require ("$(Get-Value (Get-Value $TrackingAfterPickup.Json 'tracking') 'locationVisibility')" -eq "delivery_window_rounded") "tracking did not expose captain location after pickup"
$TrackingAfterPickupAssignment = Get-Value $TrackingAfterPickup.Json 'assignment'
Require ([math]::Abs([double](Get-Value $TrackingAfterPickupAssignment 'lastLatitude') - $StorePoint.Latitude) -lt 0.000001) "tracking latitude mismatch after pickup"

$ArrivedCustomerHeaders = Headers $Captain "arrived-customer"
$ArrivedCustomerHeaders["If-Match-Version"] = "$(Get-Value (Get-Value $PickedUp.Json 'assignment') 'version')"
$ArrivedCustomer = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" $ArrivedCustomerHeaders @{
  status = "arrived_customer"
  latitude = $StorePoint.Latitude
  longitude = $StorePoint.Longitude
  version = [int](Get-Value (Get-Value $PickedUp.Json 'assignment') 'version')
}
Require-Status $ArrivedCustomer @(200) "captain customer arrival"

$PinIssue = Invoke-Api POST "$DshBaseUrl/dsh/client/orders/$OrderId/delivery-pin" (Headers $Client "delivery-pin")
Require-Status $PinIssue @(201) "client delivery PIN issue"
$DeliveryPin = "$(Get-Value $PinIssue.Json 'pin')"
Require ($DeliveryPin -match '^\d{6}$') "delivery PIN was not issued in governed six-digit format"

$ProofHeaders = Headers $Captain "delivery-proof"
$Proof = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/delivery-proof" $ProofHeaders @{
  method = "otp_pin"
  pin = $DeliveryPin
  recipientRelationship = "customer"
}
Require-Status $Proof @(200) "governed delivery proof"
$ProofBody = Get-Value $Proof.Json 'proof'
$ProofId = "$(Get-Value $ProofBody 'id')"
Require (-not [string]::IsNullOrWhiteSpace($ProofId)) "delivery proof returned no id"
Require ("$(Get-Value $ProofBody 'status')" -eq "accepted") "delivery proof was not accepted"
Require ("$(Get-Value $ProofBody 'method')" -eq "otp_pin") "delivery proof method mismatch"

$ProofReplay = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/delivery-proof" $ProofHeaders @{
  method = "otp_pin"
  pin = $DeliveryPin
  recipientRelationship = "customer"
}
Require-Status $ProofReplay @(200) "delivery proof idempotent replay"
Require ("$(Get-Value (Get-Value $ProofReplay.Json 'proof') 'id')" -eq $ProofId) "delivery proof replay created a duplicate"

$RepeatedProof = Invoke-Api POST "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/delivery-proof" (Headers $Captain "delivery-proof-repeat") @{
  method = "otp_pin"
  pin = $DeliveryPin
  recipientRelationship = "customer"
}
Require-Status $RepeatedProof @(409) "new delivery proof after completion"

$CaptainActiveAfterCompletion = Invoke-Api GET "$DshBaseUrl/dsh/captain/dispatch/assignments" (Headers $Captain "captain-after-completion" -ReadOnly)
Require-Status $CaptainActiveAfterCompletion @(200) "captain active assignments after completion"
Require ((Find-Id @((Get-Value $CaptainActiveAfterCompletion.Json 'assignments')) $AssignmentId).Count -eq 0) "completed assignment remained in captain active inbox"

$OperatorFinalAssignments = Invoke-Api GET "$DshBaseUrl/dsh/operator/dispatch/assignments" (Headers $Operator "operator-final-assignments" -ReadOnly)
Require-Status $OperatorFinalAssignments @(200) "operator final assignments"
$DeliveredMatches = Find-Id @((Get-Value $OperatorFinalAssignments.Json 'assignments')) $AssignmentId
Require ($DeliveredMatches.Count -eq 1) "completed assignment disappeared from operator history"
$DeliveredAssignment = $DeliveredMatches[0]
Require ("$(Get-Value $DeliveredAssignment 'status')" -eq "completed") "assignment did not complete"
Require ("$(Get-Value (Get-Value $DeliveredAssignment 'delivery') 'status')" -eq "delivered") "delivery did not complete"
Require ($null -eq (Get-Value $DeliveredAssignment 'lastLatitude')) "captain location was not purged"
Require ($null -eq (Get-Value $DeliveredAssignment 'lastLongitude')) "captain longitude was not purged"
Require ($null -eq (Get-Value $DeliveredAssignment 'locationRecordedAt')) "captain location timestamp was not purged"

$FinalClient = Invoke-Api GET "$DshBaseUrl/dsh/client/orders/$OrderId" (Headers $Client "client-final" -ReadOnly)
Require-Status $FinalClient @(200) "client delivered readback"
Require ("$(Get-Value (Get-Value $FinalClient.Json 'order') 'status')" -eq "delivered") "client did not read delivered status"

$FinalPartner = Invoke-Api GET "$DshBaseUrl/dsh/partner/order-workboard?storeId=store-test-grocery" (Headers $Partner "partner-final" -ReadOnly)
Require-Status $FinalPartner @(200) "partner delivered readback"
$PartnerFinalMatch = Find-Id @((Get-Value $FinalPartner.Json 'orders')) $OrderId
Require ($PartnerFinalMatch.Count -eq 1 -and "$(Get-Value $PartnerFinalMatch[0] 'status')" -eq "delivered") "partner did not read delivered status"

$OutboxSql = "SELECT COUNT(*) FROM dsh_wlt_outbox_events WHERE event_type='delivery_completed' AND order_id='$OrderId'::uuid AND status IN ('pending','processing','sent');"
$OutboxCount = Invoke-DshRuntimeScalar -Statement $OutboxSql
Require ([int]$OutboxCount -eq 1) "delivery did not create exactly one WLT outbox event"

$MockedVisit = Invoke-Api POST "$DshBaseUrl/dsh/field/stores/store-test-grocery/visits" (Headers $Field "field-mocked") @{
  visitType = "periodic"
  startLocation = @{
    latitude = $StorePoint.Latitude
    longitude = $StorePoint.Longitude
    accuracyMeters = 5
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    provider = "android-fused"
    deviceReference = "runtime-field-$RunId"
    isMocked = $true
  }
}
Require-Status $MockedVisit @(400) "mocked field GPS"
Require ("$(Get-Value $MockedVisit.Json 'code')" -eq "LOCATION_MOCKED") "mocked GPS code mismatch"

$ValidVisit = Invoke-Api POST "$DshBaseUrl/dsh/field/stores/store-test-grocery/visits" (Headers $Field "field-visit") @{
  visitType = "periodic"
  startLocation = @{
    latitude = $StorePoint.Latitude
    longitude = $StorePoint.Longitude
    accuracyMeters = 5
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    provider = "android-fused"
    deviceReference = "runtime-field-$RunId"
    isMocked = $false
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
  description = "governed multi-surface escalation $RunId"
}
Require-Status $EscalationCreate @(201) "field escalation create"
$EscalationId = "$(Get-Value (Get-Value $EscalationCreate.Json 'escalation') 'id')"
Require (-not [string]::IsNullOrWhiteSpace($EscalationId)) "field escalation returned no id"

$OperatorEscalations = Invoke-Api GET "$DshBaseUrl/dsh/operator/field-readiness/escalations" (Headers $Operator "operator-escalations" -ReadOnly)
Require-Status $OperatorEscalations @(200) "operator escalation list"
Require ((Find-Id @((Get-Value $OperatorEscalations.Json 'escalations')) $EscalationId).Count -eq 1) "operator did not read field escalation"

$Resolve = Invoke-Api PATCH "$DshBaseUrl/dsh/operator/field-readiness/escalations/$EscalationId" (Headers $Operator "operator-resolve") @{
  status = "resolved"
  resolutionNote = "resolved by governed runtime closure"
}
Require-Status $Resolve @(200) "operator escalation resolution"
Require ("$(Get-Value (Get-Value $Resolve.Json 'escalation') 'status')" -eq "resolved") "escalation did not resolve"

$PrematureCompletion = Invoke-Api POST "$DshBaseUrl/dsh/field/visits/$VisitId/complete" (Headers $Field "field-complete-early") @{
  completionLocation = @{
    latitude = $StorePoint.Latitude
    longitude = $StorePoint.Longitude
    accuracyMeters = 5
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    provider = "android-fused"
    deviceReference = "runtime-field-$RunId"
    isMocked = $false
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
  deliveryProofId = $ProofId
  fieldVisitId = $VisitId
  escalationId = $EscalationId
  proven = @(
    "authentication and role isolation",
    "governed service-area resolution",
    "address idempotency and ownership",
    "central catalog cart checkout and WLT handoff",
    "order replay idempotency and assignment duplicate rejection",
    "versioned idempotent partner order decision",
    "partner preparation lifecycle",
    "operator dispatch with explicit service-area authority",
    "captain active-inbox ownership and live tracking",
    "arrival geofence coordinates",
    "fail-closed store-captain handoff",
    "governed delivery PIN and idempotent proof acceptance",
    "completed assignment removal from captain active inbox",
    "operator historical completion readback",
    "location purge on terminal delivery",
    "exactly one durable DSH-to-WLT delivery event",
    "field mocked-GPS rejection and work queue",
    "field-to-control-panel escalation and resolution",
    "field checklist fail-closed completion"
  )
} | ConvertTo-Json -Depth 10
Write-Host "DSH five-surface governed runtime matrix v2: PASS"
