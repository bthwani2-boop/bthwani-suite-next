[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:58080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:58082",
  [string]$IdentityPassword = ""
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
  param([string]$Method, [string]$Url, [hashtable]$Headers = @{}, [object]$Body = $null)
  $Request = @{ Method = $Method; Uri = $Url; Headers = $Headers; TimeoutSec = 30; SkipHttpErrorCheck = $true }
  if ($null -ne $Body) {
    $Request.ContentType = "application/json"
    $Request.Body = $Body | ConvertTo-Json -Depth 12
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
function Require([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }

function Login([string]$Username) {
  $Response = Invoke-Api POST "$IdentityBaseUrl/auth/login" @{} @{
    username = $Username
    password = $IdentityPassword
    deviceFingerprint = "lian-support-$RunId-$Username"
  }
  Require-Status $Response @(200) "login $Username"
  $Token = "$(Get-Value $Response.Json 'accessToken')"
  Require (-not [string]::IsNullOrWhiteSpace($Token)) "login returned no token for $Username"
  $Session = Invoke-Api GET "$IdentityBaseUrl/auth/session" @{ Authorization = "Bearer $Token" }
  Require-Status $Session @(200) "session $Username"
  return [pscustomobject]@{ Token = $Token; Subject = "$(Get-Value $Session.Json 'subject')"; Username = $Username }
}

function Headers([object]$Actor, [string]$Operation, [switch]$ReadOnly) {
  $Result = @{
    Authorization = "Bearer $($Actor.Token)"
    "X-Correlation-ID" = "lian-support-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))"
  }
  if (-not $ReadOnly) { $Result["Idempotency-Key"] = "lian-support-$Operation-$RunId-$([guid]::NewGuid().ToString('N'))" }
  return $Result
}

function Contains-Id([object[]]$Items, [string]$Id) {
  return @($Items | Where-Object { "$(Get-Value $_ 'id')" -eq $Id }).Count -eq 1
}

function Invoke-DshScalar([string]$Sql) {
  $Result = docker compose --env-file infra/docker/env/runtime.env.example -f infra/docker/compose.runtime.yml exec -T postgres `
    psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1 -tAc $Sql
  if ($LASTEXITCODE -ne 0) { throw "DSH SQL failed" }
  return ($Result -join "").Trim()
}

function Escape-Sql([string]$Value) { return $Value.Replace("'", "''") }

$Client = Login "client"
$Partner = Login "bthwani"
$Operator = Login "operator"

$TicketCreate = Invoke-Api POST "$DshBaseUrl/dsh/support/tickets" (Headers $Client "ticket-create") @{
  storeId = "store-test-grocery"
  subject = "Runtime ownership ticket $RunId"
  description = "Verify reporter isolation, internal messages, public replies, and governed resolution."
  category = "order_issue"
  priority = "high"
}
Require-Status $TicketCreate @(201) "client support ticket create"
$TicketId = "$(Get-Value (Get-Value $TicketCreate.Json 'ticket') 'id')"
Require (-not [string]::IsNullOrWhiteSpace($TicketId)) "support ticket returned no id"

$ClientList = Invoke-Api GET "$DshBaseUrl/dsh/support/tickets" (Headers $Client "client-ticket-list" -ReadOnly)
Require-Status $ClientList @(200) "client ticket list"
Require (Contains-Id @((Get-Value $ClientList.Json 'tickets')) $TicketId) "client ticket list missed created ticket"

$PartnerRead = Invoke-Api GET "$DshBaseUrl/dsh/support/tickets/$TicketId" (Headers $Partner "partner-cross-read" -ReadOnly)
Require-Status $PartnerRead @(404) "partner cross-ticket read"
$PartnerMessage = Invoke-Api POST "$DshBaseUrl/dsh/support/tickets/$TicketId/messages" (Headers $Partner "partner-cross-message") @{
  body = "unauthorized cross-actor message"
  isInternal = $false
}
Require-Status $PartnerMessage @(404) "partner cross-ticket message"
$PartnerMessages = Invoke-Api GET "$DshBaseUrl/dsh/support/tickets/$TicketId/messages" (Headers $Partner "partner-cross-list" -ReadOnly)
Require-Status $PartnerMessages @(404) "partner cross-ticket message list"

$OperatorTickets = Invoke-Api GET "$DshBaseUrl/dsh/operator/support/tickets" (Headers $Operator "operator-ticket-list" -ReadOnly)
Require-Status $OperatorTickets @(200) "operator support list"
Require (Contains-Id @((Get-Value $OperatorTickets.Json 'tickets')) $TicketId) "operator support list missed ticket"

$InReview = Invoke-Api PATCH "$DshBaseUrl/dsh/operator/support/tickets/$TicketId" (Headers $Operator "ticket-in-review") @{
  status = "in_review"
  assignedTo = $Operator.Subject
}
Require-Status $InReview @(200) "operator ticket assignment"
Require ("$(Get-Value (Get-Value $InReview.Json 'ticket') 'status')" -eq "in_review") "ticket did not enter in_review"

$Internal = Invoke-Api POST "$DshBaseUrl/dsh/support/tickets/$TicketId/messages" (Headers $Operator "internal-message") @{
  body = "internal investigation note $RunId"
  isInternal = $true
}
Require-Status $Internal @(201) "operator internal message"
$InternalId = "$(Get-Value (Get-Value $Internal.Json 'message') 'id')"
$Public = Invoke-Api POST "$DshBaseUrl/dsh/support/tickets/$TicketId/messages" (Headers $Operator "public-message") @{
  body = "public support response $RunId"
  isInternal = $false
}
Require-Status $Public @(201) "operator public message"
$PublicId = "$(Get-Value (Get-Value $Public.Json 'message') 'id')"

$ClientMessages = Invoke-Api GET "$DshBaseUrl/dsh/support/tickets/$TicketId/messages" (Headers $Client "client-message-list" -ReadOnly)
Require-Status $ClientMessages @(200) "client support messages"
$ClientMessageItems = @((Get-Value $ClientMessages.Json 'messages'))
Require (Contains-Id $ClientMessageItems $PublicId) "client did not receive public support message"
Require (-not (Contains-Id $ClientMessageItems $InternalId)) "internal support message leaked to client"

$OperatorMessages = Invoke-Api GET "$DshBaseUrl/dsh/support/tickets/$TicketId/messages" (Headers $Operator "operator-message-list" -ReadOnly)
Require-Status $OperatorMessages @(200) "operator support messages"
$OperatorMessageItems = @((Get-Value $OperatorMessages.Json 'messages'))
Require (Contains-Id $OperatorMessageItems $PublicId) "operator message list missed public message"
Require (Contains-Id $OperatorMessageItems $InternalId) "operator message list missed internal message"

$ClientReply = Invoke-Api POST "$DshBaseUrl/dsh/support/tickets/$TicketId/messages" (Headers $Client "client-reply") @{
  body = "client confirmation reply $RunId"
  isInternal = $true
}
Require-Status $ClientReply @(201) "client support reply"
Require (-not [bool](Get-Value (Get-Value $ClientReply.Json 'message') 'isInternal')) "client was able to create an internal message"

$Resolved = Invoke-Api PATCH "$DshBaseUrl/dsh/operator/support/tickets/$TicketId" (Headers $Operator "ticket-resolve") @{
  status = "resolved"
  assignedTo = $Operator.Subject
}
Require-Status $Resolved @(200) "operator ticket resolve"
Require ("$(Get-Value (Get-Value $Resolved.Json 'ticket') 'status')" -eq "resolved") "ticket did not resolve"
$ClientReadback = Invoke-Api GET "$DshBaseUrl/dsh/support/tickets/$TicketId" (Headers $Client "client-ticket-readback" -ReadOnly)
Require-Status $ClientReadback @(200) "client resolved ticket readback"
Require ("$(Get-Value (Get-Value $ClientReadback.Json 'ticket') 'status')" -eq "resolved") "client did not read resolved status"

$Topic = "support.ticket.updated"
$Config = Invoke-Api PUT "$DshBaseUrl/dsh/operator/notifications/config" (Headers $Operator "notification-config") @{
  topic = $Topic
  actorTypes = @("client")
  isEnabled = $true
  description = "Runtime governed support notifications"
}
Require-Status $Config @(200) "operator notification config"
Require ([bool](Get-Value (Get-Value $Config.Json 'config') 'isEnabled')) "notification config was not enabled"

$Preference = Invoke-Api PUT "$DshBaseUrl/dsh/notifications/preferences" (Headers $Client "notification-preference") @{
  topic = $Topic
  enabled = $true
}
Require-Status $Preference @(200) "client notification preference"
Require ([bool](Get-Value (Get-Value $Preference.Json 'preference') 'enabled')) "client notification preference was not enabled"

$ClientIdSql = Escape-Sql $Client.Subject
$TicketIdSql = Escape-Sql $TicketId
$NotificationId = Invoke-DshScalar @"
INSERT INTO dsh_notifications (actor_id, actor_type, topic, title, body, action_url)
VALUES ('$ClientIdSql', 'client', '$Topic', 'Support ticket updated', 'Ticket $TicketIdSql resolved', '/support/tickets/$TicketIdSql')
RETURNING id::text;
"@
Require (-not [string]::IsNullOrWhiteSpace($NotificationId)) "notification insert returned no id"

$ClientNotifications = Invoke-Api GET "$DshBaseUrl/dsh/notifications" (Headers $Client "client-notifications" -ReadOnly)
Require-Status $ClientNotifications @(200) "client notifications"
Require (Contains-Id @((Get-Value $ClientNotifications.Json 'notifications')) $NotificationId) "client did not receive inserted notification"
Require ([int](Get-Value $ClientNotifications.Json 'unreadCount') -ge 1) "client unread count did not increase"

$PartnerNotifications = Invoke-Api GET "$DshBaseUrl/dsh/notifications" (Headers $Partner "partner-notifications" -ReadOnly)
Require-Status $PartnerNotifications @(200) "partner notifications"
Require (-not (Contains-Id @((Get-Value $PartnerNotifications.Json 'notifications')) $NotificationId)) "client notification leaked to partner"
$PartnerMarkRead = Invoke-Api POST "$DshBaseUrl/dsh/notifications/$NotificationId/read" (Headers $Partner "partner-mark-client-notification")
Require-Status $PartnerMarkRead @(404) "partner marking client notification"

$MarkRead = Invoke-Api POST "$DshBaseUrl/dsh/notifications/$NotificationId/read" (Headers $Client "client-mark-read")
Require-Status $MarkRead @(200) "client mark notification read"
Require ([bool](Get-Value (Get-Value $MarkRead.Json 'notification') 'isRead')) "notification did not become read"

$SecondNotificationId = Invoke-DshScalar @"
INSERT INTO dsh_notifications (actor_id, actor_type, topic, title, body, action_url)
VALUES ('$ClientIdSql', 'client', '$Topic', 'Second support update', 'Read-all verification', '/support/tickets/$TicketIdSql')
RETURNING id::text;
"@
$ReadAll = Invoke-Api POST "$DshBaseUrl/dsh/notifications/read-all" (Headers $Client "client-read-all")
Require-Status $ReadAll @(200) "client mark all notifications read"
Require ([int](Get-Value $ReadAll.Json 'markedCount') -ge 1) "read-all marked no notifications"
$FinalNotifications = Invoke-Api GET "$DshBaseUrl/dsh/notifications" (Headers $Client "client-notifications-final" -ReadOnly)
Require-Status $FinalNotifications @(200) "client final notifications"
Require ([int](Get-Value $FinalNotifications.Json 'unreadCount') -eq 0) "client unread count did not return to zero"
Require (Contains-Id @((Get-Value $FinalNotifications.Json 'notifications')) $SecondNotificationId) "second notification disappeared"

[ordered]@{
  state = "PASS"
  ticketId = $TicketId
  notificationId = $NotificationId
  secondNotificationId = $SecondNotificationId
  proven = @(
    "ticket reporter ownership",
    "cross-actor ticket and message isolation",
    "operator assignment and resolution",
    "internal message redaction",
    "client internal-message downgrade",
    "platform notification configuration",
    "actor notification preference",
    "notification actor isolation",
    "individual mark-read ownership",
    "read-all and unread-count readback"
  )
} | ConvertTo-Json -Depth 8
Write-Host "DSH support ownership and notification runtime matrix: PASS"
