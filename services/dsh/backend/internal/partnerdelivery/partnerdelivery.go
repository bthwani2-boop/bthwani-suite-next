// Package partnerdelivery implements the partner_delivery fulfillment mode's
// operational closure: a store's own courier is assigned to an order,
// departs the store, arrives at the customer, and submits proof of
// delivery. It is the first real consumer of dsh_partner_delivery_tasks
// (dsh-055), which existed unused before this package.
package partnerdelivery

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound              = errors.New("partner delivery task not found")
	ErrInvalid               = errors.New("invalid partner delivery input")
	ErrConflict              = errors.New("partner delivery state conflict")
	ErrVersionConflict       = errors.New("partner delivery task version conflict")
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
	ID             string
	OrderID        string
	StoreID        string
	BranchID       string
	StoreCourierID string
	Status         Status
	AssignedAt     *time.Time
	PickedUpAt     *time.Time
	DepartedAt     *time.Time
	ArrivedAt      *time.Time
	ProofMethod    *string
	ProofReference *string
	CompletedAt    *time.Time
	Version        int
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

const taskColumns = `
	id, order_id::text, store_id, branch_id, store_courier_id, status,
	assigned_at, picked_up_at, departed_at, arrived_at,
	proof_method, proof_reference, completed_at,
	version, created_at, updated_at
`

func scanTask(scan func(...any) error) (*PartnerDeliveryTask, error) {
	var t PartnerDeliveryTask
	err := scan(
		&t.ID, &t.OrderID, &t.StoreID, &t.BranchID, &t.StoreCourierID, &t.Status,
		&t.AssignedAt, &t.PickedUpAt, &t.DepartedAt, &t.ArrivedAt,
		&t.ProofMethod, &t.ProofReference, &t.CompletedAt,
		&t.Version, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetForUpdate locks and returns the task row for id within tx.
func GetForUpdate(tx *sql.Tx, id string) (*PartnerDeliveryTask, error) {
	query := `SELECT ` + taskColumns + ` FROM dsh_partner_delivery_tasks WHERE id = $1 FOR UPDATE`
	t, err := scanTask(tx.QueryRow(query, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// GetForUpdateByOrderID locks and returns the task row for order_id within
// tx, if one exists.
func GetForUpdateByOrderID(tx *sql.Tx, orderID string) (*PartnerDeliveryTask, error) {
	query := `SELECT ` + taskColumns + ` FROM dsh_partner_delivery_tasks WHERE order_id = $1::uuid FOR UPDATE`
	t, err := scanTask(tx.QueryRow(query, orderID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// GetByOrderID returns the task row for order_id, if one exists.
func GetByOrderID(db *sql.DB, orderID string) (*PartnerDeliveryTask, error) {
	query := `SELECT ` + taskColumns + ` FROM dsh_partner_delivery_tasks WHERE order_id = $1::uuid`
	t, err := scanTask(db.QueryRow(query, orderID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

// Get returns the task row by id.
func Get(db *sql.DB, id string) (*PartnerDeliveryTask, error) {
	query := `SELECT ` + taskColumns + ` FROM dsh_partner_delivery_tasks WHERE id = $1`
	t, err := scanTask(db.QueryRow(query, id).Scan)
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

// List returns partner delivery tasks matching filter, newest first.
func List(db *sql.DB, filter ListFilter) ([]PartnerDeliveryTask, error) {
	limit := clampLimit(filter.Limit)
	where := "WHERE 1=1"
	var args []any
	idx := 1
	if filter.StoreID != "" {
		where += " AND store_id = $" + itoa(idx)
		args = append(args, filter.StoreID)
		idx++
	}
	if filter.Status != "" {
		where += " AND status = $" + itoa(idx)
		args = append(args, filter.Status)
		idx++
	}
	query := `SELECT ` + taskColumns + ` FROM dsh_partner_delivery_tasks ` + where +
		` ORDER BY created_at DESC LIMIT $` + itoa(idx) + ` OFFSET $` + itoa(idx+1)
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
	return tasks, rows.Err()
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf [20]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
