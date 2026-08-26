package wlt

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type FinanceOperationType string

const (
	OperationTypeRead  FinanceOperationType = "READ"
	OperationTypeWrite FinanceOperationType = "WRITE"
)

type FinanceOperation struct {
	ID                     string
	Type                   FinanceOperationType
	RequiredPermission     string
	HTTPMethod             string
	PathTemplate           string
	Timeout                time.Duration
	RequiresIdempotencyKey bool
	RequiresDelegatedActor bool
	ResponseContract       FinanceResponseContract
}

func (o FinanceOperation) Path(params map[string]string) (string, error) {
	path := o.PathTemplate
	for key, value := range params {
		placeholder := "{" + key + "}"
		if !strings.Contains(path, placeholder) {
			return "", fmt.Errorf("operation %s does not accept path parameter %q", o.ID, key)
		}
		value = strings.TrimSpace(value)
		if value == "" {
			return "", fmt.Errorf("operation %s path parameter %q is required", o.ID, key)
		}
		path = strings.ReplaceAll(path, placeholder, url.PathEscape(value))
	}
	if strings.Contains(path, "{") || strings.Contains(path, "}") {
		return "", fmt.Errorf("operation %s path parameters are incomplete", o.ID)
	}
	return path, nil
}

type OperationRegistry struct{ operations map[string]FinanceOperation }

func responseContract(key string, kind FinanceResponseKind, allowed ...string) FinanceResponseContract {
	if kind == FinanceResponseNoContent {
		return FinanceResponseContract{ValueKind: kind}
	}
	if len(allowed) == 0 {
		allowed = []string{key}
	}
	return FinanceResponseContract{RequiredKey: key, ValueKind: kind, AllowedKeys: allowed}
}

func NewOperationRegistry() *OperationRegistry {
	r := &OperationRegistry{operations: make(map[string]FinanceOperation)}
	read := func(id, path, key string, kind FinanceResponseKind, allowed ...string) {
		r.register(FinanceOperation{ID: id, Type: OperationTypeRead, RequiredPermission: "finance.read", HTTPMethod: http.MethodGet, PathTemplate: path, Timeout: 10 * time.Second, ResponseContract: responseContract(key, kind, allowed...)})
	}
	write := func(id, method, path, permission, key string, kind FinanceResponseKind, idem, delegated bool, allowed ...string) {
		r.register(FinanceOperation{ID: id, Type: OperationTypeWrite, RequiredPermission: permission, HTTPMethod: method, PathTemplate: path, Timeout: 15 * time.Second, RequiresIdempotencyKey: idem, RequiresDelegatedActor: delegated, ResponseContract: responseContract(key, kind, allowed...)})
	}

	read("finance.settlements.read", "/wlt/settlements", "settlements", FinanceResponseArray)
	read("finance.settlements.summary.read", "/wlt/settlements/summary", "summary", FinanceResponseObject)
	read("finance.settlements.evidence.read", "/wlt/settlements/{settlementId}/evidence", "evidence", FinanceResponseArray)
	read("finance.settlement_policy.read", "/wlt/settlement-policies/{partnerId}", "settlementPolicy", FinanceResponseObject)
	read("finance.refunds.read", "/wlt/refunds", "refunds", FinanceResponseArray)
	read("finance.refunds.detail.read", "/wlt/refunds/{refundId}", "refund", FinanceResponseObject)
	read("finance.refunds.audit.read", "/wlt/refunds/{refundId}/audit", "auditEvents", FinanceResponseArray)
	read("finance.ledger.entries.read", "/wlt/ledger/entries", "ledgerEntries", FinanceResponseArray, "ledgerEntries", "nextCursor")
	read("finance.ledger.summary.read", "/wlt/ledger/financial-summary", "financialSummary", FinanceResponseObject)
	read("finance.ledger.commissions.read", "/wlt/commissions", "commissions", FinanceResponseArray)
	read("finance.ledger.commission.read", "/wlt/commissions/{commissionId}", "commission", FinanceResponseObject, "commission", "evidence", "adjustments")
	read("finance.ledger.payment_status.read", "/wlt/references/payment-status", "reference", FinanceResponseObject)
	read("finance.ledger.settlement_status.read", "/wlt/references/settlement-status", "reference", FinanceResponseObject)
	read("finance.ledger.refund_status.read", "/wlt/references/refund-status", "reference", FinanceResponseObject)
	read("finance.ledger.field_commission.read", "/wlt/references/field-commission", "reference", FinanceResponseObject)
	read("finance.payout_requests.read", "/wlt/payout-requests", "payoutRequests", FinanceResponseArray, "payoutRequests", "total")
	read("finance.payout_requests.audit.read", "/wlt/payout-requests/{payoutId}/audit", "auditEvents", FinanceResponseArray)
	read("finance.payout_destinations.read", "/wlt/payout-destinations/{actorType}/{actorId}", "payoutDestination", FinanceResponseObject)
	read("finance.reconciliation.read", "/wlt/reconciliation-cases", "reconciliationCases", FinanceResponseArray)
	read("finance.reconciliation.detail.read", "/wlt/reconciliation-cases/{caseId}", "reconciliationCase", FinanceResponseObject)
	read("finance.captain_collateral.read", "/wlt/captain-collateral/{captainId}", "collateral", FinanceResponseObject)
	read("finance.wallet.read", "/wlt/wallets/{actorType}/{actorId}", "wallet", FinanceResponseObject)
	read("finance.store_onboarding_fee.read", "/wlt/commercial/store-onboarding-fee", "policy", FinanceResponseObject)
	read("finance.payment_sessions.timeline.read", "/wlt/payment-sessions/{paymentSessionId}/timeline", "paymentTimeline", FinanceResponseObject)
	read("finance.payment_sessions.read", "/wlt/payment-sessions/{paymentSessionId}", "paymentSession", FinanceResponseObject)

	write("finance.settlements.create", http.MethodPost, "/wlt/settlements", "finance.manage", "settlement", FinanceResponseObject, true, false)
	write("finance.settlement_policy.upsert", http.MethodPut, "/wlt/settlement-policies/{partnerId}", "finance.manage", "settlementPolicy", FinanceResponseObject, true, false)
	write("finance.store_onboarding_fee.upsert", http.MethodPut, "/wlt/commercial/store-onboarding-fee", "finance.manage", "policy", FinanceResponseObject, true, true)
	write("finance.payment_sessions.refresh_provider_status", http.MethodPost, "/wlt/payment-sessions/{paymentSessionId}/refresh-provider-status", "finance.manage", "paymentSession", FinanceResponseObject, true, false, "paymentSession", "providerRefreshSkipped", "reason", "idempotentReplay", "ledgerTransactionId")
	write("finance.topup_sessions.create", http.MethodPost, "/wlt/topup-sessions", "finance.manage", "paymentSession", FinanceResponseObject, true, false)
	write("finance.topup_sessions.authorize", http.MethodPost, "/wlt/topup-sessions/{paymentSessionId}/authorize", "finance.manage", "paymentSession", FinanceResponseObject, true, false)
	write("finance.topup_sessions.capture", http.MethodPost, "/wlt/topup-sessions/{paymentSessionId}/capture", "finance.manage", "paymentSession", FinanceResponseObject, true, false)
	write("finance.payout_requests.create", http.MethodPost, "/wlt/payout-requests", "finance.manage", "payoutRequest", FinanceResponseObject, true, true, "payoutRequest", "replayed")
	write("finance.payout_requests.approve", http.MethodPost, "/wlt/payout-requests/{payoutId}/approve", "finance.manage", "payoutRequest", FinanceResponseObject, true, true)
	write("finance.payout_requests.reject", http.MethodPost, "/wlt/payout-requests/{payoutId}/reject", "finance.manage", "payoutRequest", FinanceResponseObject, true, true)
	write("finance.payout_requests.complete", http.MethodPost, "/wlt/payout-requests/{payoutId}/complete", "finance.manage", "payoutRequest", FinanceResponseObject, true, true)
	write("finance.payout_destinations.upsert", http.MethodPut, "/wlt/payout-destinations/{actorType}/{actorId}", "finance.manage", "payoutDestination", FinanceResponseObject, true, true)
	write("finance.payout_destinations.verify", http.MethodPost, "/wlt/payout-destinations/{actorType}/{actorId}/verify", "finance.payout_destinations.verify", "payoutDestination", FinanceResponseObject, true, true)
	write("finance.payout_destinations.deactivate", http.MethodPost, "/wlt/payout-destinations/{actorType}/{actorId}/deactivate", "finance.payout_destinations.deactivate", "", FinanceResponseNoContent, true, true)
	write("finance.reconciliation.assign", http.MethodPost, "/wlt/reconciliation-cases/{caseId}/assign", "finance.manage", "reconciliationCase", FinanceResponseObject, true, true)
	write("finance.reconciliation.resolve", http.MethodPost, "/wlt/reconciliation-cases/{caseId}/resolve", "finance.manage", "reconciliationCase", FinanceResponseObject, true, true)
	write("finance.captain_collateral.allocate", http.MethodPost, "/wlt/captain-collateral/allocate", "finance.manage", "collateral", FinanceResponseObject, true, true)
	write("finance.captain_collateral.release", http.MethodPost, "/wlt/captain-collateral/release", "finance.manage", "collateral", FinanceResponseObject, true, true)
	write("finance.refunds.create", http.MethodPost, "/wlt/refunds", "finance.manage", "refund", FinanceResponseObject, true, true, "refund", "replayed")
	write("finance.refunds.approve", http.MethodPost, "/wlt/refunds/{refundId}/approve", "finance.manage", "refund", FinanceResponseObject, true, true)
	write("finance.refunds.reject", http.MethodPost, "/wlt/refunds/{refundId}/reject", "finance.manage", "refund", FinanceResponseObject, true, true)
	write("finance.refunds.complete", http.MethodPost, "/wlt/refunds/{refundId}/complete", "finance.manage", "refund", FinanceResponseObject, true, true)
	write("finance.refunds.reconcile", http.MethodPost, "/wlt/refunds/{refundId}/reconcile", "finance.manage", "refund", FinanceResponseObject, true, true)
	write("finance.commission_policy.upsert", http.MethodPut, "/wlt/commission-policies", "finance.manage", "commissionPolicy", FinanceResponseObject, true, false)
	for _, action := range []string{"adjust", "confirm", "settle", "reject", "reverse"} {
		write("finance.commissions."+action, http.MethodPost, "/wlt/commissions/{commissionId}/"+action, "finance.manage", "commission", FinanceResponseObject, true, false)
	}
	return r
}

func (r *OperationRegistry) register(op FinanceOperation) { r.operations[op.ID] = op }

func (r *OperationRegistry) GetOperation(id string) (FinanceOperation, error) {
	op, ok := r.operations[id]
	if !ok {
		return FinanceOperation{}, fmt.Errorf("unregistered finance operation: %s", id)
	}
	return op, nil
}

var Registry = NewOperationRegistry()
