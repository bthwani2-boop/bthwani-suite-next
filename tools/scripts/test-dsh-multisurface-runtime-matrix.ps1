[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:58080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:58082",
  [string]$IdentityPassword = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if ([string]::IsNullOrWhiteSpace($IdentityPassword)) {
  $IdentityPassword = if ($env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD) { $env:IDENTITY_LOCAL_BOOTSTRAP_PASSWORD } else { "123456" }
}
$RunId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

function Get-PropertyValue {
  param([object]$Object, [string]$Name)
  if ($null -eq $Object) { return $null }
  $Property = $Object.PSObject.Properties[$Name]
  if ($null -eq $Property) { return $null }
  return $Property.Value
}

function Invoke-Http {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )
  $Parameters = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    TimeoutSec = 20
    SkipHttpErrorCheck = $true
  }
  if ($null -ne $Body) {
    $Parameters.ContentType = "application/json"
    $Parameters.Body = $Body | ConvertTo-Json -Depth 15
  }
  $Response = Invoke-WebRequest @Parameters
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

function Assert-Status {
  param([object]$Response, [int[]]$Expected, [string]$Name)
  if ($Expected -notcontains $Response.Status) {
    throw "$Name expected HTTP $($Expected -join '/') but received $($Response.Status): $($Response.Content)"
  }
}

function Assert-Value {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Get-Actor {
  param([string]$Username, [string]$ExpectedRole)
  $Login = Invoke-Http -Method POST -Url "$IdentityBaseUrl/auth/login" -Body @{
    username = $Username
    password = $IdentityPassword
    deviceFingerprint = "lian-multisurface-$RunId-$Username"
  }
  Assert-Status $Login @(200) "identity login for $Username"
  $Token = "$((Get-PropertyValue $Login.Json 'accessToken'))"
  Assert-Value (-not [string]::IsNullOrWhiteSpace($Token)) "identity login returned no token for $Username"
  $Session = Invoke-Http -Method GET -Url "$IdentityBaseUrl/auth/session" -Headers @{ Authorization = "Bearer $Token" }
  Assert-Status $Session @(200) "identity session for $Username"
  $Subject = "$((Get-PropertyValue $Session.Json 'subject'))"
  Assert-Value (-not [string]::IsNullOrWhiteSpace($Subject)) "identity session returned no subject for $Username"
  $Roles = @((Get-PropertyValue $Session.Json 'roles'))
  if ($Roles.Count -gt 0) {
    Assert-Value ($Roles -contains $ExpectedRole) "identity session for $Username does not include role $ExpectedRole"
  }
  return [pscustomobject]@{ Username = $Username; Token = $Token; Subject = $Subject; Role = $ExpectedRole }
}

function New-Headers {
  param([object]$Actor, [string]$Operation, [switch]$NoIdempotency)
  $Headers = @{
    Authorization = "Bearer $($Actor.Token)"
    "X-Correlation-ID" = "lian-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))"
  }
  if (-not $NoIdempotency) {
    $Headers["Idempotency-Key"] = "lian-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))"
  }
  return $Headers
}

function Find-ById {
  param([object[]]$Items, [string]$Id)
  return @($Items | Where-Object { "$((Get-PropertyValue $_ 'id'))" -eq $Id })
}

$Client = Get-Actor "client" "client"
$Partner = Get-Actor "bthwani" "partner"
$Captain = Get-Actor "captain" "captain"
$Field = Get-Actor "field" "field"
$Operator = Get-Actor "operator" "operator"

$Anonymous = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/client/orders"
Assert-Status $Anonymous @(401) "anonymous client orders"
$CrossRole = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/client/orders" -Headers (New-Headers $Partner "partner-client-orders" -NoIdempotency)
Assert-Status $CrossRole @(403) "partner accessing client orders"

$Catalog = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/stores/store-test-grocery/catalog"
Assert-Status $Catalog @(200) "published catalog"
$Products = @((Get-PropertyValue $Catalog.Json 'products'))
Assert-Value ($Products.Count -gt 0) "published catalog has no products"
$Product = $Products[0]
$ProductId = "$((Get-PropertyValue $Product 'masterProductId'))"
if ([string]::IsNullOrWhiteSpace($ProductId)) { $ProductId = "$((Get-PropertyValue $Product 'id'))" }
Assert-Value (-not [string]::IsNullOrWhiteSpace($ProductId)) "catalog product has no governed identifier"

$Cart = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/client/cart/items" -Headers (New-Headers $Client "cart") -Body @{
  storeId = "store-test-grocery"
  fulfillmentMode = "bthwani_delivery"
  masterProductId = $ProductId
  quantity = 1
}
Assert-Status $Cart @(200, 201) "client cart upsert"
$CartId = "$((Get-PropertyValue $Cart.Json 'cartId'))"
if ([string]::IsNullOrWhiteSpace($CartId)) {
  $CartObject = Get-PropertyValue $Cart.Json 'cart'
  $CartId = "$((Get-PropertyValue $CartObject 'id'))"
}
Assert-Value (-not [string]::IsNullOrWhiteSpace($CartId)) "client cart returned no cart id"

$Checkout = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/client/checkout-intents" -Headers (New-Headers $Client "checkout") -Body @{
  cartId = $CartId
  storeId = "store-test-grocery"
  fulfillmentMode = "bthwani_delivery"
  paymentMethod = "cod"
  deliveryAddress = "Sanaa runtime multisurface $RunId"
  note = "lian multi-surface closure"
}
Assert-Status $Checkout @(201) "client checkout"
$Intent = Get-PropertyValue $Checkout.Json 'intent'
$CheckoutId = "$((Get-PropertyValue $Intent 'id'))"
$WltPaymentSessionId = "$((Get-PropertyValue $Intent 'wltPaymentSessionId'))"
Assert-Value (-not [string]::IsNullOrWhiteSpace($CheckoutId)) "checkout returned no intent id"
Assert-Value (-not [string]::IsNullOrWhiteSpace($WltPaymentSessionId)) "checkout returned no WLT payment session"

$OrderCreate = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/client/orders" -Headers (New-Headers $Client "order-create") -Body @{
  checkoutIntentId = $CheckoutId
}
Assert-Status $OrderCreate @(201) "client order create"
$Order = Get-PropertyValue $OrderCreate.Json 'order'
$OrderId = "$((Get-PropertyValue $Order 'id'))"
Assert-Value (-not [string]::IsNullOrWhiteSpace($OrderId)) "order create returned no id"

$ClientOrders = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/client/orders" -Headers (New-Headers $Client "client-list" -NoIdempotency)
Assert-Status $ClientOrders @(200) "client order list"
Assert-Value ((Find-ById @((Get-PropertyValue $ClientOrders.Json 'orders')) $OrderId).Count -eq 1) "client order list did not read back the created order"
$ClientOrder = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/client/orders/$OrderId" -Headers (New-Headers $Client "client-read" -NoIdempotency)
Assert-Status $ClientOrder @(200) "client order read"

$PartnerOrders = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/partner/orders" -Headers (New-Headers $Partner "partner-list" -NoIdempotency)
Assert-Status $PartnerOrders @(200) "partner order list"
Assert-Value ((Find-ById @((Get-PropertyValue $PartnerOrders.Json 'orders')) $OrderId).Count -eq 1) "partner did not receive the client order"

$Accepted = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/partner/orders/$OrderId/accept" -Headers (New-Headers $Partner "partner-accept")
Assert-Status $Accepted @(200) "partner accept"
Assert-Value ("$((Get-PropertyValue (Get-PropertyValue $Accepted.Json 'order') 'status'))" -eq "store_accepted") "partner accept returned wrong status"
$Preparing = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/partner/orders/$OrderId/preparing" -Headers (New-Headers $Partner "partner-preparing")
Assert-Status $Preparing @(200) "partner preparing"
Assert-Value ("$((Get-PropertyValue (Get-PropertyValue $Preparing.Json 'order') 'status'))" -eq "preparing") "partner preparing returned wrong status"
$Ready = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/partner/orders/$OrderId/ready" -Headers (New-Headers $Partner "partner-ready")
Assert-Status $Ready @(200) "partner ready"
Assert-Value ("$((Get-PropertyValue (Get-PropertyValue $Ready.Json 'order') 'status'))" -eq "ready_for_pickup") "partner ready returned wrong status"

$OperatorOrders = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/operator/orders" -Headers (New-Headers $Operator "operator-list" -NoIdempotency)
Assert-Status $OperatorOrders @(200) "operator order list"
Assert-Value ((Find-ById @((Get-PropertyValue $OperatorOrders.Json 'orders')) $OrderId).Count -eq 1) "operator did not read the ready order"

$AssignmentCreate = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/operator/dispatch/assignments" -Headers (New-Headers $Operator "dispatch-create") -Body @{
  orderId = $OrderId
  captainId = $Captain.Subject
}
Assert-Status $AssignmentCreate @(201) "operator assignment create"
$Assignment = Get-PropertyValue $AssignmentCreate.Json 'assignment'
$AssignmentId = "$((Get-PropertyValue $Assignment 'id'))"
Assert-Value (-not [string]::IsNullOrWhiteSpace($AssignmentId)) "operator assignment returned no id"

$CaptainList = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/captain/dispatch/assignments" -Headers (New-Headers $Captain "captain-list" -NoIdempotency)
Assert-Status $CaptainList @(200) "captain assignment list"
Assert-Value ((Find-ById @((Get-PropertyValue $CaptainList.Json 'assignments')) $AssignmentId).Count -eq 1) "captain did not receive the assignment"

$LocationBeforeAccept = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" -Headers (New-Headers $Captain "location-before-accept") -Body @{
  latitude = 15.35
  longitude = 44.20
  recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Assert-Status $LocationBeforeAccept @(409) "captain location before accept"

$AcceptAssignment = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/accept" -Headers (New-Headers $Captain "captain-accept")
Assert-Status $AcceptAssignment @(200) "captain assignment accept"

$InvalidLocation = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" -Headers (New-Headers $Captain "invalid-location") -Body @{
  latitude = 95
  longitude = 44.20
  recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Assert-Status $InvalidLocation @(400) "captain invalid location"

$OutOfOrderPickup = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" -Headers (New-Headers $Captain "pickup-out-of-order") -Body @{ status = "picked_up" }
Assert-Status $OutOfOrderPickup @(409) "captain pickup before store arrival"

$ValidLocation = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/location" -Headers (New-Headers $Captain "valid-location") -Body @{
  latitude = 15.3501
  longitude = 44.2001
  recordedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Assert-Status $ValidLocation @(200) "captain valid location"

$Tracking = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/client/orders/$OrderId/tracking" -Headers (New-Headers $Client "client-tracking" -NoIdempotency)
Assert-Status $Tracking @(200) "client tracking"
$TrackingAssignment = Get-PropertyValue $Tracking.Json 'assignment'
Assert-Value ([math]::Abs([double](Get-PropertyValue $TrackingAssignment 'lastLatitude') - 15.3501) -lt 0.000001) "client tracking did not read back captain latitude"

foreach ($DeliveryStatus in @("driver_arrived_store", "picked_up", "arrived_customer")) {
  $Progress = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/status" -Headers (New-Headers $Captain "delivery-$DeliveryStatus") -Body @{ status = $DeliveryStatus }
  Assert-Status $Progress @(200) "captain delivery status $DeliveryStatus"
  $Delivery = Get-PropertyValue (Get-PropertyValue $Progress.Json 'assignment') 'delivery'
  Assert-Value ("$((Get-PropertyValue $Delivery 'status'))" -eq $DeliveryStatus) "delivery did not reach $DeliveryStatus"
}

$PoDReference = "runtime://pod/$AssignmentId/$RunId"
$Delivered = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/pod" -Headers (New-Headers $Captain "pod") -Body @{
  method = "photo"
  reference = $PoDReference
  note = "lian runtime delivery proof"
}
Assert-Status $Delivered @(200) "captain proof of delivery"
$DeliveredAssignment = Get-PropertyValue $Delivered.Json 'assignment'
Assert-Value ("$((Get-PropertyValue $DeliveredAssignment 'status'))" -eq "completed") "assignment did not complete"
$DeliveredRecord = Get-PropertyValue $DeliveredAssignment 'delivery'
Assert-Value ("$((Get-PropertyValue $DeliveredRecord 'status'))" -eq "delivered") "delivery did not reach delivered"
Assert-Value ($null -eq (Get-PropertyValue $DeliveredAssignment 'lastLatitude')) "captain location was not purged on completion"
Assert-Value ("$((Get-PropertyValue $DeliveredRecord 'podReference'))" -eq $PoDReference) "PoD reference was not persisted"

$RepeatedPoD = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/captain/dispatch/assignments/$AssignmentId/pod" -Headers (New-Headers $Captain "pod-replay") -Body @{
  method = "photo"
  reference = $PoDReference
}
Assert-Status $RepeatedPoD @(409) "repeated proof of delivery"

$FinalClientOrder = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/client/orders/$OrderId" -Headers (New-Headers $Client "client-final" -NoIdempotency)
Assert-Status $FinalClientOrder @(200) "client final order read"
Assert-Value ("$((Get-PropertyValue (Get-PropertyValue $FinalClientOrder.Json 'order') 'status'))" -eq "delivered") "client order did not read back delivered status"
$FinalPartnerOrders = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/partner/orders" -Headers (New-Headers $Partner "partner-final" -NoIdempotency)
Assert-Status $FinalPartnerOrders @(200) "partner final order list"
$PartnerFinal = Find-ById @((Get-PropertyValue $FinalPartnerOrders.Json 'orders')) $OrderId
Assert-Value ($PartnerFinal.Count -eq 1 -and "$((Get-PropertyValue $PartnerFinal[0] 'status'))" -eq "delivered") "partner did not read back delivered status"

$OutboxSql = "SELECT COUNT(*) FROM dsh_wlt_outbox_events WHERE event_type='delivery_completed' AND order_id='$OrderId'::uuid AND status IN ('pending','processing','sent');"
$OutboxCount = docker compose --env-file infra/docker/env/runtime.env.example -f infra/docker/compose.runtime.yml exec -T postgres `
  psql -U dsh_runtime -d dsh_runtime -tAc $OutboxSql
if ($LASTEXITCODE -ne 0) { throw "could not inspect DSH to WLT delivery outbox" }
Assert-Value ([int](($OutboxCount -join "").Trim()) -eq 1) "delivery did not create exactly one durable WLT outbox event"

$FieldHeaders = New-Headers $Field "field-work-queue" -NoIdempotency
$FieldQueueBefore = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/field/work-queue" -Headers $FieldHeaders
Assert-Status $FieldQueueBefore @(200) "field work queue"
$CapturedAt = [DateTimeOffset]::UtcNow.ToString("o")
$MockedVisit = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/field/stores/store-test-grocery/visits" -Headers (New-Headers $Field "field-mocked") -Body @{
  visitType = "periodic"
  storeLatitude = 15.3500
  storeLongitude = 44.2000
  startLocation = @{
    latitude = 15.3500
    longitude = 44.2000
    accuracyMeters = 5
    capturedAt = $CapturedAt
    provider = "android-fused"
    deviceReference = "lian-field-$RunId"
    isMocked = $true
  }
}
Assert-Status $MockedVisit @(400) "field mocked GPS rejection"
Assert-Value ("$((Get-PropertyValue $MockedVisit.Json 'code'))" -eq "LOCATION_MOCKED") "mocked GPS did not return LOCATION_MOCKED"

$ValidVisit = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/field/stores/store-test-grocery/visits" -Headers (New-Headers $Field "field-visit") -Body @{
  visitType = "periodic"
  storeLatitude = 15.3500
  storeLongitude = 44.2000
  startLocation = @{
    latitude = 15.3500
    longitude = 44.2000
    accuracyMeters = 5
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    provider = "android-fused"
    deviceReference = "lian-field-$RunId"
    isMocked = $false
  }
}
Assert-Status $ValidVisit @(201) "field visit create"
$Visit = Get-PropertyValue $ValidVisit.Json 'visit'
$VisitId = "$((Get-PropertyValue $Visit 'id'))"
Assert-Value (-not [string]::IsNullOrWhiteSpace($VisitId)) "field visit returned no id"

$QueueAfter = Invoke-Http -Method GET -Url "$DshBaseUrl/dsh/field/work-queue" -Headers (New-Headers $Field "field-queue-after" -NoIdempotency)
Assert-Status $QueueAfter @(200) "field work queue readback"
Assert-Value ((Find-ById @((Get-PropertyValue $QueueAfter.Json 'visits')) $VisitId).Count -eq 1) "field work queue did not include the new visit"

$PrematureComplete = Invoke-Http -Method POST -Url "$DshBaseUrl/dsh/field/visits/$VisitId/complete" -Headers (New-Headers $Field "field-complete-early") -Body @{
  completionLocation = @{
    latitude = 15.3500
    longitude = 44.2000
    accuracyMeters = 5
    capturedAt = [DateTimeOffset]::UtcNow.ToString("o")
    provider = "android-fused"
    deviceReference = "lian-field-$RunId"
    isMocked = $false
  }
}
Assert-Status $PrematureComplete @(409) "field premature completion"
Assert-Value ("$((Get-PropertyValue $PrematureComplete.Json 'code'))" -eq "CHECKLIST_INCOMPLETE") "premature field completion did not fail with CHECKLIST_INCOMPLETE"

[ordered]@{
  state = "PASS"
  runId = $RunId
  surfaces = @("app-client", "app-partner", "app-captain", "app-field", "control-panel")
  orderId = $OrderId
  checkoutIntentId = $CheckoutId
  wltPaymentSessionId = $WltPaymentSessionId
  assignmentId = $AssignmentId
  fieldVisitId = $VisitId
  assertions = @(
    "anonymous and cross-role access rejected",
    "client cart checkout order persisted",
    "partner accepted prepared and readied order",
    "operator assigned governed captain",
    "captain location and state ordering enforced",
    "client tracking read captain location",
    "proof of delivery completed and purged location",
    "DSH emitted exactly one durable WLT delivery event",
    "field mocked GPS rejected",
    "field visit appeared in work queue",
    "field completion blocked before governed checklist"
  )
} | ConvertTo-Json -Depth 10
Write-Host "DSH five-surface order, delivery, financial-outbox, and field matrix: PASS"
