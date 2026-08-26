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

func NewOperationRegistry() *OperationRegistry {
	r := &OperationRegistry{operations: make(map[string]FinanceOperation)}
	read := func(id, path string) {
		r.register(FinanceOperation{ID: id, Type: OperationTypeRead, RequiredPermission: "finance.read", HTTPMethod: http.MethodGet, PathTemplate: path, Timeout: 10 * time.Second})
	}
	write := func(id, method, path, permission string, idem, delegated bool) {
		r.register(FinanceOperation{ID: id, Type: OperationTypeWrite, RequiredPermission: permission, HTTPMethod: method, PathTemplate: path, Timeout: 15 * time.Second, RequiresIdempotencyKey: idem, RequiresDelegatedActor: delegated})
	}
	read("finance.settlements.read", "/wlt/settlements")
	read("finance.settlements.summary.read", "/wlt/settlements/summary")
	read("finance.settlements.evidence.read", "/wlt/settlements/{settlementId}/evidence")
	read("finance.settlement_policy.read", "/wlt/settlement-policies/{partnerId}")
	read("finance.refunds.read", "/wlt/refunds")
	read("finance.refunds.detail.read", "/wlt/refunds/{refundId}")
	read("finance.refunds.audit.read", "/wlt/refunds/{refundId}/audit")
	read("finance.ledger.entries.read", "/wlt/ledger/entries")
	read("finance.ledger.summary.read", "/wlt/ledger/financial-summary")
	read("finance.ledger.commissions.read", "/wlt/commissions")
	read("finance.ledger.commission.read", "/wlt/commissions/{commissionId}")
	read("finance.ledger.payment_status.read", "/wlt/references/payment-status")
	read("finance.ledger.settlement_status.read", "/wlt/references/settlement-status")
	read("finance.ledger.refund_status.read", "/wlt/references/refund-status")
	read("finance.ledger.field_commission.read", "/wlt/references/field-commission")
	read("finance.payout_requests.read", "/wlt/payout-requests")
	read("finance.payout_requests.audit.read", "/wlt/payout-requests/{payoutId}/audit")
	read("finance.payout_destinations.read", "/wlt/payout-destinations/{actorType}/{actorId}")
	read("finance.reconciliation.read", "/wlt/reconciliation-cases")
	read("finance.reconciliation.detail.read", "/wlt/reconciliation-cases/{caseId}")
	read("finance.captain_collateral.read", "/wlt/captain-collateral/{captainId}")
	read("finance.wallet.read", "/wlt/wallets/{actorType}/{actorId}")
	read("finance.store_onboarding_fee.read", "/wlt/commercial/store-onboarding-fee")
	write("finance.store_onboarding_fee.upsert", http.MethodPut, "/wlt/commercial/store-onboarding-fee", "finance.manage", true, true)
	write("finance.payout_requests.create", http.MethodPost, "/wlt/payout-requests", "finance.manage", true, true)
	write("finance.payout_requests.approve", http.MethodPost, "/wlt/payout-requests/{payoutId}/approve", "finance.manage", true, true)
	write("finance.payout_requests.reject", http.MethodPost, "/wlt/payout-requests/{payoutId}/reject", "finance.manage", true, true)
	write("finance.payout_requests.complete", http.MethodPost, "/wlt/payout-requests/{payoutId}/complete", "finance.manage", true, true)
	write("finance.payout_destinations.upsert", http.MethodPut, "/wlt/payout-destinations/{actorType}/{actorId}", "finance.manage", true, true)
	write("finance.payout_destinations.verify", http.MethodPost, "/wlt/payout-destinations/{actorType}/{actorId}/verify", "finance.payout_destinations.verify", true, true)
	write("finance.payout_destinations.deactivate", http.MethodPost, "/wlt/payout-destinations/{actorType}/{actorId}/deactivate", "finance.payout_destinations.deactivate", true, true)
	write("finance.reconciliation.assign", http.MethodPost, "/wlt/reconciliation-cases/{caseId}/assign", "finance.manage", true, true)
	write("finance.reconciliation.resolve", http.MethodPost, "/wlt/reconciliation-cases/{caseId}/resolve", "finance.manage", true, true)
	write("finance.captain_collateral.allocate", http.MethodPost, "/wlt/captain-collateral/allocate", "finance.manage", true, true)
	write("finance.captain_collateral.release", http.MethodPost, "/wlt/captain-collateral/release", "finance.manage", true, true)
	write("finance.refunds.create", http.MethodPost, "/wlt/refunds", "finance.manage", true, true)
	write("finance.refunds.approve", http.MethodPost, "/wlt/refunds/{refundId}/approve", "finance.manage", true, true)
	write("finance.refunds.reject", http.MethodPost, "/wlt/refunds/{refundId}/reject", "finance.manage", true, true)
	write("finance.refunds.complete", http.MethodPost, "/wlt/refunds/{refundId}/complete", "finance.manage", true, true)
	write("finance.refunds.reconcile", http.MethodPost, "/wlt/refunds/{refundId}/reconcile", "finance.manage", true, true)
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
