package orders

import (
	"database/sql"
	"errors"
	"strings"
)

type Cancellation struct {
	ID                             string `json:"id"`
	OrderID                        string `json:"orderId"`
	ActorID                        string `json:"actorId"`
	ActorRole                      string `json:"actorRole"`
	ReasonCode                     string `json:"reasonCode"`
	ReasonNote                     string `json:"reasonNote"`
	FromStatus                     string `json:"fromStatus"`
	ToStatus                       string `json:"toStatus"`
	FinancialClosureStatus         string `json:"financialClosureStatus"`
	FinancialReference             string `json:"financialReference"`
	FinancialResultAction          string `json:"financialResultAction"`
	FinancialFailure               string `json:"financialFailure"`
	FinancialOutboxID              string `json:"financialOutboxId"`
	FinancialOutboxStatus          string `json:"financialOutboxStatus"`
	FinancialRecovery              string `json:"financialRecoveryDisposition"`
	FinancialFailureClassification string `json:"financialFailureClassification"`
	FinancialDiagnostic            string `json:"financialDiagnosticCode"`
	FinancialAttempts              int    `json:"financialAttemptCount"`
	FinancialReadbacks             int    `json:"financialReadbackAttemptCount"`
	CreatedAt                      string `json:"createdAt"`
	UpdatedAt                      string `json:"updatedAt"`
}

func GetCancellation(db *sql.DB, orderID string) (*Cancellation, error) {
	var cancellation Cancellation
	err := db.QueryRow(`
		SELECT c.id::text,
		       c.order_id::text,
		       c.actor_id,
		       c.actor_role,
		       c.reason_code,
		       COALESCE(c.reason_note,''),
		       c.from_status,
		       c.to_status,
		       c.financial_closure_status,
		       COALESCE(c.financial_reference,''),
		       COALESCE(o.result_action,''),
		       COALESCE(o.last_error,''),
		       COALESCE(o.id::text,''),
		       COALESCE(o.status,''),
		       COALESCE(o.failure_disposition,''),
		       COALESCE(o.failure_classification,'UNKNOWN_REQUIRES_READBACK'),
		       COALESCE(o.diagnostic_code,''),
		       COALESCE(o.attempt_count,0),
		       COALESCE(o.readback_attempt_count,0),
		       c.created_at::text,
		       c.updated_at::text
		FROM dsh_order_cancellations c
		LEFT JOIN LATERAL (
			SELECT id, result_action, last_error, status, failure_disposition,
			       failure_classification, diagnostic_code, attempt_count, readback_attempt_count
			FROM dsh_checkout_financial_closure_outbox
			WHERE order_id=c.order_id
			ORDER BY created_at DESC
			LIMIT 1
		) o ON TRUE
		WHERE c.order_id=$1::uuid`, orderID).Scan(
		&cancellation.ID,
		&cancellation.OrderID,
		&cancellation.ActorID,
		&cancellation.ActorRole,
		&cancellation.ReasonCode,
		&cancellation.ReasonNote,
		&cancellation.FromStatus,
		&cancellation.ToStatus,
		&cancellation.FinancialClosureStatus,
		&cancellation.FinancialReference,
		&cancellation.FinancialResultAction,
		&cancellation.FinancialFailure,
		&cancellation.FinancialOutboxID,
		&cancellation.FinancialOutboxStatus,
		&cancellation.FinancialRecovery,
		&cancellation.FinancialFailureClassification,
		&cancellation.FinancialDiagnostic,
		&cancellation.FinancialAttempts,
		&cancellation.FinancialReadbacks,
		&cancellation.CreatedAt,
		&cancellation.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &cancellation, nil
}
func GetCancellationForContext(db *sql.DB, operatorContextID, orderID string) (*Cancellation, error) {
	if strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(orderID) == "" {
		return nil, ErrInvalid
	}
	var cancellation Cancellation
	err := db.QueryRow(`
		SELECT c.id::text,
		       c.order_id::text,
		       c.actor_id,
		       c.actor_role,
		       c.reason_code,
		       COALESCE(c.reason_note,''),
		       c.from_status,
		       c.to_status,
		       c.financial_closure_status,
		       COALESCE(c.financial_reference,''),
		       COALESCE(o.result_action,''),
		       COALESCE(o.last_error,''),
		       COALESCE(o.id::text,''),
		       COALESCE(o.status,''),
		       COALESCE(o.failure_disposition,''),
		       COALESCE(o.failure_classification,'UNKNOWN_REQUIRES_READBACK'),
		       COALESCE(o.diagnostic_code,''),
		       COALESCE(o.attempt_count,0),
		       COALESCE(o.readback_attempt_count,0),
		       c.created_at::text,
		       c.updated_at::text
		FROM dsh_order_cancellations c
		JOIN dsh_orders ord ON ord.id = c.order_id
		LEFT JOIN LATERAL (
			SELECT id, result_action, last_error, status, failure_disposition,
			       failure_classification, diagnostic_code, attempt_count, readback_attempt_count
			FROM dsh_checkout_financial_closure_outbox
			WHERE order_id=c.order_id
			ORDER BY created_at DESC
			LIMIT 1
		) o ON TRUE
		WHERE c.order_id=$1::uuid AND (c.operator_context_id=$2 OR ord.operator_context_id=$2)`, orderID, operatorContextID).Scan(
		&cancellation.ID,
		&cancellation.OrderID,
		&cancellation.ActorID,
		&cancellation.ActorRole,
		&cancellation.ReasonCode,
		&cancellation.ReasonNote,
		&cancellation.FromStatus,
		&cancellation.ToStatus,
		&cancellation.FinancialClosureStatus,
		&cancellation.FinancialReference,
		&cancellation.FinancialResultAction,
		&cancellation.FinancialFailure,
		&cancellation.FinancialOutboxID,
		&cancellation.FinancialOutboxStatus,
		&cancellation.FinancialRecovery,
		&cancellation.FinancialFailureClassification,
		&cancellation.FinancialDiagnostic,
		&cancellation.FinancialAttempts,
		&cancellation.FinancialReadbacks,
		&cancellation.CreatedAt,
		&cancellation.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &cancellation, nil
}
