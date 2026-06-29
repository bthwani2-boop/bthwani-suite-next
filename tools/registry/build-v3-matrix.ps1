# Build V3 Master Matrix — complete in single pass
# Run from: C:\bthwani-suite-next
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$v3Header = "master_v3_id,master_id,slice_id,slice_order,service,section,surface,consumer_surfaces,app,actor,capability,journey_id,page_id,screen_id,logic_id,source_matrix,source_record_ids,source_path,target_path,route_path,target_anchor,fragment_id,layer,artifact_type,operation,domain_rule,business_domain_rules,db_state_lifecycle,dispatch_policy,pricing_policy,finance_policy,notification_triggers,integration_infrastructure,external_dependencies,ui_localization_rules,build_target,rbac_tenant_rule,audit_privacy_rule,rollback_compensation_rule,policy_parameters,policy_owner,provider_decision,api_contract,db_objects,auth_rule,wlt_boundary,wlt_dependency,idempotency_required,state_transitions,error_cases,negative_cases,performance_rule,observability_rule,ui_kit_compliance,visual_reference,evidence_required,decision,status,blocker_code,next_action,acceptance_gate,verification_command,risk,rollback,duplicate_key,notes"
$v3Cols = $v3Header -split ','
$auditStd = "audit actor_id actor_role object_id action from_state to_state correlation_id timestamp; mask phone/location; never log payment secrets; mask provider references"
$uiLocStd = "RTL required; translation keys only; no hardcoded strings; Arabic typography via ui-kit tokens; localized number/date/currency formatting"

function New-PR {
    param([hashtable]$f)
    $r=[ordered]@{}
    foreach($c in $script:v3Cols){ $r[$c]=if($f.ContainsKey($c)){$f[$c]}else{""} }
    [PSCustomObject]$r
}

# Load repaired V2
$v2Rows = Import-Csv "machine-readable\slice_execution_master_matrix.csv" -Encoding utf8
Write-Host "V2 rows loaded: $($v2Rows.Count)"

$allRows = [System.Collections.Generic.List[PSCustomObject]]::new()
$idx = 1

# ===== PART 1: Convert V2 rows to V3 format =====
foreach ($row in $v2Rows) {
    $surface = $row."surface"; $service = $row."service"; $sliceId = $row."slice_id"; $layer = $row."layer"
    $extDeps = $row."integration_dependencies"; if (-not $extDeps) { $extDeps = "N/A_READ_ONLY:not-applicable" }
    $uiLoc = $row."i18n_rtl_rules"; if (-not $uiLoc -or $uiLoc -eq "") { $uiLoc = if ($surface -in @("app-client","app-partner","app-captain","app-field","control-panel","webapp","website")) { $uiLocStd } else { "N/A_READ_ONLY:not-applicable" } }
    $buildTarget = $row."store_build_target"; if (-not $buildTarget -or $buildTarget -eq "") { $buildTarget = if ($surface -in @("app-client","app-partner","app-captain","app-field")) { "expo-dev-client; store-submission reserved until PRE_STORE_READINESS_GATE" } elseif ($surface -eq "control-panel") { "local web/control-panel runtime; production deploy reserved" } else { "not-applicable" } }
    $rbacRule = switch ($surface) { "app-client" { "client own data only; deny cross-tenant without object existence leak" } "app-partner" { "partner own store only; deny cross-tenant without object existence leak" } "app-captain" { "captain assigned tasks only; deny cross-tenant without object existence leak" } "app-field" { "field assigned visits only; deny cross-tenant without object existence leak" } "control-panel" { "operator role-scoped and audited; support operational read only without payment card data" } default { "N/A_READ_ONLY:not-applicable" } }
    $auditPrivacy = if ($service -eq "wlt" -or $sliceId -like "WLT*" -or $sliceId -like "DSH-WLT*" -or $layer -match "backend") { $auditStd } else { "N/A_READ_ONLY:not-applicable" }
    $rollbackComp = $row."rollback"; if (-not $rollbackComp -or $rollbackComp -eq "") { $rollbackComp = "N/A_READ_ONLY:not-applicable" }
    $providerDecision = if ($extDeps -ne "N/A_READ_ONLY:not-applicable") { "TBD_CONFIG_REQUIRED:provider-not-decided-use-abstract-contract" } else { "N/A_READ_ONLY:not-applicable" }
    $dispatchPolicy = if ($sliceId -like "DSH-WLT*" -or $layer -match "dispatch") { "BLOCKED_NEEDS_DOMAIN_MODEL:dispatch-policy-spec-pending" } else { "N/A_READ_ONLY:not-applicable" }
    $pricingPolicy = if ($service -eq "wlt" -or $sliceId -like "WLT*") { "BLOCKED_NEEDS_WLT:pricing-policy-spec-pending" } else { "N/A_READ_ONLY:not-applicable" }
    $financePolicy = if ($service -eq "wlt" -or $sliceId -like "WLT*" -or $sliceId -like "DSH-WLT*") { "BLOCKED_NEEDS_WLT:finance-policy-spec-pending" } else { "N/A_READ_ONLY:not-applicable" }
    $integInfra = if ($row."wlt_dependency" -ne "") { "wlt-dependency:$($row."wlt_dependency")" } else { "N/A_READ_ONLY:not-applicable" }

    $r=[ordered]@{}
    foreach($c in $v3Cols) {
        $r[$c] = switch ($c) {
            "master_v3_id"              { "V3-$($idx.ToString("D5"))" }
            "dispatch_policy"           { $dispatchPolicy }
            "pricing_policy"            { $pricingPolicy }
            "finance_policy"            { $financePolicy }
            "integration_infrastructure"{ $integInfra }
            "external_dependencies"     { $extDeps }
            "ui_localization_rules"     { $uiLoc }
            "build_target"              { $buildTarget }
            "rbac_tenant_rule"          { $rbacRule }
            "audit_privacy_rule"        { $auditPrivacy }
            "rollback_compensation_rule"{ $rollbackComp }
            "policy_parameters"         { "N/A_READ_ONLY:not-applicable" }
            "policy_owner"              { $service }
            "provider_decision"         { $providerDecision }
            default { if ($c -in $row.PSObject.Properties.Name) { $row.$c } else { "" } }
        }
    }
    $allRows.Add([PSCustomObject]$r)
    $idx++
}

Write-Host "V2->V3 converted: $($allRows.Count)"

# ===== PART 2: DSH order state machine (15 states) =====
$dsm_states = @("pending","store-accepted","preparing","ready-for-pickup","dispatching","driver-assigned","driver-arrived-store","picked-up","arrived-customer","delivered","cancelled-by-client","cancelled-by-store","cancelled-no-driver","failed-payment","failed-dispatch")
foreach ($state in $dsm_states) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-DSH-ORDER-STATE-$($state.ToUpper() -replace '-','_')"; "slice_id"="DSH-011"; "service"="dsh"; "section"="order-state-machine"; "surface"="system"; "capability"="order-state-machine"; "layer"="domain"; "artifact_type"="state-policy"; "operation"="state-transition"; "domain_rule"="DSH owns order state lifecycle; WLT owns financial truth"; "business_domain_rules"="Order state [$state]: DSH DB authoritative for operational state; WLT triggered only at payment-relevant transitions"; "db_state_lifecycle"="orders table state column; valid_from/valid_to; transition_log"; "notification_triggers"="order.state.$state"; "idempotency_required"="true: state transitions idempotent by correlation_id"; "state_transitions"=$state; "rollback_compensation_rule"="invalid transition -> no state mutation and audited rejection"; "audit_privacy_rule"=$auditStd; "rbac_tenant_rule"="N/A_READ_ONLY:domain-policy-row"; "error_cases"="invalid_transition; duplicate_transition; auth_failure"; "observability_rule"="emit order.state.changed event on every transition"; "evidence_required"="BLOCKED_NEEDS_DOMAIN_MODEL:state-machine-diagram-required"; "decision"="BLOCKED_NEEDS_DOMAIN_MODEL"; "status"="BLOCKED_NEEDS_EVIDENCE"; "blocker_code"="MISSING_ORDER_STATE_MACHINE_SPEC"; "next_action"="define DSH order state machine before DSH-011 execution"; "risk"="HIGH: incorrect state machine causes incorrect financial triggers"; "rollback"="invalid transition -> no state mutation; audited rejection logged"; "policy_owner"="dsh"; "provider_decision"="N/A_READ_ONLY:not-applicable"; "api_contract"="BLOCKED_NEEDS_API_CONTRACT:order-state-transition-api-pending"; "auth_rule"="BLOCKED_NEEDS_API_CONTRACT:auth-pending"; "wlt_boundary"="DSH operational"; "notes"="Canonical DSH order state: $state" }))
    $idx++
}
Write-Host "After DSH states: $($allRows.Count)"

# ===== PART 3: WLT financial state machine (15 states) =====
$wlt_states = @("payment-initiated","authorization-hold","authorized","capture-in-progress","captured","settlement-in-progress","settled","refund-requested","refund-in-progress","refund-completed","refund-failed","reversal-requested","reversal-completed","failed","expired")
foreach ($state in $wlt_states) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-WLT-FIN-STATE-$($state.ToUpper() -replace '-','_')"; "slice_id"="WLT-001"; "service"="wlt"; "section"="wlt-financial-state-machine"; "surface"="system"; "capability"="financial-state-machine"; "layer"="domain"; "artifact_type"="state-policy"; "operation"="financial-state-transition"; "domain_rule"="WLT owns all financial state; DSH references only paymentSessionId/status"; "business_domain_rules"="Financial state [$state]: WLT is sole truth; DSH must not replicate financial state calculations"; "db_state_lifecycle"="payment_sessions table; state column; audit_log; idempotency_keys"; "finance_policy"="BLOCKED_NEEDS_WLT:financial-policy-spec-pending"; "pricing_policy"="BLOCKED_NEEDS_WLT:pricing-policy-spec-pending"; "wlt_boundary"="WLT financial truth"; "idempotency_required"="true: all WLT state transitions idempotent by payment_session_id + idempotency_key"; "state_transitions"=$state; "rollback_compensation_rule"="dispatch failure after authorization -> release authorization hold; WLT callback duplicate -> idempotent no-op; provider timeout -> query provider status before retry"; "audit_privacy_rule"=$auditStd; "error_cases"="duplicate_idempotency_key; provider_timeout; auth_failure; insufficient_balance; invalid_transition"; "negative_cases"="partial capture; provider callback late; settlement mismatch; COD reconciliation failure"; "observability_rule"="emit wlt.financial.state.changed on every transition with correlation_id"; "auth_rule"="BLOCKED_NEEDS_API_CONTRACT:wlt-auth-rule-pending"; "api_contract"="BLOCKED_NEEDS_API_CONTRACT:wlt-payment-session-api-pending"; "evidence_required"="BLOCKED_NEEDS_WLT:wlt-financial-state-machine-diagram"; "decision"="BLOCKED_NEEDS_WLT"; "status"="BLOCKED_NEEDS_WLT"; "blocker_code"="MISSING_WLT_FINANCIAL_STATE_MACHINE_SPEC"; "next_action"="define WLT financial state machine before WLT-001 execution"; "risk"="CRITICAL: incorrect financial state machine causes settlement errors"; "rollback"="partial refund -> recalculate commission/tax/settlement through WLT; invalid transition -> no state mutation"; "provider_decision"="TBD_CONFIG_REQUIRED:provider-not-decided-use-abstract-contract"; "policy_owner"="wlt"; "rbac_tenant_rule"="N/A_READ_ONLY:domain-policy-row"; "notes"="Canonical WLT financial state: $state" }))
    $idx++
}
Write-Host "After WLT financial states: $($allRows.Count)"

# ===== PART 4: Dispatch policy (7) =====
$dispatchPolicies = @(
    @{ cap="dispatch-radial-search"; rule="Search drivers within configurable radius; expand if no match within timeout" }
    @{ cap="dispatch-priority-routing"; rule="Priority: online captain -> nearest -> highest rating -> manual escalation" }
    @{ cap="dispatch-auto-reject"; rule="Auto-reject if captain does not accept within configurable window" }
    @{ cap="dispatch-batching"; rule="Batch orders to same captain if same zone and within time window" }
    @{ cap="dispatch-manual-escalation"; rule="Operator can manually assign captain from control panel if auto fails" }
    @{ cap="dispatch-geofencing"; rule="Active polygon; inactive zone; store radius; stale zone version check" }
    @{ cap="dispatch-partner-blacklist"; rule="Do not dispatch to blocked partners; check partner status before dispatch" }
)
foreach ($dp in $dispatchPolicies) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-DSH-DISPATCH-$($dp.cap.ToUpper() -replace '-','_')"; "slice_id"="DSH-WLT-001"; "service"="dsh"; "section"="dispatch-policy"; "surface"="system"; "capability"=$dp.cap; "layer"="domain"; "artifact_type"="dispatch-policy"; "operation"="dispatch-assignment"; "domain_rule"="DSH owns dispatch logic; WLT owns payment authorization before dispatch"; "business_domain_rules"=$dp.rule; "dispatch_policy"=$dp.rule; "db_state_lifecycle"="dispatch_attempts; captain_assignments; zone_config"; "idempotency_required"="true: dispatch attempt idempotent by order_id + attempt_sequence"; "state_transitions"="pending->dispatching->driver-assigned"; "rollback_compensation_rule"="dispatch failure after authorization -> release authorization; auto escalate to manual"; "audit_privacy_rule"=$auditStd; "rbac_tenant_rule"="operator role-scoped; captain assigned tasks only"; "auth_rule"="BLOCKED_NEEDS_API_CONTRACT:dispatch-auth-pending"; "api_contract"="BLOCKED_NEEDS_API_CONTRACT:dispatch-api-pending"; "evidence_required"="BLOCKED_NEEDS_DOMAIN_MODEL:dispatch-policy-spec-required"; "decision"="BLOCKED_NEEDS_DOMAIN_MODEL"; "status"="BLOCKED_NEEDS_EVIDENCE"; "blocker_code"="MISSING_DISPATCH_POLICY_SPEC"; "next_action"="define dispatch policy before DSH-WLT-001 execution"; "risk"="HIGH: incorrect dispatch causes order failures and financial holds"; "rollback"="dispatch failure -> release payment authorization; requeue order"; "policy_owner"="dsh"; "provider_decision"="N/A_READ_ONLY:not-applicable"; "external_dependencies"="N/A_READ_ONLY:internal-dispatch-logic"; "notes"="Canonical dispatch policy: $($dp.cap)" }))
    $idx++
}
Write-Host "After dispatch: $($allRows.Count)"

# ===== PART 5: Pricing policy (6) =====
$pricingPolicies = @(
    @{ cap="pricing-base-fare"; rule="Base fare calculated from store category, distance, and time; owned by WLT" }
    @{ cap="pricing-surge-multiplier"; rule="Surge multiplier applied on high demand periods; configurable per zone" }
    @{ cap="pricing-delivery-fee"; rule="Delivery fee: base + distance tier + surge; WLT calculates final" }
    @{ cap="pricing-service-fee"; rule="Platform service fee: fixed percentage of order subtotal; WLT ledger entry" }
    @{ cap="pricing-discount-coupon"; rule="Discount applied before final charge; WLT validates coupon and recalculates" }
    @{ cap="pricing-minimum-order"; rule="Minimum order value enforced at checkout; DSH serviceability check" }
)
foreach ($pp in $pricingPolicies) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-WLT-PRICING-$($pp.cap.ToUpper() -replace '-','_')"; "slice_id"="WLT-005"; "service"="wlt"; "section"="pricing-policy"; "surface"="system"; "capability"=$pp.cap; "layer"="domain"; "artifact_type"="pricing-policy"; "operation"="price-calculation"; "domain_rule"="WLT owns all financial calculations; DSH may display quote only"; "business_domain_rules"=$pp.rule; "pricing_policy"=$pp.rule; "finance_policy"="BLOCKED_NEEDS_WLT:finance-policy-pending"; "wlt_boundary"="WLT financial truth"; "idempotency_required"="true: price quotes idempotent by quoteId"; "rollback_compensation_rule"="partial refund -> recalculate commission/tax/settlement through WLT"; "audit_privacy_rule"=$auditStd; "evidence_required"="BLOCKED_NEEDS_WLT:pricing-policy-spec-required"; "decision"="BLOCKED_NEEDS_WLT"; "status"="BLOCKED_NEEDS_WLT"; "blocker_code"="MISSING_PRICING_POLICY_SPEC"; "next_action"="define WLT pricing policy before WLT-005 execution"; "risk"="HIGH: incorrect pricing causes revenue loss or overcharge"; "policy_owner"="wlt"; "provider_decision"="N/A_READ_ONLY:not-applicable"; "rbac_tenant_rule"="N/A_READ_ONLY:domain-policy-row"; "notes"="Canonical pricing policy: $($pp.cap)" }))
    $idx++
}
Write-Host "After pricing: $($allRows.Count)"

# ===== PART 6: COD policy (5) =====
$codPolicies = @(
    @{ cap="cod-driver-liability"; rule="Captain collects COD; liable for amount; auto-deducted from settlements" }
    @{ cap="cod-auto-block-dispatch"; rule="Captain with unreconciled COD above cap is blocked from dispatch" }
    @{ cap="cod-deposit-reconciliation"; rule="COD deposit reconciliation: captain deposits at collection point; WLT marks settled" }
    @{ cap="cod-cap-enforcement"; rule="Maximum COD per captain per day enforced; configurable by zone" }
    @{ cap="cod-daily-reconciliation"; rule="Daily COD reconciliation batch; discrepancies trigger manual review" }
)
foreach ($cod in $codPolicies) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-WLT-COD-$($cod.cap.ToUpper() -replace '-','_')"; "slice_id"="WLT-004"; "service"="wlt"; "section"="cod-policy"; "surface"="system"; "capability"=$cod.cap; "layer"="domain"; "artifact_type"="finance-policy"; "operation"="cod-management"; "domain_rule"="WLT owns COD financial truth; DSH owns collection operation trigger"; "business_domain_rules"=$cod.rule; "finance_policy"=$cod.rule; "wlt_boundary"="WLT financial truth - COD"; "wlt_dependency"="cod-reconciliation; settlement-cycle"; "idempotency_required"="true: COD deposit idempotent by deposit_reference_id"; "rollback_compensation_rule"="COD reconciliation failure -> quarantine to manual review; do not auto-release"; "audit_privacy_rule"=$auditStd; "evidence_required"="BLOCKED_NEEDS_WLT:cod-policy-spec-required"; "decision"="BLOCKED_NEEDS_WLT"; "status"="BLOCKED_NEEDS_WLT"; "blocker_code"="MISSING_COD_POLICY_SPEC"; "next_action"="define WLT COD policy before WLT-004 execution"; "risk"="CRITICAL: COD mismanagement causes driver liability and financial discrepancy"; "policy_owner"="wlt"; "provider_decision"="N/A_READ_ONLY:not-applicable"; "rbac_tenant_rule"="operator role-scoped and audited"; "notes"="Canonical COD policy: $($cod.cap)" }))
    $idx++
}
Write-Host "After COD: $($allRows.Count)"

# ===== PART 7: Notifications (23) =====
$notifications = @(
    @{ trigger="order.created"; actor="client"; msg="Order placed successfully" }
    @{ trigger="payment.pending"; actor="client"; msg="Payment processing" }
    @{ trigger="payment.failed"; actor="client"; msg="Payment failed - retry or use different method" }
    @{ trigger="store.accepted"; actor="client"; msg="Store accepted your order" }
    @{ trigger="order.preparing"; actor="client"; msg="Store is preparing your order" }
    @{ trigger="order.ready-for-pickup"; actor="captain"; msg="Order ready for pickup at store" }
    @{ trigger="order.dispatching"; actor="client"; msg="Driver is on the way to store" }
    @{ trigger="captain.assigned"; actor="client"; msg="Driver assigned to your order" }
    @{ trigger="captain.arrived-store"; actor="client"; msg="Driver arrived at store" }
    @{ trigger="order.picked-up"; actor="client"; msg="Driver picked up your order" }
    @{ trigger="captain.arrived-customer"; actor="client"; msg="Driver is at your location" }
    @{ trigger="order.delivered"; actor="client"; msg="Order delivered successfully" }
    @{ trigger="order.cancelled-by-client"; actor="client"; msg="Order cancellation confirmed" }
    @{ trigger="order.cancelled-by-store"; actor="client"; msg="Store cancelled - alternatives offered" }
    @{ trigger="order.cancelled-no-driver"; actor="client"; msg="No driver available - order cancelled" }
    @{ trigger="refund.pending"; actor="client"; msg="Refund initiated and being processed" }
    @{ trigger="refund.completed"; actor="client"; msg="Refund completed to your payment method" }
    @{ trigger="partner.activation"; actor="partner"; msg="Your store account has been activated" }
    @{ trigger="partner.document-review"; actor="partner"; msg="Document review status update" }
    @{ trigger="auth.otp"; actor="client,partner,captain,field"; msg="OTP verification code" }
    @{ trigger="support.ticket-created"; actor="client,partner"; msg="Support ticket created" }
    @{ trigger="support.ticket-updated"; actor="client,partner"; msg="Support ticket status updated" }
    @{ trigger="commission.settlement"; actor="captain"; msg="Commission settled to your wallet" }
)
foreach ($notif in $notifications) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-NOTIF-$($notif.trigger.ToUpper() -replace '[.-]','_')"; "slice_id"="DSH-WLT-003"; "service"="dsh"; "section"="notification-policy"; "surface"="all-surfaces"; "capability"="notification-trigger"; "layer"="integration"; "artifact_type"="notification-policy"; "operation"="push-notification"; "domain_rule"="DSH triggers notifications on order state changes; WLT triggers on financial events"; "business_domain_rules"="Trigger: $($notif.trigger) -> $($notif.msg)"; "notification_triggers"=$notif.trigger; "integration_infrastructure"="abstract-NotificationProvider; no named provider hardcoded"; "external_dependencies"="abstract-notification-provider"; "provider_decision"="TBD_CONFIG_REQUIRED:notification-provider-not-decided-use-abstract-NotificationProvider"; "rbac_tenant_rule"="actor: $($notif.actor)"; "audit_privacy_rule"="mask phone; never log notification content with PII; log event_id and correlation_id only"; "rollback_compensation_rule"="notification failure is non-blocking; retry with exponential backoff; dead-letter after 3 attempts"; "idempotency_required"="true: notifications idempotent by event_id"; "error_cases"="provider_unreachable; device_token_expired; rate_limit_exceeded"; "negative_cases"="user opted out; silent hours; duplicate notification"; "observability_rule"="emit notification.sent/failed events; track delivery rate per trigger type"; "evidence_required"="BLOCKED_NEEDS_PROVIDER_DECISION:notification-provider-contract-required"; "decision"="BLOCKED_NEEDS_PROVIDER_DECISION"; "status"="BLOCKED_NEEDS_EVIDENCE"; "blocker_code"="MISSING_NOTIFICATION_PROVIDER_CONTRACT"; "next_action"="define abstract NotificationProvider contract; choose provider in config not in code"; "risk"="MEDIUM: notification failure affects UX but is non-blocking for order flow"; "rollback"="notification failure -> retry queue; non-blocking"; "policy_owner"="dsh"; "ui_localization_rules"="translation keys only; no hardcoded strings; RTL layout support in notification body"; "build_target"="not-applicable"; "notes"="Canonical notification trigger: $($notif.trigger)" }))
    $idx++
}
Write-Host "After notifications: $($allRows.Count)"

# ===== PART 8: OpenAPI endpoints (10) =====
$endpoints = @(
    @{ method="GET"; path="/dsh/stores"; sliceId="DSH-002"; cap="store-listing"; svc="dsh" }
    @{ method="GET"; path="/dsh/stores/{storeId}"; sliceId="DSH-002"; cap="store-detail"; svc="dsh" }
    @{ method="GET"; path="/dsh/stores/{storeId}/catalog"; sliceId="DSH-002"; cap="store-catalog"; svc="dsh" }
    @{ method="POST"; path="/dsh/carts"; sliceId="DSH-003"; cap="cart-create"; svc="dsh" }
    @{ method="POST"; path="/dsh/checkout-intents"; sliceId="DSH-WLT-001"; cap="checkout-intent"; svc="dsh" }
    @{ method="GET"; path="/dsh/orders/{orderId}"; sliceId="DSH-011"; cap="order-status"; svc="dsh" }
    @{ method="POST"; path="/wlt/payment-sessions"; sliceId="WLT-001"; cap="payment-session-create"; svc="wlt" }
    @{ method="GET"; path="/wlt/payment-sessions/{paymentSessionId}"; sliceId="WLT-001"; cap="payment-session-get"; svc="wlt" }
    @{ method="GET"; path="/wlt/refunds/{refundId}"; sliceId="WLT-005"; cap="refund-status"; svc="wlt" }
    @{ method="GET"; path="/wlt/settlements/{settlementId}"; sliceId="WLT-004"; cap="settlement-status"; svc="wlt" }
)
foreach ($ep in $endpoints) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-API-$($ep.method)-$($ep.path.ToUpper() -replace '[/{}\-]','_')"; "slice_id"=$ep.sliceId; "service"=$ep.svc; "section"="openapi-endpoint-contract"; "surface"="system"; "capability"=$ep.cap; "layer"="backend"; "artifact_type"="api-contract"; "operation"="$($ep.method) $($ep.path)"; "domain_rule"="No endpoint created until API contract approved"; "api_contract"="BLOCKED_NEEDS_API_CONTRACT:$($ep.method.ToLower())-$($ep.path -replace '[/{}\-]','-')-pending"; "external_dependencies"="N/A_READ_ONLY:internal-api"; "auth_rule"="BLOCKED_NEEDS_API_CONTRACT:auth-rule-pending"; "error_cases"="BLOCKED_NEEDS_API_CONTRACT:error-cases-pending"; "negative_cases"="BLOCKED_NEEDS_API_CONTRACT:negative-cases-pending"; "performance_rule"="BLOCKED_NEEDS_API_CONTRACT:perf-rule-pending"; "observability_rule"="BLOCKED_NEEDS_API_CONTRACT:observability-pending"; "idempotency_required"=if($ep.method -eq "POST"){"true: POST idempotent by idempotency-key header"}else{"N/A: GET is idempotent by definition"}; "audit_privacy_rule"=$auditStd; "rbac_tenant_rule"="BLOCKED_NEEDS_API_CONTRACT:rbac-pending"; "rollback_compensation_rule"="BLOCKED_NEEDS_API_CONTRACT:rollback-pending"; "evidence_required"="BLOCKED_NEEDS_API_CONTRACT:openapi-spec-required"; "decision"="BLOCKED_NEEDS_API_CONTRACT"; "status"="BLOCKED_NEEDS_API_CONTRACT"; "blocker_code"="MISSING_API_CONTRACT"; "next_action"="handle in specific slice contract readiness"; "risk"="HIGH: no endpoint without contract approval"; "policy_owner"=$ep.svc; "provider_decision"="N/A_READ_ONLY:not-applicable"; "wlt_boundary"=if($ep.svc -eq "wlt"){"WLT financial truth"}else{"N/A_READ_ONLY:not-applicable"}; "notes"="OpenAPI endpoint blocked: $($ep.method) $($ep.path)" }))
    $idx++
}
Write-Host "After OpenAPI endpoints: $($allRows.Count)"

# ===== PART 9: WLT service manifest (1) =====
$allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-WLT-SERVICE-MANIFEST"; "slice_id"="WLT-001"; "service"="wlt"; "section"="service-manifest"; "surface"="system"; "capability"="wlt-service-manifest"; "layer"="governance"; "artifact_type"="manifest"; "target_path"="services/wlt/service.manifest.ts"; "domain_rule"="Real services use service.manifest.ts as active machine-readable contract"; "evidence_required"="BLOCKED_NEEDS_EVIDENCE:wlt-service-manifest-missing"; "decision"="BLOCKED_NEEDS_EVIDENCE"; "status"="BLOCKED_NEEDS_EVIDENCE"; "blocker_code"="MISSING_WLT_MANIFEST"; "next_action"="create WLT service manifest before WLT-001 or DSH-WLT execution"; "risk"="HIGH: no service manifest = uncontrolled execution"; "policy_owner"="wlt"; "provider_decision"="N/A_READ_ONLY:not-applicable"; "rbac_tenant_rule"="N/A_READ_ONLY:governance-row"; "audit_privacy_rule"="N/A_READ_ONLY:governance-row"; "rollback_compensation_rule"="N/A_READ_ONLY:governance-row"; "notes"="WLT service manifest required before any WLT/DSH-WLT execution" }))
$idx++

# ===== PART 10: DSH/WLT boundary policies (7) =====
$boundaries = @(
    @{ cap="dsh-wlt-boundary-ownership"; rule="DSH owns operational fulfillment only; WLT owns financial truth" }
    @{ cap="dsh-financial-field-restriction"; rule="DSH may store only quoteId/paymentSessionId/paymentStatus/financialReference - no financial calculations" }
    @{ cap="dsh-wlt-authorization-trigger"; rule="DSH triggers payment authorization at checkout; does not process payment" }
    @{ cap="dsh-wlt-settlement-prohibition"; rule="DSH must not calculate final collectible amount capture settle payout commission COD ledger reconciliation" }
    @{ cap="wlt-commission-settlement"; rule="WLT calculates and settles commission/platform fee/driver earnings per settlement cycle" }
    @{ cap="wlt-ledger-reconciliation"; rule="WLT maintains authoritative ledger; all reconciliation through WLT only" }
    @{ cap="wlt-refund-authority"; rule="Refunds initiated by DSH event but processed and reconciled by WLT only" }
)
foreach ($b in $boundaries) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-DSHWLT-$($b.cap.ToUpper() -replace '-','_')"; "slice_id"="DSH-WLT-001"; "service"="dsh"; "section"="dsh-wlt-boundary"; "surface"="system"; "capability"=$b.cap; "layer"="governance"; "artifact_type"="boundary-policy"; "operation"="boundary-enforcement"; "domain_rule"="DSH/WLT ownership boundary: $($b.rule)"; "business_domain_rules"=$b.rule; "wlt_boundary"="DSH operational; WLT financial truth"; "wlt_dependency"="wlt-financial-state-machine"; "idempotency_required"="N/A_READ_ONLY:governance-policy"; "rollback_compensation_rule"="DSH DB transition failure -> do not call WLT settlement"; "audit_privacy_rule"=$auditStd; "evidence_required"="BLOCKED_NEEDS_DOMAIN_MODEL:dsh-wlt-boundary-spec-required"; "decision"="BLOCKED_NEEDS_DOMAIN_MODEL"; "status"="BLOCKED_NEEDS_EVIDENCE"; "blocker_code"="MISSING_DSH_WLT_BOUNDARY_SPEC"; "next_action"="define DSH/WLT boundary before any DSH-WLT execution"; "risk"="CRITICAL: boundary violation causes financial data corruption"; "policy_owner"="dsh"; "rbac_tenant_rule"="N/A_READ_ONLY:governance-policy"; "provider_decision"="N/A_READ_ONLY:not-applicable"; "notes"="DSH/WLT boundary policy: $($b.cap)" }))
    $idx++
}
Write-Host "After boundary: $($allRows.Count)"

# ===== PART 11: External dependency rows (8) =====
$extDeps = @(
    @{ cap="maps-provider"; svc="dsh"; dep="abstract-maps-provider"; note="DSH requires maps for store discovery and captain tracking; no provider hardcoded" }
    @{ cap="sms-otp-provider"; svc="core"; dep="abstract-sms-provider"; note="OTP delivery; provider abstracted; no Twilio or similar hardcoded" }
    @{ cap="push-notification-provider"; svc="dsh"; dep="abstract-NotificationProvider"; note="Push notifications; provider abstracted" }
    @{ cap="payment-gateway-provider"; svc="wlt"; dep="abstract-payment-gateway"; note="Payment processing; no provider hardcoded; WLT routes through abstract gateway" }
    @{ cap="storage-provider"; svc="core"; dep="abstract-storage-provider"; note="Document/media storage; no S3 or Firebase hardcoded" }
    @{ cap="analytics-provider"; svc="core"; dep="abstract-analytics-provider"; note="Analytics events; no Firebase Analytics hardcoded" }
    @{ cap="email-provider"; svc="core"; dep="abstract-email-provider"; note="Transactional email; no SendGrid hardcoded" }
    @{ cap="geolocation-provider"; svc="dsh"; dep="abstract-geolocation-provider"; note="Captain live location; no Google Maps hardcoded" }
)
foreach ($ed in $extDeps) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-EXTDEP-$($ed.cap.ToUpper() -replace '-','_')"; "slice_id"="PLATFORM-001"; "service"=$ed.svc; "section"="external-dependency-policy"; "surface"="system"; "capability"=$ed.cap; "layer"="integration"; "artifact_type"="provider-contract"; "operation"="provider-abstraction"; "domain_rule"="No external provider selected by name; use abstract contract only"; "business_domain_rules"=$ed.note; "external_dependencies"=$ed.dep; "integration_infrastructure"="abstract-provider-contract"; "provider_decision"="TBD_CONFIG_REQUIRED:provider-not-decided-use-abstract-contract"; "evidence_required"="BLOCKED_NEEDS_PROVIDER_DECISION:abstract-provider-contract-required"; "decision"="BLOCKED_NEEDS_PROVIDER_DECISION"; "status"="BLOCKED_NEEDS_EVIDENCE"; "blocker_code"="MISSING_PROVIDER_CONTRACT"; "next_action"="define abstract provider contract; do not hardcode provider name"; "risk"="HIGH: hardcoded provider creates vendor lock-in"; "policy_owner"=$ed.svc; "rbac_tenant_rule"="N/A_READ_ONLY:integration-policy"; "audit_privacy_rule"="mask provider credentials; never log API keys"; "rollback_compensation_rule"="provider timeout -> query provider status before retry; switch to fallback if configured"; "notes"=$ed.note }))
    $idx++
}
Write-Host "After ext deps: $($allRows.Count)"

# ===== PART 12: Donor alias normalization (11) =====
$donorAliases = @(
    @{ alias="dashboard"; target="shell-overview"; svc="shared-app-shell"; sliceId="PLATFORM-001"; status="INVENTORY_ONLY"; decision="ADOPT_AS_IS" }
    @{ alias="operations"; target="operations"; svc="dsh"; sliceId="DSH-011"; status="INVENTORY_ONLY"; decision="ADAPT_NORMALIZE" }
    @{ alias="finance"; target="wallet-finance"; svc="wlt"; sliceId="WLT-001"; status="BLOCKED_NEEDS_WLT"; decision="BLOCKED_NEEDS_WLT" }
    @{ alias="catalogs"; target="catalog"; svc="dsh"; sliceId="DSH-002"; status="INVENTORY_ONLY"; decision="ADAPT_NORMALIZE" }
    @{ alias="community-services"; target="RESERVED_INVENTORY"; svc="reserved"; sliceId="RESERVED-001"; status="RESERVED_INVENTORY"; decision="REFERENCE_ONLY" }
    @{ alias="support"; target="support"; svc="dsh"; sliceId="DSH-014"; status="INVENTORY_ONLY"; decision="ADAPT_NORMALIZE" }
    @{ alias="partners"; target="partners"; svc="dsh"; sliceId="DSH-006"; status="INVENTORY_ONLY"; decision="ADAPT_NORMALIZE" }
    @{ alias="marketing"; target="marketing"; svc="dsh"; sliceId="DSH-015"; status="INVENTORY_ONLY"; decision="ADAPT_NORMALIZE" }
    @{ alias="platform"; target="platform"; svc="core"; sliceId="PLATFORM-001"; status="INVENTORY_ONLY"; decision="ADAPT_NORMALIZE" }
    @{ alias="administration"; target="platform"; svc="core"; sliceId="PLATFORM-001"; status="INVENTORY_ONLY"; decision="ADAPT_NORMALIZE" }
    @{ alias="hr"; target="RESERVED_INVENTORY"; svc="reserved"; sliceId="RESERVED-002"; status="RESERVED_INVENTORY"; decision="REFERENCE_ONLY" }
)
foreach ($da in $donorAliases) {
    $allRows.Add((New-PR @{ "master_v3_id"="V3-$($idx.ToString("D5"))"; "master_id"="POLICY-DONOR-ALIAS-$($da.alias.ToUpper() -replace '-','_')"; "slice_id"=$da.sliceId; "service"=$da.svc; "section"="donor-alias-normalization"; "surface"="system"; "capability"="donor-alias-$($da.alias)"; "layer"="governance"; "artifact_type"="alias-policy"; "operation"="donor-alias-normalization"; "domain_rule"="Donor alias [$($da.alias)] normalized to [$($da.target)] in new repo"; "business_domain_rules"="alias [$($da.alias)] -> [$($da.target)] owned by $($da.svc)"; "evidence_required"="BLOCKED_NEEDS_EVIDENCE:alias-normalization-confirmation"; "decision"=$da.decision; "status"=$da.status; "policy_owner"=$da.svc; "provider_decision"="N/A_READ_ONLY:not-applicable"; "rbac_tenant_rule"="N/A_READ_ONLY:governance-row"; "audit_privacy_rule"="N/A_READ_ONLY:governance-row"; "rollback_compensation_rule"="N/A_READ_ONLY:governance-row"; "notes"="donor alias: $($da.alias) -> $($da.target)" }))
    $idx++
}
Write-Host "TOTAL V3 rows built: $($allRows.Count)"

# ===== WRITE V3 CSV =====
$v3Path = "machine-readable\slice_execution_master_matrix_v3.csv"
$allRows | Export-Csv $v3Path -Encoding utf8 -NoTypeInformation

Write-Host "V3 CSV written: $v3Path"
Write-Host "V3 rows: $($allRows.Count)"
Write-Host "V3 columns: $($v3Cols.Count)"
