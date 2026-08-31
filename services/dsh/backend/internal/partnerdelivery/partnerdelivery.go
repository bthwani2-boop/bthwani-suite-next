// Package partnerdelivery implements the partner_delivery fulfillment mode's
// operational closure: a store's own courier is assigned to an order,
// departs the store, arrives at the customer, and submits proof of
// delivery. It is the first real consumer of dsh_partner_delivery_tasks
// (dsh-055), which existed unused before this package.
package partnerdelivery

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"
)

var (
	ErrNotFound              = errors.New("partner delivery task not found")
	ErrInvalid               = errors.New("invalid partner delivery input")
	ErrConflict              = errors.New("partner delivery state conflict")
	ErrVersionConflict       = errors.New("partner delivery task version conflict")
	ErrIdempotencyConflict   = errors.New("partner delivery command idempotency conflict")
	ErrNotReadyForAssignment = errors.New("order is not ready for partner delivery assignment")
	ErrCourierIneligible     = errors.New("store courier is not eligible for assignment")
	ErrAlreadyAssigned       = errors.New("order already has an active dispatch assignment or partner delivery task")
)

type Status string

const (
	StatusUnassigned   Status = "unassigned"
	StatusAssigned     Status = "assigned"
	StatusDeparted     Status = "departed"
	StatusArrived      Status = "arrived"
	StatusProofPending Status = "proof_pending"
	StatusCompleted    Status = "completed"
	StatusCancelled    Status = "cancelled"
	StatusException    Status = "exception"
)

// PartnerDeliveryTask mirrors dsh_partner_delivery_tasks' columns.
type PartnerDeliveryTask struct {
	ID                          string
	OrderID                     string
	StoreID                     string
	BranchID                    string
	StoreCourierID              string
	Status                      Status
	AssignedAt                  *time.Time
	PickedUpAt                  *time.Time
	DepartedAt                  *time.Time
	ArrivedAt                   *time.Time
	ProofMethod                 *string
	ProofReference              *string
	CompletedAt                 *time.Time
	ExceptionReason             *string
	ExceptionEvidenceReferences []string
	ExceptionReportedAt         *time.Time
	Version                     int
	CreatedAt                   time.Time
	UpdatedAt                   time.Time
}

const taskColumnsPrefixed = `
        t.id, t.order_id::text, t.store_id, t.branch_id, t.store_courier_id, t.status,
        t.assigned_at, t.picked_up_at, t.departed_at, t.arrived_at,
        t.proof_method, t.proof_reference, t.completed_at,
        t.exception_reason, t.exception_evidence_references, t.exception_reported_at,
        t.version, t.created_at, t.updated_at
`

const taskByIDSQL = `SELECT
	id, order_id::text, store_id, branch_id, store_courier_id, status,
	assigned_at, picked_up_at, departed_at, arrived_at,
	proof_method, proof_reference, completed_at,
	exception_reason, exception_evidence_references, exception_reported_at,
	version, created_at, updated_at
FROM dsh_partner_delivery_tasks
WHERE id = $1`

const taskByIDForOperatorContextSQL = `SELECT
	t.id, t.order_id::text, t.store_id, t.branch_id, t.store_courier_id, t.status,
	t.assigned_at, t.picked_up_at, t.departed_at, t.arrived_at,
	t.proof_method, t.proof_reference, t.completed_at,
	t.exception_reason, t.exception_evidence_references, t.exception_reported_at,
	t.version, t.created_at, t.updated_at
FROM dsh_partner_delivery_tasks t
JOIN dsh_orders o ON o.id = t.order_id
WHERE t.id = $1 AND o.operator_context_id = $2`

const taskByOrderForOperatorContextSQL = `SELECT
	t.id, t.order_id::text, t.store_id, t.branch_id, t.store_courier_id, t.status,
	t.assigned_at, t.picked_up_at, t.departed_at, t.arrived_at,
	t.proof_method, t.proof_reference, t.completed_at,
	t.exception_reason, t.exception_evidence_references, t.exception_reported_at,
	t.version, t.created_at, t.updated_at
FROM dsh_partner_delivery_tasks t
JOIN dsh_orders o ON o.id=t.order_id
WHERE t.order_id=$1::uuid AND o.operator_context_id=$2`

const taskByOrderForUpdateForOperatorContextSQL = `SELECT
	t.id, t.order_id::text, t.store_id, t.branch_id, t.store_courier_id, t.status,
	t.assigned_at, t.picked_up_at, t.departed_at, t.arrived_at,
	t.proof_method, t.proof_reference, t.completed_at,
	t.exception_reason, t.exception_evidence_references, t.exception_reported_at,
	t.version, t.created_at, t.updated_at
FROM dsh_partner_delivery_tasks t
JOIN dsh_orders o ON o.id=t.order_id
WHERE t.order_id=$1::uuid AND o.operator_context_id=$2
FOR UPDATE OF t`

const taskByIDForUpdateForOperatorContextSQL = `SELECT
	t.id, t.order_id::text, t.store_id, t.branch_id, t.store_courier_id, t.status,
	t.assigned_at, t.picked_up_at, t.departed_at, t.arrived_at,
	t.proof_method, t.proof_reference, t.completed_at,
	t.exception_reason, t.exception_evidence_references, t.exception_reported_at,
	t.version, t.created_at, t.updated_at
FROM dsh_partner_delivery_tasks t
JOIN dsh_orders o ON o.id = t.order_id
WHERE t.id = $1 AND o.operator_context_id = $2
FOR UPDATE OF t`

func itoa(i int) string {
	return strconv.Itoa(i)
}

func scanTask(scan func(...any) error) (*PartnerDeliveryTask, error) {
	var t PartnerDeliveryTask
	var evidenceJSON []byte
	err := scan(
		&t.ID, &t.OrderID, &t.StoreID, &t.BranchID, &t.StoreCourierID, &t.Status,
		&t.AssignedAt, &t.PickedUpAt, &t.DepartedAt, &t.ArrivedAt,
		&t.ProofMethod, &t.ProofReference, &t.CompletedAt,
		&t.ExceptionReason, &evidenceJSON, &t.ExceptionReportedAt,
		&t.Version, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if len(evidenceJSON) > 0 {
		if err := json.Unmarshal(evidenceJSON, &t.ExceptionEvidenceReferences); err != nil {
			return nil, err
		}
	}
	if t.ExceptionEvidenceReferences == nil {
		t.ExceptionEvidenceReferences = []string{}
	}
	return &t, nil
}

// GetForUpdateForOperatorContext locks and returns the task row for id within tx for the given operator context.
func GetForUpdateForOperatorContext(tx *sql.Tx, operatorContextID, id string) (*PartnerDeliveryTask, error) {
	if strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(id) == "" {
		return nil, ErrInvalid
	}
	t, err := scanTask(tx.QueryRow(taskByIDForUpdateForOperatorContextSQL, id, operatorContextID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// GetForUpdateByOrderIDForOperatorContext locks the task only when its source
// order belongs to the trusted operator context.
func GetForUpdateByOrderIDForOperatorContext(tx *sql.Tx, operatorContextID, orderID string) (*PartnerDeliveryTask, error) {
	if strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(orderID) == "" {
		return nil, ErrInvalid
	}
	t, err := scanTask(tx.QueryRow(taskByOrderForUpdateForOperatorContextSQL, orderID, operatorContextID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// GetByOrderIDForOperatorContext returns the task row for order_id if it belongs to operatorContextID.
func GetByOrderIDForOperatorContext(db *sql.DB, operatorContextID, orderID string) (*PartnerDeliveryTask, error) {
	if strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(orderID) == "" {
		return nil, ErrInvalid
	}
	t, err := scanTask(db.QueryRow(taskByOrderForOperatorContextSQL, orderID, operatorContextID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// GetForOperatorContext returns the task row by id if it belongs to operatorContextID.
func GetForOperatorContext(db *sql.DB, operatorContextID, id string) (*PartnerDeliveryTask, error) {
	if strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(id) == "" {
		return nil, ErrInvalid
	}
	query := `SELECT ` + taskColumnsPrefixed + `
                FROM dsh_partner_delivery_tasks t
                JOIN dsh_orders o ON o.id = t.order_id
                WHERE t.id = $1 AND o.operator_context_id = $2`
	t, err := scanTask(db.QueryRow(query, id, operatorContextID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// ListFilter narrows List by store and/or status.
type ListFilter struct {
	StoreID string
	Status  string
	Limit   int
	Offset  int
}

func clampLimit(limit int) int {
	if limit <= 0 || limit > 200 {
		return 50
	}
	return limit
}

// ListForOperatorContext returns partner delivery tasks matching filter for operatorContextID.
func ListForOperatorContext(db *sql.DB, operatorContextID string, filter ListFilter) ([]PartnerDeliveryTask, error) {
	if strings.TrimSpace(operatorContextID) == "" {
		return nil, ErrInvalid
	}
	limit := clampLimit(filter.Limit)
	where := "WHERE o.operator_context_id = $1"
	args := []any{operatorContextID}
	idx := 2
	if filter.StoreID != "" {
		where += " AND t.store_id = $" + itoa(idx)
		args = append(args, filter.StoreID)
		idx++
	}
	if filter.Status != "" {
		where += " AND t.status = $" + itoa(idx)
		args = append(args, filter.Status)
		idx++
	}
	query := `SELECT ` + taskColumnsPrefixed + `
                FROM dsh_partner_delivery_tasks t
                JOIN dsh_orders o ON o.id = t.order_id
                ` + where + `
                ORDER BY t.created_at DESC LIMIT $` + itoa(idx) + ` OFFSET $` + itoa(idx+1)
	args = append(args, limit, filter.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []PartnerDeliveryTask
	for rows.Next() {
		t, err := scanTask(rows.Scan)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, *t)
	}
	if tasks == nil {
		tasks = []PartnerDeliveryTask{}
	}
	return tasks, rows.Err()
}
