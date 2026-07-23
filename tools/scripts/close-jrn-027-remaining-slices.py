#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if new in content:
        return
    if old not in content:
        raise SystemExit(f"required replacement anchor missing: {path}\n{old[:160]}")
    write(path, content.replace(old, new, 1))


def insert_before_once(path: str, marker: str, block: str) -> None:
    content = read(path)
    if block.strip() in content:
        return
    if marker not in content:
        raise SystemExit(f"required insertion anchor missing: {path}: {marker}")
    write(path, content.replace(marker, block + marker, 1))


# 1. Register only the governed handlers; the old handlers remain unreachable
# until a later mechanical cleanup can remove their shared helper functions.
replace_once(
    "services/dsh/backend/internal/http/server.go",
    '''\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/purchase", protected.handleCreateClientSubscriptionPurchase)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{purchaseId}/activate", protected.handleActivateClientSubscription)\n\tmux.HandleFunc("GET /dsh/client/benefits", protected.handleClientBenefits)''',
    '''\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/purchase", protected.handleCreateGovernedSubscriptionPurchase)\n\tmux.HandleFunc("GET /dsh/client/marketing/subscriptions/purchases/{purchaseId}", protected.handleGetGovernedSubscriptionPurchase)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{purchaseId}/activate", protected.handleActivateGovernedSubscriptionPurchase)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{subscriptionId}/renew", protected.handleRenewGovernedSubscription)\n\tmux.HandleFunc("POST /dsh/client/marketing/subscriptions/{subscriptionId}/cancel", protected.handleCancelGovernedSubscription)\n\tmux.HandleFunc("GET /dsh/client/benefits", protected.handleClientBenefits)''',
)

# 2. Expose the WLT lifecycle and compensation state through DSH's canonical
# client-benefits read model. No financial value is recalculated here.
replace_once(
    "services/dsh/backend/internal/marketing/commercial_programs.go",
    '''type ClientSubscriptionEntitlement struct {\n\tID                       string           `json:"id"`\n\tStatus                   string           `json:"status"`\n\tWLTSubscriptionReference string           `json:"wltSubscriptionReference,omitempty"`\n\tStartsAt                 *string          `json:"startsAt,omitempty"`\n\tEndsAt                   *string          `json:"endsAt,omitempty"`\n\tPlan                     SubscriptionPlan `json:"plan"`\n}\n\ntype ClientBenefits struct {\n\tLoyaltyAccount     *ClientLoyaltyAccount          `json:"loyaltyAccount,omitempty"`\n\tAvailableTiers     []LoyaltyTier                  `json:"availableTiers"`\n\tAvailablePlans     []SubscriptionPlan             `json:"availablePlans"`\n\tActiveSubscription *ClientSubscriptionEntitlement `json:"activeSubscription,omitempty"`\n\tOffers             []PartnerOffer                 `json:"offers"`\n}''',
    '''type ClientSubscriptionEntitlement struct {\n\tID                       string           `json:"id"`\n\tStatus                   string           `json:"status"`\n\tWLTSubscriptionReference string           `json:"wltSubscriptionReference,omitempty"`\n\tStartsAt                 *string          `json:"startsAt,omitempty"`\n\tEndsAt                   *string          `json:"endsAt,omitempty"`\n\tCancelAtPeriodEnd        bool             `json:"cancelAtPeriodEnd"`\n\tCancelledAt              *string          `json:"cancelledAt,omitempty"`\n\tCancellationReason       *string          `json:"cancellationReason,omitempty"`\n\tCompensationStatus       string           `json:"compensationStatus,omitempty"`\n\tCompensationReference    *string          `json:"compensationReference,omitempty"`\n\tAllowedActions           []string         `json:"allowedActions"`\n\tPlan                     SubscriptionPlan `json:"plan"`\n}\n\ntype ClientSubscriptionCompensation struct {\n\tID               string  `json:"id"`\n\tSubscriptionID   string  `json:"subscriptionId"`\n\tStatus           string  `json:"status"`\n\tReason           string  `json:"reason"`\n\tRefundReference  *string `json:"refundReference,omitempty"`\n\tAmountMinorUnits int64   `json:"amountMinorUnits"`\n\tCurrency         string  `json:"currency"`\n\tCreatedAt        string  `json:"createdAt"`\n\tUpdatedAt        string  `json:"updatedAt"`\n\tCompletedAt      *string `json:"completedAt,omitempty"`\n}\n\ntype ClientBenefits struct {\n\tLoyaltyAccount     *ClientLoyaltyAccount              `json:"loyaltyAccount,omitempty"`\n\tAvailableTiers     []LoyaltyTier                      `json:"availableTiers"`\n\tAvailablePlans     []SubscriptionPlan                 `json:"availablePlans"`\n\tActiveSubscription *ClientSubscriptionEntitlement     `json:"activeSubscription,omitempty"`\n\tCompensation       *ClientSubscriptionCompensation    `json:"compensation,omitempty"`\n\tOffers             []PartnerOffer                     `json:"offers"`\n}''',
)

replace_once(
    "services/dsh/backend/internal/http/commercial_programs.go",
    '''\t\tbenefits.ActiveSubscription = &marketing.ClientSubscriptionEntitlement{\n\t\t\tID:                       truth.ActiveSubscription.ID,\n\t\t\tStatus:                   truth.ActiveSubscription.Status,\n\t\t\tWLTSubscriptionReference: truth.ActiveSubscription.ID,\n\t\t\tStartsAt:                 &truth.ActiveSubscription.StartsAt,\n\t\t\tEndsAt:                   truth.ActiveSubscription.EndsAt,\n\t\t\tPlan:                     plan,\n\t\t}\n\t}\n\n\tstore.SendJSON''',
    '''\t\tbenefits.ActiveSubscription = &marketing.ClientSubscriptionEntitlement{\n\t\t\tID:                       truth.ActiveSubscription.ID,\n\t\t\tStatus:                   truth.ActiveSubscription.Status,\n\t\t\tWLTSubscriptionReference: truth.ActiveSubscription.ID,\n\t\t\tStartsAt:                 &truth.ActiveSubscription.StartsAt,\n\t\t\tEndsAt:                   truth.ActiveSubscription.EndsAt,\n\t\t\tCancelAtPeriodEnd:        truth.ActiveSubscription.CancelAtPeriodEnd,\n\t\t\tCancelledAt:              truth.ActiveSubscription.CancelledAt,\n\t\t\tCancellationReason:       truth.ActiveSubscription.CancellationReason,\n\t\t\tCompensationStatus:       truth.ActiveSubscription.CompensationStatus,\n\t\t\tCompensationReference:    truth.ActiveSubscription.CompensationReference,\n\t\t\tAllowedActions:           truth.ActiveSubscription.AllowedActions,\n\t\t\tPlan:                     plan,\n\t\t}\n\t}\n\n\tif truth.Compensation != nil {\n\t\tbenefits.Compensation = &marketing.ClientSubscriptionCompensation{\n\t\t\tID:               truth.Compensation.ID,\n\t\t\tSubscriptionID:   truth.Compensation.SubscriptionID,\n\t\t\tStatus:           truth.Compensation.Status,\n\t\t\tReason:           truth.Compensation.Reason,\n\t\t\tRefundReference:  truth.Compensation.RefundReference,\n\t\t\tAmountMinorUnits: truth.Compensation.AmountMinorUnits,\n\t\t\tCurrency:         truth.Compensation.Currency,\n\t\t\tCreatedAt:        truth.Compensation.CreatedAt,\n\t\t\tUpdatedAt:        truth.Compensation.UpdatedAt,\n\t\t\tCompletedAt:      truth.Compensation.CompletedAt,\n\t\t}\n\t}\n\n\tstore.SendJSON''',
)

# 3. Award a non-zero, exactly-once activation benefit by default. This remains
# WLT-owned and can later be made configurable through a separately approved
# product-policy mutation.
replace_once(
    "services/wlt/database/migrations/wlt-095_jrn027_subscription_lifecycle.sql",
    '''    ADD COLUMN IF NOT EXISTS activation_points BIGINT NOT NULL DEFAULT 0\n        CHECK (activation_points >= 0);''',
    '''    ADD COLUMN IF NOT EXISTS activation_points BIGINT NOT NULL DEFAULT 1\n        CHECK (activation_points > 0);\n\nALTER TABLE wlt_commercial_products\n    ALTER COLUMN activation_points SET DEFAULT 1;\n\nUPDATE wlt_commercial_products\nSET activation_points = 1\nWHERE activation_points <= 0;''',
)

# 4. Preserve the actual DSH status in activation evidence and append a DSH
# cancellation event after WLT has committed the sovereign cancellation.
replace_once(
    "services/dsh/backend/internal/http/subscription_lifecycle_governed.go",
    '''\tif err := appendGovernedSubscriptionEvent(tx, item, eventType, "payment_captured", status,''',
    '''\tif err := appendGovernedSubscriptionEvent(tx, item, eventType, item.Status, status,''',
)
replace_once(
    "services/dsh/backend/internal/http/subscription_lifecycle_governed.go",
    '''\tupdatedRows, _ := result.RowsAffected()\n\tstore.SendJSON''',
    '''\tupdatedRows, _ := result.RowsAffected()\n\t_, eventErr := s.db.Exec(`INSERT INTO dsh_subscription_lifecycle_events\n\t\t(purchase_id, tenant_id, client_id, event_type, from_status, to_status,\n\t\t wlt_payment_session_id, wlt_subscription_id, idempotency_key,\n\t\t correlation_id, actor_id, metadata)\n\t\tSELECT id, tenant_id, client_id, 'cancelled', status,\n\t\t       CASE WHEN $5='pending' THEN 'compensation_pending' ELSE 'cancelled' END,\n\t\t       wlt_payment_session_id, wlt_subscription_id, $6, $7, $2,\n\t\t       jsonb_build_object('reason',$4,'compensationStatus',$5)\n\t\tFROM dsh_subscription_purchases\n\t\tWHERE tenant_id=$1 AND client_id=$2 AND wlt_subscription_id=$3\n\t\tORDER BY created_at LIMIT 1\n\t\tON CONFLICT (purchase_id, idempotency_key, event_type) DO NOTHING`,\n\t\ttenantID, actor.ID, subscription.ID, body.Reason, compensationStatus,\n\t\tidempotencyKey, correlationID)\n\tif eventErr != nil {\n\t\tstore.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "WLT cancellation committed but DSH audit evidence could not be appended")\n\t\treturn\n\t}\n\tstore.SendJSON''',
)

# 5. Expand the DSH modular commercial contract with readback, renewal and
# cancellation. Existing generic response envelopes remain intentionally broad
# because runtime clients use the typed shared adapter.
dsh_contract_block = '''  /dsh/client/marketing/subscriptions/purchases/{purchaseId}:\n    get:\n      operationId: getDshClientSubscriptionPurchase\n      tags: [DshMarketingCommercial]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: purchaseId\n          in: path\n          required: true\n          schema: { type: string, minLength: 1 }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }\n        '401': { $ref: '#/components/responses/ErrorResponse' }\n        '403': { $ref: '#/components/responses/ErrorResponse' }\n        '404': { $ref: '#/components/responses/ErrorResponse' }\n        '502': { $ref: '#/components/responses/ErrorResponse' }\n        '503': { $ref: '#/components/responses/ErrorResponse' }\n  /dsh/client/marketing/subscriptions/{subscriptionId}/renew:\n    post:\n      operationId: renewDshClientSubscription\n      tags: [DshMarketingCommercial]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: subscriptionId\n          in: path\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: Idempotency-Key\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              properties:\n                paymentMethod: { type: string, enum: [official_wallet, wallet, mixed] }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }\n        '201': { $ref: '#/components/responses/ObjectResponse' }\n        '400': { $ref: '#/components/responses/ErrorResponse' }\n        '401': { $ref: '#/components/responses/ErrorResponse' }\n        '403': { $ref: '#/components/responses/ErrorResponse' }\n        '404': { $ref: '#/components/responses/ErrorResponse' }\n        '409': { $ref: '#/components/responses/ErrorResponse' }\n        '503': { $ref: '#/components/responses/ErrorResponse' }\n  /dsh/client/marketing/subscriptions/{subscriptionId}/cancel:\n    post:\n      operationId: cancelDshClientSubscription\n      tags: [DshMarketingCommercial]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: subscriptionId\n          in: path\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: Idempotency-Key\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              required: [reason]\n              properties:\n                reason: { type: string, minLength: 1 }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }\n        '400': { $ref: '#/components/responses/ErrorResponse' }\n        '401': { $ref: '#/components/responses/ErrorResponse' }\n        '403': { $ref: '#/components/responses/ErrorResponse' }\n        '404': { $ref: '#/components/responses/ErrorResponse' }\n        '409': { $ref: '#/components/responses/ErrorResponse' }\n        '503': { $ref: '#/components/responses/ErrorResponse' }\n'''
insert_before_once(
    "services/dsh/contracts/dsh.marketing-commercial.openapi.yaml",
    "  /dsh/client/benefits:\n",
    dsh_contract_block,
)
replace_once(
    "services/dsh/contracts/dsh.marketing-commercial.openapi.yaml",
    '''        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }''',
    '''        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: Idempotency-Key\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }''',
)

# 6. Expand the WLT sovereign contract. All mutations remain deployment gated
# and service-authenticated; this only makes the actual lifecycle explicit.
wlt_contract_block = '''  /wlt/commercial/subscriptions/{subscriptionId}/lifecycle:\n    get:\n      operationId: getWltCommercialSubscriptionLifecycle\n      tags: [WltCommercialBenefits]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - $ref: '#/components/parameters/AuthorizationHeader'\n        - $ref: '#/components/parameters/ServiceCallerHeader'\n        - name: subscriptionId\n          in: path\n          required: true\n          schema: { type: string, format: uuid }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }\n        '401': { $ref: '#/components/responses/ErrorResponse' }\n        '403': { $ref: '#/components/responses/ErrorResponse' }\n        '404': { $ref: '#/components/responses/ErrorResponse' }\n  /wlt/commercial/subscriptions/{subscriptionId}/renew:\n    post:\n      operationId: renewWltCommercialSubscription\n      tags: [WltCommercialBenefits]\n      security: [{ bearerAuth: [] }]\n      x-bthwani-mutation-approved: false\n      x-bthwani-default-enabled: false\n      parameters:\n        - $ref: '#/components/parameters/AuthorizationHeader'\n        - $ref: '#/components/parameters/ServiceCallerHeader'\n        - name: subscriptionId\n          in: path\n          required: true\n          schema: { type: string, format: uuid }\n        - name: Idempotency-Key\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { $ref: '#/components/schemas/SubscriptionActivation' }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }\n        '400': { $ref: '#/components/responses/ErrorResponse' }\n        '401': { $ref: '#/components/responses/ErrorResponse' }\n        '403': { $ref: '#/components/responses/ErrorResponse' }\n        '404': { $ref: '#/components/responses/ErrorResponse' }\n        '409': { $ref: '#/components/responses/ErrorResponse' }\n  /wlt/commercial/subscriptions/{subscriptionId}/cancel:\n    post:\n      operationId: cancelWltCommercialSubscription\n      tags: [WltCommercialBenefits]\n      security: [{ bearerAuth: [] }]\n      x-bthwani-mutation-approved: false\n      x-bthwani-default-enabled: false\n      parameters:\n        - $ref: '#/components/parameters/AuthorizationHeader'\n        - $ref: '#/components/parameters/ServiceCallerHeader'\n        - name: subscriptionId\n          in: path\n          required: true\n          schema: { type: string, format: uuid }\n        - name: Idempotency-Key\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              required: [clientId, reason]\n              properties:\n                clientId: { type: string, minLength: 1 }\n                reason: { type: string, minLength: 1 }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }\n        '400': { $ref: '#/components/responses/ErrorResponse' }\n        '401': { $ref: '#/components/responses/ErrorResponse' }\n        '403': { $ref: '#/components/responses/ErrorResponse' }\n        '404': { $ref: '#/components/responses/ErrorResponse' }\n        '409': { $ref: '#/components/responses/ErrorResponse' }\n  /wlt/commercial/subscriptions/expire-due:\n    post:\n      operationId: expireDueWltCommercialSubscriptions\n      tags: [WltCommercialBenefits]\n      security: [{ bearerAuth: [] }]\n      x-bthwani-mutation-approved: false\n      x-bthwani-default-enabled: false\n      parameters:\n        - $ref: '#/components/parameters/AuthorizationHeader'\n        - $ref: '#/components/parameters/ServiceCallerHeader'\n        - name: Idempotency-Key\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      responses:\n        '200': { $ref: '#/components/responses/ObjectResponse' }\n        '400': { $ref: '#/components/responses/ErrorResponse' }\n        '401': { $ref: '#/components/responses/ErrorResponse' }\n        '403': { $ref: '#/components/responses/ErrorResponse' }\n'''
insert_before_once(
    "services/wlt/contracts/wlt.commercial.openapi.yaml",
    "components:\n",
    wlt_contract_block,
)
replace_once(
    "services/wlt/contracts/wlt.commercial.openapi.yaml",
    '''        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { $ref: '#/components/schemas/SubscriptionActivation' }''',
    '''        - name: X-Correlation-ID\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n        - name: Idempotency-Key\n          in: header\n          required: true\n          schema: { type: string, minLength: 1 }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { $ref: '#/components/schemas/SubscriptionActivation' }''',
)

# 7. Install focused route-registration tests. They exercise Go 1.22 ServeMux
# matching without requiring live databases or identity/WLT credentials.
write(
    "services/dsh/backend/internal/http/jrn027_routes_test.go",
    '''package http\n\nimport (\n\t"net/http"\n\t"net/http/httptest"\n\t"testing"\n)\n\nfunc TestJRN027GovernedSubscriptionRoutes(t *testing.T) {\n\trouter := NewRouter(nil, nil, nil, nil)\n\tcases := []struct {\n\t\tmethod string\n\t\tpath   string\n\t}{\n\t\t{http.MethodPost, "/dsh/client/marketing/subscriptions/purchase"},\n\t\t{http.MethodGet, "/dsh/client/marketing/subscriptions/purchases/subp-1"},\n\t\t{http.MethodPost, "/dsh/client/marketing/subscriptions/subp-1/activate"},\n\t\t{http.MethodPost, "/dsh/client/marketing/subscriptions/00000000-0000-0000-0000-000000000001/renew"},\n\t\t{http.MethodPost, "/dsh/client/marketing/subscriptions/00000000-0000-0000-0000-000000000001/cancel"},\n\t\t{http.MethodGet, "/dsh/client/benefits"},\n\t}\n\tfor _, tc := range cases {\n\t\treq := httptest.NewRequest(tc.method, tc.path, nil)\n\t\t_, pattern := router.Handler(req)\n\t\tif pattern == "" {\n\t\t\tt.Fatalf("JRN-027 route is not registered: %s %s", tc.method, tc.path)\n\t\t}\n\t}\n}\n''',
)
write(
    "services/wlt/backend/internal/http/jrn027_routes_test.go",
    '''package http\n\nimport (\n\t"net/http"\n\t"net/http/httptest"\n\t"testing"\n)\n\nfunc TestJRN027WLTSubscriptionLifecycleRoutes(t *testing.T) {\n\trouter := NewRouter(nil, true)\n\tcases := []struct {\n\t\tmethod string\n\t\tpath   string\n\t}{\n\t\t{http.MethodPost, "/wlt/commercial/subscriptions"},\n\t\t{http.MethodGet, "/wlt/commercial/subscriptions/00000000-0000-0000-0000-000000000001/lifecycle"},\n\t\t{http.MethodPost, "/wlt/commercial/subscriptions/00000000-0000-0000-0000-000000000001/renew"},\n\t\t{http.MethodPost, "/wlt/commercial/subscriptions/00000000-0000-0000-0000-000000000001/cancel"},\n\t\t{http.MethodPost, "/wlt/commercial/subscriptions/expire-due"},\n\t\t{http.MethodGet, "/wlt/commercial/clients/client-1/benefits"},\n\t}\n\tfor _, tc := range cases {\n\t\treq := httptest.NewRequest(tc.method, tc.path, nil)\n\t\t_, pattern := router.Handler(req)\n\t\tif pattern == "" {\n\t\t\tt.Fatalf("JRN-027 WLT route is not registered: %s %s", tc.method, tc.path)\n\t\t}\n\t}\n}\n''',
)

# 8. Machine-checkable static closure gate and evidence skeleton. Independent
# product/visual approvals remain explicitly pending; engineering must not forge
# those decisions.
write(
    "tools/guards/jrn027-closure-gate.py",
    '''#!/usr/bin/env python3\nfrom pathlib import Path\nimport json\n\nroot = Path(__file__).resolve().parents[2]\nchecks = {\n    "product truth": ("governance/product/contracts/jrn-027-subscriptions-commercial-benefits.product-truth.json", "JRN_027_SUBSCRIPTIONS_COMMERCIAL_BENEFITS"),\n    "DSH migration": ("services/dsh/database/migrations/dsh-103_jrn_027_subscription_lifecycle.sql", "dsh_subscription_lifecycle_events"),\n    "WLT migration": ("services/wlt/database/migrations/wlt-095_jrn027_subscription_lifecycle.sql", "wlt_subscription_compensations"),\n    "DSH handlers": ("services/dsh/backend/internal/http/subscription_lifecycle_governed.go", "handleCancelGovernedSubscription"),\n    "WLT lifecycle": ("services/wlt/backend/internal/commercial/subscription_lifecycle.go", "RenewSubscriptionLifecycleGoverned"),\n    "shared controller": ("services/dsh/frontend/shared/marketing/use-subscription-lifecycle-controller.tsx", "useSubscriptionLifecycleController"),\n    "client screen": ("services/dsh/frontend/app-client/account/BenefitsHubScreen.tsx", "شراء عبر المحفظة"),\n    "DSH contract": ("services/dsh/contracts/dsh.marketing-commercial.openapi.yaml", "cancelDshClientSubscription"),\n    "WLT contract": ("services/wlt/contracts/wlt.commercial.openapi.yaml", "expireDueWltCommercialSubscriptions"),\n}\nfor label, (path, marker) in checks.items():\n    text = (root / path).read_text(encoding="utf-8")\n    if marker not in text:\n        raise SystemExit(f"JRN-027 gate failed: {label}: {marker}")\ntruth = json.loads((root / checks["product truth"][0]).read_text(encoding="utf-8"))\nif truth.get("owners", {}).get("productAcceptanceDecision") != "PENDING":\n    raise SystemExit("JRN-027 gate failed: engineering must not self-approve product acceptance")\nprint("JRN-027 static closure gate passed")\n''',
)

print("JRN-027 remaining slices patched idempotently")
