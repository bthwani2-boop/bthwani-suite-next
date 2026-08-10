package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/checkoutfinanceoutbox"
)

type CancellationStatus string

const (
	CancellationRequested  CancellationStatus = "requested"
	CancellationReview     CancellationStatus = "review"
	CancellationApproved   CancellationStatus = "approved"
	CancellationRejected   CancellationStatus = "rejected"
	CancellationCancelling CancellationStatus = "cancelling"
	CancellationCancelled  CancellationStatus = "cancelled"
	CancellationConflict   CancellationStatus = "conflict"
	CancellationUnknown    CancellationStatus = "unknown"
)

type CancellationActionType string

const (
	CancellationActionApprove       CancellationActionType = "approve"
	CancellationActionReject        CancellationActionType = "reject"
	CancellationActionExecuteCancel CancellationActionType = "execute_cancel"
	CancellationActionReconcileWLT  CancellationActionType = "reconcile_wlt"
)

type CancellationActionStatus string

const (
	ActionPendingApproval CancellationActionStatus = "pending_approval"
	ActionExecuting       CancellationActionStatus = "executing"
	ActionCompleted       CancellationActionStatus = "completed"
	ActionFailed          CancellationActionStatus = "failed"
	ActionRejected        CancellationActionStatus = "rejected"
)

type OrderCancellationCase struct {
	ID                     string             `json:"id"`
	OrderID                string             `json:"orderId"`
	OperatorContextID      string             `json:"operatorContextId"`
	ActorID                string             `json:"actorId"`
	ActorRole              string             `json:"actorRole"`
	ReasonCode             string             `json:"reasonCode"`
	ReasonNote             *string            `json:"reasonNote,omitempty"`
	FromStatus             string             `json:"fromStatus"`
	ToStatus               string             `json:"toStatus"`
	FinancialClosureStatus string             `json:"financialClosureStatus"`
	FinancialReference     *string            `json:"financialReference,omitempty"`
	CorrelationID          string             `json:"correlationId"`
	Status                 CancellationStatus `json:"status"`
	Version                int                `json:"version"`
	CreatedAt              time.Time          `json:"createdAt"`
	UpdatedAt              time.Time          `json:"updatedAt"`
}

type OrderCancellationAction struct {
	ID             string                   `json:"id"`
	CancellationID string                   `json:"cancellationId"`
	ActionType     CancellationActionType   `json:"actionType"`
	Status         CancellationActionStatus `json:"status"`
	Payload        string                   `json:"payload,omitempty"`
	IdempotencyKey string                   `json:"idempotencyKey"`
	CorrelationID  string                   `json:"correlationId"`
	CreatedBy      string                   `json:"createdBy"`
	ExecutedBy     *string                  `json:"executedBy,omitempty"`
	CreatedAt      time.Time                `json:"createdAt"`
	UpdatedAt      time.Time                `json:"updatedAt"`
}

const orderCancellationSelect = `
	SELECT id, order_id, operator_context_id, actor_id, actor_role, reason_code, reason_note,
		from_status, to_status, financial_closure_status, financial_reference, correlation_id,
		status, version, created_at, updated_at
	FROM dsh_order_cancellations
`

func scanOrderCancellationCase(row *sql.Row) (OrderCancellationCase, error) {
	var c OrderCancellationCase
	err := row.Scan(
		&c.ID, &c.OrderID, &c.OperatorContextID, &c.ActorID, &c.ActorRole, &c.ReasonCode, &c.ReasonNote,
		&c.FromStatus, &c.ToStatus, &c.FinancialClosureStatus, &c.FinancialReference, &c.CorrelationID,
		&c.Status, &c.Version, &c.CreatedAt, &c.UpdatedAt,
	)
	return c, err
}

const orderCancellationActionSelect = `
	SELECT id, cancellation_id, action_type, status, COALESCE(payload, '{}'::jsonb)::text,
		idempotency_key, correlation_id, created_by, executed_by, created_at, updated_at
	FROM dsh_order_cancellation_actions
`

func scanOrderCancellationAction(row *sql.Row) (OrderCancellationAction, error) {
	var a OrderCancellationAction
	err := row.Scan(
		&a.ID, &a.CancellationID, &a.ActionType, &a.Status, &a.Payload, &a.IdempotencyKey, &a.CorrelationID,
		&a.CreatedBy, &a.ExecutedBy, &a.CreatedAt, &a.UpdatedAt,
	)
	return a, err
}

type CreateCancellationCaseInput struct {
	OrderID           string
	OperatorContextID string
	ActorID           string
	ActorRole         string
	ReasonCode        string
	ReasonNote        string
	CorrelationID     string
}

// CreateCancellationCase initializes a cancellation process.
func CreateCancellationCase(db *sql.DB, input CreateCancellationCaseInput) (*OrderCancellationCase, error) {
	if db == nil {
		return nil, fmt.Errorf("database required")
	}
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ActorRole = strings.TrimSpace(input.ActorRole)
	input.ReasonCode = strings.TrimSpace(input.ReasonCode)
	input.ReasonNote = strings.TrimSpace(input.ReasonNote)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)

	if input.OrderID == "" || input.ActorID == "" || input.ActorRole == "" || input.ReasonCode == "" || input.CorrelationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var (
		checkoutIntentID string
		clientID         string
		opCtxID          string
		paymentSessionID string
		current          OrderStatus
	)
	err = tx.QueryRow(`
		SELECT checkout_intent_id::text, client_id, operator_context_id, wlt_payment_ref_id, status
		FROM dsh_orders
		WHERE id=$1::uuid
		FOR UPDATE`, input.OrderID).Scan(
		&checkoutIntentID, &clientID, &opCtxID, &paymentSessionID, &current,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.OperatorContextID != "" && input.OperatorContextID != opCtxID {
		return nil, ErrNotFound
	}

	// Replay is resolved before current-state eligibility because the first
	// successful execution has already moved the order into a terminal state.
	// The order-level uniqueness invariant also means a different command must
	// conflict instead of inheriting the first command's result.
	existing, existingErr := scanOrderCancellationCase(tx.QueryRow(
		orderCancellationSelect+` WHERE order_id = $1::uuid FOR UPDATE`,
		input.OrderID,
	))
	if existingErr == nil {
		sameCommand := existing.OperatorContextID == opCtxID &&
			existing.ActorID == input.ActorID &&
			existing.ActorRole == input.ActorRole &&
			existing.ReasonCode == input.ReasonCode &&
			existing.CorrelationID == input.CorrelationID &&
			strings.TrimSpace(valueOrEmpty(existing.ReasonNote)) == input.ReasonNote
		if !sameCommand {
			return nil, ErrConflict
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &existing, nil
	}
	if !errors.Is(existingErr, sql.ErrNoRows) {
		return nil, existingErr
	}

	// Client cancellation is direct only before preparation. Once preparation
	// starts, the client surface must fail closed into the operator-review path
	// without creating a misleading cancellation case that has not been
	// accepted for review by an operator.
	if input.ActorRole == "client" && (current == StatusPreparing || current == StatusReadyForPickup || current == StatusDriverAssigned || current == StatusArrivedStore) {
		return nil, ErrCancellationRequiresReview
	}

	// Determine eligibility.
	allowed := false
	for _, status := range cancellableStatuses(input.ActorRole) {
		if current == status {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, ErrConflict
	}

	target := cancellationTarget(input.ActorRole, input.ReasonCode)
	financialStatus := "not_required"
	if paymentSessionID != "" {
		financialStatus = "pending"
	}

	// The command has already passed the actor/state eligibility matrix above;
	// accepted cancellation commands enter the single approved execution state.
	status := CancellationApproved

	var caseID string
	err = tx.QueryRow(`
		INSERT INTO dsh_order_cancellations(
			order_id, operator_context_id, actor_id, actor_role, reason_code, reason_note,
			from_status, to_status, financial_closure_status, correlation_id, status)
		VALUES($1::uuid, $2, $3, $4, $5, NULLIF($6,''), $7, $8, $9, $10, $11)
		RETURNING id`,
		input.OrderID, opCtxID, input.ActorID, input.ActorRole, input.ReasonCode, input.ReasonNote,
		string(current), string(target), financialStatus, input.CorrelationID, string(status),
	).Scan(&caseID)
	if err != nil {
		// Unique violation means a cancellation is already in progress for this correlation ID or order.
		if strings.Contains(err.Error(), "duplicate key value") {
			// Retrieve the existing case
			c, errGet := scanOrderCancellationCase(tx.QueryRow(orderCancellationSelect+` WHERE order_id = $1::uuid`, input.OrderID))
			if errGet == nil {
				return &c, nil // Idempotent return
			}
		}
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Read back
	c, err := scanOrderCancellationCase(db.QueryRow(orderCancellationSelect+` WHERE id = $1::uuid`, caseID))
	return &c, err
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

type CreateCancellationActionInput struct {
	ActorID        string
	CaseID         string
	ActionType     CancellationActionType
	Payload        string
	IdempotencyKey string
	CorrelationID  string
}

func CreateCancellationAction(db *sql.DB, input CreateCancellationActionInput) (OrderCancellationAction, error) {
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.CaseID = strings.TrimSpace(input.CaseID)
	input.Payload = strings.TrimSpace(input.Payload)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)

	if db == nil || input.CaseID == "" || input.IdempotencyKey == "" || input.ActorID == "" {
		return OrderCancellationAction{}, ErrInvalid
	}

	var actionID string
	err := db.QueryRow(`
		INSERT INTO dsh_order_cancellation_actions (cancellation_id, action_type, payload, idempotency_key, correlation_id, created_by)
		VALUES ($1::uuid, $2, NULLIF($3,'')::jsonb, $4, $5, $6)
		RETURNING id`,
		input.CaseID, string(input.ActionType), input.Payload, input.IdempotencyKey, input.CorrelationID, input.ActorID,
	).Scan(&actionID)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value") {
			// Idempotent return
			return scanOrderCancellationAction(db.QueryRow(orderCancellationActionSelect+` WHERE cancellation_id = $1::uuid AND idempotency_key = $2`, input.CaseID, input.IdempotencyKey))
		}
		return OrderCancellationAction{}, err
	}

	return scanOrderCancellationAction(db.QueryRow(orderCancellationActionSelect+` WHERE id = $1::uuid`, actionID))
}

type ExecuteCancellationActionInput struct {
	ActorID       string
	ActionID      string
	CorrelationID string
}

func ExecuteCancellationAction(db *sql.DB, input ExecuteCancellationActionInput) (OrderCancellationAction, error) {
	if db == nil || strings.TrimSpace(input.ActionID) == "" {
		return OrderCancellationAction{}, ErrInvalid
	}
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.ActorID == "" {
		return OrderCancellationAction{}, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return OrderCancellationAction{}, err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), 0)`, "cancel-action|"+input.ActionID); err != nil {
		return OrderCancellationAction{}, err
	}

	action, err := scanOrderCancellationAction(tx.QueryRow(orderCancellationActionSelect+` WHERE id = $1::uuid FOR UPDATE`, input.ActionID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return OrderCancellationAction{}, ErrNotFound
		}
		return OrderCancellationAction{}, err
	}
	if action.Status != ActionPendingApproval {
		return OrderCancellationAction{}, ErrConflict
	}

	caseItem, err := scanOrderCancellationCase(tx.QueryRow(orderCancellationSelect+` WHERE id = $1::uuid FOR UPDATE`, action.CancellationID))
	if err != nil {
		return OrderCancellationAction{}, err
	}

	// State machine enforcement
	if action.ActionType == CancellationActionApprove {
		if caseItem.Status != CancellationReview {
			return OrderCancellationAction{}, ErrConflict
		}
		if _, err = tx.Exec(`UPDATE dsh_order_cancellations SET status = 'approved', version = version + 1 WHERE id = $1::uuid`, caseItem.ID); err != nil {
			return OrderCancellationAction{}, err
		}
		// Queue the execute cancel action
		if _, err = tx.Exec(`
			INSERT INTO dsh_order_cancellation_actions (cancellation_id, action_type, idempotency_key, correlation_id, created_by, status)
			VALUES ($1::uuid, $2, $3, $4, $5, 'pending_approval')`,
			caseItem.ID, string(CancellationActionExecuteCancel), "exec-"+action.ID, input.CorrelationID, input.ActorID,
		); err != nil {
			return OrderCancellationAction{}, err
		}

	} else if action.ActionType == CancellationActionReject {
		if caseItem.Status != CancellationReview {
			return OrderCancellationAction{}, ErrConflict
		}
		if _, err = tx.Exec(`UPDATE dsh_order_cancellations SET status = 'rejected', version = version + 1 WHERE id = $1::uuid`, caseItem.ID); err != nil {
			return OrderCancellationAction{}, err
		}

	} else if action.ActionType == CancellationActionExecuteCancel {
		if caseItem.Status != CancellationApproved && caseItem.Status != CancellationCancelling {
			return OrderCancellationAction{}, ErrConflict
		}
		if _, err = tx.Exec(`UPDATE dsh_order_cancellations SET status = 'cancelling', version = version + 1 WHERE id = $1::uuid`, caseItem.ID); err != nil {
			return OrderCancellationAction{}, err
		}

		// Perform Custody Transfer Check
		var deliveryStatus string
		err = tx.QueryRow(`
			SELECT d.status FROM dsh_assignments a
			JOIN dsh_deliveries d ON d.assignment_id = a.id
			WHERE a.order_id = $1::uuid AND a.status IN ('offered', 'accepted')
			LIMIT 1`, caseItem.OrderID).Scan(&deliveryStatus)
		if err == nil && deliveryStatus == "picked_up" {
			// Custody violation: items are with the captain, cannot cancel blindly.
			// Must go through return / handoff first.
			return OrderCancellationAction{}, fmt.Errorf("%w: cannot cancel order while items are in transit (custody block)", ErrConflict)
		}

		// Mutate Order Status
		var paymentSessionID string
		var checkoutIntentID string
		var clientID string
		err = tx.QueryRow(`
			UPDATE dsh_orders
			SET status = $2, cancelled_by_actor_id = $3, cancelled_by_role = $4, cancellation_reason_code = $5, cancellation_note = NULLIF($6,''), cancelled_at = NOW(), updated_at = NOW()
			WHERE id = $1::uuid AND status = $7
			RETURNING wlt_payment_ref_id, checkout_intent_id::text, client_id
		`, caseItem.OrderID, caseItem.ToStatus, caseItem.ActorID, caseItem.ActorRole, caseItem.ReasonCode, caseItem.ReasonNote, caseItem.FromStatus).Scan(&paymentSessionID, &checkoutIntentID, &clientID)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return OrderCancellationAction{}, fmt.Errorf("%w: order not in expected state", ErrConflict)
			}
			return OrderCancellationAction{}, err
		}

		// Dispatch WLT Outbox for Refund (No local calculation of refund amount!)
		if paymentSessionID != "" {
			if err := checkoutfinanceoutbox.Enqueue(tx, checkoutfinanceoutbox.EnqueueInput{
				EventType:        checkoutfinanceoutbox.EventTypeCancelForOrder,
				CheckoutIntentID: checkoutIntentID,
				PaymentSessionID: paymentSessionID,
				OrderID:          &caseItem.OrderID,
				ClientID:         clientID,
				Reason:           caseItem.ReasonCode,
				CorrelationID:    input.CorrelationID,
			}); err != nil {
				return OrderCancellationAction{}, err
			}
		}

		// Emit Status Event
		if _, err := tx.Exec(`
			INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note)
			VALUES($1::uuid,$2,$3,$4,$5)`,
			caseItem.OrderID, caseItem.ActorRole, caseItem.FromStatus, caseItem.ToStatus, caseItem.ReasonCode,
		); err != nil {
			return OrderCancellationAction{}, err
		}

		// Cancel non-custody dependent work (assignments, pickup sessions, deliveries if not picked_up)
		// We explicitly do not use the removed trigger.
		tx.Exec(`UPDATE dsh_assignments SET status='cancelled', updated_at=NOW() WHERE order_id=$1::uuid AND status IN ('offered','accepted')`, caseItem.OrderID)
		tx.Exec(`UPDATE dsh_deliveries SET status='cancelled', note='order cancelled', updated_at=NOW() WHERE order_id=$1::uuid AND status NOT IN ('delivered', 'picked_up')`, caseItem.OrderID)
		tx.Exec(`UPDATE dsh_partner_delivery_tasks SET status='cancelled', version=version+1, updated_at=NOW() WHERE order_id=$1::uuid AND status NOT IN ('completed','cancelled')`, caseItem.OrderID)
		tx.Exec(`UPDATE dsh_pickup_sessions SET status='cancelled', cancelled_at=NOW(), cancellation_reason='order_cancelled', used_at=NULL, version=version+1, updated_at=NOW() WHERE order_id=$1::uuid AND status <> 'cancelled'`, caseItem.OrderID)

		if _, err = tx.Exec(`UPDATE dsh_order_cancellations SET status = 'cancelled', version = version + 1 WHERE id = $1::uuid`, caseItem.ID); err != nil {
			return OrderCancellationAction{}, err
		}
	}

	_, err = tx.Exec(`UPDATE dsh_order_cancellation_actions SET status = 'completed', executed_by = $2, updated_at = NOW() WHERE id = $1::uuid`, action.ID, input.ActorID)
	if err != nil {
		return OrderCancellationAction{}, err
	}

	if err := tx.Commit(); err != nil {
		return OrderCancellationAction{}, err
	}

	action.Status = ActionCompleted
	action.ExecutedBy = &input.ActorID
	return action, nil
}

// CancelOrderSync is a convenience wrapper for immediate cancellations.
func CancelOrderSync(db *sql.DB, input CreateCancellationCaseInput) (*Order, error) {
	c, err := CreateCancellationCase(db, input)
	if err != nil {
		return nil, err
	}
	if c.Status == CancellationApproved {
		act, err := CreateCancellationAction(db, CreateCancellationActionInput{
			ActorID:        input.ActorID,
			CaseID:         c.ID,
			ActionType:     CancellationActionExecuteCancel,
			Payload:        "",
			IdempotencyKey: "sync-exec-" + input.CorrelationID,
			CorrelationID:  input.CorrelationID,
		})
		if err != nil {
			return nil, err
		}
		_, err = ExecuteCancellationAction(db, ExecuteCancellationActionInput{
			ActorID:       input.ActorID,
			ActionID:      act.ID,
			CorrelationID: input.CorrelationID,
		})
		if err != nil {
			return nil, err
		}
	} else if c.Status == CancellationReview {
		return nil, ErrCancellationRequiresReview
	} else if c.Status == CancellationRejected || c.Status == CancellationConflict || c.Status == CancellationUnknown {
		return nil, ErrConflict
	}
	return GetOrder(db, input.OrderID)
}
