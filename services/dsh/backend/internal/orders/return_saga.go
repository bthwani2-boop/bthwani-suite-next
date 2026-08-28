package orders

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type ReturnStatus string

const (
	ReturnStatusSubmitted        ReturnStatus = "submitted"
	ReturnStatusReview           ReturnStatus = "review"
	ReturnStatusNeedsInfo        ReturnStatus = "needs_info"
	ReturnStatusApproved         ReturnStatus = "approved"
	ReturnStatusRejected         ReturnStatus = "rejected"
	ReturnStatusReturning        ReturnStatus = "returning"
	ReturnStatusFinancialPending ReturnStatus = "financial_pending"
	ReturnStatusResolved         ReturnStatus = "resolved"
)

type ReturnActionType string

const (
	ReturnActionTypeStartReturn      ReturnActionType = "start_return"
	ReturnActionTypeProvideInfo      ReturnActionType = "provide_info"
	ReturnActionTypeApprove          ReturnActionType = "approve"
	ReturnActionTypeReject           ReturnActionType = "reject"
	ReturnActionTypeRequireLogistics ReturnActionType = "require_logistics"
	ReturnActionTypeComplete         ReturnActionType = "complete"
	ReturnActionTypeRefundWlt        ReturnActionType = "refund_wlt"
)

type OrderReturn struct {
	ID              string       `json:"id"`
	OrderID         string       `json:"orderId"`
	Status          ReturnStatus `json:"status"`
	ActorID         string       `json:"actorId"`
	ActorRole       string       `json:"actorRole"`
	ReasonCode      string       `json:"reasonCode"`
	ReasonNote      string       `json:"reasonNote"`
	TicketReference string       `json:"ticketReference,omitempty"`
	CorrelationID   string       `json:"correlationId"`
	Version         int64        `json:"version"`
	CreatedAt       time.Time    `json:"createdAt"`
	UpdatedAt       time.Time    `json:"updatedAt"`
}

type OrderReturnItem struct {
	ReturnID    string `json:"returnId"`
	OrderItemID string `json:"orderItemId"`
	Quantity    int64  `json:"quantity"`
}

type OrderReturnAction struct {
	ID             string           `json:"id"`
	ReturnID       string           `json:"returnId"`
	ActorID        string           `json:"actorId"`
	ActionType     ReturnActionType `json:"actionType"`
	Payload        json.RawMessage  `json:"payload"`
	EvidenceIDs    []string         `json:"evidenceIds,omitempty"`
	IdempotencyKey string           `json:"idempotencyKey"`
	CorrelationID  string           `json:"correlationId"`
	Status         string           `json:"status"`
	CreatedAt      time.Time        `json:"createdAt"`
	ExecutedAt     *time.Time       `json:"executedAt,omitempty"`
	ErrorMessage   string           `json:"errorMessage,omitempty"`
}

type CreateReturnCaseInput struct {
	OrderID           string
	OperatorContextID string
	ActorID           string
	ActorRole         string
	ReasonCode        string
	ReasonNote        string
	TicketReference   string
	CorrelationID     string
	Items             []ReturnItemInput
}

type ReturnItemInput struct {
	OrderItemID string
	Quantity    int64
}

func CreateReturnCase(db *sql.DB, input CreateReturnCaseInput) (*OrderReturn, error) {
	if input.OrderID == "" || input.ActorID == "" || input.ReasonCode == "" || input.ActorRole == "" {
		return nil, fmt.Errorf("%w: missing required fields", ErrInvalid)
	}
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	if input.OperatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	if len(input.Items) == 0 {
		return nil, fmt.Errorf("%w: at least one item must be returned", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Lock the order within the trusted operator context. The lock itself is
	// context-bound so cross-context callers cannot observe or mutate another
	// context's order, and legacy context-less rows never match (fail closed).
	var order Order
	var operatorContextID string
	err = tx.QueryRow(`
		SELECT id, store_id, client_id, status, operator_context_id
		FROM dsh_orders
		WHERE id = $1 AND operator_context_id = $2 FOR UPDATE
	`, input.OrderID, input.OperatorContextID).Scan(&order.ID, &order.StoreID, &order.ClientID, &order.Status, &operatorContextID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if operatorContextID != input.OperatorContextID {
		return nil, fmt.Errorf("%w: mismatch operator context", ErrConflict)
	}

	// Returns are only allowed if order has been delivered
	if order.Status != StatusDelivered {
		return nil, fmt.Errorf("%w: order is not delivered, cannot return", ErrConflict)
	}

	id := "ret_" + strings.ReplaceAll(input.CorrelationID, "-", "") // simplified generator
	if len(id) > 40 {
		id = id[:40]
	}

	status := ReturnStatusSubmitted

	// Insert the return case
	var ret OrderReturn
	err = tx.QueryRow(`
		INSERT INTO dsh_order_returns (id, order_id, status, actor_id, actor_role, reason_code, reason_note, ticket_reference, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, order_id, status, actor_id, actor_role, reason_code, reason_note, ticket_reference, correlation_id, version, created_at, updated_at
	`, id, order.ID, string(status), input.ActorID, input.ActorRole, input.ReasonCode, input.ReasonNote, input.TicketReference, input.CorrelationID).
		Scan(&ret.ID, &ret.OrderID, (*string)(&ret.Status), &ret.ActorID, &ret.ActorRole, &ret.ReasonCode, &ret.ReasonNote, &ret.TicketReference, &ret.CorrelationID, &ret.Version, &ret.CreatedAt, &ret.UpdatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "idx_dsh_order_returns_order_id") {
			return nil, fmt.Errorf("%w: return already exists for this order", ErrConflict)
		}
		return nil, err
	}

	for _, item := range input.Items {
		_, err = tx.Exec(`
			INSERT INTO dsh_order_return_items (return_id, order_item_id, quantity)
			VALUES ($1, $2, $3)
		`, ret.ID, item.OrderItemID, item.Quantity)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &ret, nil
}

// GetReturnForOperatorContext reads the return case for an order inside the
// trusted operator context. The join through dsh_orders makes the read
// context-bound; the caller must already have proven order ownership.
func GetReturnForOperatorContext(db *sql.DB, operatorContextID, orderID string) (*OrderReturn, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	var ret OrderReturn
	err := db.QueryRow(`
		SELECT r.id, r.order_id, r.status, r.actor_id, r.actor_role, r.reason_code, r.reason_note, r.ticket_reference, r.correlation_id, r.version, r.created_at, r.updated_at
		FROM dsh_order_returns r
		JOIN dsh_orders o ON o.id = r.order_id
		WHERE r.order_id = $1 AND o.operator_context_id = $2
	`, orderID, operatorContextID).Scan(&ret.ID, &ret.OrderID, (*string)(&ret.Status), &ret.ActorID, &ret.ActorRole, &ret.ReasonCode, &ret.ReasonNote, &ret.TicketReference, &ret.CorrelationID, &ret.Version, &ret.CreatedAt, &ret.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &ret, nil
}
