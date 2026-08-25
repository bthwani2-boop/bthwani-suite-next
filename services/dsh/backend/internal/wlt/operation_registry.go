package wlt

import (
	"fmt"
	"time"
)

type FinanceOperationType string

const (
	OperationTypeRead  FinanceOperationType = "READ"
	OperationTypeWrite FinanceOperationType = "WRITE"
)

type FinanceOperation struct {
	ID                 string
	Type               FinanceOperationType
	RequiredPermission string
	Timeout            time.Duration
	Idempotent         bool
}

type OperationRegistry struct {
	operations map[string]FinanceOperation
}

func NewOperationRegistry() *OperationRegistry {
	r := &OperationRegistry{
		operations: make(map[string]FinanceOperation),
	}
	r.registerDefaults()
	return r
}

func (r *OperationRegistry) registerDefaults() {
	r.register(FinanceOperation{ID: "finance.settlements.read", Type: OperationTypeRead, RequiredPermission: "finance.read", Timeout: 10 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.refunds.read", Type: OperationTypeRead, RequiredPermission: "finance.read", Timeout: 10 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.ledger.read", Type: OperationTypeRead, RequiredPermission: "finance.read", Timeout: 10 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.payout_requests.read", Type: OperationTypeRead, RequiredPermission: "finance.read", Timeout: 10 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.payout_requests.approve", Type: OperationTypeWrite, RequiredPermission: "finance.manage", Timeout: 15 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.payout_requests.reject", Type: OperationTypeWrite, RequiredPermission: "finance.manage", Timeout: 15 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.payout_destinations.read", Type: OperationTypeRead, RequiredPermission: "finance.read", Timeout: 10 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.payout_destinations.upsert", Type: OperationTypeWrite, RequiredPermission: "finance.manage", Timeout: 15 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.payout_destinations.verify", Type: OperationTypeWrite, RequiredPermission: "finance.payout_destinations.verify", Timeout: 15 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.payout_destinations.deactivate", Type: OperationTypeWrite, RequiredPermission: "finance.payout_destinations.deactivate", Timeout: 15 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.reconciliation.read", Type: OperationTypeRead, RequiredPermission: "finance.read", Timeout: 10 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.reconciliation.assign", Type: OperationTypeWrite, RequiredPermission: "finance.manage", Timeout: 15 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.reconciliation.resolve", Type: OperationTypeWrite, RequiredPermission: "finance.manage", Timeout: 15 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.captain_collateral.read", Type: OperationTypeRead, RequiredPermission: "finance.read", Timeout: 10 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.captain_collateral.allocate", Type: OperationTypeWrite, RequiredPermission: "finance.manage", Timeout: 15 * time.Second, Idempotent: true})
	r.register(FinanceOperation{ID: "finance.captain_collateral.release", Type: OperationTypeWrite, RequiredPermission: "finance.manage", Timeout: 15 * time.Second, Idempotent: true})
}

func (r *OperationRegistry) register(op FinanceOperation) {
	r.operations[op.ID] = op
}

func (r *OperationRegistry) GetOperation(id string) (FinanceOperation, error) {
	op, ok := r.operations[id]
	if !ok {
		return FinanceOperation{}, fmt.Errorf("unregistered finance operation: %s", id)
	}
	return op, nil
}

// Registry is the singleton instance for DSH financial operations.
var Registry = NewOperationRegistry()
